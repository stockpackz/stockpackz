# Token Utility & Progression

The STOCKPACKZ token is an **optional membership and progression layer**. The pack product fully works without it: the guaranteed 9 USDG stock purchase is always funded by the buyer and never depends on token price, tax revenue, or buybacks (there are none).

## Burn or surcharge (Mode B)

Every paid opening either burns token value or pays a surcharge — always visible, never hidden:

| User | Pays | Burn |
| --- | --- | --- |
| Holder | 10.00 USDG | ≈ $0.05 of STOCKPACKZ, sent to the dead address |
| Non-holder | 10.20 USDG | none |

The burn quantity is derived per-opening from an oracle price adapter (staleness- and bounds-checked) — never a hardcoded token amount. If the oracle is unusable or the user lacks balance/allowance, the opening safely falls back to the surcharge.

## Membership tiers (`MembershipTierManager`)

| Tier | Min PACKZ | Discount | Stock bonus | XP | Printer | Access |
| --- | --- | --- | --- | --- | --- | --- |
| Basic | 0 | — | — | 1.00x | — | Standard |
| Bronze | 1,000 | 2% | +$0.05 | 1.10x | 1 key / 24h | — |
| Silver | 10,000 | 3% | +$0.10 | 1.25x | 1 key / 12h | Early access |
| Gold | 50,000 | 5% | +$0.20 | 1.50x | 1 key / 6h | Founder Packs |
| Diamond | 250,000 | 7% | +$0.30 | 2.00x | 1 key / 2h | Black Packs |

Every threshold and benefit is admin-configurable. Discounts come **only** out of the treasury leg — the stock purchase and jackpot contribution are never reduced. Odds are never changed by tier: the same snapshotted weights apply to everyone.

## Stock subsidies (`PackRewardsVault`)

Tier subsidies increase the stock leg (e.g. Gold: 9.20 USDG buys stock). The extra USDG is **pulled from the funded Pack Rewards Vault before the opening is created**; if the vault can't fund it, the opening proceeds at the base 9.00 — never an unfunded promise, never a revert of the core product. Refunded openings return their subsidy to the vault.

## XP & levels (`XPManager` + `LevelUnlockRegistry`)

- XP is awarded **only after the stock purchase settles** — failed and refunded openings earn nothing.
- `finalXP = baseXP × tierMultiplier` (Standard 100, Premium 250, Founder 500, Black 1,000).
- The level curve is a configurable threshold table (L2: 500, L3: 1,200, … L100-anchor: 1,000,000).
- Unlocks (frames, reveal animations, pack eligibility, titles) live in an additive registry, so new rewards ship without touching the XP contract.
- Lifetime XP never resets; season XP resets each season; daily streaks are tracked on-chain.

## Founder Packs

Token-gated packs enforced on-chain at opening: minimum tier, minimum level, per-wallet daily caps, and a global supply cap — all snapshotted, all public. Same transparent weighted odds as every other pack.

## Flywheel

Holders get deterministic benefits → paid openings burn token value → trading tax (1%, split 50/50) fills the Rewards and Jackpot Support vaults → keepers convert to USDG → vaults fund better holder benefits and a bigger jackpot → and the base product keeps working at any token price.

## Phases

- **Phase 1 (implemented)**: burn/Mode B, tiers, discounts, subsidies, XP, levels, unlock registry, Founder Pack gates.
- **Phase 2**: staking-based Pack Printer + Pack Keys, seasonal XP, leaderboards.
- **Phase 3**: Black Packs, prestige, automated tax conversion, seasonal reward distribution.

Tests: `cd contracts && forge test` — the `TokenUtility` suite covers holder/non-holder pricing, oracle-tracked burn amounts, stale-oracle fallback, discount capping, subsidy funding/fallback/refund-return, XP-on-settle-only, level curves, unlock registry, Founder Pack gates, tier-independent odds, and full functionality with all modules unset.
