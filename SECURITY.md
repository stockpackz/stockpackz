# Security Policy

StockPackz moves user funds through randomness, swaps, and vault accounting. This document describes what the protocol defends against, what it assumes, what it knowingly does not solve, and how to report anything we missed.

## Threat model

### In scope

| Threat | Defense |
| --- | --- |
| Reentrancy via tokens, adapters, or callbacks | `ReentrancyGuard` on every external mutating entrypoint; checks-effects-interactions; state finalized before transfers |
| Randomness manipulation or prediction | Coordinator-only fulfillment; stock never selected before payment commits; no `block.timestamp` / `blockhash` / `tx.origin` entropy |
| Duplicate or stale randomness fulfillment | Request-id mapping cleared on first use; one-way status machine rejects replays; cancelled requests are invalidated |
| Admin changing odds/economics after a user pays | Full per-opening snapshot: stock set, weights, fees, jackpot odds, adapter, and tier benefits are frozen at payment |
| Failed swaps stranding user funds | `SettlementFailed` state with bounded retry or full refund; fees and jackpot finalized only after settlement |
| Shallow liquidity / price manipulation | Per-stock minimum-quote liquidity floors; user and protocol slippage caps (tighter wins); deadline-bounded swaps |
| Treasury draining user liabilities | Explicit liability accounting: pending settlements, jackpot balance, and credit backing are structurally non-withdrawable |
| Fee-on-transfer settlement assets | Balance-delta verification on every inbound transfer; mismatches revert |
| Stale or malicious oracle prices (token burn) | Staleness window + min/max sanity bounds; unusable oracle degrades to the fixed USDG surcharge, never a mis-burn |
| Flash-loan / temporary balance tier manipulation | Instant benefits are small and value-capped per opening; time-based rewards (Pack Printer) require staking with checkpoints (Phase 2) |
| Duplicate XP, badge, or credit claims | One-way settlement transition gates XP; per-wallet claim maps for badges and per-epoch maps for credits |
| Jackpot double-payment / underflow | Single explicit ordering (contribute → read → pay 90% / retain 10%); internally tracked balance, not `balanceOf` trust |

### Out of scope

- Compromise of the underlying tokenized-equity issuers or their peg
- Robinhood Chain consensus failures
- Uniswap v4 pool implementation bugs
- Phishing, wallet malware, or key theft on the user side

## Trust assumptions

1. **USDG and tokenized stocks** are honest ERC-20s without fee-on-transfer behavior (violations are detected and reverted, not silently absorbed).
2. **The randomness coordinator** (Chainlink-VRF-style) is unbiased and live. Liveness failure is bounded: unfulfilled openings become user-cancellable after a timeout.
3. **The admin** is trusted for configuration but not for custody: no role can withdraw pending settlements, the jackpot, or issued reward backing, and no change affects an already-paid opening.
4. **Oracles** feeding the token price adapter are accurate within the configured staleness and sanity bounds.

## Known limitations

- The protocol is **pre-audit**. See [AUDIT_SCOPE.md](AUDIT_SCOPE.md).
- Wallet-balance tier checks are manipulable within one block; the design intentionally caps per-opening benefit value rather than pretending to solve this. Time-based accrual requires staking (Phase 2).
- The Uniswap v4 adapter wraps a minimal router interface pending finalized periphery deployments on Robinhood Chain.
- Jackpot win probability is enforced per-opening; the "1 in 25,000" figure is an expectation, not a schedule.

## Responsible disclosure

**Do not open a public issue for vulnerabilities.**

- Use GitHub's [private vulnerability reporting](../../security/advisories/new) on this repository.
- Include a proof of concept, affected contract(s), and an impact assessment if possible.

We commit to:

1. Acknowledging reports within **48 hours**
2. A triage decision within **7 days**
3. Credit in the advisory (or anonymity, your choice) once resolved

Please give us reasonable time to remediate before public disclosure.
