// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

import {IXPManager} from "../interfaces/IXPManager.sol";

/// @title XPManager
/// @notice Pack XP + level progression. XP is only awardable by contracts
///         holding AWARDER_ROLE (the StockPackz core), which calls it exactly
///         once per settled opening — failed and refunded openings never
///         reach the award path.
///
///         The level curve is a configurable threshold table, not a formula,
///         so any progression shape is possible. Season/prestige fields are
///         stored now (Phase 2/3 activate them).
contract XPManager is IXPManager, AccessControl {
    bytes32 public constant AWARDER_ROLE = keccak256("AWARDER_ROLE");
    bytes32 public constant SEASON_ROLE = keccak256("SEASON_ROLE");

    struct Profile {
        uint256 lifetimeXP;
        uint256 seasonXP;
        uint32 seasonId;
        uint16 prestigeCount;
        uint16 dailyStreak;
        uint64 lastActivityAt;
    }

    /// @dev xpThresholds[i] = lifetime XP required for level i+1.
    ///      Level 1 requires 0 XP (index 0 must be 0).
    uint256[] public xpThresholds;

    uint32 public currentSeasonId = 1;

    mapping(address => Profile) public profiles;

    event XPAwarded(address indexed user, uint256 baseXP, uint16 multiplierBps, uint256 finalXP);
    event LevelCurveUpdated(uint256 levels);
    event SeasonAdvanced(uint32 seasonId);

    error CurveMustStartAtZero();
    error CurveMustAscend();

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        // Default curve per spec (levels 1,2,3,10,25,50,100 anchors,
        // gap levels interpolated by config later — table is replaceable).
        xpThresholds.push(0); // L1
        xpThresholds.push(500); // L2
        xpThresholds.push(1_200); // L3
        xpThresholds.push(2_500); // L4
        xpThresholds.push(4_500); // L5
        xpThresholds.push(7_000); // L6
        xpThresholds.push(9_500); // L7
        xpThresholds.push(11_500); // L8
        xpThresholds.push(13_000); // L9
        xpThresholds.push(15_000); // L10
        xpThresholds.push(75_000); // L11 → spec's L25 anchor compressed for MVP
        xpThresholds.push(250_000); // L12 → L50 anchor
        xpThresholds.push(1_000_000); // L13 → L100 anchor
    }

    // -------------------------------------------------------------- config

    function setLevelCurve(uint256[] calldata thresholds) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (thresholds.length == 0 || thresholds[0] != 0) revert CurveMustStartAtZero();
        for (uint256 i = 1; i < thresholds.length; i++) {
            if (thresholds[i] <= thresholds[i - 1]) revert CurveMustAscend();
        }
        xpThresholds = thresholds;
        emit LevelCurveUpdated(thresholds.length);
    }

    function advanceSeason() external onlyRole(SEASON_ROLE) {
        currentSeasonId += 1;
        emit SeasonAdvanced(currentSeasonId);
    }

    // -------------------------------------------------------------- awards

    /// @inheritdoc IXPManager
    function awardXP(address user, uint256 baseXP, uint16 multiplierBps) external onlyRole(AWARDER_ROLE) {
        uint256 finalXP = (baseXP * multiplierBps) / 10_000;
        Profile storage profile = profiles[user];

        // Lifetime XP never resets; season XP resets when the season changes.
        if (profile.seasonId != currentSeasonId) {
            profile.seasonId = currentSeasonId;
            profile.seasonXP = 0;
        }

        // Daily streak: consecutive-day openings extend it, gaps reset it.
        uint64 today = uint64(block.timestamp / 1 days);
        uint64 lastDay = profile.lastActivityAt / 1 days;
        if (profile.lastActivityAt == 0 || today > lastDay + 1) {
            profile.dailyStreak = 1;
        } else if (today == lastDay + 1) {
            profile.dailyStreak += 1;
        }
        profile.lastActivityAt = uint64(block.timestamp);

        profile.lifetimeXP += finalXP;
        profile.seasonXP += finalXP;

        emit XPAwarded(user, baseXP, multiplierBps, finalXP);
    }

    // --------------------------------------------------------------- views

    /// @inheritdoc IXPManager
    function levelOf(address user) public view returns (uint256 level) {
        uint256 xp = profiles[user].lifetimeXP;
        uint256 n = xpThresholds.length;
        for (uint256 i = n; i > 0; i--) {
            if (xp >= xpThresholds[i - 1]) return i;
        }
        return 1;
    }

    /// @inheritdoc IXPManager
    function lifetimeXP(address user) external view returns (uint256) {
        return profiles[user].lifetimeXP;
    }

    function seasonXP(address user) external view returns (uint256) {
        Profile storage profile = profiles[user];
        return profile.seasonId == currentSeasonId ? profile.seasonXP : 0;
    }

    function levelCount() external view returns (uint256) {
        return xpThresholds.length;
    }
}
