// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @dev Minimal Uniswap v4 core surface used by the native adapter.
///      Mirrors v4-core types exactly; kept local so the protocol repo
///      doesn't vendor the full v4 codebase.

type Currency is address;

struct PoolKey {
    Currency currency0;
    Currency currency1;
    uint24 fee;
    int24 tickSpacing;
    address hooks;
}

struct SwapParams {
    bool zeroForOne;
    int256 amountSpecified; // negative = exact input
    uint160 sqrtPriceLimitX96;
}

/// @dev Packed (int128 amount0, int128 amount1).
type BalanceDelta is int256;

interface IPoolManager {
    function unlock(bytes calldata data) external returns (bytes memory);

    function swap(PoolKey memory key, SwapParams memory params, bytes calldata hookData)
        external
        returns (BalanceDelta swapDelta);

    function sync(Currency currency) external;

    function settle() external payable returns (uint256 paid);

    function take(Currency currency, address to, uint256 amount) external;
}

interface IUnlockCallback {
    function unlockCallback(bytes calldata data) external returns (bytes memory);
}

interface IStateView {
    function getSlot0(bytes32 poolId)
        external
        view
        returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee);

    function getLiquidity(bytes32 poolId) external view returns (uint128 liquidity);
}
