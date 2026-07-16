// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {UniswapV4NativeAdapter} from "../../src/adapters/UniswapV4NativeAdapter.sol";
import {KeeperRandomnessCoordinator} from "../../src/randomness/KeeperRandomnessCoordinator.sol";
import {StockPackz} from "../../src/StockPackz.sol";
import {IPoolManager, IStateView} from "../../src/interfaces/IUniswapV4.sol";
import {IRandomnessCoordinator} from "../../src/interfaces/IRandomnessCoordinator.sol";
import {IStockSwapAdapter} from "../../src/interfaces/IStockSwapAdapter.sol";

/// @notice Fork tests against live Robinhood Chain state. Run with:
///         forge test --match-contract RobinhoodForkTest \
///           --fork-url https://rpc.mainnet.chain.robinhood.com -vv
contract RobinhoodForkTest is Test {
    // ---- live mainnet addresses (chain 4663) ----
    address constant POOL_MANAGER = 0x8366a39CC670B4001A1121B8F6A443A643e40951;
    address constant STATE_VIEW = 0xF3334192D15450CdD385c8B70e03f9A6bD9E673b;
    address constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
    address constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address constant AAPL = 0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9;
    address constant SPCX = 0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa;

    UniswapV4NativeAdapter adapter;
    KeeperRandomnessCoordinator coordinator;
    StockPackz core;

    address admin = makeAddr("admin");
    address keeper = makeAddr("keeper");
    address alice = makeAddr("alice");

    function setUp() public {
        vm.skip(block.chainid != 4663); // only meaningful on the fork

        adapter = new UniswapV4NativeAdapter(IPoolManager(POOL_MANAGER), IStateView(STATE_VIEW), admin);
        coordinator = new KeeperRandomnessCoordinator(admin);
        core = new StockPackz(
            IERC20(USDG), IRandomnessCoordinator(address(coordinator)), IStockSwapAdapter(address(adapter)), admin
        );

        vm.startPrank(admin);
        // Deepest verified pools per token (from on-chain scan).
        adapter.configurePair(USDG, NVDA, 3000, 60, 0);
        adapter.configurePair(USDG, AAPL, 10000, 200, 0);
        adapter.configurePair(USDG, SPCX, 10000, 200, 0);
        coordinator.grantRole(coordinator.CONSUMER_ROLE(), address(core));
        coordinator.grantRole(coordinator.KEEPER_ROLE(), keeper);
        vm.stopPrank();

        deal(USDG, alice, 1_000e6);
    }

    function test_fork_quote_nvda() public view {
        uint256 out = adapter.quote(USDG, NVDA, 9e6);
        console.log("9 USDG -> NVDA quote:", out);
        // NVDA trades in the low hundreds USD -> expect ~0.02-0.10 shares.
        assertGt(out, 0.005e18, "quote too low");
        assertLt(out, 1e18, "quote implausibly high");
    }

    function test_fork_swap_nvda_deliversToRecipient() public {
        uint256 quoted = adapter.quote(USDG, NVDA, 9e6);
        uint256 minOut = quoted * 90 / 100; // 10% tolerance vs spot quote

        vm.startPrank(alice);
        IERC20(USDG).approve(address(adapter), 9e6);
        uint256 out = adapter.swapExactInput(USDG, NVDA, 9e6, minOut, alice, block.timestamp + 300);
        vm.stopPrank();

        console.log("9 USDG -> NVDA fill:", out);
        assertEq(IERC20(NVDA).balanceOf(alice), out, "stock not delivered");
        assertGe(out, minOut, "fill below minOut");
    }

    function test_fork_fullOpening_endToEnd() public {
        // Create a live-config pack: 10 USDG = 9 stock + 0.6 fee + 0.4 jackpot.
        StockPackz.StockOption[] memory options = new StockPackz.StockOption[](3);
        options[0] = StockPackz.StockOption({token: NVDA, weight: 4000, maxSlippageBps: 500, minimumQuote: 0, active: true});
        options[1] = StockPackz.StockOption({token: AAPL, weight: 3000, maxSlippageBps: 500, minimumQuote: 0, active: true});
        options[2] = StockPackz.StockOption({token: SPCX, weight: 3000, maxSlippageBps: 500, minimumQuote: 0, active: true});

        StockPackz.PackConfig memory cfg;
        cfg.name = "Fork AI Pack";
        cfg.price = 10e6;
        cfg.stockAmount = 9e6;
        cfg.protocolFee = 0.6e6;
        cfg.jackpotContribution = 0.4e6;
        cfg.active = true;

        vm.prank(admin);
        uint256 packId = core.createPack(cfg, options);

        vm.startPrank(alice);
        IERC20(USDG).approve(address(core), 10e6);
        uint256 openingId = core.openPack(packId, 500, 0);
        vm.stopPrank();

        // Keeper fulfills in a later block.
        vm.roll(block.number + 1);
        vm.prank(keeper);
        coordinator.fulfill(1, keccak256("fork-entropy"));

        // Settlement success is observable via balances + accounting:
        // exactly one of the pack's stocks landed in Alice's wallet, the
        // jackpot took its contribution, and no liability remains pending.
        uint256 nvdaBal = IERC20(NVDA).balanceOf(alice);
        uint256 aaplBal = IERC20(AAPL).balanceOf(alice);
        uint256 spcxBal = IERC20(SPCX).balanceOf(alice);
        uint256 totalReceived = nvdaBal + aaplBal + spcxBal;

        assertGt(totalReceived, 0, "no stock delivered");
        assertEq(core.pendingLiabilities(), 0, "liability not cleared");
        assertEq(core.jackpotBalance(), 0.4e6, "jackpot not funded");
        assertEq(core.treasuryAccrued(), 0.6e6, "fee not accrued");
        assertEq(openingId, 1, "unexpected opening id");
        console.log("delivered NVDA/AAPL/SPCX:", nvdaBal, aaplBal, spcxBal);
    }
}
