# Protocol Contracts

The complete on-chain product logic lives in `contracts/` (Foundry). StockPackz settles every pack into **real tokenized stocks, just-in-time** — no inventory, no IOUs.

## Core economics

Default pack price: **10 USDG**, split on every opening:

| Leg | Amount | Destination |
| --- | --- | --- |
| Stock purchase | 9.00 USDG | Swapped via Uniswap v4 → user wallet |
| Protocol fee | 0.60 USDG | Treasury (accrued, withdrawable) |
| Jackpot | 0.40 USDG | Global jackpot vault |

All amounts are admin-configurable per pack, but the split must always sum to the price (`InvalidSplit` otherwise). The protocol never promises a fixed number of shares — the user receives whatever 9 USDG buys at the actual on-chain execution price.

## Contract map

- **`StockPackz.sol`** — pack configs, the opening state machine, jackpot vault, liability-aware treasury.
- **`adapters/UniswapV4Adapter.sol`** — `IStockSwapAdapter` implementation with a token allowlist, per-pair enable flags, and liquidity floors. The core depends only on the interface, so routing is replaceable.
- **`token/StockPackzToken.sol`** — optional membership token, 1% transfer tax split 50/50 into the Pack Rewards and Jackpot Support vaults. No reflections, no buyback, no swap-on-transfer.
- **`vaults/TaxVaultConverter.sol`** — keeper batch-converts taxed tokens → USDG (bounded slippage/deadline) and forwards to the jackpot or Pack Credits.
- **`credits/PackCredits.sol`** — non-transferable USDG-denominated credits, weekly epochs, holding tiers, fully backed 1:1. A free pack is still a fully funded pack.
- **`badges/CollectionBadges.sol`** — soulbound achievement NFTs, claimed once per wallet after on-chain balance verification.

## Opening state machine

```
Created → RandomnessRequested → RandomnessFulfilled → Settled
              │ (timeout)              ├→ SettlementFailed → retry → Settled
              ▼                        │                  └→ Refunded
      CancelledAndRefunded             ▼
```

1. `openPack(packId, maxSlippageBps, creditAmount)` pulls 10 USDG, snapshots the pack's exact stocks/weights **and the jackpot odds**, then requests verifiable randomness (2 words).
2. Fulfillment: word 0 selects the stock against the frozen snapshot; word 1 rolls the jackpot. The stock is never selected before payment is committed, and admin changes never affect a pending opening.
3. Settlement swaps 9 USDG → stock **directly to the user**. Only on success are the fee and jackpot finalized. A failed swap parks the opening in `SettlementFailed` — the user retries with new bounds or takes a **full 10 USDG refund**.

## Jackpot

- Every opening contributes 0.40 USDG to one global vault.
- Win check: `word1 % 1,000,000 < 40` → ≈ 1 in 25,000 openings.
- Explicit ordering: add contribution → read balance → winner gets **90%**, **10%** stays as the next seed.
- Token-tax conversions supplement the vault via `fundJackpot`, but pack contributions remain the primary funding.

## Safety properties

- OpenZeppelin `SafeERC20`, `ReentrancyGuard`, `AccessControl`, `Pausable`; checks-effects-interactions throughout.
- Duplicate/stale randomness rejected; requests map is cleared on first use.
- Fee-on-transfer settlement assets rejected by balance-delta checks.
- Liabilities tracked separately: admin withdrawals are capped to accrued fees and can never touch the jackpot, pending settlements, or issued credit backing.
- Pausing blocks new opens but never blocks refunds or cancellations.

## Tests

`cd contracts && forge test` — 49 tests cover weighted selection (boundary + distribution), the exact fee split, direct delivery, jackpot accrual/payout/seed, config-snapshot immunity, failure/retry/refund branches, randomness timeouts and replays, pause behavior, credit funding/claiming/spending, badge eligibility, and admin withdrawal limits. Deterministic random words are injected through `MockRandomnessCoordinator`.
