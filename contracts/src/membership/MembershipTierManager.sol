// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

import {IMembershipTiers} from "../interfaces/IMembershipTiers.sol";

/// @title MembershipTierManager
/// @notice Configurable holder tiers. Immediate benefits (discount, subsidy,
///         XP multiplier) use the wallet balance at the time of opening;
///         time-based rewards (Pack Printer, Phase 2) will require staking
///         with checkpoints instead of instant snapshots.
///
///         Every threshold, discount, multiplier, and access flag is
///         admin-configurable. Tier 0 (Basic) always exists with zero
///         benefits and no minimum.
contract MembershipTierManager is IMembershipTiers, AccessControl {
    struct TierConfig {
        string name;
        uint256 minTokenBalance;
        uint16 discountBps;
        uint16 xpMultiplierBps;
        uint256 stockSubsidyUsdg;
        uint8 printerLevel;
        bool founderAccess;
        bool blackAccess;
    }

    IERC20 public immutable protocolToken;

    /// @dev Index 0 = Basic. Ascending by minTokenBalance.
    TierConfig[] public tiers;

    event TiersConfigured(uint256 count);

    error TiersMustAscend();
    error BasicMustBeFree();

    constructor(IERC20 _protocolToken, address admin) {
        protocolToken = _protocolToken;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        // Default configuration per product spec (all replaceable).
        tiers.push(TierConfig("Basic", 0, 0, 10_000, 0, 0, false, false));
        tiers.push(TierConfig("Bronze", 1_000e18, 200, 11_000, 0.05e6, 1, false, false));
        tiers.push(TierConfig("Silver", 10_000e18, 300, 12_500, 0.10e6, 2, false, false));
        tiers.push(TierConfig("Gold", 50_000e18, 500, 15_000, 0.20e6, 3, true, false));
        tiers.push(TierConfig("Diamond", 250_000e18, 700, 20_000, 0.30e6, 4, true, true));
    }

    function setTiers(TierConfig[] calldata newTiers) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newTiers.length == 0 || newTiers[0].minTokenBalance != 0) revert BasicMustBeFree();
        delete tiers;
        uint256 lastMin;
        for (uint256 i = 0; i < newTiers.length; i++) {
            if (i > 0 && newTiers[i].minTokenBalance <= lastMin) revert TiersMustAscend();
            lastMin = newTiers[i].minTokenBalance;
            tiers.push(newTiers[i]);
        }
        emit TiersConfigured(newTiers.length);
    }

    function tierCount() external view returns (uint256) {
        return tiers.length;
    }

    /// @inheritdoc IMembershipTiers
    function tierOf(address user) public view returns (uint8 tierId) {
        uint256 balance = protocolToken.balanceOf(user);
        for (uint256 i = tiers.length; i > 0; i--) {
            if (balance >= tiers[i - 1].minTokenBalance) return uint8(i - 1);
        }
        return 0;
    }

    /// @inheritdoc IMembershipTiers
    function benefitsOf(address user) external view returns (Benefits memory benefits) {
        uint8 tierId = tierOf(user);
        TierConfig storage tier = tiers[tierId];
        benefits = Benefits({
            tierId: tierId,
            discountBps: tier.discountBps,
            xpMultiplierBps: tier.xpMultiplierBps,
            stockSubsidyUsdg: tier.stockSubsidyUsdg,
            printerLevel: tier.printerLevel,
            founderAccess: tier.founderAccess,
            blackAccess: tier.blackAccess
        });
    }
}
