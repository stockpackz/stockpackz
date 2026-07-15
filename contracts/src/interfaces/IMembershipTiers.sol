// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IMembershipTiers
/// @notice Optional membership layer. The pack product must fully function
///         when this module is unset — every consumer treats "no module" as
///         Basic tier with zero benefits.
interface IMembershipTiers {
    struct Benefits {
        uint8 tierId; // 0 = Basic
        uint16 discountBps; // pack price discount (treasury-leg only)
        uint16 xpMultiplierBps; // 10_000 = 1.00x
        uint256 stockSubsidyUsdg; // extra USDG toward the stock leg
        uint8 printerLevel; // Pack Printer level (Phase 2)
        bool founderAccess;
        bool blackAccess;
    }

    function tierOf(address user) external view returns (uint8);

    function benefitsOf(address user) external view returns (Benefits memory);
}
