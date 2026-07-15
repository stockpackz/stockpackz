// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

import {ITokenPriceAdapter} from "../interfaces/ITokenPriceAdapter.sol";

/// @dev Chainlink-style price feed surface.
interface IPriceFeed {
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);

    function decimals() external view returns (uint8);
}

/// @title OracleTokenPriceAdapter
/// @notice USD price of STOCKPACKZ from a configured oracle feed, with
///         staleness and sanity bounds. Reverts on unusable prices so the
///         core can fall back (Mode B surcharge) instead of mis-burning.
contract OracleTokenPriceAdapter is ITokenPriceAdapter, AccessControl {
    IPriceFeed public feed;
    uint256 public maxStaleness = 1 hours;
    /// @dev Sanity bounds on the token price in USD (6 decimals).
    uint256 public minPriceUsd = 1; // > 0
    uint256 public maxPriceUsd = 1_000e6;

    event FeedUpdated(address feed);
    event BoundsUpdated(uint256 maxStaleness, uint256 minPriceUsd, uint256 maxPriceUsd);

    error StalePrice();
    error PriceOutOfBounds();

    constructor(IPriceFeed _feed, address admin) {
        feed = _feed;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function setFeed(IPriceFeed _feed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        feed = _feed;
        emit FeedUpdated(address(_feed));
    }

    function setBounds(uint256 _maxStaleness, uint256 _minPriceUsd, uint256 _maxPriceUsd)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        maxStaleness = _maxStaleness;
        minPriceUsd = _minPriceUsd;
        maxPriceUsd = _maxPriceUsd;
        emit BoundsUpdated(_maxStaleness, _minPriceUsd, _maxPriceUsd);
    }

    /// @notice Current token price in USD, normalized to 6 decimals.
    function tokenPriceUsd() public view returns (uint256 price) {
        (, int256 answer,, uint256 updatedAt,) = feed.latestRoundData();
        if (block.timestamp - updatedAt > maxStaleness) revert StalePrice();
        if (answer <= 0) revert PriceOutOfBounds();

        uint8 feedDecimals = feed.decimals();
        price = uint256(answer);
        if (feedDecimals > 6) price /= 10 ** (feedDecimals - 6);
        else if (feedDecimals < 6) price *= 10 ** (6 - feedDecimals);

        if (price < minPriceUsd || price > maxPriceUsd) revert PriceOutOfBounds();
    }

    /// @inheritdoc ITokenPriceAdapter
    function tokenAmountForUsd(uint256 usdAmount) external view returns (uint256) {
        // usdAmount (6dp) / price (6dp per token) → tokens (18dp)
        return (usdAmount * 1e18) / tokenPriceUsd();
    }
}
