// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IPackCredits} from "../interfaces/IPackCredits.sol";

/// @title PackCredits
/// @notice Non-transferable, USDG-denominated account credits, funded by the
///         Pack Rewards Vault. Weekly epochs; users claim per-epoch credits
///         based on protocol-token holding tiers and spend them toward pack
///         openings. Every credit is fully backed by USDG held here, so a
///         promotional (even fully free) opening is always completely funded.
contract PackCredits is IPackCredits, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant SPENDER_ROLE = keccak256("SPENDER_ROLE"); // StockPackz core
    bytes32 public constant FUNDER_ROLE = keccak256("FUNDER_ROLE"); // rewards vault converter, admin

    uint256 public constant EPOCH_LENGTH = 1 weeks;

    struct Tier {
        uint256 minTokenBalance; // protocol-token balance required
        uint256 creditsPerEpoch; // USDG-denominated credits granted per epoch
    }

    IERC20 public immutable usdg;
    IERC20 public immutable protocolToken;

    /// @dev Ordered ascending by minTokenBalance; the highest satisfied tier wins.
    Tier[] public tiers;

    mapping(address => uint256) private _credits;
    mapping(address => mapping(uint256 => bool)) public claimedEpoch;

    /// @notice USDG deposited to back credits.
    uint256 public totalBacking;
    /// @notice Credits issued but not yet spent (liability).
    uint256 public totalCreditLiabilities;

    event CreditsFunded(address indexed from, uint256 amount, uint256 totalBacking);
    event CreditsClaimed(address indexed user, uint256 indexed epoch, uint256 amount);
    event CreditsSpent(address indexed user, address indexed spender, uint256 amount);
    event TiersUpdated(uint256 count);

    error NothingClaimable();
    error AlreadyClaimed();
    error InsufficientCredits();
    error InsufficientBacking();
    error FeeOnTransferNotSupported();

    constructor(IERC20 _usdg, IERC20 _protocolToken, address admin) {
        usdg = _usdg;
        protocolToken = _protocolToken;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(FUNDER_ROLE, admin);
    }

    // -------------------------------------------------------------- config

    function setTiers(Tier[] calldata newTiers) external onlyRole(DEFAULT_ADMIN_ROLE) {
        delete tiers;
        uint256 lastMin;
        for (uint256 i = 0; i < newTiers.length; i++) {
            require(newTiers[i].minTokenBalance > lastMin, "tiers must ascend");
            lastMin = newTiers[i].minTokenBalance;
            tiers.push(newTiers[i]);
        }
        emit TiersUpdated(newTiers.length);
    }

    function tierCount() external view returns (uint256) {
        return tiers.length;
    }

    // ------------------------------------------------------------- funding

    /// @notice Deposit USDG backing (from the rewards-vault converter or admin).
    function fundCredits(uint256 amount) external onlyRole(FUNDER_ROLE) nonReentrant {
        uint256 beforeBal = usdg.balanceOf(address(this));
        usdg.safeTransferFrom(msg.sender, address(this), amount);
        if (usdg.balanceOf(address(this)) - beforeBal != amount) revert FeeOnTransferNotSupported();
        totalBacking += amount;
        emit CreditsFunded(msg.sender, amount, totalBacking);
    }

    // ------------------------------------------------------------- claiming

    function currentEpoch() public view returns (uint256) {
        return block.timestamp / EPOCH_LENGTH;
    }

    /// @notice Credits claimable by `user` this epoch (0 if already claimed,
    ///         no tier reached, or backing exhausted).
    function claimableCredits(address user) public view returns (uint256) {
        if (claimedEpoch[user][currentEpoch()]) return 0;
        uint256 entitled = _tierCredits(protocolToken.balanceOf(user));
        uint256 unallocated = totalBacking - totalCreditLiabilities;
        return entitled > unallocated ? unallocated : entitled;
    }

    /// @notice Claim this epoch's credits. Holdings are verified on-chain at
    ///         claim time (MVP snapshot). One claim per epoch per wallet.
    function claimCredits() external nonReentrant returns (uint256 amount) {
        uint256 epoch = currentEpoch();
        if (claimedEpoch[msg.sender][epoch]) revert AlreadyClaimed();

        amount = claimableCredits(msg.sender);
        if (amount == 0) revert NothingClaimable();

        claimedEpoch[msg.sender][epoch] = true;
        _credits[msg.sender] += amount;
        totalCreditLiabilities += amount;

        emit CreditsClaimed(msg.sender, epoch, amount);
    }

    // ------------------------------------------------------------- spending

    /// @inheritdoc IPackCredits
    function spendFor(address user, uint256 amount) external onlyRole(SPENDER_ROLE) nonReentrant {
        if (_credits[user] < amount) revert InsufficientCredits();
        if (totalBacking < amount) revert InsufficientBacking();

        _credits[user] -= amount;
        totalCreditLiabilities -= amount;
        totalBacking -= amount;

        // Back the opening 1:1 — the core contract receives real USDG so the
        // guaranteed stock purchase and jackpot contribution stay fully funded.
        usdg.safeTransfer(msg.sender, amount);

        emit CreditsSpent(user, msg.sender, amount);
    }

    function creditBalance(address user) external view returns (uint256) {
        return _credits[user];
    }

    // ---------------------------------------------------------------- admin

    /// @notice Admin can only withdraw backing that is NOT reserved for
    ///         already-issued credits.
    function withdrawUnallocated(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        uint256 unallocated = totalBacking - totalCreditLiabilities;
        require(amount <= unallocated, "exceeds unallocated");
        totalBacking -= amount;
        usdg.safeTransfer(to, amount);
    }

    // ------------------------------------------------------------- internal

    function _tierCredits(uint256 balance) internal view returns (uint256) {
        uint256 credits;
        for (uint256 i = 0; i < tiers.length; i++) {
            if (balance >= tiers[i].minTokenBalance) {
                credits = tiers[i].creditsPerEpoch;
            }
        }
        return credits;
    }
}
