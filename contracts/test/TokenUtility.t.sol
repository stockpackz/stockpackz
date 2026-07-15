// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseTest} from "./Base.t.sol";
import {StockPackz} from "../src/StockPackz.sol";
import {StockPackzToken} from "../src/token/StockPackzToken.sol";
import {MembershipTierManager} from "../src/membership/MembershipTierManager.sol";
import {PackRewardsVault} from "../src/vaults/PackRewardsVault.sol";
import {XPManager} from "../src/progression/XPManager.sol";
import {LevelUnlockRegistry} from "../src/progression/LevelUnlockRegistry.sol";
import {OracleTokenPriceAdapter, IPriceFeed} from "../src/adapters/OracleTokenPriceAdapter.sol";
import {MockPriceFeed} from "../src/mocks/MockPriceFeed.sol";
import {IMembershipTiers} from "../src/interfaces/IMembershipTiers.sol";
import {IPackRewardsVault} from "../src/interfaces/IPackRewardsVault.sol";
import {IXPManager} from "../src/interfaces/IXPManager.sol";
import {ITokenPriceAdapter} from "../src/interfaces/ITokenPriceAdapter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TokenUtilityTest is BaseTest {
    StockPackzToken packz;
    MembershipTierManager tierManager;
    PackRewardsVault rewardsVault;
    XPManager xp;
    LevelUnlockRegistry unlockRegistry;
    MockPriceFeed feed;
    OracleTokenPriceAdapter priceAdapter;

    // Token priced at $0.10 → $0.05 burn = 0.5 PACKZ.
    int256 constant TOKEN_PRICE = 0.10e6;
    uint256 constant EXPECTED_BURN = 0.5e18;

    function setUp() public override {
        super.setUp();

        packz = new StockPackzToken(10_000_000e18, admin, makeAddr("rewardsTax"), makeAddr("jackpotTax"));
        tierManager = new MembershipTierManager(IERC20(address(packz)), admin);
        rewardsVault = new PackRewardsVault(IERC20(address(usdg)), admin);
        xp = new XPManager(admin);
        unlockRegistry = new LevelUnlockRegistry(IXPManager(address(xp)), admin);
        feed = new MockPriceFeed(TOKEN_PRICE, 6);
        priceAdapter = new OracleTokenPriceAdapter(IPriceFeed(address(feed)), admin);

        vm.startPrank(admin);
        core.setUtilityModules(
            IMembershipTiers(address(tierManager)),
            IPackRewardsVault(address(rewardsVault)),
            IXPManager(address(xp)),
            ITokenPriceAdapter(address(priceAdapter)),
            IERC20(address(packz))
        );
        xp.grantRole(xp.AWARDER_ROLE(), address(core));
        rewardsVault.grantRole(rewardsVault.SPENDER_ROLE(), address(core));
        packz.setTaxExempt(address(core), true);
        packz.setTaxExempt(core.BURN_ADDRESS(), true); // burns transfer to dead untaxed
        vm.stopPrank();

        // Give the pack XP so awards flow.
        StockPackz.PackConfig memory config = _packConfig();
        config.baseXP = 100;
        vm.prank(admin);
        core.updatePack(aiPackId, config, _aiPackOptions());

        // Approvals for burns.
        vm.prank(alice);
        packz.approve(address(core), type(uint256).max);
        vm.prank(bob);
        packz.approve(address(core), type(uint256).max);
    }

    function _fundRewards(uint256 amount) internal {
        usdg.mint(admin, amount);
        vm.startPrank(admin);
        usdg.approve(address(rewardsVault), amount);
        rewardsVault.fundVault(amount);
        vm.stopPrank();
    }

    function _giveTier(address user, uint256 tokens) internal {
        vm.prank(admin);
        packz.transfer(user, tokens);
    }

    // ------------------------------------------------ burn vs surcharge

    function test_holder_pays10_andBurns() public {
        _giveTier(alice, 1e18); // enough tokens for the burn, below Bronze

        uint256 usdgBefore = usdg.balanceOf(alice);
        uint256 packzBefore = packz.balanceOf(alice);
        uint256 openingId = _openAndFulfill(alice, 0, 999);

        assertEq(usdg.balanceOf(alice), usdgBefore - 10e6); // exactly 10.00
        assertEq(packz.balanceOf(alice), packzBefore - EXPECTED_BURN);
        assertEq(packz.balanceOf(core.BURN_ADDRESS()), EXPECTED_BURN);
        assertEq(core.totalTokensBurned(), EXPECTED_BURN);
        assertEq(uint8(_status(openingId)), uint8(StockPackz.OpeningStatus.Settled));
    }

    function test_nonHolder_pays1020_noBurn() public {
        uint256 usdgBefore = usdg.balanceOf(alice);
        uint256 openingId = _openAndFulfill(alice, 0, 999);

        assertEq(usdg.balanceOf(alice), usdgBefore - 10.2e6); // Mode B
        assertEq(core.totalTokensBurned(), 0);
        // Surcharge lands in the treasury leg; stock + jackpot untouched.
        assertEq(core.treasuryAccrued(), FEE + 0.2e6);
        assertEq(core.jackpotBalance(), JACKPOT_CUT);
        assertEq(nvda.balanceOf(alice), EXPECTED_OUT);
        assertEq(uint8(_status(openingId)), uint8(StockPackz.OpeningStatus.Settled));
    }

    function test_burnAmount_tracksOraclePrice() public {
        _giveTier(alice, 100e18);
        feed.setAnswer(0.5e6); // token now $0.50 → $0.05 burn = 0.1 PACKZ

        uint256 packzBefore = packz.balanceOf(alice);
        _openAndFulfill(alice, 0, 999);
        assertEq(packzBefore - packz.balanceOf(alice), 0.1e18);
    }

    function test_staleOracle_fallsBackToSurcharge() public {
        _giveTier(alice, 100e18);
        feed.setUpdatedAt(block.timestamp);
        vm.warp(block.timestamp + 2 hours); // beyond 1h staleness window

        uint256 usdgBefore = usdg.balanceOf(alice);
        _openAndFulfill(alice, 0, 999);

        assertEq(usdg.balanceOf(alice), usdgBefore - 10.2e6); // no mis-burn
        assertEq(core.totalTokensBurned(), 0);
    }

    // -------------------------------------------------------- discounts

    function test_bronzeDiscount_fromTreasuryLegOnly() public {
        _giveTier(alice, 1_000e18); // Bronze: 2% discount = 0.20 USDG

        uint256 usdgBefore = usdg.balanceOf(alice);
        _openAndFulfill(alice, 0, 999);

        // 10.00 − 0.20 discount = 9.80 (burn covered separately in PACKZ).
        assertEq(usdg.balanceOf(alice), usdgBefore - 9.8e6);
        // Discount reduced the fee leg: 0.60 − 0.20 = 0.40.
        assertEq(core.treasuryAccrued(), 0.4e6);
        // Stock + jackpot legs untouched.
        assertEq(core.jackpotBalance(), JACKPOT_CUT);
        assertEq(nvda.balanceOf(alice), EXPECTED_OUT);
    }

    function test_diamondDiscount() public {
        _giveTier(alice, 250_000e18); // Diamond: 7% = 0.70 USDG (> fee leg 0.60 → capped)

        uint256 usdgBefore = usdg.balanceOf(alice);
        _openAndFulfill(alice, 0, 999);

        // Discount capped at the 0.60 fee leg → pays 9.40.
        assertEq(usdg.balanceOf(alice), usdgBefore - 9.4e6);
        assertEq(core.treasuryAccrued(), 0);
        assertEq(core.jackpotBalance(), JACKPOT_CUT);
    }

    // --------------------------------------------------------- subsidies

    function test_goldSubsidy_biggerStockLeg() public {
        _fundRewards(100e6);
        _giveTier(alice, 50_000e18); // Gold: +0.20 USDG subsidy

        uint256 openingId = _openAndFulfill(alice, 0, 999);

        assertEq(_stockLeg(openingId), 9.2e6);
        assertEq(_subsidyOf(openingId), 0.2e6);
        // 9.2 USDG × adapter price → 9.2e18 stock delivered.
        assertEq(nvda.balanceOf(alice), 9.2e18);
        assertEq(rewardsVault.availableFunds(), 100e6 - 0.2e6);
    }

    function test_subsidy_fallsBackWhenVaultEmpty() public {
        _giveTier(alice, 50_000e18); // Gold, but vault has 0

        uint256 openingId = _openAndFulfill(alice, 0, 999);

        assertEq(_stockLeg(openingId), 9e6); // base amount, no revert
        assertEq(_subsidyOf(openingId), 0);
        assertEq(nvda.balanceOf(alice), EXPECTED_OUT);
    }

    function test_subsidy_returnedToVaultOnRefund() public {
        _fundRewards(10e6);
        _giveTier(alice, 50_000e18);
        adapter.setFailSwaps(true);

        uint256 openingId = _openAndFulfill(alice, 0, 999);
        assertEq(rewardsVault.availableFunds(), 10e6 - 0.2e6);

        vm.prank(alice);
        core.refundOpening(openingId);

        // User got their cash back AND the vault got its subsidy back.
        assertEq(rewardsVault.availableFunds(), 10e6);
        assertEq(core.pendingLiabilities(), 0);
    }

    // --------------------------------------------------------------- XP

    function test_xp_awardedOnSettle_withMultiplier() public {
        _giveTier(alice, 10_000e18); // Silver: 1.25x

        _openAndFulfill(alice, 0, 999);

        assertEq(xp.lifetimeXP(alice), 125); // 100 × 1.25
        assertEq(xp.seasonXP(alice), 125);
    }

    function test_xp_notAwardedOnFailureOrRefund() public {
        adapter.setFailSwaps(true);
        uint256 openingId = _openAndFulfill(alice, 0, 999);
        assertEq(xp.lifetimeXP(alice), 0);

        vm.prank(alice);
        core.refundOpening(openingId);
        assertEq(xp.lifetimeXP(alice), 0);

        // Retry that settles DOES award.
        adapter.setFailSwaps(false);
        uint256 second = _openAndFulfill(alice, 0, 999);
        assertEq(uint8(_status(second)), uint8(StockPackz.OpeningStatus.Settled));
        assertEq(xp.lifetimeXP(alice), 100); // Basic 1.00x
    }

    function test_levelCurve() public {
        vm.startPrank(admin);
        xp.grantRole(xp.AWARDER_ROLE(), admin);
        assertEq(xp.levelOf(alice), 1);
        xp.awardXP(alice, 500, 10_000);
        assertEq(xp.levelOf(alice), 2);
        xp.awardXP(alice, 700, 10_000); // 1,200 total
        assertEq(xp.levelOf(alice), 3);
        vm.stopPrank();
    }

    function test_unlockRegistry() public {
        vm.startPrank(admin);
        uint256 frameId = unlockRegistry.registerUnlock(5, "profile-frame", "Collector Frame", "ipfs://frame");
        xp.grantRole(xp.AWARDER_ROLE(), admin);
        xp.awardXP(alice, 4_500, 10_000); // level 5
        vm.stopPrank();

        assertTrue(unlockRegistry.hasUnlock(alice, frameId));
        assertFalse(unlockRegistry.hasUnlock(bob, frameId));
        assertEq(unlockRegistry.unlocksOf(alice).length, 1);
    }

    // ------------------------------------------------------ founder pack

    function _createFounderPack() internal returns (uint256 packId) {
        StockPackz.PackConfig memory config = _packConfig();
        config.name = "AI Founder Pack";
        config.baseXP = 500;
        config.minTier = 3; // Gold+
        config.minLevel = 3;
        config.maxOpeningsPerWalletPerDay = 1;
        config.globalSupplyCap = 2;
        vm.prank(admin);
        packId = core.createPack(config, _aiPackOptions());
    }

    function _levelUp(address user, uint256 amount) internal {
        vm.startPrank(admin);
        xp.grantRole(xp.AWARDER_ROLE(), admin);
        xp.awardXP(user, amount, 10_000);
        vm.stopPrank();
    }

    function test_founderPack_tierGate() public {
        uint256 packId = _createFounderPack();
        _levelUp(alice, 2_000); // level ok, tier Basic

        vm.prank(alice);
        vm.expectRevert(StockPackz.TierTooLow.selector);
        core.openPack(packId, 100, 0);
    }

    function test_founderPack_levelGate() public {
        uint256 packId = _createFounderPack();
        _giveTier(alice, 50_000e18); // Gold, level 1

        vm.prank(alice);
        vm.expectRevert(StockPackz.LevelTooLow.selector);
        core.openPack(packId, 100, 0);
    }

    function test_founderPack_dailyAndSupplyCaps() public {
        uint256 packId = _createFounderPack();
        // Extra tokens so burns never dip the wallets below the Gold minimum.
        _giveTier(alice, 50_100e18);
        _giveTier(bob, 50_100e18);
        _levelUp(alice, 2_000);
        _levelUp(bob, 2_000);

        vm.prank(alice);
        core.openPack(packId, 100, 0);

        // Same wallet, same day → blocked.
        vm.prank(alice);
        vm.expectRevert(StockPackz.DailyLimitReached.selector);
        core.openPack(packId, 100, 0);

        // Next day is fine — but consumes the global cap (2).
        vm.warp(block.timestamp + 1 days);
        vm.prank(alice);
        core.openPack(packId, 100, 0);

        vm.prank(bob);
        vm.expectRevert(StockPackz.SupplyCapReached.selector);
        core.openPack(packId, 100, 0);
    }

    // ------------------------------------------------- odds are tier-free

    function test_oddsIdenticalForAllTiers() public {
        _giveTier(alice, 250_000e18); // Diamond
        // Same roll → same stock for Diamond alice and Basic bob.
        uint256 diamondOpen = _openAndFulfill(alice, 4_000, 999);
        uint256 basicOpen = _openAndFulfill(bob, 4_000, 999);
        assertEq(_selectedStock(diamondOpen), _selectedStock(basicOpen));
        assertEq(_selectedStock(diamondOpen), address(msft));
    }

    // --------------------------------------------- product works tokenless

    function test_baseProductWorksWithModulesUnset() public {
        vm.prank(admin);
        core.setUtilityModules(
            IMembershipTiers(address(0)),
            IPackRewardsVault(address(0)),
            IXPManager(address(0)),
            ITokenPriceAdapter(address(0)),
            IERC20(address(0))
        );

        uint256 usdgBefore = usdg.balanceOf(alice);
        uint256 openingId = _openAndFulfill(alice, 0, 999);

        assertEq(usdg.balanceOf(alice), usdgBefore - 10e6); // plain 10.00
        assertEq(uint8(_status(openingId)), uint8(StockPackz.OpeningStatus.Settled));
        assertEq(nvda.balanceOf(alice), EXPECTED_OUT);
    }

    function test_tierManager_defaults() public view {
        assertEq(tierManager.tierCount(), 5);
        assertEq(tierManager.tierOf(alice), 0);
    }
}
