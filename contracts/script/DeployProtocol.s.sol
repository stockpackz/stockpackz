// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {StockPackz} from "../src/StockPackz.sol";
import {UniswapV4NativeAdapter} from "../src/adapters/UniswapV4NativeAdapter.sol";
import {KeeperRandomnessCoordinator} from "../src/randomness/KeeperRandomnessCoordinator.sol";
import {IPoolManager, IStateView} from "../src/interfaces/IUniswapV4.sol";
import {IRandomnessCoordinator} from "../src/interfaces/IRandomnessCoordinator.sol";
import {IStockSwapAdapter} from "../src/interfaces/IStockSwapAdapter.sol";

/// @notice Deploys the StockPackz protocol to Robinhood Chain mainnet (4663)
///         and configures the two launch packs against verified live pools.
///
///         Env: DEPLOYER_PK (funded with ETH for gas), optional KEEPER
///         (defaults to deployer). After deploy, fund the jackpot by
///         approving USDG and calling fundJackpot(500e6).
contract DeployProtocol is Script {
    // ---- Robinhood Chain mainnet (4663) ----
    address constant POOL_MANAGER = 0x8366a39CC670B4001A1121B8F6A443A643e40951;
    address constant STATE_VIEW = 0xF3334192D15450CdD385c8B70e03f9A6bD9E673b;
    address constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;

    // Verified stock tokens (symbol/decimals checked via RPC, pools scanned).
    address constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address constant AMD = 0x86923f96303D656E4aa86D9d42D1e57ad2023fdC;
    address constant INTC = 0xc72b96e0E48ecd4DC75E1e45396e26300BC39681;
    address constant MU = 0xfF080c8ce2E5feadaCa0Da81314Ae59D232d4afD;
    address constant SPCX = 0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa;

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");
        address deployer = vm.addr(pk);
        address keeper = vm.envOr("KEEPER", deployer);

        vm.startBroadcast(pk);

        // 1. Randomness coordinator (keeper-fulfilled MVP).
        KeeperRandomnessCoordinator coordinator = new KeeperRandomnessCoordinator(deployer);

        // 2. Native Uniswap v4 adapter with the verified deepest pools.
        UniswapV4NativeAdapter adapter =
            new UniswapV4NativeAdapter(IPoolManager(POOL_MANAGER), IStateView(STATE_VIEW), deployer);
        adapter.configurePair(USDG, NVDA, 3000, 60, 0);
        adapter.configurePair(USDG, AMD, 10000, 200, 0);
        adapter.configurePair(USDG, INTC, 10000, 200, 0);
        adapter.configurePair(USDG, MU, 10000, 200, 0);
        adapter.configurePair(USDG, SPCX, 10000, 200, 0);

        // 3. Core protocol.
        StockPackz core = new StockPackz(
            IERC20(USDG),
            IRandomnessCoordinator(address(coordinator)),
            IStockSwapAdapter(address(adapter)),
            deployer
        );
        coordinator.grantRole(coordinator.CONSUMER_ROLE(), address(core));
        coordinator.grantRole(coordinator.KEEPER_ROLE(), keeper);
        core.grantRole(core.KEEPER_ROLE(), keeper);

        // 4. Launch packs (weights = frontend rarity weights, in bps).
        _createAiPack(core);
        _createFutureTechPack(core);

        vm.stopBroadcast();

        console.log("KeeperRandomnessCoordinator:", address(coordinator));
        console.log("UniswapV4NativeAdapter:     ", address(adapter));
        console.log("StockPackz core:            ", address(core));
        console.log("");
        console.log("NEXT STEPS:");
        console.log(" 1. usdg.approve(core, 500e6); core.fundJackpot(500e6)  // $500 seed");
        console.log(" 2. Start the keeper (fulfills randomness requests)");
        console.log(" 3. Wire the frontend to these addresses");
    }

    function _createAiPack(StockPackz core) internal {
        // $9.99 = 9.00 stock + 0.59 fee + 0.40 jackpot
        StockPackz.StockOption[] memory options = new StockPackz.StockOption[](4);
        options[0] = _opt(NVDA, 588); //   legendary
        options[1] = _opt(AMD, 1765); //   epic
        options[2] = _opt(INTC, 5882); //  common
        options[3] = _opt(MU, 1765); //    epic

        StockPackz.PackConfig memory cfg;
        cfg.name = "AI Pack";
        cfg.description = "The companies building the future of intelligence";
        cfg.price = 9.99e6;
        cfg.stockAmount = 9e6;
        cfg.protocolFee = 0.59e6;
        cfg.jackpotContribution = 0.40e6;
        cfg.active = true;
        core.createPack(cfg, options);
    }

    function _createFutureTechPack(StockPackz core) internal {
        // $11.99 = 10.79 stock + 0.72 fee + 0.48 jackpot
        StockPackz.StockOption[] memory options = new StockPackz.StockOption[](4);
        options[0] = _opt(NVDA, 1250); //  legendary
        options[1] = _opt(AMD, 3750); //   epic
        options[2] = _opt(SPCX, 1250); //  legendary
        options[3] = _opt(MU, 3750); //    epic

        StockPackz.PackConfig memory cfg;
        cfg.name = "Future Tech";
        cfg.description = "Semiconductors, space & growth";
        cfg.price = 11.99e6;
        cfg.stockAmount = 10.79e6;
        cfg.protocolFee = 0.72e6;
        cfg.jackpotContribution = 0.48e6;
        cfg.active = true;
        core.createPack(cfg, options);
    }

    function _opt(address token, uint32 weight) internal pure returns (StockPackz.StockOption memory) {
        return StockPackz.StockOption({
            token: token,
            weight: weight,
            maxSlippageBps: 500, // 5% protocol cap per stock
            minimumQuote: 0,
            active: true
        });
    }
}
