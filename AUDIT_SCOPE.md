# Audit Scope

This document defines the surface, invariants, and priorities for a security review of the StockPackz protocol. Status: **pre-audit** — no engagement has been completed yet.

## In-scope contracts

| Contract | LoC focus | Priority |
| --- | --- | --- |
| `contracts/src/StockPackz.sol` | Opening state machine, jackpot ordering, liability accounting, burn/surcharge, gates | Critical |
| `contracts/src/adapters/UniswapV4Adapter.sol` | Swap execution, allowlists, deadline/slippage enforcement | Critical |
| `contracts/src/vaults/PackRewardsVault.sol` | Pull-or-fallback funding semantics | High |
| `contracts/src/vaults/TaxVaultConverter.sol` | Keeper conversion bounds | High |
| `contracts/src/credits/PackCredits.sol` | Backing vs. liability accounting, epoch claims | High |
| `contracts/src/membership/MembershipTierManager.sol` | Tier resolution | Medium |
| `contracts/src/progression/XPManager.sol` | Award gating, curve math | Medium |
| `contracts/src/progression/LevelUnlockRegistry.sol` | Registry access | Low |
| `contracts/src/badges/CollectionBadges.sol` | Claim verification, soulbound enforcement | Medium |
| `contracts/src/token/StockPackzToken.sol` | Tax split correctness, exemptions | Medium |
| `contracts/src/adapters/OracleTokenPriceAdapter.sol` | Staleness/bounds checks | High |

Mocks (`contracts/src/mocks/*`) are out of scope except as test infrastructure.

## Core invariants to verify

1. A paid opening always terminates in exactly one of: `Settled`, `Refunded`, `CancelledAndRefunded` — and the user receives stock or their full payment, never neither.
2. `usdg.balanceOf(core) ≥ pendingLiabilities + jackpotBalance` at all times.
3. No admin path can reduce `pendingLiabilities` or `jackpotBalance` except through settlement, refunds, or jackpot payouts.
4. Treasury and jackpot legs are finalized if and only if the stock swap settled.
5. Stock selection uses only the per-opening snapshot; no post-payment configuration read affects a pending opening.
6. The jackpot pays exactly `floor(balance × 0.9)` and retains the remainder, with the contribution added before the balance read.
7. XP for an opening is awarded at most once, and only on the `Settled` transition.
8. Discounts never reduce the stock or jackpot legs; subsidies are always backed by an actual USDG transfer from the Rewards Vault.
9. The burn path never executes with a stale or out-of-bounds oracle price.
10. Weighted selection is uniform over the configured weights (denominator 10,000) for all random words.

## Known areas of nuance

- `executeSettlement` is an external self-call to enable try/catch; auditors should verify the `msg.sender == address(this)` guard and reentrancy interactions.
- Refund paths return tier subsidies to the current rewards vault address, which is admin-settable.
- Tier benefits derive from instantaneous wallet balances by design (documented flash-loan stance in SECURITY.md).

## Test suite

`cd contracts && forge test` — 68 tests, deterministic randomness. Reviewers are encouraged to extend the suite with adversarial cases; `MockSwapAdapter` supports failure, shallow-liquidity, and delivery-shortfall modes, and `MockPriceFeed` supports stale and out-of-bounds prices.
