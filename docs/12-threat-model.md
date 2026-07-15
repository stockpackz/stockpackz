# Threat Model

An attacker-by-attacker walkthrough of who could try to break StockPackz, what they would attempt, and what stops them.

## The malicious user

**Attempts:** reentering settlement to double-draw; replaying randomness fulfillments; refunding an opening twice; claiming a badge or epoch credits repeatedly; opening gated packs without qualifying.

**Stopped by:** reentrancy guards and one-way status transitions (every transition checks the exact prior status); request-id invalidation on first fulfillment; per-wallet claim maps; on-chain gate checks (tier, level, daily count, supply) at opening time.

## The flash-loan whale

**Attempts:** borrowing STOCKPACKZ for one block to claim Diamond benefits, then repaying.

**Stopped by:** benefit design rather than detection. Instant benefits are value-capped per opening (≤ 0.70 USDG discount + 0.30 USDG subsidy) — far below flash-loan costs at scale. Time-based rewards (Pack Printer, Phase 2) require staking with a minimum continuous period and checkpointed balances, which flash loans cannot satisfy.

## The malicious admin (or stolen admin key)

**Attempts:** draining the jackpot; withdrawing funds owed to pending openings; changing odds or stock lists after users have paid; pointing the adapter at a malicious router to strand in-flight openings.

**Stopped by:** liability-aware withdrawal caps (`withdrawTreasury` cannot exceed accrued fees or dip below pending liabilities + jackpot); per-opening snapshots of odds, options, economics, and adapter address; the jackpot having no admin withdrawal path at all. A hostile admin can degrade *future* service, not confiscate committed funds.

## The MEV searcher / pool manipulator

**Attempts:** sandwiching settlement swaps; draining value through manipulated pool prices during fulfillment.

**Stopped by:** per-stock protocol slippage caps combined with user tolerances (the tighter bound wins), minimum-quote liquidity floors that fail settlement into the recoverable state rather than executing a bad swap, and deadline-bounded execution.

## The oracle failure

**Attempts:** a stale, zeroed, or manipulated token price feed causing over- or under-burns.

**Stopped by:** staleness windows and min/max sanity bounds in the price adapter; any violation reverts the quote and the opening falls back to the fixed USDG surcharge. The burn can be wrong by at most the configured bounds, and never blocks an opening.

## The randomness provider

**Attempts:** withholding fulfillment (liveness attack) or biasing words.

**Stopped by:** economic design — no one, including the coordinator, knows an opening's outcome before fulfillment, so withholding gains nothing; timed-out requests become user-cancellable for a full refund. Bias resistance is inherited from the VRF's cryptographic guarantees (a stated trust assumption).

## The broken integration

**Attempts:** a router that reports success but under-delivers; a token with fee-on-transfer semantics corrupting accounting.

**Stopped by:** delivery verification against the *recipient's* balance delta (not the adapter's return value); balance-delta checks on every inbound USDG transfer with explicit rejection of fee-on-transfer behavior.

## Residual risks

- Tokenized-equity issuer solvency and peg integrity are outside the protocol's control.
- Chain-level censorship or reorgs are inherited from Robinhood Chain.
- The protocol is pre-audit; this model documents intent, and review is required to confirm implementation.
