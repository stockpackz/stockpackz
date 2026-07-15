# Collections

Collections let users build **themed portfolios** by acquiring tokenized stocks across capsule openings. Completing a collection earns an **NFT badge**.

**Component:** `src/components/capsules/collections.tsx`

## Collection Definitions

Defined in `src/lib/mock-data.ts`:

| Collection | Tickers Required | Description |
|------------|------------------|-------------|
| AI Collection | NVDA, AMD, INTC, MU | AI & semiconductor exposure |
| Magnificent Seven | AAPL, MSFT, AMZN, META, TSLA, GOOGL, NVDA | Market titans |
| Dividend Kings | JNJ, PG, KO, PEP | Consumer staples dividends |
| Healthcare | JNJ, PG, PEP | Healthcare infrastructure |
| Future Tech | NVDA, AMD, COIN, MU | Semiconductors & growth |

## Data Model

```typescript
interface Collection {
  id: string;
  name: string;
  description: string;
  stocks: string[];      // Required tickers
  owned: string[];       // User's owned tickers (mock)
  badgeEarned: boolean;  // NFT badge minted
}
```

## Progress Calculation

```
progress = (owned.length / stocks.length) × 100
```

Displayed as a large percentage — no progress bars.

## UI (current design)

Each collection card shows:

- **Company logo grid** — every required ticker as a real logo; owned logos in full color with a ring, missing logos dimmed/grayscale until the card is hovered
- **Hover reveal** — hovering the card brightens missing logos; hovering a logo shows a ticker tooltip
- **Collection artwork ghost** — the matching pack render faded in the card corner
- **Completion percentage** — large tabular number with "complete" label
- **Badge preview** — Award icon tile; gold with glow when `badgeEarned`, dimmed preview otherwise
- Logos float gently on staggered loops; cards lift on hover

## NFT Badges (Future)

In production, completing a collection should:

1. Verify user holds all required tokens (via `balanceOf` checks)
2. Call badge minting contract
3. Emit ERC-721 badge to user wallet
4. Set `badgeEarned: true` in user profile API

Badge metadata example:

```json
{
  "name": "AI Collection Badge",
  "description": "Completed the AI & Semiconductors portfolio on Robinhood Chain",
  "image": "ipfs://...",
  "attributes": [
    { "trait_type": "Collection", "value": "AI" },
    { "trait_type": "Completed", "value": "2026-07-15" }
  ]
}
```

## Syncing with Pulls

When backend is connected, each successful pull should:

1. Add ticker to user's `owned` array if not present
2. Recalculate collection progress
3. Trigger badge claim UI if collection reaches 100%

Hook: extend `onPullComplete` in `page.tsx`:

```typescript
const handlePullComplete = useCallback((result: PullResult) => {
  // POST /api/portfolio/add { ticker: result.stock.ticker, amount: result.tokenAmount }
}, []);
```

## Adding a Collection

1. Add entry to `collections` array in `mock-data.ts`
2. Ensure all tickers exist in `TOKENIZED_STOCKS`
3. Set initial `owned` array for demo state
4. Collection card auto-renders in grid (no component changes needed)
