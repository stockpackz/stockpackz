// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {IStockSwapAdapter} from "./interfaces/IStockSwapAdapter.sol";
import {IRandomnessCoordinator, IRandomnessConsumer} from "./interfaces/IRandomnessCoordinator.sol";
import {IPackCredits} from "./interfaces/IPackCredits.sol";
import {IMembershipTiers} from "./interfaces/IMembershipTiers.sol";
import {IPackRewardsVault} from "./interfaces/IPackRewardsVault.sol";
import {IXPManager} from "./interfaces/IXPManager.sol";
import {ITokenPriceAdapter} from "./interfaces/ITokenPriceAdapter.sol";

/// @title StockPackz
/// @notice Core protocol: themed packs that settle just-in-time into real
///         tokenized stocks. No inventory — every opening swaps USDG into the
///         selected stock through a pluggable adapter and delivers it straight
///         to the user's wallet. A shared USDG jackpot vault accrues from
///         every opening.
contract StockPackz is AccessControl, Pausable, ReentrancyGuard, IRandomnessConsumer {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------- roles

    bytes32 public constant PACK_MANAGER_ROLE = keccak256("PACK_MANAGER_ROLE");
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // ---------------------------------------------------------------- types

    enum OpeningStatus {
        None,
        Created,
        RandomnessRequested,
        RandomnessFulfilled,
        Settled,
        SettlementFailed,
        Refunded,
        CancelledAndRefunded
    }

    struct StockOption {
        address token;
        uint32 weight; // basis points of WEIGHT_DENOMINATOR
        uint16 maxSlippageBps; // protocol cap for this stock
        uint256 minimumQuote; // liquidity floor: quote below this reverts settlement
        bool active;
    }

    struct PackConfig {
        uint256 id;
        string name;
        string description;
        string imageURI;
        uint256 price; // USDG pulled from the user
        uint256 stockAmount; // USDG swapped into the stock
        uint256 protocolFee; // USDG accrued to treasury
        uint256 jackpotContribution; // USDG retained in the jackpot vault
        bool active;
        uint64 startsAt; // 0 = no restriction
        uint64 endsAt; // 0 = no restriction
        address gateToken; // optional token-holder restriction (0 = open)
        uint256 gateMinBalance;
        uint256 version;
        // ---- progression / access (0 = unrestricted) ----
        uint256 baseXP; // XP awarded per settled opening
        uint8 minTier; // membership tier gate (Founder/Black packs)
        uint256 minLevel; // account level gate
        uint32 maxOpeningsPerWalletPerDay;
        uint256 globalSupplyCap; // lifetime openings cap
    }

    struct Opening {
        uint256 id;
        address user;
        uint256 packId;
        uint256 packVersion;
        uint256 amountPaid;
        uint256 stockAmount;
        uint256 protocolFee;
        uint256 jackpotContribution;
        uint256 requestId;
        address adapter; // adapter frozen at creation
        uint16 userMaxSlippageBps;
        address selectedStock;
        uint16 selectedMaxSlippageBps;
        uint256 selectedMinimumQuote;
        uint256 stockAmountReceived;
        uint256 jackpotRoll; // word1 % JACKPOT_DENOMINATOR
        uint256 jackpotThresholdSnapshot; // odds frozen at payment
        bool jackpotWinner;
        uint256 jackpotPayout;
        bytes32 optionsHash; // snapshot integrity
        uint64 createdAt;
        // ---- token utility snapshot (frozen at payment) ----
        uint256 subsidyAmount; // rewards-vault USDG added to the stock leg
        uint256 baseXP;
        uint16 xpMultiplierBps;
        uint8 tierId;
        OpeningStatus status;
    }

    // ------------------------------------------------------------ constants

    uint256 public constant WEIGHT_DENOMINATOR = 10_000;
    uint256 public constant JACKPOT_DENOMINATOR = 1_000_000;
    uint256 public constant JACKPOT_WINNER_SHARE_BPS = 9_000; // 90% paid, 10% seed
    uint16 public constant MAX_SLIPPAGE_CAP_BPS = 1_000; // absolute 10% ceiling

    // -------------------------------------------------------------- storage

    IERC20 public immutable usdg;
    IRandomnessCoordinator public coordinator;
    IStockSwapAdapter public swapAdapter;
    IPackCredits public packCredits;

    // ---- optional token-utility modules (product works with all unset) ----
    IMembershipTiers public membershipTiers;
    IPackRewardsVault public rewardsVault;
    IXPManager public xpManager;
    ITokenPriceAdapter public tokenPriceAdapter;
    IERC20 public protocolToken;

    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    /// @notice USD value (6dp) of STOCKPACKZ burned per holder opening.
    uint256 public burnUsdValue = 0.05e6;
    /// @notice Mode B: non-holders skip the burn but pay this USDG surcharge.
    uint256 public nonHolderSurchargeUsdg = 0.20e6;
    bool public burnEnabled = true;

    /// @notice Jackpot win threshold: roll < threshold wins.
    ///         Default 40 / 1,000,000 ≈ 1 in 25,000 openings.
    uint256 public jackpotThreshold = 40;

    /// @notice Seconds after which an unfulfilled randomness request may be
    ///         cancelled and refunded by the user.
    uint256 public randomnessTimeout = 24 hours;

    /// @notice Swap deadline window applied to every settlement attempt.
    uint256 public swapDeadlineWindow = 10 minutes;

    uint256 public nextPackId = 1;
    uint256 public nextOpeningId = 1;

    mapping(uint256 => PackConfig) public packs;
    mapping(uint256 => StockOption[]) private _packOptions;

    mapping(uint256 => Opening) public openings;
    /// @dev Frozen copy of the eligible stocks/weights for each opening.
    mapping(uint256 => StockOption[]) private _openingOptions;
    mapping(uint256 => uint256) public requestToOpening;

    // Liability-aware accounting. Admin can never withdraw below these.
    uint256 public pendingLiabilities; // paid but not yet settled/refunded
    uint256 public jackpotBalance; // shared vault
    uint256 public treasuryAccrued; // withdrawable protocol fees

    // Access-gate bookkeeping (Founder/Black packs).
    mapping(uint256 => uint256) public packTotalOpened;
    mapping(uint256 => mapping(address => mapping(uint256 => uint256))) public packOpenedPerDay;

    // Burn statistics for full transparency.
    uint256 public totalTokensBurned;

    // --------------------------------------------------------------- events

    event PackCreated(uint256 indexed packId, string name, uint256 price);
    event PackUpdated(uint256 indexed packId, uint256 version);
    event PackStatusChanged(uint256 indexed packId, bool active);
    event PackOpeningStarted(
        uint256 indexed openingId, address indexed user, uint256 indexed packId, uint256 amountPaid
    );
    event RandomnessRequested(uint256 indexed openingId, uint256 indexed requestId);
    event RandomnessFulfilled(uint256 indexed openingId, uint256 indexed requestId);
    event StockSelected(uint256 indexed openingId, address indexed stock);
    event StockPurchased(
        uint256 indexed openingId, address indexed user, address indexed stock, uint256 usdgIn, uint256 stockOut
    );
    event ProtocolFeeCollected(uint256 indexed openingId, uint256 amount);
    event JackpotFunded(uint256 indexed openingId, uint256 amount, uint256 newBalance);
    event JackpotWon(uint256 indexed openingId, address indexed winner, uint256 payout, uint256 retainedSeed);
    event JackpotExternallyFunded(address indexed from, uint256 amount, uint256 newBalance);
    event OpeningSettled(uint256 indexed openingId);
    event OpeningFailed(uint256 indexed openingId, bytes reason);
    event OpeningRefunded(uint256 indexed openingId, address indexed user, uint256 amount);
    event TokenBurned(uint256 indexed openingId, address indexed user, uint256 tokenAmount, uint256 usdValue);
    event NonHolderSurchargeApplied(uint256 indexed openingId, uint256 surcharge);
    event HolderDiscountApplied(uint256 indexed openingId, uint8 tierId, uint256 discount);
    event StockSubsidyApplied(uint256 indexed openingId, uint8 tierId, uint256 subsidy);
    event UtilityModulesUpdated(address tiers, address rewardsVault, address xpManager, address priceAdapter, address token);
    event BurnConfigUpdated(bool enabled, uint256 burnUsdValue, uint256 surcharge);
    event SwapAdapterUpdated(address indexed adapter);
    event CoordinatorUpdated(address indexed coordinator);
    event PackCreditsUpdated(address indexed packCredits);
    event JackpotThresholdUpdated(uint256 threshold);
    event TreasuryWithdrawal(address indexed to, uint256 amount);

    // --------------------------------------------------------------- errors

    error PackNotFound();
    error PackNotOpen();
    error GateNotSatisfied();
    error InvalidSplit();
    error InvalidWeights();
    error InvalidOption();
    error SlippageTooHigh();
    error NotCoordinator();
    error UnknownRequest();
    error WrongStatus();
    error NotOpener();
    error TimeoutNotReached();
    error QuoteBelowLiquidityFloor();
    error NothingToWithdraw();
    error WithdrawExceedsSafeBalance();
    error FeeOnTransferNotSupported();
    error ZeroAddress();
    error TierTooLow();
    error LevelTooLow();
    error DailyLimitReached();
    error SupplyCapReached();

    // ---------------------------------------------------------- constructor

    constructor(IERC20 _usdg, IRandomnessCoordinator _coordinator, IStockSwapAdapter _adapter, address admin) {
        if (address(_usdg) == address(0) || address(_coordinator) == address(0) || address(_adapter) == address(0)) {
            revert ZeroAddress();
        }
        usdg = _usdg;
        coordinator = _coordinator;
        swapAdapter = _adapter;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PACK_MANAGER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    // ------------------------------------------------------- pack management

    function createPack(PackConfig memory config, StockOption[] memory options)
        external
        onlyRole(PACK_MANAGER_ROLE)
        returns (uint256 packId)
    {
        _validateEconomics(config);
        _validateOptions(options);

        packId = nextPackId++;
        config.id = packId;
        config.version = 1;
        packs[packId] = config;
        _storeOptions(_packOptions[packId], options);

        emit PackCreated(packId, config.name, config.price);
    }

    /// @notice Replace a pack's economics and stock list. Bumps version;
    ///         pending openings keep their snapshot and are unaffected.
    function updatePack(uint256 packId, PackConfig memory config, StockOption[] memory options)
        external
        onlyRole(PACK_MANAGER_ROLE)
    {
        PackConfig storage existing = packs[packId];
        if (existing.id == 0) revert PackNotFound();
        _validateEconomics(config);
        _validateOptions(options);

        config.id = packId;
        config.version = existing.version + 1;
        packs[packId] = config;
        _storeOptions(_packOptions[packId], options);

        emit PackUpdated(packId, config.version);
    }

    function setPackActive(uint256 packId, bool active) external onlyRole(PACK_MANAGER_ROLE) {
        PackConfig storage pack = packs[packId];
        if (pack.id == 0) revert PackNotFound();
        pack.active = active;
        emit PackStatusChanged(packId, active);
    }

    function packOptions(uint256 packId) external view returns (StockOption[] memory) {
        return _packOptions[packId];
    }

    function openingOptions(uint256 openingId) external view returns (StockOption[] memory) {
        return _openingOptions[openingId];
    }

    // -------------------------------------------------------------- opening

    /// @notice Open a pack. Pulls the pack price in USDG (optionally partially
    ///         funded by Pack Credits) and requests verifiable randomness.
    ///         The stock is NOT selected here — selection only happens after
    ///         the randomness request created by this committed payment.
    /// @param packId pack to open
    /// @param maxSlippageBps user's slippage tolerance (tightened by per-stock caps)
    /// @param creditAmount USDG-denominated Pack Credits to apply (0 for none)
    function openPack(uint256 packId, uint16 maxSlippageBps, uint256 creditAmount)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 openingId)
    {
        PackConfig storage pack = packs[packId];
        if (pack.id == 0) revert PackNotFound();
        if (!pack.active) revert PackNotOpen();
        if (pack.startsAt != 0 && block.timestamp < pack.startsAt) revert PackNotOpen();
        if (pack.endsAt != 0 && block.timestamp > pack.endsAt) revert PackNotOpen();
        if (maxSlippageBps > MAX_SLIPPAGE_CAP_BPS) revert SlippageTooHigh();
        if (pack.gateToken != address(0) && IERC20(pack.gateToken).balanceOf(msg.sender) < pack.gateMinBalance) {
            revert GateNotSatisfied();
        }

        // --- membership benefits (all zero / 1.00x when modules unset) ---
        IMembershipTiers.Benefits memory benefits = _benefitsOf(msg.sender);

        // --- access gates for Founder/Black packs ---
        _enforceAccessGates(pack, packId, benefits.tierId);

        openingId = nextOpeningId++;

        // Holder discount comes exclusively out of the treasury leg — the
        // stock purchase and jackpot contribution are never reduced.
        uint256 effectiveFee = pack.protocolFee;
        uint256 discount = (pack.price * benefits.discountBps) / 10_000;
        if (discount > effectiveFee) discount = effectiveFee;
        effectiveFee -= discount;
        if (discount > 0) emit HolderDiscountApplied(openingId, benefits.tierId, discount);

        // Token burn (holders) or Mode B surcharge (non-holders). Only active
        // when the burn system is fully configured; the base product never
        // depends on the token.
        uint256 surcharge;
        if (_burnConfigured()) {
            uint256 burned = _tryBurn(msg.sender, openingId);
            if (burned == 0) {
                surcharge = nonHolderSurchargeUsdg;
                effectiveFee += surcharge;
                emit NonHolderSurchargeApplied(openingId, surcharge);
            }
        }

        uint256 price = pack.price - discount + surcharge;
        if (creditAmount > price) creditAmount = price;

        // --- funds in (checks-effects-interactions: state below is written
        //     after transfers, but all transfers are into this contract) ---
        if (creditAmount > 0) {
            // PackCredits transfers `creditAmount` USDG into this contract,
            // guaranteeing the opening is always fully funded.
            uint256 beforeBal = usdg.balanceOf(address(this));
            packCredits.spendFor(msg.sender, creditAmount);
            if (usdg.balanceOf(address(this)) - beforeBal != creditAmount) revert FeeOnTransferNotSupported();
        }
        uint256 cashPortion = price - creditAmount;
        if (cashPortion > 0) {
            uint256 beforeBal = usdg.balanceOf(address(this));
            usdg.safeTransferFrom(msg.sender, address(this), cashPortion);
            if (usdg.balanceOf(address(this)) - beforeBal != cashPortion) revert FeeOnTransferNotSupported();
        }

        // Holder stock subsidy: pull real, pre-funded USDG from the rewards
        // vault or fall back to the base amount. Never an unfunded promise.
        uint256 subsidy;
        if (benefits.stockSubsidyUsdg > 0 && address(rewardsVault) != address(0)) {
            if (rewardsVault.pullFunding(benefits.stockSubsidyUsdg)) {
                subsidy = benefits.stockSubsidyUsdg;
                emit StockSubsidyApplied(openingId, benefits.tierId, subsidy);
            }
        }

        Opening storage opening = openings[openingId];
        opening.id = openingId;
        opening.user = msg.sender;
        opening.packId = packId;
        opening.packVersion = pack.version;
        opening.amountPaid = price;
        opening.stockAmount = pack.stockAmount + subsidy;
        opening.protocolFee = effectiveFee;
        opening.jackpotContribution = pack.jackpotContribution;
        opening.adapter = address(swapAdapter);
        opening.userMaxSlippageBps = maxSlippageBps;
        opening.jackpotThresholdSnapshot = jackpotThreshold;
        opening.createdAt = uint64(block.timestamp);
        opening.subsidyAmount = subsidy;
        opening.baseXP = pack.baseXP;
        opening.xpMultiplierBps = benefits.xpMultiplierBps == 0 ? 10_000 : benefits.xpMultiplierBps;
        opening.tierId = benefits.tierId;
        opening.status = OpeningStatus.RandomnessRequested;

        // Freeze the exact stock set + weights this opening will settle with.
        StockOption[] storage snapshot = _openingOptions[openingId];
        StockOption[] storage source = _packOptions[packId];
        bytes32 hash = keccak256(abi.encode(source));
        for (uint256 i = 0; i < source.length; i++) {
            snapshot.push(source[i]);
        }
        opening.optionsHash = hash;

        pendingLiabilities += price + subsidy;

        uint256 requestId = coordinator.requestRandomness(2);
        opening.requestId = requestId;
        requestToOpening[requestId] = openingId;

        emit PackOpeningStarted(openingId, msg.sender, packId, price);
        emit RandomnessRequested(openingId, requestId);
    }

    // ---------------------------------------------------- utility helpers

    function _benefitsOf(address user) internal view returns (IMembershipTiers.Benefits memory benefits) {
        if (address(membershipTiers) != address(0)) {
            benefits = membershipTiers.benefitsOf(user);
        } else {
            benefits.xpMultiplierBps = 10_000;
        }
    }

    function _burnConfigured() internal view returns (bool) {
        return burnEnabled && address(tokenPriceAdapter) != address(0) && address(protocolToken) != address(0);
    }

    /// @dev Burn `burnUsdValue` worth of STOCKPACKZ from `user`, quantity
    ///      derived from the price adapter. Returns 0 (no burn) when the
    ///      oracle is stale/out-of-bounds or the user lacks balance or
    ///      allowance — the caller then applies the Mode B surcharge.
    function _tryBurn(address user, uint256 openingId) internal returns (uint256 tokenAmount) {
        try tokenPriceAdapter.tokenAmountForUsd(burnUsdValue) returns (uint256 amount) {
            if (amount == 0) return 0;
            if (protocolToken.balanceOf(user) < amount) return 0;
            if (protocolToken.allowance(user, address(this)) < amount) return 0;
            protocolToken.safeTransferFrom(user, BURN_ADDRESS, amount);
            totalTokensBurned += amount;
            emit TokenBurned(openingId, user, amount, burnUsdValue);
            return amount;
        } catch {
            return 0;
        }
    }

    function _enforceAccessGates(PackConfig storage pack, uint256 packId, uint8 tierId) internal {
        if (pack.minTier > 0 && tierId < pack.minTier) revert TierTooLow();
        if (pack.minLevel > 0) {
            if (address(xpManager) == address(0) || xpManager.levelOf(msg.sender) < pack.minLevel) {
                revert LevelTooLow();
            }
        }
        if (pack.globalSupplyCap > 0 && packTotalOpened[packId] >= pack.globalSupplyCap) revert SupplyCapReached();
        if (pack.maxOpeningsPerWalletPerDay > 0) {
            uint256 day = block.timestamp / 1 days;
            if (packOpenedPerDay[packId][msg.sender][day] >= pack.maxOpeningsPerWalletPerDay) {
                revert DailyLimitReached();
            }
            packOpenedPerDay[packId][msg.sender][day] += 1;
        }
        packTotalOpened[packId] += 1;
    }

    // ---------------------------------------------------------- fulfillment

    /// @notice Called by the randomness coordinator with two independently
    ///         derived words: word0 selects the stock, word1 rolls the jackpot.
    function rawFulfillRandomness(uint256 requestId, uint256[] calldata randomWords) external nonReentrant {
        if (msg.sender != address(coordinator)) revert NotCoordinator();
        uint256 openingId = requestToOpening[requestId];
        if (openingId == 0) revert UnknownRequest();
        delete requestToOpening[requestId]; // duplicate fulfillment protection

        Opening storage opening = openings[openingId];
        if (opening.status != OpeningStatus.RandomnessRequested) revert WrongStatus();
        require(randomWords.length >= 2, "need 2 words");

        // --- weighted stock selection from the frozen snapshot ---
        StockOption[] storage options = _openingOptions[openingId];
        uint256 roll = randomWords[0] % WEIGHT_DENOMINATOR;
        uint256 cumulative;
        StockOption memory selected;
        for (uint256 i = 0; i < options.length; i++) {
            cumulative += options[i].weight;
            if (roll < cumulative) {
                selected = options[i];
                break;
            }
        }
        // Weights are validated to sum to WEIGHT_DENOMINATOR, so selection is
        // guaranteed. `active` was validated at snapshot time.
        opening.selectedStock = selected.token;
        opening.selectedMaxSlippageBps = selected.maxSlippageBps;
        opening.selectedMinimumQuote = selected.minimumQuote;
        opening.jackpotRoll = randomWords[1] % JACKPOT_DENOMINATOR;
        opening.status = OpeningStatus.RandomnessFulfilled;

        emit RandomnessFulfilled(openingId, requestId);
        emit StockSelected(openingId, selected.token);

        _attemptSettlement(openingId);
    }

    /// @notice Retry a failed settlement with a (bounded) new slippage value.
    function retrySettlement(uint256 openingId, uint16 maxSlippageBps) external nonReentrant {
        Opening storage opening = openings[openingId];
        if (msg.sender != opening.user && !hasRole(KEEPER_ROLE, msg.sender)) revert NotOpener();
        if (opening.status != OpeningStatus.SettlementFailed) revert WrongStatus();
        if (maxSlippageBps > MAX_SLIPPAGE_CAP_BPS) revert SlippageTooHigh();
        opening.userMaxSlippageBps = maxSlippageBps;
        opening.status = OpeningStatus.RandomnessFulfilled;
        _attemptSettlement(openingId);
    }

    /// @notice Refund a failed settlement in full. Fee and jackpot were never
    ///         finalized, so the user gets the entire amount paid back.
    function refundOpening(uint256 openingId) external nonReentrant {
        Opening storage opening = openings[openingId];
        if (msg.sender != opening.user && !hasRole(KEEPER_ROLE, msg.sender)) revert NotOpener();
        if (opening.status != OpeningStatus.SettlementFailed) revert WrongStatus();

        opening.status = OpeningStatus.Refunded;
        pendingLiabilities -= opening.amountPaid + opening.subsidyAmount;
        _returnSubsidy(opening.subsidyAmount);
        usdg.safeTransfer(opening.user, opening.amountPaid);

        emit OpeningRefunded(openingId, opening.user, opening.amountPaid);
    }

    /// @notice Cancel an opening whose randomness never arrived.
    function cancelExpiredOpening(uint256 openingId) external nonReentrant {
        Opening storage opening = openings[openingId];
        if (msg.sender != opening.user && !hasRole(KEEPER_ROLE, msg.sender)) revert NotOpener();
        if (opening.status != OpeningStatus.RandomnessRequested) revert WrongStatus();
        if (block.timestamp < opening.createdAt + randomnessTimeout) revert TimeoutNotReached();

        opening.status = OpeningStatus.CancelledAndRefunded;
        delete requestToOpening[opening.requestId]; // stale fulfillment protection
        pendingLiabilities -= opening.amountPaid + opening.subsidyAmount;
        _returnSubsidy(opening.subsidyAmount);
        usdg.safeTransfer(opening.user, opening.amountPaid);

        emit OpeningRefunded(openingId, opening.user, opening.amountPaid);
    }

    // ------------------------------------------------------------ settlement

    function _attemptSettlement(uint256 openingId) internal {
        Opening storage opening = openings[openingId];

        try this.executeSettlement(openingId) returns (uint256 amountOut) {
            // --- success: finalize accounting (effects already guarded) ---
            opening.stockAmountReceived = amountOut;
            opening.status = OpeningStatus.Settled;
            pendingLiabilities -= opening.amountPaid + opening.subsidyAmount;

            treasuryAccrued += opening.protocolFee;
            emit ProtocolFeeCollected(openingId, opening.protocolFee);
            emit StockPurchased(openingId, opening.user, opening.selectedStock, opening.stockAmount, amountOut);

            // Explicit jackpot ordering:
            // 1. add this opening's contribution
            // 2. read resulting balance
            // 3. winner → pay 90%, retain 10% seed
            jackpotBalance += opening.jackpotContribution;
            emit JackpotFunded(openingId, opening.jackpotContribution, jackpotBalance);

            if (opening.jackpotRoll < opening.jackpotThresholdSnapshot) {
                opening.jackpotWinner = true;
                uint256 payout = (jackpotBalance * JACKPOT_WINNER_SHARE_BPS) / 10_000;
                uint256 seed = jackpotBalance - payout;
                jackpotBalance = seed;
                opening.jackpotPayout = payout;
                usdg.safeTransfer(opening.user, payout);
                emit JackpotWon(openingId, opening.user, payout, seed);
            }

            // XP is awarded only here — after the stock purchase settled.
            // Failed and refunded openings never reach this path.
            if (address(xpManager) != address(0) && opening.baseXP > 0) {
                try xpManager.awardXP(opening.user, opening.baseXP, opening.xpMultiplierBps) {} catch {}
            }

            emit OpeningSettled(openingId);
        } catch (bytes memory reason) {
            // Never silently take the user's money: park the opening and let
            // the user retry with new bounds or take a full refund.
            opening.status = OpeningStatus.SettlementFailed;
            emit OpeningFailed(openingId, reason);
        }
    }

    /// @notice Swap leg of settlement, self-callable only (enables try/catch).
    function executeSettlement(uint256 openingId) external returns (uint256 amountOut) {
        require(msg.sender == address(this), "internal");
        Opening storage opening = openings[openingId];

        IStockSwapAdapter adapter = IStockSwapAdapter(opening.adapter);
        address stock = opening.selectedStock;
        uint256 amountIn = opening.stockAmount;

        uint256 quoted = adapter.quote(address(usdg), stock, amountIn);
        if (quoted < opening.selectedMinimumQuote) revert QuoteBelowLiquidityFloor();

        // Tighter of the user's tolerance and the per-stock protocol cap.
        uint256 slippage = opening.userMaxSlippageBps < opening.selectedMaxSlippageBps
            ? opening.userMaxSlippageBps
            : opening.selectedMaxSlippageBps;
        uint256 minOut = quoted - (quoted * slippage) / 10_000;

        // Stock is delivered directly to the user — no custody after settlement.
        uint256 userBalanceBefore = IERC20(stock).balanceOf(opening.user);
        usdg.forceApprove(address(adapter), amountIn);
        amountOut =
            adapter.swapExactInput(address(usdg), stock, amountIn, minOut, opening.user, block.timestamp + swapDeadlineWindow);
        usdg.forceApprove(address(adapter), 0);

        uint256 received = IERC20(stock).balanceOf(opening.user) - userBalanceBefore;
        require(received >= minOut && received >= amountOut, "short delivery");
    }

    /// @dev Send an unused subsidy back to the rewards vault on refund/cancel.
    ///      Falls back to treasury accrual if the vault was unset meanwhile.
    function _returnSubsidy(uint256 amount) internal {
        if (amount == 0) return;
        if (address(rewardsVault) != address(0)) {
            usdg.safeTransfer(address(rewardsVault), amount);
        } else {
            treasuryAccrued += amount;
        }
    }

    // -------------------------------------------------------------- jackpot

    /// @notice Supplementary jackpot funding (e.g. converted token-tax USDG).
    function fundJackpot(uint256 amount) external nonReentrant {
        uint256 beforeBal = usdg.balanceOf(address(this));
        usdg.safeTransferFrom(msg.sender, address(this), amount);
        if (usdg.balanceOf(address(this)) - beforeBal != amount) revert FeeOnTransferNotSupported();
        jackpotBalance += amount;
        emit JackpotExternallyFunded(msg.sender, amount, jackpotBalance);
    }

    // ---------------------------------------------------------------- admin

    function setJackpotThreshold(uint256 threshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(threshold <= JACKPOT_DENOMINATOR, "threshold too high");
        jackpotThreshold = threshold;
        emit JackpotThresholdUpdated(threshold);
    }

    function setSwapAdapter(IStockSwapAdapter adapter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (address(adapter) == address(0)) revert ZeroAddress();
        swapAdapter = adapter;
        emit SwapAdapterUpdated(address(adapter));
    }

    function setCoordinator(IRandomnessCoordinator _coordinator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (address(_coordinator) == address(0)) revert ZeroAddress();
        coordinator = _coordinator;
        emit CoordinatorUpdated(address(_coordinator));
    }

    function setPackCredits(IPackCredits credits) external onlyRole(DEFAULT_ADMIN_ROLE) {
        packCredits = credits;
        emit PackCreditsUpdated(address(credits));
    }

    /// @notice Wire the optional token-utility modules. Any of them may be
    ///         zero — the base pack product functions without the token.
    function setUtilityModules(
        IMembershipTiers tiers,
        IPackRewardsVault vault,
        IXPManager xp,
        ITokenPriceAdapter priceAdapter,
        IERC20 token
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        membershipTiers = tiers;
        rewardsVault = vault;
        xpManager = xp;
        tokenPriceAdapter = priceAdapter;
        protocolToken = token;
        emit UtilityModulesUpdated(address(tiers), address(vault), address(xp), address(priceAdapter), address(token));
    }

    function setBurnConfig(bool enabled, uint256 usdValue, uint256 surcharge) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(usdValue <= 1e6 && surcharge <= 1e6, "config too high");
        burnEnabled = enabled;
        burnUsdValue = usdValue;
        nonHolderSurchargeUsdg = surcharge;
        emit BurnConfigUpdated(enabled, usdValue, surcharge);
    }

    function setRandomnessTimeout(uint256 timeout) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(timeout >= 1 hours, "timeout too short");
        randomnessTimeout = timeout;
    }

    function setSwapDeadlineWindow(uint256 window) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(window >= 1 minutes, "window too short");
        swapDeadlineWindow = window;
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /// @notice Withdraw accrued protocol fees only. Structurally cannot touch
    ///         the jackpot, pending settlements, or any user-owed funds.
    function withdrawTreasury(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (amount == 0 || amount > treasuryAccrued) revert NothingToWithdraw();
        uint256 safeBalance = usdg.balanceOf(address(this));
        uint256 reserved = pendingLiabilities + jackpotBalance;
        if (safeBalance < reserved || amount > safeBalance - reserved) revert WithdrawExceedsSafeBalance();

        treasuryAccrued -= amount;
        usdg.safeTransfer(to, amount);
        emit TreasuryWithdrawal(to, amount);
    }

    // ------------------------------------------------------------- internal

    function _validateEconomics(PackConfig memory config) internal pure {
        if (config.stockAmount + config.protocolFee + config.jackpotContribution != config.price) {
            revert InvalidSplit();
        }
        if (config.stockAmount == 0 || config.price == 0) revert InvalidSplit();
    }

    function _validateOptions(StockOption[] memory options) internal pure {
        if (options.length == 0) revert InvalidOption();
        uint256 total;
        for (uint256 i = 0; i < options.length; i++) {
            StockOption memory option = options[i];
            if (option.token == address(0) || !option.active || option.weight == 0) revert InvalidOption();
            if (option.maxSlippageBps > MAX_SLIPPAGE_CAP_BPS) revert SlippageTooHigh();
            total += option.weight;
        }
        if (total != WEIGHT_DENOMINATOR) revert InvalidWeights();
    }

    function _storeOptions(StockOption[] storage target, StockOption[] memory options) internal {
        while (target.length > 0) {
            target.pop();
        }
        for (uint256 i = 0; i < options.length; i++) {
            target.push(options[i]);
        }
    }
}
