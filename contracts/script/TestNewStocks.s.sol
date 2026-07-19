// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";

interface IAdapter {
    function configurePair(address tokenIn, address tokenOut, uint24 fee, int24 tickSpacing, uint256 minQuoteOut)
        external;
    function quote(address inputToken, address outputToken, uint256 amountIn) external view returns (uint256);
}

/// @notice Fork simulation: verify each candidate stock can be wired into the
///         live adapter (configurePair) and then produces a sane quote for a
///         pack-sized swap. Read-only unless broadcast.
contract TestNewStocks is Script {
    address constant ADAPTER = 0x0B17df805a8C0921cB1B141F4515612028d8E4a7;
    address constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
    address constant ADMIN = 0x59154C6638b39038e648933d1f9a5f03e3677941;

    struct Candidate {
        string ticker;
        address token;
        uint24 fee;
        int24 tickSpacing;
    }

    function run() external {
        Candidate[9] memory cands = [
            Candidate("INTC", 0xc72b96e0E48ecd4DC75E1e45396e26300BC39681, 10000, 200),
            Candidate("AAPL", 0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9, 10000, 200),
            Candidate("MSFT", 0xe93237C50D904957Cf27E7B1133b510C669c2e74, 3000, 60),
            Candidate("AMZN", 0x12f190a9F9d7D37a250758b26824B97CE941bF54, 3000, 60),
            Candidate("META", 0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35, 3000, 60),
            Candidate("TSLA", 0x322F0929c4625eD5bAd873c95208D54E1c003b2d, 3000, 60),
            Candidate("GOOGL", 0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3, 3000, 60),
            Candidate("SPY", 0x117cc2133c37B721F49dE2A7a74833232B3B4C0C, 3000, 60),
            Candidate("QQQ", 0xD5f3879160bc7c32ebb4dC785F8a4F505888de68, 10000, 200)
        ];

        // Pack-sized stock legs to test ($8.39 and $10.19 = current packs' stockAmount).
        uint256[2] memory sizes = [uint256(8_390_000), uint256(10_190_000)];

        for (uint256 i = 0; i < cands.length; i++) {
            Candidate memory c = cands[i];

            // Does it already quote? (already configured)
            bool preConfigured;
            try IAdapter(ADAPTER).quote(USDG, c.token, sizes[0]) returns (uint256) {
                preConfigured = true;
            } catch {}

            if (!preConfigured) {
                vm.prank(ADMIN);
                IAdapter(ADAPTER).configurePair(USDG, c.token, c.fee, c.tickSpacing, 0);
            }

            for (uint256 s = 0; s < sizes.length; s++) {
                try IAdapter(ADAPTER).quote(USDG, c.token, sizes[s]) returns (uint256 out) {
                    console2.log(
                        string.concat(
                            c.ticker,
                            preConfigured ? " [already wired] " : " [needs configurePair] ",
                            "in=", vm.toString(sizes[s]),
                            " out=", vm.toString(out)
                        )
                    );
                } catch {
                    console2.log(string.concat(c.ticker, " QUOTE STILL REVERTS in=", vm.toString(sizes[s])));
                }
            }
        }
    }
}
