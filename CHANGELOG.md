# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com) and the project adheres to [Semantic Versioning](https://semver.org).

## [Unreleased]

## [0.2.0] — 2026-07-15

### Added

- **Token utility layer (Phase 1)** — membership tiers with configurable discounts, funded stock subsidies, and XP multipliers; oracle-priced token burn with Mode B surcharge fallback; XP manager with configurable level curve; additive level-unlock registry; Founder Pack gates (tier, level, daily cap, supply cap); `PackRewardsVault` with pull-or-fallback funding
- Token Utility page (`/token`) with tier comparison, progression, printer preview, burn statistics, and vault balances
- Profile dropdown in the navbar: per-wallet display names, collection completion, copy address, disconnect

### Changed

- Opening reveal is now gated on the authoritative server draw; no company is displayed before the draw resolves
- Pack opening UI displays full economics up front: split, burn, surcharge, odds, and XP

## [0.1.0] — 2026-07-15

### Added

- **Core protocol** — `StockPackz` pack engine with just-in-time settlement through a Uniswap v4 adapter, verifiable-randomness selection with per-opening snapshots, shared jackpot vault with explicit 90/10 payout ordering, failure-safe state machine (retry / full refund), and liability-aware treasury accounting
- **Supporting contracts** — protocol token with 50/50 tax vaults, keeper tax conversion, USDG-backed Pack Credits, soulbound collection badges
- **Frontend** — Next.js app: hero, pack explorer, cinematic opening flow, live activity, jackpot, rarity, transparency, and docs pages
- **Test suite** — Foundry tests with deterministic randomness injection covering selection distribution, fee splits, jackpot payout, snapshot immunity, failure branches, and withdrawal caps
