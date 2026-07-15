// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Generic mintable ERC-20 used as mock USDG and mock tokenized stocks.
///         Supports an optional fee-on-transfer mode to test settlement-asset
///         rejection.
contract MockERC20 is ERC20 {
    uint8 private immutable _decimals;
    uint256 public feeOnTransferBps; // 0 = plain ERC-20

    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20(name_, symbol_) {
        _decimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setFeeOnTransferBps(uint256 bps) external {
        feeOnTransferBps = bps;
    }

    function _update(address from, address to, uint256 value) internal override {
        if (feeOnTransferBps > 0 && from != address(0) && to != address(0)) {
            uint256 fee = (value * feeOnTransferBps) / 10_000;
            super._update(from, address(0xdead), fee);
            super._update(from, to, value - fee);
        } else {
            super._update(from, to, value);
        }
    }
}
