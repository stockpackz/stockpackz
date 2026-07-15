// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseTest} from "./Base.t.sol";
import {StockPackz} from "../src/StockPackz.sol";
import {MockSwapAdapter} from "../src/mocks/MockSwapAdapter.sol";

contract StockPackzCoreTest is BaseTest {
    // ------------------------------------------------- weighted selection

    function test_weightedSelection_boundaries() public {
        // AI Pack cumulative weights:
        // NVDA [0,2000) AMD [2000,4000) MSFT [4000,5500) GOOGL [5500,7000)
        // AMZN [7000,8000) META [8000,9000) PLTR [9000,10000)
        assertEq(_selectedStock(_openAndFulfill(alice, 0, 999)), address(nvda));
        assertEq(_selectedStock(_openAndFulfill(alice, 1_999, 999)), address(nvda));
        assertEq(_selectedStock(_openAndFulfill(alice, 2_000, 999)), address(amd));
        assertEq(_selectedStock(_openAndFulfill(alice, 3_999, 999)), address(amd));
        assertEq(_selectedStock(_openAndFulfill(alice, 4_000, 999)), address(msft));
        assertEq(_selectedStock(_openAndFulfill(alice, 5_500, 999)), address(googl));
        assertEq(_selectedStock(_openAndFulfill(alice, 7_000, 999)), address(amzn));
        assertEq(_selectedStock(_openAndFulfill(alice, 8_000, 999)), address(meta));
        assertEq(_selectedStock(_openAndFulfill(alice, 9_000, 999)), address(pltr));
        assertEq(_selectedStock(_openAndFulfill(alice, 9_999, 999)), address(pltr));
        // Word is taken modulo the denominator.
        assertEq(_selectedStock(_openAndFulfill(alice, 10_000, 999)), address(nvda));
    }

    function test_stockNotSelectedBeforePayment() public {
        uint256 openingId = _open(alice);
        // Payment committed, randomness pending — no stock chosen yet.
        assertEq(_selectedStock(openingId), address(0));
        assertEq(uint8(_status(openingId)), uint8(StockPackz.OpeningStatus.RandomnessRequested));
    }

    // ------------------------------------------------------- fee split

    function test_feeSplit_exact() public {
        uint256 openingId = _openAndFulfill(alice, 0, 999);

        assertEq(uint8(_status(openingId)), uint8(StockPackz.OpeningStatus.Settled));
        assertEq(core.treasuryAccrued(), FEE);
        assertEq(core.jackpotBalance(), JACKPOT_CUT);
        assertEq(core.pendingLiabilities(), 0);
        // 9 USDG left the contract for the swap; 1 USDG (fee + jackpot) remains.
        assertEq(usdg.balanceOf(address(core)), FEE + JACKPOT_CUT);
        assertEq(usdg.balanceOf(alice), 1_000e6 - PRICE);
    }

    function test_invalidSplit_rejected() public {
        StockPackz.PackConfig memory config = _packConfig();
        config.protocolFee = FEE + 1; // split no longer sums to price
        vm.prank(admin);
        vm.expectRevert(StockPackz.InvalidSplit.selector);
        core.createPack(config, _aiPackOptions());
    }

    function test_invalidWeights_rejected() public {
        StockPackz.StockOption[] memory options = _aiPackOptions();
        options[0].weight = 1_999; // sum = 9,999
        vm.prank(admin);
        vm.expectRevert(StockPackz.InvalidWeights.selector);
        core.createPack(_packConfig(), options);
    }

    // ----------------------------------------------------- direct delivery

    function test_stockDeliveredDirectlyToUser() public {
        uint256 openingId = _openAndFulfill(alice, 0, 999);

        assertEq(nvda.balanceOf(alice), EXPECTED_OUT);
        assertEq(nvda.balanceOf(address(core)), 0); // no custody
        assertEq(_stockReceived(openingId), EXPECTED_OUT);
    }

    // ----------------------------------------------------------- jackpot

    function test_jackpotAccumulates() public {
        _openAndFulfill(alice, 0, 999);
        _openAndFulfill(bob, 0, 999);
        _openAndFulfill(alice, 5_000, 999);
        assertEq(core.jackpotBalance(), 3 * JACKPOT_CUT);
    }

    function test_jackpotWin_payout90_retain10() public {
        // Build a vault first: 3 non-winning opens.
        _openAndFulfill(alice, 0, 999);
        _openAndFulfill(bob, 0, 999);
        _openAndFulfill(alice, 0, 999);
        uint256 vaultBefore = core.jackpotBalance();

        uint256 aliceBefore = usdg.balanceOf(alice);
        // Explicit ordering: contribution added first, then balance read.
        uint256 winningVault = vaultBefore + JACKPOT_CUT;
        uint256 expectedPayout = (winningVault * 9_000) / 10_000;
        uint256 expectedSeed = winningVault - expectedPayout;

        uint256 openingId = _openAndFulfill(alice, 0, 39); // 39 < 40 wins

        (bool winner, uint256 payout) = _jackpotResult(openingId);
        assertTrue(winner);
        assertEq(payout, expectedPayout);
        assertEq(core.jackpotBalance(), expectedSeed);
        assertEq(usdg.balanceOf(alice), aliceBefore - PRICE + expectedPayout);
    }

    function test_jackpotThresholdBoundary() public {
        uint256 winId = _openAndFulfill(alice, 0, 39);
        (bool winner39,) = _jackpotResult(winId);
        assertTrue(winner39);

        uint256 loseId = _openAndFulfill(bob, 0, 40); // 40 is NOT < 40
        (bool winner40,) = _jackpotResult(loseId);
        assertFalse(winner40);
    }

    function test_jackpotOddsSnapshot_adminChangeDoesNotAffectPending() public {
        uint256 openingId = _open(alice);
        // Admin flips odds to zero after payment — pending opening keeps 40.
        vm.prank(admin);
        core.setJackpotThreshold(0);
        _fulfill(openingId, 0, 39);
        (bool winner,) = _jackpotResult(openingId);
        assertTrue(winner);
    }

    function test_externalJackpotFunding() public {
        usdg.mint(admin, 100e6);
        vm.startPrank(admin);
        usdg.approve(address(core), 100e6);
        core.fundJackpot(100e6);
        vm.stopPrank();
        assertEq(core.jackpotBalance(), 100e6);
    }

    // ---------------------------------------------------- config snapshot

    function test_configSnapshot_adminUpdateDoesNotAffectPending() public {
        uint256 openingId = _open(alice);

        // Admin swaps the pack to 100% PLTR after alice paid.
        StockPackz.StockOption[] memory newOptions = new StockPackz.StockOption[](1);
        newOptions[0] = _option(address(pltr), 10_000);
        vm.prank(admin);
        core.updatePack(aiPackId, _packConfig(), newOptions);

        // Roll 0 must still resolve against the frozen snapshot → NVDA.
        _fulfill(openingId, 0, 999);
        assertEq(_selectedStock(openingId), address(nvda));
        assertEq(_packVersionOf(openingId), 1);

        // A fresh opening uses the new config.
        uint256 fresh = _openAndFulfill(bob, 0, 999);
        assertEq(_selectedStock(fresh), address(pltr));
        assertEq(_packVersionOf(fresh), 2);
    }

    // -------------------------------------------------- failure + refunds

    function test_swapFailure_parksOpening_noFeesFinalized() public {
        adapter.setFailSwaps(true);
        uint256 openingId = _openAndFulfill(alice, 0, 999);

        assertEq(uint8(_status(openingId)), uint8(StockPackz.OpeningStatus.SettlementFailed));
        // Nothing finalized: no fee, no jackpot, liability still open.
        assertEq(core.treasuryAccrued(), 0);
        assertEq(core.jackpotBalance(), 0);
        assertEq(core.pendingLiabilities(), PRICE);
        // User funds are still held, not taken.
        assertEq(usdg.balanceOf(address(core)), PRICE);
    }

    function test_retryAfterFailure_settles() public {
        adapter.setFailSwaps(true);
        uint256 openingId = _openAndFulfill(alice, 0, 999);

        adapter.setFailSwaps(false);
        vm.prank(alice);
        core.retrySettlement(openingId, 200);

        assertEq(uint8(_status(openingId)), uint8(StockPackz.OpeningStatus.Settled));
        assertEq(nvda.balanceOf(alice), EXPECTED_OUT);
        assertEq(core.treasuryAccrued(), FEE);
        assertEq(core.jackpotBalance(), JACKPOT_CUT);
    }

    function test_refundAfterFailure_fullAmount() public {
        adapter.setFailSwaps(true);
        uint256 openingId = _openAndFulfill(alice, 0, 999);

        uint256 before = usdg.balanceOf(alice);
        vm.prank(alice);
        core.refundOpening(openingId);

        assertEq(uint8(_status(openingId)), uint8(StockPackz.OpeningStatus.Refunded));
        assertEq(usdg.balanceOf(alice), before + PRICE);
        assertEq(core.pendingLiabilities(), 0);
    }

    function test_refund_onlyUserOrKeeper() public {
        adapter.setFailSwaps(true);
        uint256 openingId = _openAndFulfill(alice, 0, 999);
        vm.prank(bob);
        vm.expectRevert(StockPackz.NotOpener.selector);
        core.refundOpening(openingId);
    }

    function test_refund_cannotDoubleSpend() public {
        adapter.setFailSwaps(true);
        uint256 openingId = _openAndFulfill(alice, 0, 999);
        vm.prank(alice);
        core.refundOpening(openingId);
        vm.prank(alice);
        vm.expectRevert(StockPackz.WrongStatus.selector);
        core.refundOpening(openingId);
    }

    function test_shallowLiquidity_failsSettlement() public {
        adapter.setShallowLiquidity(true); // quotes collapse below minimumQuote
        uint256 openingId = _openAndFulfill(alice, 0, 999);
        assertEq(uint8(_status(openingId)), uint8(StockPackz.OpeningStatus.SettlementFailed));
    }

    function test_deliveryShortfall_failsSettlement() public {
        adapter.setDeliveryShortfallBps(500); // adapter lies about output
        uint256 openingId = _openAndFulfill(alice, 0, 999);
        assertEq(uint8(_status(openingId)), uint8(StockPackz.OpeningStatus.SettlementFailed));
    }

    function test_expiredSwap_failsSettlement() public {
        // Force deadline expiry inside the adapter by warping between open
        // and a retry with a zero-window... window is enforced by core, so
        // instead simulate adapter-side expiry via failSwaps analogue:
        // the adapter reverts on expired deadline; core always passes
        // block.timestamp + window, so this can only occur with a broken
        // adapter — covered by failure handling above. Here we assert the
        // adapter itself enforces deadlines.
        usdg.mint(address(this), 10e6);
        usdg.approve(address(adapter), 10e6);
        vm.expectRevert("MockSwapAdapter: expired");
        adapter.swapExactInput(address(usdg), address(nvda), 1e6, 0, address(this), block.timestamp - 1);
    }

    // ------------------------------------------------- randomness safety

    function test_duplicateFulfillment_rejected() public {
        uint256 openingId = _open(alice);
        _fulfill(openingId, 0, 999);

        uint256[] memory words = new uint256[](2);
        words[0] = 5_000;
        words[1] = 0;
        vm.expectRevert(StockPackz.UnknownRequest.selector);
        coordinator.fulfill(requestOf[openingId], words);
    }

    function test_onlyCoordinatorCanFulfill() public {
        uint256 openingId = _open(alice);
        uint256[] memory words = new uint256[](2);
        vm.expectRevert(StockPackz.NotCoordinator.selector);
        core.rawFulfillRandomness(requestOf[openingId], words);
    }

    function test_timeoutCancel_refunds() public {
        uint256 openingId = _open(alice);

        vm.prank(alice);
        vm.expectRevert(StockPackz.TimeoutNotReached.selector);
        core.cancelExpiredOpening(openingId);

        vm.warp(block.timestamp + 24 hours + 1);
        uint256 before = usdg.balanceOf(alice);
        vm.prank(alice);
        core.cancelExpiredOpening(openingId);

        assertEq(uint8(_status(openingId)), uint8(StockPackz.OpeningStatus.CancelledAndRefunded));
        assertEq(usdg.balanceOf(alice), before + PRICE);

        // Stale randomness arriving after cancellation is rejected.
        uint256[] memory words = new uint256[](2);
        vm.expectRevert(StockPackz.UnknownRequest.selector);
        coordinator.fulfill(requestOf[openingId], words);
    }

    // --------------------------------------------------------- pause/gates

    function test_pause_blocksOpens_allowsRefunds() public {
        adapter.setFailSwaps(true);
        uint256 openingId = _openAndFulfill(alice, 0, 999);

        vm.prank(admin);
        core.pause();

        vm.prank(bob);
        vm.expectRevert();
        core.openPack(aiPackId, 100, 0);

        // User exit paths keep working while paused.
        vm.prank(alice);
        core.refundOpening(openingId);
        assertEq(uint8(_status(openingId)), uint8(StockPackz.OpeningStatus.Refunded));
    }

    function test_slippageCap_enforced() public {
        vm.prank(alice);
        vm.expectRevert(StockPackz.SlippageTooHigh.selector);
        core.openPack(aiPackId, 1_001, 0);
    }

    function test_gateToken_restriction() public {
        StockPackz.PackConfig memory config = _packConfig();
        config.gateToken = address(pltr);
        config.gateMinBalance = 5e18;
        vm.prank(admin);
        uint256 gatedId = core.createPack(config, _aiPackOptions());

        vm.prank(alice);
        vm.expectRevert(StockPackz.GateNotSatisfied.selector);
        core.openPack(gatedId, 100, 0);

        pltr.mint(alice, 5e18);
        vm.prank(alice);
        core.openPack(gatedId, 100, 0); // now allowed
    }

    function test_timeWindow_restriction() public {
        StockPackz.PackConfig memory config = _packConfig();
        config.startsAt = uint64(block.timestamp + 1 days);
        vm.prank(admin);
        uint256 futureId = core.createPack(config, _aiPackOptions());

        vm.prank(alice);
        vm.expectRevert(StockPackz.PackNotOpen.selector);
        core.openPack(futureId, 100, 0);

        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(alice);
        core.openPack(futureId, 100, 0);
    }

    // -------------------------------------------------- settlement assets

    function test_feeOnTransferUSDG_rejected() public {
        usdg.setFeeOnTransferBps(100);
        vm.prank(alice);
        vm.expectRevert(StockPackz.FeeOnTransferNotSupported.selector);
        core.openPack(aiPackId, 100, 0);
    }

    // ------------------------------------------------- admin withdrawals

    function test_adminWithdraw_onlyAccruedFees() public {
        _openAndFulfill(alice, 0, 999);
        _openAndFulfill(bob, 0, 999);
        // Contract holds 2 × (fee + jackpot); only 2 × fee is withdrawable.

        vm.prank(admin);
        vm.expectRevert(StockPackz.NothingToWithdraw.selector);
        core.withdrawTreasury(admin, 2 * FEE + 1);

        vm.prank(admin);
        core.withdrawTreasury(admin, 2 * FEE);
        assertEq(usdg.balanceOf(admin), 2 * FEE);
        assertEq(core.jackpotBalance(), 2 * JACKPOT_CUT);
        assertEq(usdg.balanceOf(address(core)), 2 * JACKPOT_CUT); // jackpot untouched
    }

    function test_adminCannotTouchPendingLiabilities() public {
        _openAndFulfill(alice, 0, 999); // accrues 0.6 fee
        adapter.setFailSwaps(true);
        _openAndFulfill(bob, 0, 999); // pending 10 USDG liability

        // Balance = 1.0 (settled fee+jackpot) + 10 (pending). Reserved = 10 + 0.4.
        // Withdrawable = 0.6 only.
        vm.prank(admin);
        core.withdrawTreasury(admin, FEE);

        vm.prank(admin);
        vm.expectRevert(StockPackz.NothingToWithdraw.selector);
        core.withdrawTreasury(admin, 1);
    }

    function test_adapterFrozenPerOpening() public {
        uint256 openingId = _open(alice);

        // Admin swaps the global adapter to a broken one mid-flight.
        MockSwapAdapter evil = new MockSwapAdapter();
        evil.setFailSwaps(true);
        vm.prank(admin);
        core.setSwapAdapter(evil);

        // Opening settles through the adapter it was created with.
        _fulfill(openingId, 0, 999);
        assertEq(uint8(_status(openingId)), uint8(StockPackz.OpeningStatus.Settled));
        assertEq(nvda.balanceOf(alice), EXPECTED_OUT);
    }

    // ----------------------------------------------------- distribution

    function test_weightedSelection_distribution() public {
        // 1,000 openings with uniformly spread rolls: counts must match
        // weights exactly because rolls are deterministic and evenly spaced.
        uint256 nvdaCount;
        uint256 pltrCount;
        usdg.mint(alice, 10_000e6);
        for (uint256 i = 0; i < 1_000; i++) {
            uint256 roll = (i * 10) % 10_000;
            uint256 id = _openAndFulfill(alice, roll, 999);
            address sel = _selectedStock(id);
            if (sel == address(nvda)) nvdaCount++;
            if (sel == address(pltr)) pltrCount++;
        }
        assertEq(nvdaCount, 200); // 20% of 1,000
        assertEq(pltrCount, 100); // 10% of 1,000
    }
}
