// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title StockPackzToken
/// @notice Optional protocol/membership token. Users never need it to open
///         normal packs and core settlement never depends on its price.
///
///         1% transfer tax, split 50/50:
///           - Pack Rewards Vault   (funds Pack Credits after conversion)
///           - Jackpot Support Vault (supplements the USDG jackpot after conversion)
///
///         No marketing tax, no dev tax, no reflections, no auto-liquidity,
///         no buyback, and — critically — no swap-on-transfer: taxed tokens
///         simply accumulate in the vaults until a keeper converts them.
contract StockPackzToken is ERC20, AccessControl {
    uint256 public constant TAX_BPS = 100; // 1%
    uint256 public constant BPS = 10_000;

    address public packRewardsVault;
    address public jackpotSupportVault;

    /// @notice Addresses exempt from tax (vaults, core contract, converters).
    mapping(address => bool) public taxExempt;

    event VaultsUpdated(address rewardsVault, address jackpotSupportVault);
    event TaxExemptionSet(address indexed account, bool exempt);
    event TaxCollected(address indexed from, address indexed to, uint256 rewardsShare, uint256 jackpotShare);

    error ZeroAddress();

    constructor(uint256 initialSupply, address admin, address _rewardsVault, address _jackpotSupportVault)
        ERC20("StockPackz", "PACKZ")
    {
        if (_rewardsVault == address(0) || _jackpotSupportVault == address(0)) revert ZeroAddress();
        packRewardsVault = _rewardsVault;
        jackpotSupportVault = _jackpotSupportVault;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        taxExempt[admin] = true;
        taxExempt[_rewardsVault] = true;
        taxExempt[_jackpotSupportVault] = true;
        _mint(admin, initialSupply);
    }

    function setVaults(address _rewardsVault, address _jackpotSupportVault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_rewardsVault == address(0) || _jackpotSupportVault == address(0)) revert ZeroAddress();
        packRewardsVault = _rewardsVault;
        jackpotSupportVault = _jackpotSupportVault;
        taxExempt[_rewardsVault] = true;
        taxExempt[_jackpotSupportVault] = true;
        emit VaultsUpdated(_rewardsVault, _jackpotSupportVault);
    }

    function setTaxExempt(address account, bool exempt) external onlyRole(DEFAULT_ADMIN_ROLE) {
        taxExempt[account] = exempt;
        emit TaxExemptionSet(account, exempt);
    }

    function _update(address from, address to, uint256 value) internal override {
        // Mint/burn and exempt paths transfer untaxed.
        if (from == address(0) || to == address(0) || taxExempt[from] || taxExempt[to]) {
            super._update(from, to, value);
            return;
        }

        uint256 tax = (value * TAX_BPS) / BPS;
        if (tax == 0) {
            super._update(from, to, value);
            return;
        }

        uint256 rewardsShare = tax / 2;
        uint256 jackpotShare = tax - rewardsShare;

        super._update(from, packRewardsVault, rewardsShare);
        super._update(from, jackpotSupportVault, jackpotShare);
        super._update(from, to, value - tax);

        emit TaxCollected(from, to, rewardsShare, jackpotShare);
    }
}
