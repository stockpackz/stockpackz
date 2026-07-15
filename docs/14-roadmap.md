# Roadmap

StockPackz ships in phases. Each phase is fully tested and documented before the next begins, and no later phase may weaken the core guarantee: every paid opening settles into a real tokenized stock or is fully refunded.

## Phase 1 — Core Packs ✅ Implemented

- Just-in-time settlement through the Uniswap v4 adapter
- Verifiable randomness with per-opening configuration snapshots
- Shared jackpot vault with explicit 90/10 payout ordering
- Failure-safe state machine: bounded retry or full refund
- Liability-aware treasury accounting
- Membership tiers: discounts, funded subsidies, XP multipliers
- Oracle-priced token burn with Mode B surcharge fallback
- XP, configurable level curve, additive unlock registry
- Founder Packs with tier, level, daily, and supply gates

## Phase 2 — Progression 🔨 In design

- Non-custodial STOCKPACKZ staking with checkpointed balances
- Pack Printer: lazily-accrued, non-transferable Pack Keys
- Key-funded packs, fully backed by the Pack Rewards Vault
- Seasons: seasonal XP, themed packs, exclusive badges
- Leaderboards with finalized, claimable rewards

## Phase 3 — Platform 📋 Planned

- `@stockpackz/sdk` general availability
- Creator Packs: curated third-party configurations with published odds
- Automated, rate-limited tax-conversion keepers
- Indexed analytics: openings, burns, jackpot history

## Phase 4 — Community 📋 Planned

- Community Packs proposed by token holders
- Governance over pack curation and seasonal calendars
- Prestige: permanent multipliers, prestige-only cosmetics
- Black Packs: endgame packs with public odds and vault-funded rewards
