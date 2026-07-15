// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Chainlink-style feed mock with settable answer and timestamp,
///         enabling stale-price and out-of-bounds tests.
contract MockPriceFeed {
    int256 public answer;
    uint256 public updatedAtTimestamp;
    uint8 public immutable feedDecimals;

    constructor(int256 _answer, uint8 _decimals) {
        answer = _answer;
        feedDecimals = _decimals;
        updatedAtTimestamp = block.timestamp;
    }

    function setAnswer(int256 _answer) external {
        answer = _answer;
        updatedAtTimestamp = block.timestamp;
    }

    function setUpdatedAt(uint256 timestamp) external {
        updatedAtTimestamp = timestamp;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (1, answer, updatedAtTimestamp, updatedAtTimestamp, 1);
    }

    function decimals() external view returns (uint8) {
        return feedDecimals;
    }
}
