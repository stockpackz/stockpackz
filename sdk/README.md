# @stockpackz/sdk

Typed TypeScript client for the StockPackz protocol: packs, openings, odds, XP, membership, and the jackpot.

> **Status:** API-stable skeleton. Contract transports land when Robinhood Chain deployment addresses are finalized (Roadmap Phase 3). Every method is fully typed today so integrations can build against the final surface.

## Install

```bash
npm install @stockpackz/sdk viem
```

## Usage

```ts
import { StockPackzClient } from "@stockpackz/sdk";

const client = new StockPackzClient({ chain: "robinhood" });

// Read a pack and its exact on-chain odds
const pack = await client.packs.get(1n);
const odds = await client.packs.odds(1n);

// Open a pack and follow it to settlement
const opening = await client.packs.open({ packId: 1n, maxSlippageBps: 100 });
const settled = await client.openings.waitForSettlement(opening.id);

console.log(settled.selectedStock, settled.stockAmountReceived);
```

See [`examples/`](../examples) for runnable scripts covering every namespace.

## Design

- **bigint everywhere** — amounts are never floats; USDG uses 6 decimals.
- **Terminal-state aware** — `waitForSettlement` resolves only on `settled`, `refunded`, or `cancelled-and-refunded`.
- **No hidden approvals** — `packs.open` reports required approvals; nothing is signed silently.

## License

MIT
