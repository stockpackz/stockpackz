# Packs

Packs are themed containers that hold a **pool of tokenized stocks**. Opening a pack randomly selects one stock from the pool and transfers a fractional amount to the user.

## Pack Types

Defined in `src/lib/mock-data.ts` (`capsuleTypes`):

| Pack | Price | Assets | Stocks Included | Foil Accent |
|------|-------|--------|-----------------|-------------|
| **AI Pack** | $9.99 | 4 | NVDA, AMD, INTC, MU | Robinhood green `#00C805` |
| **Magnificent Seven** | $14.99 | 7 | AAPL, MSFT, AMZN, META, TSLA, GOOGL, NVDA | Platinum silver `#C8C8CE` |
| **Dividend Kings** | $7.99 | 4 | JNJ, PG, KO, PEP | Gold `#D4AF37` |
| **Healthcare** | $8.99 | 3 | JNJ, PG, PEP | Ice blue `#7CC4FF` |
| **Future Tech** | $11.99 | 4 | NVDA, AMD, COIN, MU | Electric violet `#A855F7` |

### Pack metadata

```typescript
interface CapsuleType {
  id: string;
  name: string;
  description: string;
  price: number;              // USD cost to open
  assetCount: number;         // Number of possible stocks
  stocks: Stock[];            // Token pool
  artwork: {
    primary: string;
    secondary: string;
    accent: string;           // Matches the pack's foil color
  };
  rarityPreview: Rarity[];
  globalOpened: number;       // Mock: packs opened globally
  completionPercent: number;  // Mock: average collector completion
}
```

> Internal code still uses `CapsuleType` — a legacy type name. User-facing copy says **Pack**.

## Pack Artwork

All five packs share one product design: a matte black foil sachet, straight-on studio shot, differing only in foil accent color and embossed emblem. Assets live in `public/graphics/capsule-*.png` and are mapped in `src/lib/capsule-artwork.ts`:

```typescript
export const CAPSULE_ARTWORK: Record<string, string> = {
  ai: "/graphics/capsule-ai.png",
  mag7: "/graphics/capsule-mag7.png",
  dividend: "/graphics/capsule-dividend.png",
  healthcare: "/graphics/capsule-healthcare.png",
  "future-tech": "/graphics/capsule-future-tech.png",
};
```

The hero pack (`hero-pack.png`) is the AI pack render with a feathered alpha edge so it floats on the page background.

## Rarity System

Weights defined in `RARITY_WEIGHTS` (`capsule-card.tsx`) and `pickRandomPull()` (`mock-data.ts`):

| Rarity | Color | Pull Weight | Typical Fraction |
|--------|-------|-------------|-----------------|
| Common | Gray | 50% | 0.01–0.05 tokens |
| Rare | Blue | 30% | 0.03–0.08 tokens |
| Epic | Purple | 15% | 0.05–0.12 tokens |
| Legendary | Gold | 5% | 0.08–0.20 tokens |

Per-stock odds shown in the pack explorer are the stock's rarity weight divided by the sum of weights in that pack.

## Pack Card UI (Pack Explorer)

File: `src/components/capsules/capsule-card.tsx`

- Studio-stage artwork area with per-pack accent glow; pack art floats and slowly sways
- 3D mouse tilt via Framer Motion springs (disabled while expanded)
- Floating stock logos and price chip over the stage
- Completion % and global open count with an animated hairline progress bar
- **Expandable explorer**: chevron toggles an inline panel listing every stock with logo, name, current market price, rarity, and pull odds — no tables
- Clicking the artwork or title starts the opening flow for that pack

## Pricing Model (Preview)

- **Pack price** = what the user pays to open (e.g. $9.99)
- **Token value** = fractional amount × Chainlink price (what they receive)

## Confetti Rules

Confetti fires **only** on Legendary pulls (see [Opening Flow](./05-opening-flow.md)).

## Extending Packs

1. Choose stocks from `TOKENIZED_STOCKS` in `src/lib/tokenized-stocks.ts`
2. Add entry to `capsuleTypes` in `mock-data.ts`
3. Generate matching foil artwork and add the mapping in `capsule-artwork.ts`
