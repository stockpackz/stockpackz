// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IPackRewardsVault
/// @notice USDG vault funding holder subsidies, key openings, and promotional
///         packs. A subsidy is a pull of real USDG — never a minted promise.
interface IPackRewardsVault {
    /// @notice Try to pull `amount` USDG to the caller (the core contract).
    ///         Returns false (without reverting) when the vault cannot fully
    ///         fund the request, so the opening can fall back to base terms.
    function pullFunding(uint256 amount) external returns (bool funded);

    function availableFunds() external view returns (uint256);
}
