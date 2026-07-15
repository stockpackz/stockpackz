// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IPackCredits
/// @notice Non-transferable, USDG-denominated credit ledger. Credits can only
///         be spent by the StockPackz core contract toward pack openings, and
///         every spend is backed 1:1 by USDG transferred to the core contract.
interface IPackCredits {
    /// @notice Spend `amount` of `user`'s credits toward a pack opening.
    ///         Must transfer `amount` USDG to `msg.sender` (the core contract)
    ///         so the opening is always fully funded. Reverts if the user's
    ///         balance or the vault backing is insufficient.
    function spendFor(address user, uint256 amount) external;

    function creditBalance(address user) external view returns (uint256);
}
