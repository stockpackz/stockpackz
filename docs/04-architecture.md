# Architecture

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout, fonts, metadata, favicon
│   ├── page.tsx            # Landing page — section order + flow state
│   ├── icon.png            # App icon
│   ├── docs/
│   │   └── page.tsx        # Documentation viewer (renders /docs/*.md)
│   └── globals.css         # Theme tokens, foil shimmer, animations
├── components/
│   ├── brand/
│   │   └── stockpackz-logo.tsx         # Logo (full / icon / wordmark variants)
│   ├── capsules/
│   │   ├── hero.tsx                    # Hero: headline + pack with orbiting logos
│   │   ├── stock-pack-visual.tsx       # Floating 3D foil pack render
│   │   ├── live-openings.tsx           # Live Openings feed (+ jackpot events)
│   │   ├── capsule-grid.tsx            # Pack section wrapper
│   │   ├── capsule-card.tsx            # Expandable pack explorer card
│   │   ├── jackpot.tsx                 # Jackpot vault + growing counter
│   │   ├── rarity-showcase.tsx         # Rarity tiers (metallic styling)
│   │   ├── how-to-play.tsx             # Horizontal how-it-works timeline
│   │   ├── transparency.tsx            # Settlement pipeline section
│   │   ├── statistics.tsx              # Real product info cards
│   │   ├── collections.tsx             # Collection cards with logo grids
│   │   ├── recently-collected.tsx      # Social proof avatars
│   │   ├── final-cta.tsx               # Closing CTA
│   │   ├── open-capsule-flow.tsx       # Cinematic opening sequence
│   │   ├── mini-pack.tsx               # Small pack render (selection list)
│   │   ├── stock-logo.tsx              # Logo with FMP CDN + fallback
│   │   ├── connect-wallet-prompt.tsx   # Wallet connect modal content
│   │   ├── wallet-button.tsx           # Connect / disconnect / switch UI
│   │   ├── page-background.tsx         # Particles + radial gradients
│   │   └── section-header.tsx          # Reusable section titles
│   ├── stocks/
│   │   ├── stock-ticker-strip.tsx      # Marquee ticker rows
│   │   ├── stock-ticker-item.tsx       # Single quote chip
│   │   ├── stock-watchlist.tsx         # Featured stock cards
│   │   └── stock-sparkline.tsx         # SVG sparkline
│   ├── docs/
│   │   └── docs-viewer.tsx             # Markdown docs renderer
│   ├── providers/
│   │   └── web3-provider.tsx           # WagmiProvider wrapper
│   └── ui/                             # shadcn + Magic UI
│       ├── button.tsx
│       ├── blur-fade.tsx
│       ├── orbiting-circles.tsx
│       ├── particles.tsx
│       ├── marquee.tsx
│       ├── number-ticker.tsx
│       └── ...
├── lib/
│   ├── tokenized-stocks.ts   # ⭐ Canonical token catalog (contracts, prices)
│   ├── mock-data.ts          # Packs, collections, activity, pull logic
│   ├── capsule-artwork.ts    # Pack artwork path mapping
│   ├── stock-market-mock.ts  # Deterministic mock quotes + sparklines
│   ├── chain.ts              # wagmi config + Robinhood Chain definition
│   ├── types.ts              # Shared TypeScript interfaces
│   └── utils.ts              # cn(), formatCurrency(), formatNumber()
└── public/graphics/          # Generated pack art, logo, hero assets
```

## Data Flow

```
tokenized-stocks.ts (source of truth for tokens)
        │
        ▼
mock-data.ts (packs reference tokens via toStockToken())
        │
        ▼
page.tsx (orchestrates state: flowOpen, selectedCapsule)
        │
        ├── CapsuleGrid → CapsuleCard → onSelect(capsule)
        ├── Hero / FinalCta → onOpenCapsule()
        └── OpenCapsuleFlow
                ├── pickRandomPull() → { stock, tokenAmount, valueUsd }
                └── onPullComplete(result) → future backend hook
```

## State Management

React local state only — no global store in the preview build.

| State | Location | Purpose |
|-------|----------|---------|
| `flowOpen` | `page.tsx` | Controls opening modal visibility |
| `selectedCapsule` | `page.tsx` | Pre-selected pack from card click |
| `phase` | `open-capsule-flow.tsx` | `focus → rotating → tearing → burst → reveal → swap → result` |
| `result` | `open-capsule-flow.tsx` | Pull outcome, drawn before the animation starts |
| `events` | `live-openings.tsx` | Simulated live feed (interval) |
| `value` | `jackpot.tsx` | Growing jackpot counter (interval) |
| `expanded` | `capsule-card.tsx` | Pack explorer panel toggle |

## Component Dependencies

### Magic UI ([magicuidesign/magicui](https://github.com/magicuidesign/magicui))

Installed via shadcn CLI:

```bash
npx shadcn@latest add "https://magicui.design/r/blur-fade.json"
```

| Component | Used In |
|-----------|---------|
| BlurFade | All section entrances |
| OrbitingCircles | Hero stock logos |
| Particles | Page background |
| Marquee | Stock ticker strip |
| NumberTicker | Statistics / counters |

### shadcn/ui ([shadcn-ui/ui](https://github.com/shadcn-ui/ui))

Initialized with Tailwind v4. Provides base `Button`, theming via CSS variables in `globals.css`.

### Framer Motion ([motiondivision/motion](https://github.com/motiondivision/motion))

All bespoke animation: card tilt/lift, floating logos, the opening cinematic, pipeline steps, feed transitions (`AnimatePresence` with `popLayout`).

## Theming

CSS variables in `:root` (`globals.css`):

```css
--rh-green: #00c805;
--background: #000000;
--foreground: #fafafa;
--surface-elevated: #111111;
--border: rgba(255, 255, 255, 0.08);
```

Green is reserved for primary actions and live indicators. Pack accents (silver, gold, ice blue, violet) come from `capsuleTypes[].artwork.accent`.

## TypeScript Types

Key interfaces in `src/lib/types.ts`:

- `Stock` — token with logo, contract, pricing, rarity
- `CapsuleType` — themed pack definition (incl. `globalOpened`, `completionPercent`)
- `PullResult` — `{ stock, capsule, tokenAmount, valueUsd }`
- `Collection` — portfolio completion tracker
- `ActivityEvent` — live feed entry (`pull | collection | pack_open | jackpot`)
- `RarityTier` — rarity showcase data

## Build & Deploy

```bash
npm run build    # Production build (Turbopack)
npm run start    # Serve production
npm run lint     # ESLint
```

Image domains configured in `next.config.ts`:
- `financialmodelingprep.com`
- `logo.clearbit.com` (fallback)

## Performance Notes

- All animation loops use transform/opacity only — GPU-composited, 60fps
- `StockLogo` uses `unoptimized` for external CDN images
- Particles canvas is pointer-events none — no interaction overhead
- `BlurFade` uses `useInView` with `once: true` — animations run once per section
- Opening flow timers tracked in refs and cleared on unmount

## Testing Recommendations

When adding backend integration:

1. Unit test `pickRandomPull` weight distribution
2. Unit test `generatePullAmount` bounds per rarity
3. Integration test wallet connect → open → receive token flow
4. E2E test the opening phase timeline transitions
5. Visual regression on pack cards and the reveal sequence
