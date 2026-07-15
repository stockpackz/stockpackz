// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IStockSwapAdapter} from "../interfaces/IStockSwapAdapter.sol";

/// @dev Minimal surface of the Uniswap v4 routing stack this adapter needs.
///      The concrete router (Universal Router / V4Router periphery) is wrapped
///      behind this interface so the adapter stays deployable against whatever
///      periphery Robinhood Chain ships.
interface IV4RouterLike {
    function swapExactTokensForTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        uint256 deadline
    ) external returns (uint256 amountOut);

    function quoteExactInput(address tokenIn, address tokenOut, uint256 amountIn)
        external
        view
        returns (uint256 amountOut);
}

/// @title UniswapV4Adapter
/// @notice Production adapter between StockPackz and Uniswap v4 pools.
///         Enforces a supported-token allowlist, per-pair enable flags, and a
///         per-pair liquidity threshold under which quotes are rejected.
///         The core contract depends only on IStockSwapAdapter, so this whole
///         contract is replaceable without touching pack logic.
contract UniswapV4Adapter is IStockSwapAdapter, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct PairConfig {
        bool enabled;
        uint256 minQuoteOut; // quotes below this are considered shallow liquidity
    }

    IV4RouterLike public immutable router;

    mapping(address => bool) public supportedToken;
    mapping(address => mapping(address => PairConfig)) public pairs;

    event TokenSupported(address indexed token, bool supported);
    event PairConfigured(address indexed tokenIn, address indexed tokenOut, bool enabled, uint256 minQuoteOut);

    error UnsupportedToken();
    error PairDisabled();
    error ShallowLiquidity();
    error Expired();

    constructor(IV4RouterLike _router, address admin) {
        router = _router;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function setTokenSupported(address token, bool supported) external onlyRole(DEFAULT_ADMIN_ROLE) {
        supportedToken[token] = supported;
        emit TokenSupported(token, supported);
    }

    function configurePair(address tokenIn, address tokenOut, bool enabled, uint256 minQuoteOut)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        pairs[tokenIn][tokenOut] = PairConfig({enabled: enabled, minQuoteOut: minQuoteOut});
        emit PairConfigured(tokenIn, tokenOut, enabled, minQuoteOut);
    }

    function quote(address inputToken, address outputToken, uint256 amountIn) external view returns (uint256) {
        _validatePair(inputToken, outputToken);
        uint256 out = router.quoteExactInput(inputToken, outputToken, amountIn);
        if (out < pairs[inputToken][outputToken].minQuoteOut) revert ShallowLiquidity();
        return out;
    }

    function swapExactInput(
        address inputToken,
        address outputToken,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountOut) {
        _validatePair(inputToken, outputToken);
        if (block.timestamp > deadline) revert Expired();

        IERC20(inputToken).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(inputToken).forceApprove(address(router), amountIn);
        amountOut = router.swapExactTokensForTokens(inputToken, outputToken, amountIn, minAmountOut, recipient, deadline);
        IERC20(inputToken).forceApprove(address(router), 0);
    }

    function _validatePair(address inputToken, address outputToken) internal view {
        if (!supportedToken[inputToken] || !supportedToken[outputToken]) revert UnsupportedToken();
        if (!pairs[inputToken][outputToken].enabled) revert PairDisabled();
    }
}
