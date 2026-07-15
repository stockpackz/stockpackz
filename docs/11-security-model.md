# Security Model

StockPackz is designed so that the safest path is the default path: user funds are either converted into stock or returned, and no privileged role can change that.

## Principles

1. **Payment before selection.** Randomness is requested only after USDG is committed. There is no code path where the outcome is known before payment.
2. **Snapshots over trust.** Every opening freezes its stock set, weights, economics, jackpot odds, adapter, and tier benefits at payment time. Administrators configure the future, never the past.
3. **Fees follow settlement.** The protocol earns nothing from an opening that didn't deliver stock. Treasury and jackpot legs finalize only on successful settlement.
4. **Liabilities are structural.** Pending settlements, the jackpot balance, and reward backing are tracked explicitly, and withdrawal functions are capped beneath them. This is enforced by arithmetic, not policy.
5. **Degrade, don't gamble.** A stale oracle skips the burn and charges the fixed surcharge. An empty rewards vault skips the subsidy and funds the base amount. A failed swap parks the opening for retry or refund. No failure mode improvises with user money.

## Defense layers

| Layer | Mechanism |
| --- | --- |
| Access | OpenZeppelin `AccessControl` with narrow roles (pack manager, keeper, pauser) |
| Reentrancy | `ReentrancyGuard` + checks-effects-interactions on every mutating entrypoint |
| Assets | `SafeERC20`, balance-delta verification, fee-on-transfer rejection |
| Swaps | Allowlists, pair enable flags, liquidity floors, slippage caps, deadlines |
| Randomness | Coordinator-only fulfillment, request-id invalidation, replay rejection |
| Emergency | `Pausable` blocks new openings; refunds and cancellations always remain live |

## What pausing can and cannot do

Pausing stops new pack openings. It cannot stop users from refunding failed openings or cancelling timed-out randomness requests — user exits are deliberately un-pausable.

## Related documents

- [Threat Model](12-threat-model.md) — attacker-by-attacker analysis
- Repository [SECURITY.md](https://github.com/stockpackz/stockpackz/blob/main/SECURITY.md) — disclosure policy
- [AUDIT_SCOPE.md](https://github.com/stockpackz/stockpackz/blob/main/AUDIT_SCOPE.md) — invariants for review
