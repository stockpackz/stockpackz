// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title ITokenPriceAdapter
/// @notice Trusted USD price source for the STOCKPACKZ token, used to derive
///         the per-opening burn quantity. Never hardcode token amounts.
interface ITokenPriceAdapter {
    /// @notice Token amount (18 decimals) currently worth `usdAmount`
    ///         (6 decimals, USDG-denominated). MUST revert on stale or
    ///         out-of-bounds prices so callers can fall back safely.
    function tokenAmountForUsd(uint256 usdAmount) external view returns (uint256);
}
