// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IStockSwapAdapter
/// @notice Routing abstraction between StockPackz and any concrete swap venue
///         (Uniswap v4 today, anything else tomorrow). The core contract must
///         only ever depend on this interface.
interface IStockSwapAdapter {
    function quote(
        address inputToken,
        address outputToken,
        uint256 amountIn
    ) external view returns (uint256 amountOut);

    function swapExactInput(
        address inputToken,
        address outputToken,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        uint256 deadline
    ) external returns (uint256 amountOut);
}
