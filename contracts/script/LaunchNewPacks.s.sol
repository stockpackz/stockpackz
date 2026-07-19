// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {StockPackz} from "../src/StockPackz.sol";

interface IAdapterAdmin {
    function configurePair(address tokenIn, address tokenOut, uint24 fee, int24 tickSpacing, uint256 minQuoteOut)
        external;
}

/// @notice Launch two new packs (Magnificent 7 + Index Pack) on the live
///         StockPackz. Wires the 8 missing adapter pairs first (INTC was
///         already configured). Validated end-to-end by the mainnet fork
///         stress test in test/fork/LaunchNewPacks.fork.t.sol.
contract LaunchNewPacks is Script {
    StockPackz constant core = StockPackz(0xEee1458Ad6DeB8Fa35f39FDdbB1aaa12D4A422f3);
    IAdapterAdmin constant adapter = IAdapterAdmin(0x0B17df805a8C0921cB1B141F4515612028d8E4a7);
    address constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;

    address constant AAPL = 0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9;
    address constant MSFT = 0xe93237C50D904957Cf27E7B1133b510C669c2e74;
    address constant AMZN = 0x12f190a9F9d7D37a250758b26824B97CE941bF54;
    address constant META = 0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35;
    address constant TSLA = 0x322F0929c4625eD5bAd873c95208D54E1c003b2d;
    address constant GOOGL = 0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3;
    address constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address constant SPY = 0x117cc2133c37B721F49dE2A7a74833232B3B4C0C;
    address constant QQQ = 0xD5f3879160bc7c32ebb4dC785F8a4F505888de68;

    function run() external {
        vm.startBroadcast(vm.envUint("DEPLOYER_PK"));

        // --- adapter wiring (fee tier = deepest live pool per scanner) ---
        adapter.configurePair(USDG, AAPL, 10000, 200, 0);
        adapter.configurePair(USDG, MSFT, 3000, 60, 0);
        adapter.configurePair(USDG, AMZN, 3000, 60, 0);
        adapter.configurePair(USDG, META, 3000, 60, 0);
        adapter.configurePair(USDG, TSLA, 3000, 60, 0);
        adapter.configurePair(USDG, GOOGL, 3000, 60, 0);
        adapter.configurePair(USDG, SPY, 3000, 60, 0);
        adapter.configurePair(USDG, QQQ, 10000, 200, 0);

        // --- Magnificent 7 ($14.99: $13.49 stock / $0.90 fee / $0.60 jackpot) ---
        StockPackz.StockOption[] memory m7 = new StockPackz.StockOption[](7);
        m7[0] = _opt(AAPL, 1800);
        m7[1] = _opt(MSFT, 1800);
        m7[2] = _opt(AMZN, 1800);
        m7[3] = _opt(GOOGL, 1800);
        m7[4] = _opt(TSLA, 1200); // rare
        m7[5] = _opt(NVDA, 800); //  epic
        m7[6] = _opt(META, 800); //  epic

        StockPackz.PackConfig memory mag7;
        mag7.name = "Magnificent 7";
        mag7.description = "The seven giants that move the market";
        mag7.price = 14.99e6;
        mag7.stockAmount = 13.49e6;
        mag7.protocolFee = 0.90e6;
        mag7.jackpotContribution = 0.60e6;
        mag7.active = true;
        mag7.baseXP = 300;
        uint256 mag7Id = core.createPack(mag7, m7);

        // --- Index Pack ($9.99: $9.00 stock / $0.59 fee / $0.40 jackpot) ---
        StockPackz.StockOption[] memory ix = new StockPackz.StockOption[](2);
        ix[0] = _opt(SPY, 5000);
        ix[1] = _opt(QQQ, 5000);

        StockPackz.PackConfig memory index;
        index.name = "Index Pack";
        index.description = "Own the whole market: S&P 500 & Nasdaq 100";
        index.price = 9.99e6;
        index.stockAmount = 9e6;
        index.protocolFee = 0.59e6;
        index.jackpotContribution = 0.40e6;
        index.active = true;
        index.baseXP = 100;
        uint256 indexId = core.createPack(index, ix);

        vm.stopBroadcast();

        console2.log("Magnificent 7 pack id:", mag7Id);
        console2.log("Index Pack id:", indexId);
    }

    function _opt(address token, uint32 weight) internal pure returns (StockPackz.StockOption memory) {
        return StockPackz.StockOption({token: token, weight: weight, maxSlippageBps: 500, minimumQuote: 0, active: true});
    }
}
