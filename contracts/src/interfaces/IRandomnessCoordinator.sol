// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IRandomnessCoordinator
/// @notice VRF-style verifiable randomness source. The coordinator later calls
///         `IRandomnessConsumer.rawFulfillRandomness` on the requester.
interface IRandomnessCoordinator {
    function requestRandomness(uint32 numWords) external returns (uint256 requestId);
}

interface IRandomnessConsumer {
    function rawFulfillRandomness(uint256 requestId, uint256[] calldata randomWords) external;
}
