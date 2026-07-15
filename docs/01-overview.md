# Overview

## What is Stockpackz?

**Stockpackz** is a premium on-chain experience built on **Robinhood Chain** where users open themed packs and receive **real tokenized equities** — not points, not worthless rewards, not off-chain promises.

Each pack opening:

1. User selects and pays for a pack (mock USD pricing in preview)
2. A cinematic opening sequence plays (zoom, foil rotation, seal tear, burst, reveal)
3. A **fractional Robinhood stock token** is assigned (e.g. `0.05 NVDA`)
4. A swap pipeline animates the settlement: USDG → Uniswap v4 → Tokenized Stock → Wallet
5. User can **Open Again** or return to the page

## Design Principles

### Apple-quality minimalism
- Pure black backgrounds, generous whitespace, restrained typography
- No casino aesthetics, no slot machines
- Opening a pack should feel like unboxing an Apple product mixed with a Pokémon booster

### Robinhood-inspired identity
- Primary accent: `#00C805` — used **only** for important actions and live indicators
- Everything else black, white, and neutral; per-pack foil accents (silver, gold, ice blue, violet)
- Dark surfaces, Geist Sans typography

### Premium motion
- Framer Motion + Magic UI ([magicuidesign/magicui](https://github.com/magicuidesign/magicui))
- Only GPU-composited properties (transform, opacity) in animation loops — 60fps target

## Page Sections (top to bottom)

| Section | Component | Purpose |
|---------|-----------|---------|
| **Hero** | `hero.tsx` | Headline, CTA, floating foil pack with orbiting stock logos |
| **Ticker Strip** | `stock-ticker-strip.tsx` | Marquee of live tokenized stock quotes |
| **Live Openings** | `live-openings.tsx` | Animated feed of pack openings and jackpot wins |
| **Packs** | `capsule-grid.tsx` / `capsule-card.tsx` | Expandable pack explorer cards |
| **Jackpot** | `jackpot.tsx` | Shared vault visualization with growing counter |
| **Watchlist** | `stock-watchlist.tsx` | Featured stock cards with sparklines |
| **Rarity** | `rarity-showcase.tsx` | Legendary → Common tiers with metallic styling |
| **How It Works** | `how-to-play.tsx` | Horizontal timeline: Connect → Choose → Reveal → Own |
| **Transparency** | `transparency.tsx` | Animated settlement pipeline (USDG → … → Wallet) |
| **Product Facts** | `statistics.tsx` | Real product info cards (no fake metrics) |
| **Collections** | `collections.tsx` | Portfolio completion with company logos + badges |
| **Recently Collected** | `recently-collected.tsx` | Social proof: collectors and completed sets |
| **Final CTA** | `final-cta.tsx` | Closing call to action |
| **Trust Footer** | `page.tsx` | Settlement guarantee statement |

## User Journey

```
Land on Stockpackz → Connect wallet → Open Pack OR pick a pack card
    → Choose pack type → Cinematic reveal → Swap pipeline animates
    → Fractional token in portfolio → Open Again → Progress collections
```

## Tech Stack

Next.js 16 · TypeScript · Tailwind CSS v4 · shadcn/ui · Magic UI · Framer Motion · wagmi · viem

Full reference links with GitHub repositories: see [README](./README.md#references).
