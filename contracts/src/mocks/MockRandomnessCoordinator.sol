// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IRandomnessCoordinator, IRandomnessConsumer} from "../interfaces/IRandomnessCoordinator.sol";

/// @notice Manually-fulfilled randomness coordinator for deterministic tests.
///         Requests queue up; the test injects known words via `fulfill`,
///         which lets us test delayed randomness, replays, and exact rolls.
contract MockRandomnessCoordinator is IRandomnessCoordinator {
    uint256 public nextRequestId = 1;
    mapping(uint256 => address) public requester;

    function requestRandomness(uint32) external returns (uint256 requestId) {
        requestId = nextRequestId++;
        requester[requestId] = msg.sender;
    }

    function fulfill(uint256 requestId, uint256[] calldata words) external {
        IRandomnessConsumer(requester[requestId]).rawFulfillRandomness(requestId, words);
    }
}
