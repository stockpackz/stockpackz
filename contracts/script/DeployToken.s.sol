// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {StockPackzToken} from "../src/token/StockPackzToken.sol";
import {PackRewardsVault} from "../src/vaults/PackRewardsVault.sol";

/// @title DeployToken
/// @notice Launch-day script: deploys PACKZ + the two tax vaults and wires
///         exemptions. Deliberately does NOT create a Uniswap v4 pool or add
///         liquidity — pool initialization is a separate, explicit step.
///
/// Usage:
///   export DEPLOYER_PK=0x...          # throwaway launch key
///   export USDG=0x...                 # USDG address on the target chain
///   export INITIAL_SUPPLY=1000000000  # whole tokens (18 decimals applied)
///   forge script script/DeployToken.s.sol --rpc-url $RPC_URL --broadcast
contract DeployToken is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");
        address deployer = vm.addr(pk);
        IERC20 usdg = IERC20(vm.envAddress("USDG"));
        uint256 supply = vm.envUint("INITIAL_SUPPLY") * 1e18;

        vm.startBroadcast(pk);

        // 1. Tax destination vaults (rewards + jackpot support).
        PackRewardsVault rewardsVault = new PackRewardsVault(usdg, deployer);
        PackRewardsVault jackpotSupportVault = new PackRewardsVault(usdg, deployer);

        // 2. Token — full supply minted to the deployer, 1% tax to the vaults.
        StockPackzToken token = new StockPackzToken(
            supply,
            deployer,
            address(rewardsVault),
            address(jackpotSupportVault)
        );

        vm.stopBroadcast();

        console.log("PACKZ token:          ", address(token));
        console.log("Pack Rewards Vault:   ", address(rewardsVault));
        console.log("Jackpot Support Vault:", address(jackpotSupportVault));
        console.log("Supply minted to:     ", deployer);
        console.log("");
        console.log("NEXT STEPS (manual, in order):");
        console.log(" 1. Verify contracts on the explorer");
        console.log(" 2. token.setTaxExempt(<v4 PoolManager>, true)");
        console.log(" 3. token.setTaxExempt(<v4 Universal Router>, true)");
        console.log(" 4. token.setTaxExempt(<v4 Position Manager>, true)");
        console.log(" 5. Initialize the v4 pool (no liquidity required)");
    }
}
