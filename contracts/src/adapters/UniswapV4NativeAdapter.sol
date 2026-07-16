// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

import {IStockSwapAdapter} from "../interfaces/IStockSwapAdapter.sol";
import {
    IPoolManager,
    IUnlockCallback,
    IStateView,
    PoolKey,
    SwapParams,
    BalanceDelta,
    Currency
} from "../interfaces/IUniswapV4.sol";

/// @title UniswapV4NativeAdapter
/// @notice Production swap adapter that executes directly against the
///         Uniswap v4 PoolManager on Robinhood Chain. One configured pool
///         per (tokenIn, tokenOut) pair; hookless pools only.
///
///         Quotes are derived from the pool's current sqrtPriceX96 (spot,
///         fee-adjusted). For pack-sized notionals this tracks execution
///         closely; the caller's minAmountOut still bounds the actual fill.
contract UniswapV4NativeAdapter is IStockSwapAdapter, IUnlockCallback, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct PairConfig {
        PoolKey key;
        bool enabled;
        uint256 minQuoteOut; // quotes below this are considered shallow liquidity
    }

    // v4-core TickMath bounds.
    uint160 internal constant MIN_SQRT_PRICE = 4295128739;
    uint160 internal constant MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342;

    IPoolManager public immutable manager;
    IStateView public immutable stateView;

    mapping(address => mapping(address => PairConfig)) private _pairs;

    event PairConfigured(
        address indexed tokenIn, address indexed tokenOut, uint24 fee, int24 tickSpacing, uint256 minQuoteOut
    );
    event PairDisabledByAdmin(address indexed tokenIn, address indexed tokenOut);

    error PairNotConfigured();
    error ShallowLiquidity();
    error Expired();
    error InsufficientOutput();
    error NotPoolManager();
    error HooksNotSupported();

    constructor(IPoolManager _manager, IStateView _stateView, address admin) {
        manager = _manager;
        stateView = _stateView;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // ------------------------------------------------------------- admin

    /// @notice Configure the v4 pool used for a directional pair. The same
    ///         PoolKey is normally registered for both directions.
    function configurePair(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        int24 tickSpacing,
        uint256 minQuoteOut
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        (address c0, address c1) = tokenIn < tokenOut ? (tokenIn, tokenOut) : (tokenOut, tokenIn);
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(c0),
            currency1: Currency.wrap(c1),
            fee: fee,
            tickSpacing: tickSpacing,
            hooks: address(0)
        });
        _pairs[tokenIn][tokenOut] = PairConfig({key: key, enabled: true, minQuoteOut: minQuoteOut});
        emit PairConfigured(tokenIn, tokenOut, fee, tickSpacing, minQuoteOut);
    }

    function disablePair(address tokenIn, address tokenOut) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pairs[tokenIn][tokenOut].enabled = false;
        emit PairDisabledByAdmin(tokenIn, tokenOut);
    }

    function pairConfig(address tokenIn, address tokenOut) external view returns (PairConfig memory) {
        return _pairs[tokenIn][tokenOut];
    }

    // ------------------------------------------------------------- quoting

    /// @inheritdoc IStockSwapAdapter
    /// @dev Spot quote from slot0, adjusted for the pool's LP fee. v4's
    ///      transient-storage locking makes exact-execution quoting
    ///      impossible inside a view function, so settlement additionally
    ///      re-checks the fill against minAmountOut.
    function quote(address inputToken, address outputToken, uint256 amountIn) external view returns (uint256) {
        PairConfig storage cfg = _pairs[inputToken][outputToken];
        if (!cfg.enabled) revert PairNotConfigured();

        bytes32 poolId = _poolId(cfg.key);
        (uint160 sqrtPriceX96,,, uint24 lpFee) = stateView.getSlot0(poolId);
        if (sqrtPriceX96 == 0 || stateView.getLiquidity(poolId) == 0) revert ShallowLiquidity();

        uint256 effectiveFee = lpFee == 0 ? cfg.key.fee : lpFee;
        uint256 amountAfterFee = amountIn - Math.mulDiv(amountIn, effectiveFee, 1_000_000);

        bool zeroForOne = inputToken == Currency.unwrap(cfg.key.currency0);
        uint256 out;
        if (zeroForOne) {
            // out = in * (sqrtP/2^96)^2
            uint256 step = Math.mulDiv(amountAfterFee, sqrtPriceX96, 1 << 96);
            out = Math.mulDiv(step, sqrtPriceX96, 1 << 96);
        } else {
            // out = in / (sqrtP/2^96)^2
            uint256 step = Math.mulDiv(amountAfterFee, 1 << 96, sqrtPriceX96);
            out = Math.mulDiv(step, 1 << 96, sqrtPriceX96);
        }
        if (out < cfg.minQuoteOut) revert ShallowLiquidity();
        return out;
    }

    // ------------------------------------------------------------- swapping

    struct CallbackData {
        PoolKey key;
        bool zeroForOne;
        uint256 amountIn;
        address inputToken;
        address outputToken;
        address recipient;
    }

    /// @inheritdoc IStockSwapAdapter
    function swapExactInput(
        address inputToken,
        address outputToken,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountOut) {
        if (block.timestamp > deadline) revert Expired();
        PairConfig storage cfg = _pairs[inputToken][outputToken];
        if (!cfg.enabled) revert PairNotConfigured();

        IERC20(inputToken).safeTransferFrom(msg.sender, address(this), amountIn);

        bool zeroForOne = inputToken == Currency.unwrap(cfg.key.currency0);
        bytes memory result = manager.unlock(
            abi.encode(
                CallbackData({
                    key: cfg.key,
                    zeroForOne: zeroForOne,
                    amountIn: amountIn,
                    inputToken: inputToken,
                    outputToken: outputToken,
                    recipient: recipient
                })
            )
        );
        amountOut = abi.decode(result, (uint256));
        if (amountOut < minAmountOut) revert InsufficientOutput();
    }

    /// @dev PoolManager calls back inside `unlock`. Executes the swap, pays
    ///      the input currency, and takes the output straight to the recipient.
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        if (msg.sender != address(manager)) revert NotPoolManager();
        CallbackData memory cb = abi.decode(data, (CallbackData));

        BalanceDelta delta = manager.swap(
            cb.key,
            SwapParams({
                zeroForOne: cb.zeroForOne,
                amountSpecified: -int256(cb.amountIn), // exact input
                sqrtPriceLimitX96: cb.zeroForOne ? MIN_SQRT_PRICE + 1 : MAX_SQRT_PRICE - 1
            }),
            ""
        );

        (int128 amount0, int128 amount1) = _unpack(delta);
        uint256 amountOut = uint256(uint128(cb.zeroForOne ? amount1 : amount0));

        // Pay the input leg.
        manager.sync(Currency.wrap(cb.inputToken));
        IERC20(cb.inputToken).safeTransfer(address(manager), cb.amountIn);
        manager.settle();

        // Deliver the output leg directly to the recipient.
        manager.take(Currency.wrap(cb.outputToken), cb.recipient, amountOut);

        return abi.encode(amountOut);
    }

    // ------------------------------------------------------------- helpers

    function _poolId(PoolKey memory key) internal pure returns (bytes32) {
        return keccak256(abi.encode(key));
    }

    function _unpack(BalanceDelta delta) internal pure returns (int128 amount0, int128 amount1) {
        int256 raw = BalanceDelta.unwrap(delta);
        amount0 = int128(raw >> 128);
        amount1 = int128(raw);
    }
}
