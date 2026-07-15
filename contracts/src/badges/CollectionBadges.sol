// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IPackRewardsVault} from "../interfaces/IPackRewardsVault.sol";

interface IPackCreditsGranter {
    function grantFor(address user, uint256 amount) external;
}

/// @title CollectionBadges
/// @notice Soulbound (non-transferable) achievement badges. A collection is
///         complete when the claiming wallet currently holds at least the
///         configured minimum balance of every required token — verified
///         on-chain at claim time. No locking or burning required.
///
///         Completing a collection can additionally reward bonus stock value
///         and free packs, delivered as USDG-backed pack credits funded by
///         the Pack Rewards Vault. Rewards are best-effort: if the vault
///         cannot fund them, the badge still mints and the skip is recorded —
///         a reward is never an unfunded promise and never blocks the badge.
contract CollectionBadges is ERC721, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant COLLECTION_MANAGER_ROLE = keccak256("COLLECTION_MANAGER_ROLE");

    struct Collection {
        uint256 id;
        string name;
        string description;
        string badgeURI;
        bool active;
        address[] requiredTokens;
        uint256[] minBalances;
        /// USDG value of bonus stock credits granted on completion (6 decimals).
        uint256 bonusStockUsdg;
        /// USDG value of free-pack credits granted on completion (6 decimals).
        uint256 freePackUsdg;
    }

    uint256 public nextCollectionId = 1;
    uint256 public nextBadgeId = 1;

    IERC20 public usdg;
    IPackRewardsVault public rewardsVault;
    IPackCreditsGranter public packCredits;

    mapping(uint256 => Collection) private _collections;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;
    mapping(uint256 => uint256) public badgeCollection; // badgeId → collectionId

    event CollectionCreated(uint256 indexed collectionId, string name);
    event CollectionStatusChanged(uint256 indexed collectionId, bool active);
    event CollectionBadgeClaimed(uint256 indexed collectionId, address indexed user, uint256 badgeId);
    event CompletionRewardGranted(uint256 indexed collectionId, address indexed user, uint256 creditAmount);
    event CompletionRewardSkipped(uint256 indexed collectionId, address indexed user, uint256 creditAmount);
    event RewardModulesSet(address usdg, address rewardsVault, address packCredits);

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
        uint256[] calldata minBalances,
        uint256 bonusStockUsdg,
        uint256 freePackUsdg
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
        c.bonusStockUsdg = bonusStockUsdg;
        c.freePackUsdg = freePackUsdg;

        emit CollectionCreated(collectionId, name);
    }

    /// @notice Wire the reward modules. Rewards are skipped while any module
    ///         is unset, so badges keep working standalone.
    function setRewardModules(IERC20 _usdg, IPackRewardsVault _rewardsVault, IPackCreditsGranter _packCredits)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        usdg = _usdg;
        rewardsVault = _rewardsVault;
        packCredits = _packCredits;
        emit RewardModulesSet(address(_usdg), address(_rewardsVault), address(_packCredits));
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

    function claimBadge(uint256 collectionId) external nonReentrant returns (uint256 badgeId) {
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

        _grantCompletionReward(c, msg.sender);
    }

    /// @dev Pull the reward's USDG from the rewards vault and convert it into
    ///      backed pack credits for `user`. Best-effort by design: an
    ///      underfunded vault or unset modules skip the reward (recorded via
    ///      event) without blocking the badge mint.
    function _grantCompletionReward(Collection storage c, address user) internal {
        uint256 total = c.bonusStockUsdg + c.freePackUsdg;
        if (total == 0) return;
        if (
            address(usdg) == address(0) || address(rewardsVault) == address(0) || address(packCredits) == address(0)
        ) {
            emit CompletionRewardSkipped(c.id, user, total);
            return;
        }
        if (!rewardsVault.pullFunding(total)) {
            emit CompletionRewardSkipped(c.id, user, total);
            return;
        }
        usdg.forceApprove(address(packCredits), total);
        packCredits.grantFor(user, total);
        emit CompletionRewardGranted(c.id, user, total);
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
