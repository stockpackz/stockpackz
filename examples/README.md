# Examples

Runnable scripts demonstrating the `@stockpackz/sdk` surface. Each example is self-contained and typed.

| Example | What it shows |
| --- | --- |
| [`open-pack.ts`](open-pack.ts) | Open a pack, follow settlement, handle retry/refund |
| [`get-odds.ts`](get-odds.ts) | Read exact on-chain selection odds for a pack |
| [`read-collections.ts`](read-collections.ts) | Compute collection completion from wallet balances |
| [`query-xp.ts`](query-xp.ts) | Read a wallet's XP, level, and streak |
| [`read-jackpot.ts`](read-jackpot.ts) | Read the jackpot vault and win probability |

## Running

```bash
npm install
npx tsx examples/get-odds.ts
```

> The SDK's contract transports land with the Phase 3 deployment (see [ROADMAP.md](../ROADMAP.md)); until then the scripts document the final integration surface.
