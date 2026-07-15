// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseTest} from "./Base.t.sol";
import {StockPackz} from "../src/StockPackz.sol";
import {PackCredits} from "../src/credits/PackCredits.sol";
import {StockPackzToken} from "../src/token/StockPackzToken.sol";
import {TaxVaultConverter} from "../src/vaults/TaxVaultConverter.sol";
import {CollectionBadges, IPackCreditsGranter} from "../src/badges/CollectionBadges.sol";
import {PackRewardsVault} from "../src/vaults/PackRewardsVault.sol";
import {IPackRewardsVault} from "../src/interfaces/IPackRewardsVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPackCredits} from "../src/interfaces/IPackCredits.sol";
import {IStockSwapAdapter} from "../src/interfaces/IStockSwapAdapter.sol";

contract CreditsTokenBadgesTest is BaseTest {
    PackCredits credits;
    StockPackzToken packz;
    TaxVaultConverter rewardsConverter;
    TaxVaultConverter jackpotConverter;
    CollectionBadges badges;

    function setUp() public override {
        super.setUp();

        // Deploy token with placeholder vaults, then wire converters in.
        packz = new StockPackzToken(1_000_000e18, admin, makeAddr("tmpRewards"), makeAddr("tmpJackpot"));
        credits = new PackCredits(IERC20(address(usdg)), IERC20(address(packz)), admin);

        rewardsConverter = new TaxVaultConverter(
            IERC20(address(packz)),
            IERC20(address(usdg)),
            IStockSwapAdapter(address(adapter)),
            address(credits),
            TaxVaultConverter.Destination.Credits,
            admin
        );
        jackpotConverter = new TaxVaultConverter(
            IERC20(address(packz)),
            IERC20(address(usdg)),
            IStockSwapAdapter(address(adapter)),
            address(core),
            TaxVaultConverter.Destination.Jackpot,
            admin
        );

        vm.startPrank(admin);
        packz.setVaults(address(rewardsConverter), address(jackpotConverter));
        credits.grantRole(credits.SPENDER_ROLE(), address(core));
        credits.grantRole(credits.FUNDER_ROLE(), address(rewardsConverter));
        core.setPackCredits(IPackCredits(address(credits)));

        // Tiers: Bronze 100, Silver 1k, Gold 10k, Platinum 100k PACKZ.
        PackCredits.Tier[] memory tiers = new PackCredits.Tier[](4);
        tiers[0] = PackCredits.Tier({minTokenBalance: 100e18, creditsPerEpoch: 1e6});
        tiers[1] = PackCredits.Tier({minTokenBalance: 1_000e18, creditsPerEpoch: 3e6});
        tiers[2] = PackCredits.Tier({minTokenBalance: 10_000e18, creditsPerEpoch: 10e6});
        tiers[3] = PackCredits.Tier({minTokenBalance: 100_000e18, creditsPerEpoch: 25e6});
        credits.setTiers(tiers);
        vm.stopPrank();

        // USDG is priced 1:1e6-per-1e18 through the adapter for PACKZ sales.
        adapter.setPrice(address(usdg), 1e6);
    }

    // -------------------------------------------------------- token tax

    function test_tax_splitFiftyFifty() public {
        vm.prank(admin);
        packz.transfer(alice, 100_000e18); // admin exempt: untaxed

        vm.prank(alice);
        packz.transfer(bob, 10_000e18); // taxed 1% = 100 PACKZ

        assertEq(packz.balanceOf(bob), 9_900e18);
        assertEq(packz.balanceOf(address(rewardsConverter)), 50e18);
        assertEq(packz.balanceOf(address(jackpotConverter)), 50e18);
    }

    function test_tax_exemptPathUntaxed() public {
        vm.prank(admin);
        packz.transfer(alice, 1_000e18);
        assertEq(packz.balanceOf(alice), 1_000e18);
    }

    function test_converter_fundsJackpot() public {
        vm.prank(admin);
        packz.transfer(alice, 100_000e18);
        vm.prank(alice);
        packz.transfer(bob, 10_000e18); // 50 PACKZ into jackpot converter

        // 50e18 PACKZ × 1e6/1e18 = 50 USDG out.
        vm.prank(admin);
        uint256 out = jackpotConverter.convert(50e18, 45e6, block.timestamp + 60);
        assertEq(out, 50e6);
        assertEq(core.jackpotBalance(), 50e6);
    }

    function test_converter_fundsCredits() public {
        vm.prank(admin);
        packz.transfer(alice, 100_000e18);
        vm.prank(alice);
        packz.transfer(bob, 10_000e18);

        vm.prank(admin);
        rewardsConverter.convert(50e18, 45e6, block.timestamp + 60);
        assertEq(credits.totalBacking(), 50e6);
    }

    function test_converter_keeperOnly() public {
        vm.prank(alice);
        vm.expectRevert();
        jackpotConverter.convert(1e18, 0, block.timestamp + 60);
    }

    // ------------------------------------------------------ pack credits

    function _fundCredits(uint256 amount) internal {
        usdg.mint(admin, amount);
        vm.startPrank(admin);
        usdg.approve(address(credits), amount);
        credits.fundCredits(amount);
        vm.stopPrank();
    }

    function test_claim_tierResolution() public {
        _fundCredits(1_000e6);
        vm.prank(admin);
        packz.transfer(alice, 10_000e18); // Gold

        vm.prank(alice);
        uint256 claimed = credits.claimCredits();
        assertEq(claimed, 10e6);
        assertEq(credits.creditBalance(alice), 10e6);
    }

    function test_claim_oncePerEpoch() public {
        _fundCredits(1_000e6);
        vm.prank(admin);
        packz.transfer(alice, 100e18); // Bronze

        vm.startPrank(alice);
        credits.claimCredits();
        vm.expectRevert(PackCredits.AlreadyClaimed.selector);
        credits.claimCredits();
        vm.stopPrank();

        // Next weekly epoch reopens claiming.
        vm.warp(block.timestamp + 1 weeks);
        vm.prank(alice);
        credits.claimCredits();
        assertEq(credits.creditBalance(alice), 2e6);
    }

    function test_claim_noTier_reverts() public {
        _fundCredits(1_000e6);
        vm.prank(alice);
        vm.expectRevert(PackCredits.NothingClaimable.selector);
        credits.claimCredits();
    }

    function test_claim_cappedByBacking() public {
        _fundCredits(4e6); // less than Gold's 10 USDG entitlement
        vm.prank(admin);
        packz.transfer(alice, 10_000e18);

        vm.prank(alice);
        uint256 claimed = credits.claimCredits();
        assertEq(claimed, 4e6); // capped, never unbacked
    }

    function test_spendCredits_towardOpening() public {
        _fundCredits(1_000e6);
        vm.prank(admin);
        packz.transfer(alice, 10_000e18);
        vm.prank(alice);
        credits.claimCredits(); // 10 USDG credits

        uint256 cashBefore = usdg.balanceOf(alice);
        vm.prank(alice);
        uint256 openingId = core.openPack(aiPackId, 100, 4e6);
        requestOf[openingId] = coordinator.nextRequestId() - 1;
        _fulfill(openingId, 0, 999);

        // Credits covered 4 USDG; user paid only 6 in cash.
        assertEq(usdg.balanceOf(alice), cashBefore - 6e6);
        assertEq(credits.creditBalance(alice), 6e6);
        // Full economics still funded: fee + jackpot present.
        assertEq(core.treasuryAccrued(), FEE);
        assertEq(core.jackpotBalance(), JACKPOT_CUT);
        assertEq(nvda.balanceOf(alice), EXPECTED_OUT);
    }

    function test_freePack_fullyFundedByCredits() public {
        _fundCredits(1_000e6);
        vm.prank(admin);
        packz.transfer(alice, 100_000e18); // Platinum: 25 USDG/epoch
        vm.prank(alice);
        credits.claimCredits();

        uint256 cashBefore = usdg.balanceOf(alice);
        vm.prank(alice);
        uint256 openingId = core.openPack(aiPackId, 100, 10e6); // fully free
        requestOf[openingId] = coordinator.nextRequestId() - 1;
        _fulfill(openingId, 0, 999);

        assertEq(usdg.balanceOf(alice), cashBefore); // zero cash spent
        assertEq(credits.creditBalance(alice), 15e6);
        // The rewards vault provided the complete 10 USDG settlement amount:
        assertEq(core.treasuryAccrued(), FEE);
        assertEq(core.jackpotBalance(), JACKPOT_CUT);
        assertEq(nvda.balanceOf(alice), EXPECTED_OUT);
    }

    function test_spend_requiresBalance() public {
        vm.prank(alice);
        vm.expectRevert(PackCredits.InsufficientCredits.selector);
        core.openPack(aiPackId, 100, 5e6);
    }

    function test_adminCannotWithdrawIssuedCreditBacking() public {
        _fundCredits(10e6);
        vm.prank(admin);
        packz.transfer(alice, 10_000e18);
        vm.prank(alice);
        credits.claimCredits(); // all 10 USDG now reserved

        vm.prank(admin);
        vm.expectRevert("exceeds unallocated");
        credits.withdrawUnallocated(admin, 1);
    }

    // ----------------------------------------------------------- badges

    function _createMag7() internal returns (uint256 collectionId) {
        badges = new CollectionBadges(admin);
        address[] memory tokens = new address[](3);
        tokens[0] = address(nvda);
        tokens[1] = address(msft);
        tokens[2] = address(googl);
        uint256[] memory mins = new uint256[](3);
        mins[0] = 1e18;
        mins[1] = 1e18;
        mins[2] = 1e18;
        vm.prank(admin);
        collectionId = badges.createCollection("Magnificent Seven", "Own them all", "ipfs://mag7", tokens, mins, 10e6, 10e6);
    }

    function _completeMag7(address user) internal {
        nvda.mint(user, 1e18);
        msft.mint(user, 1e18);
        googl.mint(user, 1e18);
    }

    function _wireRewardModules() internal returns (PackRewardsVault vault) {
        vault = new PackRewardsVault(IERC20(address(usdg)), admin);
        vm.startPrank(admin);
        badges.setRewardModules(
            IERC20(address(usdg)), IPackRewardsVault(address(vault)), IPackCreditsGranter(address(credits))
        );
        credits.grantRole(credits.GRANTER_ROLE(), address(badges));
        vault.grantRole(vault.SPENDER_ROLE(), address(badges));
        vm.stopPrank();
    }

    function test_badge_completionRewardGrantsBackedCredits() public {
        uint256 id = _createMag7();
        PackRewardsVault vault = _wireRewardModules();

        usdg.mint(admin, 100e6);
        vm.startPrank(admin);
        usdg.approve(address(vault), 100e6);
        vault.fundVault(100e6);
        vm.stopPrank();

        uint256 creditsBefore = usdg.balanceOf(address(credits));
        _completeMag7(alice);
        vm.prank(alice);
        badges.claimBadge(id);

        // 10 bonus stock + 10 free pack = 20 USDG of fully backed credits.
        assertEq(credits.creditBalance(alice), 20e6);
        assertEq(usdg.balanceOf(address(credits)) - creditsBefore, 20e6);
        assertEq(vault.availableFunds(), 80e6);
    }

    function test_badge_rewardSkippedWhenVaultEmpty_badgeStillMints() public {
        uint256 id = _createMag7();
        _wireRewardModules(); // vault deployed but never funded

        _completeMag7(alice);
        vm.prank(alice);
        uint256 badgeId = badges.claimBadge(id);

        assertEq(badges.ownerOf(badgeId), alice);
        assertEq(credits.creditBalance(alice), 0);
    }

    function test_badge_rewardSkippedWhenModulesUnset() public {
        uint256 id = _createMag7();
        _completeMag7(alice);
        vm.prank(alice);
        uint256 badgeId = badges.claimBadge(id);
        assertEq(badges.ownerOf(badgeId), alice);
        assertEq(credits.creditBalance(alice), 0);
    }

    function test_badge_claimRequiresAllBalances() public {
        uint256 id = _createMag7();

        nvda.mint(alice, 1e18);
        msft.mint(alice, 1e18);
        // GOOGL missing.
        vm.prank(alice);
        vm.expectRevert(CollectionBadges.RequirementsNotMet.selector);
        badges.claimBadge(id);

        googl.mint(alice, 1e18);
        vm.prank(alice);
        uint256 badgeId = badges.claimBadge(id);
        assertEq(badges.ownerOf(badgeId), alice);
        assertEq(badges.tokenURI(badgeId), "ipfs://mag7");
    }

    function test_badge_noDuplicateClaims() public {
        uint256 id = _createMag7();
        nvda.mint(alice, 1e18);
        msft.mint(alice, 1e18);
        googl.mint(alice, 1e18);

        vm.startPrank(alice);
        badges.claimBadge(id);
        vm.expectRevert(CollectionBadges.AlreadyClaimedBadge.selector);
        badges.claimBadge(id);
        vm.stopPrank();
    }

    function test_badge_soulbound() public {
        uint256 id = _createMag7();
        nvda.mint(alice, 1e18);
        msft.mint(alice, 1e18);
        googl.mint(alice, 1e18);
        vm.prank(alice);
        uint256 badgeId = badges.claimBadge(id);

        vm.prank(alice);
        vm.expectRevert(CollectionBadges.NonTransferable.selector);
        badges.transferFrom(alice, bob, badgeId);
    }

    function test_badge_inactiveCollection() public {
        uint256 id = _createMag7();
        vm.prank(admin);
        badges.setCollectionActive(id, false);
        nvda.mint(alice, 1e18);
        msft.mint(alice, 1e18);
        googl.mint(alice, 1e18);
        vm.prank(alice);
        vm.expectRevert(CollectionBadges.CollectionInactive.selector);
        badges.claimBadge(id);
    }
}
