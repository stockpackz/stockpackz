# Roadmap

StockPackz ships in deliberate phases. Each phase is fully tested and documented before the next begins, and nothing in a later phase is allowed to weaken the core guarantee: every paid opening settles into a real tokenized stock or is fully refunded.

## Phase 1 — Core Packs ✅

The pack engine, end to end.

- [x] Just-in-time settlement through the Uniswap v4 adapter
- [x] Verifiable randomness with per-opening configuration snapshots
- [x] Shared jackpot vault with explicit payout ordering (90% / 10% seed)
- [x] Failure-safe state machine — retry or full refund, never stranded funds
- [x] Liability-aware treasury accounting
- [x] Membership tiers: discounts, funded stock subsidies, XP multipliers
- [x] Token burn / Mode B surcharge with oracle-derived quantities
- [x] XP, configurable level curve, additive unlock registry
- [x] Founder Packs: tier, level, daily, and supply gates
- [x] 68-test Foundry suite with deterministic randomness injection

## Phase 2 — Progression 🔨

Time-based rewards, done safely.

- [ ] Non-custodial STOCKPACKZ staking with checkpointed balances
- [ ] Pack Printer: lazily-accrued, non-transferable Pack Keys
- [ ] Key-funded promotional packs, fully backed by the Pack Rewards Vault
- [ ] Seasons: seasonal XP, themed packs, exclusive badges
- [ ] Leaderboards with finalized, claimable season rewards

## Phase 3 — Platform 📋

The protocol as a developer surface.

- [ ] `@stockpackz/sdk` general availability (typed reads, writes, event streams)
- [ ] Creator Packs: curated third-party pack configurations with published odds
- [ ] Automated, rate-limited tax conversion keepers
- [ ] Indexed analytics API (openings, burns, jackpot history)

## Phase 4 — Community 📋

Handing the theme layer to holders.

- [ ] Community Packs: token-holder-proposed pack themes
- [ ] Governance over pack curation and seasonal calendars
- [ ] Prestige system with permanent multipliers and prestige-only cosmetics
- [ ] Black Packs: endgame packs with public odds and vault-funded rewards

---

Have a proposal that fits a phase? Open a [feature request](.github/ISSUE_TEMPLATE/feature_request.yml).
