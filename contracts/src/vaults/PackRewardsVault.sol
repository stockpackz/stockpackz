// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IPackRewardsVault} from "../interfaces/IPackRewardsVault.sol";

/// @title PackRewardsVault
/// @notice USDG vault that funds holder stock subsidies, Pack Key openings,
///         Founder/Black packs, and promotional/seasonal rewards. A benefit
///         only exists if this vault can pay for it — `pullFunding` either
///         transfers real USDG or returns false so callers fall back to base
///         terms. Never a minted promise.
contract PackRewardsVault is IPackRewardsVault, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant SPENDER_ROLE = keccak256("SPENDER_ROLE"); // StockPackz core

    IERC20 public immutable usdg;

    event VaultFunded(address indexed from, uint256 amount);
    event FundingPulled(address indexed spender, uint256 amount);
    event AdminWithdrawal(address indexed to, uint256 amount);

    error FeeOnTransferNotSupported();

    constructor(IERC20 _usdg, address admin) {
        usdg = _usdg;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Anyone may fund the vault (converters, treasury, partners).
    function fundCredits(uint256 amount) external nonReentrant {
        _fund(amount);
    }

    /// @notice Alias so the vault is also usable as a TaxVaultConverter sink.
    function fundVault(uint256 amount) external nonReentrant {
        _fund(amount);
    }

    function _fund(uint256 amount) internal {
        uint256 beforeBal = usdg.balanceOf(address(this));
        usdg.safeTransferFrom(msg.sender, address(this), amount);
        if (usdg.balanceOf(address(this)) - beforeBal != amount) revert FeeOnTransferNotSupported();
        emit VaultFunded(msg.sender, amount);
    }

    /// @inheritdoc IPackRewardsVault
    function pullFunding(uint256 amount) external onlyRole(SPENDER_ROLE) nonReentrant returns (bool) {
        if (usdg.balanceOf(address(this)) < amount) return false;
        usdg.safeTransfer(msg.sender, amount);
        emit FundingPulled(msg.sender, amount);
        return true;
    }

    /// @inheritdoc IPackRewardsVault
    function availableFunds() external view returns (uint256) {
        return usdg.balanceOf(address(this));
    }

    function withdraw(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        usdg.safeTransfer(to, amount);
        emit AdminWithdrawal(to, amount);
    }
}
