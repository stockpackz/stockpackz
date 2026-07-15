// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IXPManager
/// @notice Progression ledger. XP is only awarded by authorized contracts
///         after a stock purchase successfully settles.
interface IXPManager {
    function awardXP(address user, uint256 baseXP, uint16 multiplierBps) external;

    function levelOf(address user) external view returns (uint256);

    function lifetimeXP(address user) external view returns (uint256);
}
