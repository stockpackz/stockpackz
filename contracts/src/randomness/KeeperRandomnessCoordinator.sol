// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IRandomnessCoordinator, IRandomnessConsumer} from "../interfaces/IRandomnessCoordinator.sol";

/// @title KeeperRandomnessCoordinator
/// @notice MVP randomness source: an authorized keeper observes
///         `RandomnessRequested` events and fulfills each request exactly
///         once. Fulfillment mixes the keeper's entropy with unpredictable
///         chain state so the keeper cannot fully dictate the outcome, and
///         every input is emitted for public auditability.
///
///         Trust model (documented in SECURITY.md): the keeper is operated
///         by the protocol. It cannot steal funds and cannot fulfill twice,
///         but a malicious keeper could grind its entropy contribution.
///         Migration path: swap in a Chainlink VRF coordinator via
///         StockPackz.setCoordinator once VRF is live on Robinhood Chain.
contract KeeperRandomnessCoordinator is IRandomnessCoordinator, AccessControl, ReentrancyGuard {
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    bytes32 public constant CONSUMER_ROLE = keccak256("CONSUMER_ROLE");

    struct Request {
        address consumer;
        uint32 numWords;
        uint64 requestedAt;
        uint64 requestBlock;
        bool fulfilled;
    }

    uint256 public nextRequestId = 1;
    mapping(uint256 => Request) public requests;

    event RandomnessRequested(uint256 indexed requestId, address indexed consumer, uint32 numWords);
    event RandomnessFulfilled(uint256 indexed requestId, bytes32 keeperEntropy, bytes32 mixHash);

    error OnlyConsumer();
    error UnknownRequest();
    error AlreadyFulfilled();
    error SameBlock();

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @inheritdoc IRandomnessCoordinator
    function requestRandomness(uint32 numWords) external onlyRole(CONSUMER_ROLE) returns (uint256 requestId) {
        requestId = nextRequestId++;
        requests[requestId] = Request({
            consumer: msg.sender,
            numWords: numWords,
            requestedAt: uint64(block.timestamp),
            requestBlock: uint64(block.number),
            fulfilled: false
        });
        emit RandomnessRequested(requestId, msg.sender, numWords);
    }

    /// @notice Fulfill a pending request. Must be a later block than the
    ///         request so the keeper cannot pre-compute the mix in-flight.
    function fulfill(uint256 requestId, bytes32 keeperEntropy) external onlyRole(KEEPER_ROLE) nonReentrant {
        Request storage req = requests[requestId];
        if (req.consumer == address(0)) revert UnknownRequest();
        if (req.fulfilled) revert AlreadyFulfilled();
        if (block.number <= req.requestBlock) revert SameBlock();
        req.fulfilled = true;

        bytes32 mixHash = keccak256(
            abi.encode(keeperEntropy, blockhash(block.number - 1), block.prevrandao, requestId, req.consumer)
        );

        uint256[] memory words = new uint256[](req.numWords);
        for (uint256 i = 0; i < req.numWords; i++) {
            words[i] = uint256(keccak256(abi.encode(mixHash, i)));
        }

        emit RandomnessFulfilled(requestId, keeperEntropy, mixHash);
        IRandomnessConsumer(req.consumer).rawFulfillRandomness(requestId, words);
    }
}
