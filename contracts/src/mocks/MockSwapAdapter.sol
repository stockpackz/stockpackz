// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IStockSwapAdapter} from "../interfaces/IStockSwapAdapter.sol";
import {MockERC20} from "./MockERC20.sol";

/// @notice Configurable swap adapter mock: settable prices per output token,
///         failure mode, shallow-liquidity mode, and delivery-shortfall mode.
contract MockSwapAdapter is IStockSwapAdapter {
    using SafeERC20 for IERC20;

    /// @dev price expressed as output units per 1e18 input units.
    mapping(address => uint256) public pricePerInputUnit;

    bool public failSwaps;
    bool public shallowLiquidity; // quotes return near-zero
    uint256 public deliveryShortfallBps; // delivers less than reported

    function setPrice(address outputToken, uint256 outPer1e18In) external {
        pricePerInputUnit[outputToken] = outPer1e18In;
    }

    function setFailSwaps(bool value) external {
        failSwaps = value;
    }

    function setShallowLiquidity(bool value) external {
        shallowLiquidity = value;
    }

    function setDeliveryShortfallBps(uint256 bps) external {
        deliveryShortfallBps = bps;
    }

    function quote(address, address outputToken, uint256 amountIn) public view returns (uint256) {
        if (shallowLiquidity) return 1;
        return (amountIn * pricePerInputUnit[outputToken]) / 1e18;
    }

    function swapExactInput(
        address inputToken,
        address outputToken,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        uint256 deadline
    ) external returns (uint256 amountOut) {
        require(!failSwaps, "MockSwapAdapter: swap failed");
        require(block.timestamp <= deadline, "MockSwapAdapter: expired");

        IERC20(inputToken).safeTransferFrom(msg.sender, address(this), amountIn);

        amountOut = quote(inputToken, outputToken, amountIn);
        require(amountOut >= minAmountOut, "MockSwapAdapter: slippage");

        uint256 delivered = amountOut - (amountOut * deliveryShortfallBps) / 10_000;
        MockERC20(outputToken).mint(recipient, delivered);
    }
}
