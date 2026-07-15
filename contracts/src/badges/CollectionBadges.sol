// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title CollectionBadges
/// @notice Soulbound (non-transferable) achievement badges. A collection is
///         complete when the claiming wallet currently holds at least the
///         configured minimum balance of every required token — verified
///         on-chain at claim time. No locking or burning required.
contract CollectionBadges is ERC721, AccessControl {
    bytes32 public constant COLLECTION_MANAGER_ROLE = keccak256("COLLECTION_MANAGER_ROLE");

    struct Collection {
        uint256 id;
        string name;
        string description;
        string badgeURI;
        bool active;
        address[] requiredTokens;
        uint256[] minBalances;
    }

    uint256 public nextCollectionId = 1;
    uint256 public nextBadgeId = 1;

    mapping(uint256 => Collection) private _collections;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;
    mapping(uint256 => uint256) public badgeCollection; // badgeId → collectionId

    event CollectionCreated(uint256 indexed collectionId, string name);
    event CollectionStatusChanged(uint256 indexed collectionId, bool active);
    event CollectionBadgeClaimed(uint256 indexed collectionId, address indexed user, uint256 badgeId);

    error CollectionNotFound();
    error CollectionInactive();
    error LengthMismatch();
    error AlreadyClaimedBadge();
    error RequirementsNotMet();
    error NonTransferable();

    constructor(address admin) ERC721("StockPackz Collection Badges", "PACKZ-BADGE") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COLLECTION_MANAGER_ROLE, admin);
    }

    // -------------------------------------------------------------- manage

    function createCollection(
        string calldata name,
        string calldata description,
        string calldata badgeURI,
        address[] calldata requiredTokens,
        uint256[] calldata minBalances
    ) external onlyRole(COLLECTION_MANAGER_ROLE) returns (uint256 collectionId) {
        if (requiredTokens.length == 0 || requiredTokens.length != minBalances.length) revert LengthMismatch();

        collectionId = nextCollectionId++;
        Collection storage c = _collections[collectionId];
        c.id = collectionId;
        c.name = name;
        c.description = description;
        c.badgeURI = badgeURI;
        c.active = true;
        c.requiredTokens = requiredTokens;
        c.minBalances = minBalances;

        emit CollectionCreated(collectionId, name);
    }

    function setCollectionActive(uint256 collectionId, bool active) external onlyRole(COLLECTION_MANAGER_ROLE) {
        if (_collections[collectionId].id == 0) revert CollectionNotFound();
        _collections[collectionId].active = active;
        emit CollectionStatusChanged(collectionId, active);
    }

    function getCollection(uint256 collectionId) external view returns (Collection memory) {
        return _collections[collectionId];
    }

    // ---------------------------------------------------------------- claim

    /// @notice True when `user` currently satisfies every requirement.
    function isComplete(uint256 collectionId, address user) public view returns (bool) {
        Collection storage c = _collections[collectionId];
        if (c.id == 0) return false;
        for (uint256 i = 0; i < c.requiredTokens.length; i++) {
            if (IERC20(c.requiredTokens[i]).balanceOf(user) < c.minBalances[i]) return false;
        }
        return true;
    }

    function claimBadge(uint256 collectionId) external returns (uint256 badgeId) {
        Collection storage c = _collections[collectionId];
        if (c.id == 0) revert CollectionNotFound();
        if (!c.active) revert CollectionInactive();
        if (hasClaimed[collectionId][msg.sender]) revert AlreadyClaimedBadge();
        if (!isComplete(collectionId, msg.sender)) revert RequirementsNotMet();

        hasClaimed[collectionId][msg.sender] = true;
        badgeId = nextBadgeId++;
        badgeCollection[badgeId] = collectionId;
        _safeMint(msg.sender, badgeId);

        emit CollectionBadgeClaimed(collectionId, msg.sender, badgeId);
    }

    function tokenURI(uint256 badgeId) public view override returns (string memory) {
        _requireOwned(badgeId);
        return _collections[badgeCollection[badgeId]].badgeURI;
    }

    // ----------------------------------------------------------- soulbound

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        // Only mint (from == 0) is allowed; transfers and burns revert.
        if (from != address(0)) revert NonTransferable();
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
