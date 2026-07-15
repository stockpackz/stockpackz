// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";

import {StockPackz} from "../src/StockPackz.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockRandomnessCoordinator} from "../src/mocks/MockRandomnessCoordinator.sol";
import {MockSwapAdapter} from "../src/mocks/MockSwapAdapter.sol";
import {IRandomnessCoordinator} from "../src/interfaces/IRandomnessCoordinator.sol";
import {IStockSwapAdapter} from "../src/interfaces/IStockSwapAdapter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Shared fixture: USDG (6 decimals), 7 AI-pack stocks (18 decimals),
///         manual randomness, configurable swap adapter, and the AI Pack with
///         the spec's exact weights.
abstract contract BaseTest is Test {
    // 10 USDG pack, 9.00 / 0.60 / 0.40 split (USDG has 6 decimals).
    uint256 constant PRICE = 10e6;
    uint256 constant STOCK_AMOUNT = 9e6;
    uint256 constant FEE = 0.6e6;
    uint256 constant JACKPOT_CUT = 0.4e6;

    // MockSwapAdapter price of 1e30 → 9e6 USDG buys 9e18 stock units.
    uint256 constant ADAPTER_PRICE = 1e30;
    uint256 constant EXPECTED_OUT = 9e18;

    address admin = makeAddr("admin");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    MockERC20 usdg;
    MockRandomnessCoordinator coordinator;
    MockSwapAdapter adapter;
    StockPackz core;

    MockERC20 nvda;
    MockERC20 amd;
    MockERC20 msft;
    MockERC20 googl;
    MockERC20 amzn;
    MockERC20 meta;
    MockERC20 pltr;

    uint256 aiPackId;

    /// @dev requestId per openingId, captured from the coordinator.
    mapping(uint256 => uint256) internal requestOf;

    function setUp() public virtual {
        usdg = new MockERC20("USDG", "USDG", 6);
        coordinator = new MockRandomnessCoordinator();
        adapter = new MockSwapAdapter();
        core = new StockPackz(
            IERC20(address(usdg)),
            IRandomnessCoordinator(address(coordinator)),
            IStockSwapAdapter(address(adapter)),
            admin
        );

        nvda = _stock("NVDA");
        amd = _stock("AMD");
        msft = _stock("MSFT");
        googl = _stock("GOOGL");
        amzn = _stock("AMZN");
        meta = _stock("META");
        pltr = _stock("PLTR");

        aiPackId = _createAiPack();

        usdg.mint(alice, 1_000e6);
        usdg.mint(bob, 1_000e6);
        vm.prank(alice);
        usdg.approve(address(core), type(uint256).max);
        vm.prank(bob);
        usdg.approve(address(core), type(uint256).max);
    }

    function _stock(string memory symbol) internal returns (MockERC20 token) {
        token = new MockERC20(symbol, symbol, 18);
        adapter.setPrice(address(token), ADAPTER_PRICE);
    }

    function _aiPackOptions() internal view returns (StockPackz.StockOption[] memory options) {
        options = new StockPackz.StockOption[](7);
        options[0] = _option(address(nvda), 2_000);
        options[1] = _option(address(amd), 2_000);
        options[2] = _option(address(msft), 1_500);
        options[3] = _option(address(googl), 1_500);
        options[4] = _option(address(amzn), 1_000);
        options[5] = _option(address(meta), 1_000);
        options[6] = _option(address(pltr), 1_000);
    }

    function _option(address token, uint32 weight) internal pure returns (StockPackz.StockOption memory) {
        return StockPackz.StockOption({
            token: token,
            weight: weight,
            maxSlippageBps: 300,
            minimumQuote: 1e18, // liquidity floor well below EXPECTED_OUT
            active: true
        });
    }

    function _packConfig() internal pure returns (StockPackz.PackConfig memory config) {
        config.name = "AI Pack";
        config.description = "The intelligence economy";
        config.imageURI = "ipfs://ai-pack";
        config.price = PRICE;
        config.stockAmount = STOCK_AMOUNT;
        config.protocolFee = FEE;
        config.jackpotContribution = JACKPOT_CUT;
        config.active = true;
    }

    function _createAiPack() internal returns (uint256 packId) {
        vm.prank(admin);
        packId = core.createPack(_packConfig(), _aiPackOptions());
    }

    function _open(address user) internal returns (uint256 openingId) {
        uint256 nextRequest = coordinator.nextRequestId();
        vm.prank(user);
        openingId = core.openPack(aiPackId, 100, 0);
        requestOf[openingId] = nextRequest;
    }

    function _fulfill(uint256 openingId, uint256 stockRoll, uint256 jackpotRoll) internal {
        uint256[] memory words = new uint256[](2);
        words[0] = stockRoll;
        words[1] = jackpotRoll;
        coordinator.fulfill(requestOf[openingId], words);
    }

    function _openAndFulfill(address user, uint256 stockRoll, uint256 jackpotRoll)
        internal
        returns (uint256 openingId)
    {
        openingId = _open(user);
        _fulfill(openingId, stockRoll, jackpotRoll);
    }

    // ------------------------------------------------------ opening getters
    // The auto-generated getter returns a 26-value tuple; grab what we need
    // via typed helpers to keep tests readable.
    // Field order: id, user, packId, packVersion, amountPaid, stockAmount,
    // protocolFee, jackpotContribution, requestId, adapter, userMaxSlippageBps,
    // selectedStock, selectedMaxSlippageBps, selectedMinimumQuote,
    // stockAmountReceived, jackpotRoll, jackpotThresholdSnapshot,
    // jackpotWinner, jackpotPayout, optionsHash, createdAt, subsidyAmount,
    // baseXP, xpMultiplierBps, tierId, status

    function _status(uint256 openingId) internal view returns (StockPackz.OpeningStatus status) {
        (,,,,,,,,,,,,,,,,,,,,,,,,, status) = core.openings(openingId);
    }

    function _selectedStock(uint256 openingId) internal view returns (address selected) {
        (,,,,,,,,,,, selected,,,,,,,,,,,,,,) = core.openings(openingId);
    }

    function _jackpotResult(uint256 openingId) internal view returns (bool winner, uint256 payout) {
        (,,,,,,,,,,,,,,,,, winner, payout,,,,,,,) = core.openings(openingId);
    }

    function _stockReceived(uint256 openingId) internal view returns (uint256 received) {
        (,,,,,,,,,,,,,, received,,,,,,,,,,,) = core.openings(openingId);
    }

    function _packVersionOf(uint256 openingId) internal view returns (uint256 version) {
        (,,, version,,,,,,,,,,,,,,,,,,,,,,) = core.openings(openingId);
    }

    function _amountPaid(uint256 openingId) internal view returns (uint256 paid) {
        (,,,, paid,,,,,,,,,,,,,,,,,,,,,) = core.openings(openingId);
    }

    function _stockLeg(uint256 openingId) internal view returns (uint256 amount) {
        (,,,,, amount,,,,,,,,,,,,,,,,,,,,) = core.openings(openingId);
    }

    function _subsidyOf(uint256 openingId) internal view returns (uint256 subsidy) {
        (,,,,,,,,,,,,,,,,,,,,, subsidy,,,,) = core.openings(openingId);
    }
}
