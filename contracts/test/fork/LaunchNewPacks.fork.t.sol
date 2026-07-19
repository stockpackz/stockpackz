// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {StockPackz} from "../../src/StockPackz.sol";
import {KeeperRandomnessCoordinator} from "../../src/randomness/KeeperRandomnessCoordinator.sol";

interface IAdapterAdmin {
    function configurePair(address tokenIn, address tokenOut, uint24 fee, int24 tickSpacing, uint256 minQuoteOut)
        external;
    function quote(address inputToken, address outputToken, uint256 amountIn) external view returns (uint256);
}

/// @notice Mainnet-fork stress test for the new pack launch. Exercises the
///         REAL settlement path (payment -> randomness -> Uniswap v4 swap ->
///         stock delivery) for every candidate stock and for the exact packs
///         we intend to create, against live liquidity.
///
///         Run: forge test --match-contract LaunchNewPacksFork \
///              --fork-url https://rpc.mainnet.chain.robinhood.com -vv
contract LaunchNewPacksFork is Test {
    StockPackz constant core = StockPackz(0xEee1458Ad6DeB8Fa35f39FDdbB1aaa12D4A422f3);
    KeeperRandomnessCoordinator constant coordinator =
        KeeperRandomnessCoordinator(0x28A6a8eEa385FEbB9F0D88F6C6064cbE972f9cD7);
    IAdapterAdmin constant adapter = IAdapterAdmin(0x0B17df805a8C0921cB1B141F4515612028d8E4a7);
    address constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
    address constant OPS = 0x59154C6638b39038e648933d1f9a5f03e3677941; // admin + pack manager + keeper

    // Candidate stocks (fee tier = deepest live pool from the scanner).
    address constant AAPL = 0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9;
    address constant MSFT = 0xe93237C50D904957Cf27E7B1133b510C669c2e74;
    address constant AMZN = 0x12f190a9F9d7D37a250758b26824B97CE941bF54;
    address constant META = 0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35;
    address constant TSLA = 0x322F0929c4625eD5bAd873c95208D54E1c003b2d;
    address constant GOOGL = 0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3;
    address constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address constant SPY = 0x117cc2133c37B721F49dE2A7a74833232B3B4C0C;
    address constant QQQ = 0xD5f3879160bc7c32ebb4dC785F8a4F505888de68;
    address constant INTC = 0xc72b96e0E48ecd4DC75E1e45396e26300BC39681;

    address user = makeAddr("stress-user");

    function setUp() public {
        _wirePairs();
        deal(USDG, user, 10_000e6);
        vm.prank(user);
        IERC20(USDG).approve(address(core), type(uint256).max);
    }

    function _wirePairs() internal {
        vm.startPrank(OPS);
        adapter.configurePair(USDG, AAPL, 10000, 200, 0);
        adapter.configurePair(USDG, MSFT, 3000, 60, 0);
        adapter.configurePair(USDG, AMZN, 3000, 60, 0);
        adapter.configurePair(USDG, META, 3000, 60, 0);
        adapter.configurePair(USDG, TSLA, 3000, 60, 0);
        adapter.configurePair(USDG, GOOGL, 3000, 60, 0);
        adapter.configurePair(USDG, SPY, 3000, 60, 0);
        adapter.configurePair(USDG, QQQ, 10000, 200, 0);
        vm.stopPrank();
    }

    // ------------------------------------------------------------ helpers

    function _opt(address token, uint32 weight) internal pure returns (StockPackz.StockOption memory) {
        return StockPackz.StockOption({token: token, weight: weight, maxSlippageBps: 500, minimumQuote: 0, active: true});
    }

    /// Open + fulfill randomness + assert the user actually received stock.
    /// Returns the amount of stock delivered.
    function _openAndSettle(uint256 packId) internal returns (address stock, uint256 received) {
        vm.prank(user);
        uint256 openingId = core.openPack(packId, 500, 0);

        uint256 requestId = coordinator.nextRequestId() - 1;
        vm.roll(block.number + 1);

        // Snapshot balances of every candidate so we can detect which stock landed.
        address[10] memory all = [AAPL, MSFT, AMZN, META, TSLA, GOOGL, NVDA, SPY, QQQ, INTC];
        uint256[10] memory before;
        for (uint256 i = 0; i < all.length; i++) {
            before[i] = IERC20(all[i]).balanceOf(user);
        }
        // Also existing pack stocks (AMD/MU/SPCX) for the live-pack test.
        uint256 amdBefore = IERC20(0x86923f96303D656E4aa86D9d42D1e57ad2023fdC).balanceOf(user);
        uint256 muBefore = IERC20(0xfF080c8ce2E5feadaCa0Da81314Ae59D232d4afD).balanceOf(user);
        uint256 spcxBefore = IERC20(0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa).balanceOf(user);

        vm.prank(OPS);
        coordinator.fulfill(requestId, keccak256(abi.encode("stress", openingId, block.number)));

        for (uint256 i = 0; i < all.length; i++) {
            uint256 got = IERC20(all[i]).balanceOf(user) - before[i];
            if (got > 0) return (all[i], got);
        }
        uint256 amdGot = IERC20(0x86923f96303D656E4aa86D9d42D1e57ad2023fdC).balanceOf(user) - amdBefore;
        if (amdGot > 0) return (0x86923f96303D656E4aa86D9d42D1e57ad2023fdC, amdGot);
        uint256 muGot = IERC20(0xfF080c8ce2E5feadaCa0Da81314Ae59D232d4afD).balanceOf(user) - muBefore;
        if (muGot > 0) return (0xfF080c8ce2E5feadaCa0Da81314Ae59D232d4afD, muGot);
        uint256 spcxGot = IERC20(0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa).balanceOf(user) - spcxBefore;
        if (spcxGot > 0) return (0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa, spcxGot);
        return (address(0), 0);
    }

    // -------------------------------------------------------------- tests

    /// Every candidate stock must settle a REAL swap at Mag7 pack size.
    function test_everyCandidateSettlesRealSwap() public {
        address[9] memory tokens = [AAPL, MSFT, AMZN, META, TSLA, GOOGL, SPY, QQQ, INTC];
        string[9] memory names = ["AAPL", "MSFT", "AMZN", "META", "TSLA", "GOOGL", "SPY", "QQQ", "INTC"];

        for (uint256 i = 0; i < tokens.length; i++) {
            // Single-option pack forces this exact stock to be selected.
            StockPackz.StockOption[] memory opts = new StockPackz.StockOption[](1);
            opts[0] = _opt(tokens[i], 10_000);

            StockPackz.PackConfig memory cfg;
            cfg.name = string.concat("Probe ", names[i]);
            cfg.description = "stress probe";
            cfg.price = 14.99e6;
            cfg.stockAmount = 13.49e6;
            cfg.protocolFee = 0.90e6;
            cfg.jackpotContribution = 0.60e6;
            cfg.active = true;

            vm.prank(OPS);
            uint256 packId = core.createPack(cfg, opts);

            (address stock, uint256 got) = _openAndSettle(packId);
            console2.log(string.concat(names[i], " received:"), got);
            assertEq(stock, tokens[i], string.concat(names[i], ": wrong stock delivered"));
            assertGt(got, 0, string.concat(names[i], ": settlement failed (no stock delivered)"));

            // deactivate the probe pack so it never leaks into anything
            vm.prank(OPS);
            core.setPackActive(packId, false);
        }
    }

    /// Create the REAL packs we intend to launch and hammer them with
    /// repeated openings — random stock selection across all options.
    function test_launchPacks_stress() public {
        (uint256 mag7Id, uint256 indexId) = _createLaunchPacks();

        uint256 settled;
        for (uint256 i = 0; i < 14; i++) {
            uint256 packId = i % 2 == 0 ? mag7Id : indexId;
            (address stock, uint256 got) = _openAndSettle(packId);
            assertGt(got, 0, "settlement failed during stress loop");
            console2.log("open", i, stock, got);
            settled++;
        }
        assertEq(settled, 14);

        // Existing packs must still settle after the new wiring.
        (, uint256 aiGot) = _openAndSettle(1);
        assertGt(aiGot, 0, "AI Pack broken");
        (, uint256 ftGot) = _openAndSettle(2);
        assertGt(ftGot, 0, "Future Tech broken");
    }

    function _createLaunchPacks() internal returns (uint256 mag7Id, uint256 indexId) {
        vm.startPrank(OPS);

        // --- Magnificent 7 ---
        StockPackz.StockOption[] memory m7 = new StockPackz.StockOption[](7);
        m7[0] = _opt(AAPL, 1800);
        m7[1] = _opt(MSFT, 1800);
        m7[2] = _opt(AMZN, 1800);
        m7[3] = _opt(GOOGL, 1800);
        m7[4] = _opt(TSLA, 1200);
        m7[5] = _opt(NVDA, 800);
        m7[6] = _opt(META, 800);

        StockPackz.PackConfig memory mag7;
        mag7.name = "Magnificent 7";
        mag7.description = "The seven giants that move the market";
        mag7.price = 14.99e6;
        mag7.stockAmount = 13.49e6;
        mag7.protocolFee = 0.90e6;
        mag7.jackpotContribution = 0.60e6;
        mag7.active = true;
        mag7.baseXP = 300;
        mag7Id = core.createPack(mag7, m7);

        // --- Index pack ---
        StockPackz.StockOption[] memory ix = new StockPackz.StockOption[](2);
        ix[0] = _opt(SPY, 5000);
        ix[1] = _opt(QQQ, 5000);

        StockPackz.PackConfig memory index;
        index.name = "Index Pack";
        index.description = "Own the whole market: S&P 500 & Nasdaq 100";
        index.price = 9.99e6;
        index.stockAmount = 9e6;
        index.protocolFee = 0.59e6;
        index.jackpotContribution = 0.40e6;
        index.active = true;
        index.baseXP = 100;
        indexId = core.createPack(index, ix);

        vm.stopPrank();
    }
}
