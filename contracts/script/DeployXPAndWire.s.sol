// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {StockPackz} from "../src/StockPackz.sol";
import {XPManager} from "../src/progression/XPManager.sol";
import {IMembershipTiers} from "../src/interfaces/IMembershipTiers.sol";
import {IPackRewardsVault} from "../src/interfaces/IPackRewardsVault.sol";
import {IXPManager} from "../src/interfaces/IXPManager.sol";
import {ITokenPriceAdapter} from "../src/interfaces/ITokenPriceAdapter.sol";

/// @notice Deploy XPManager, wire it to live StockPackz, set pack baseXP,
///         and backfill XP for openings that already settled before XP existed.
contract DeployXPAndWire is Script {
    StockPackz constant core = StockPackz(0xEee1458Ad6DeB8Fa35f39FDdbB1aaa12D4A422f3);

    address constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address constant AMD = 0x86923f96303D656E4aa86D9d42D1e57ad2023fdC;
    address constant MU = 0xfF080c8ce2E5feadaCa0Da81314Ae59D232d4afD;
    address constant SPCX = 0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa;

    // First three real openers (all same wallet) — 2x AI + 1 more AI from events.
    // open-1 MU, open-2 AMD, open-3 AMD — all pack 1 (AI, 100 XP).
    address constant EARLY_USER = 0x73d5225F558BB1ad2a4ab02E13d038758686ef9B;

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");
        address admin = vm.addr(pk);

        vm.startBroadcast(pk);

        XPManager xp = new XPManager(admin);
        xp.grantRole(xp.AWARDER_ROLE(), address(core));
        // Allow admin to backfill early openings.
        xp.grantRole(xp.AWARDER_ROLE(), admin);

        core.setUtilityModules(
            IMembershipTiers(address(0)),
            IPackRewardsVault(address(0)),
            IXPManager(address(xp)),
            ITokenPriceAdapter(address(0)),
            IERC20(address(0))
        );

        _updateAiPack();
        _updateFutureTechPack();

        // Backfill: 3 settled AI opens × 100 XP = 300 XP for the early user.
        xp.awardXP(EARLY_USER, 300, 10_000);

        vm.stopBroadcast();

        console.log("XPManager:", address(xp));
        console.log("Wired to StockPackz; AI baseXP=100, Future Tech baseXP=250");
        console.log("Backfilled 300 XP to", EARLY_USER);
    }

    function _updateAiPack() internal {
        StockPackz.StockOption[] memory options = new StockPackz.StockOption[](3);
        options[0] = _opt(NVDA, 588);
        options[1] = _opt(AMD, 1765);
        options[2] = _opt(MU, 7647);

        StockPackz.PackConfig memory cfg;
        cfg.name = "AI Pack";
        cfg.description = "The companies building the future of intelligence";
        cfg.price = 9.99e6;
        cfg.stockAmount = 9e6;
        cfg.protocolFee = 0.59e6;
        cfg.jackpotContribution = 0.40e6;
        cfg.active = true;
        cfg.baseXP = 100;
        core.updatePack(1, cfg, options);
    }

    function _updateFutureTechPack() internal {
        StockPackz.StockOption[] memory options = new StockPackz.StockOption[](4);
        options[0] = _opt(NVDA, 1250);
        options[1] = _opt(AMD, 3750);
        options[2] = _opt(SPCX, 1250);
        options[3] = _opt(MU, 3750);

        StockPackz.PackConfig memory cfg;
        cfg.name = "Future Tech";
        cfg.description = "Semiconductors, space & growth";
        cfg.price = 11.99e6;
        cfg.stockAmount = 10.79e6;
        cfg.protocolFee = 0.72e6;
        cfg.jackpotContribution = 0.48e6;
        cfg.active = true;
        cfg.baseXP = 250;
        core.updatePack(2, cfg, options);
    }

    function _opt(address token, uint32 weight) internal pure returns (StockPackz.StockOption memory) {
        return StockPackz.StockOption({
            token: token, weight: weight, maxSlippageBps: 500, minimumQuote: 0, active: true
        });
    }
}
