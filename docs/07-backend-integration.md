# Backend Integration

StockPackz is **live on Robinhood Chain mainnet** (chain ID 4663). This document describes what is wired today and what remains for later phases.

## Current State

| Feature | Status |
|---------|--------|
| Token catalog with real contracts | ✅ Live (`src/lib/tokenized-stocks.ts`) |
| Stock logos (FMP CDN) | ✅ Live |
| Wallet connection (wagmi, chain 4663) | ✅ Live (`src/lib/chain.ts`, `wallet-button.tsx`) |
| Pack opening UI (cinematic) | ✅ Live — wallet payment first, then reveal |
| On-chain settlement | ✅ Live — `StockPackz.openPack` + Uniswap v4 + keeper randomness |
| Live prices | ✅ Live — Uniswap v4 pool prices via `/api/stocks` |
| Live Openings feed | ✅ Live — indexed from `StockPurchased` / `JackpotWon` events |
| Jackpot counter | ✅ Live — `$300` base pot + on-chain vault via `/api/jackpot` |
| Pay with USDG or ETH/WETH | ✅ Live — auto WETH→USDG via the protocol adapter |
| User portfolio / collections persistence | ✅ Live — profile reads on-chain stock balances + XPManager |
| PACKZ holder burn / XP / tiers | ⚡ XP live · burn/tiers still pending (no price adapter) |

## Live Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────────────┐
│  Next.js    │────▶│  API Routes      │────▶│  Robinhood Chain (4663)     │
│  Frontend   │     │  /api/activity   │     │                             │
│  wagmi/viem │     │  /api/jackpot    │     │  StockPackz core            │
└──────┬──────┘     │  /api/stocks     │     │  UniswapV4NativeAdapter     │
       │            │  /api/keeper     │     │  KeeperRandomnessCoordinator│
       │            └──────────────────┘     │  Tokenized stock ERC-20s    │
       │                                     │  Uniswap v4 pools (prices)  │
       └────────────────────────────────────▶└─────────────────────────────┘
```

Deployed addresses: see [DEPLOYMENT.md](../DEPLOYMENT.md).

## Step 1: Wallet Connection

Use [wagmi](https://wagmi.sh) + [viem](https://viem.sh) for Robinhood Chain:

```typescript
import { createConfig, http } from 'wagmi';
import { robinhoodChain } from './chains'; // chain ID 4663

export const config = createConfig({
  chains: [robinhoodChain],
  transports: {
    [robinhoodChain.id]: http('https://rpc.robinhood.com'), // verify RPC URL
  },
});
```

Wrap app in `WagmiProvider` in `layout.tsx`.

## Step 2: Read Token Balances

```typescript
import { erc20Abi } from 'viem';
import { TOKENIZED_STOCKS } from '@/lib/tokenized-stocks';

async function getBalance(publicClient, userAddress, ticker) {
  const token = TOKENIZED_STOCKS[ticker.toLowerCase()];
  return publicClient.readContract({
    address: token.contractAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userAddress],
  });
}
```

For UI-adjusted shares (ERC-8056):

```typescript
// balanceOfUI(address) on stock token contract
```

## Step 3: Read Live Prices

```typescript
const aggregatorAbi = [
  {
    name: 'latestRoundData',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
  },
];

async function getTokenPrice(publicClient, feedAddress) {
  const [, answer, , updatedAt] = await publicClient.readContract({
    address: feedAddress,
    abi: aggregatorAbi,
    functionName: 'latestRoundData',
  });
  if (answer <= 0n || updatedAt === 0n) throw new Error('Stale price');
  return Number(answer) / 1e8; // verify decimals per feed
}
```

Store feed addresses in `tokenized-stocks.ts` (fetch from [Oracles docs](https://docs.robinhood.com/chain/oracles-and-price-feeds/)).

## Step 4: Capsule Smart Contract

Design a capsule contract (or use existing protocol):

```solidity
// Pseudocode
function openCapsule(uint256 capsuleId) external payable {
    require(msg.value >= capsulePrices[capsuleId], "Insufficient payment");
    (address token, uint256 amount) = _selectPull(capsuleId, msg.sender);
    IERC20(token).transfer(msg.sender, amount);
    emit CapsuleOpened(msg.sender, capsuleId, token, amount);
}
```

Frontend replaces `pickRandomPull()` with transaction + event listener.

## Step 5: API Routes

Suggested Next.js API routes:

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/capsules` | GET | List capsule types + current prices |
| `/api/capsules/open` | POST | Initiate open (return tx data) |
| `/api/portfolio` | GET | User holdings + collection progress |
| `/api/pulls/recent` | GET | Global recent pulls (from indexer) |
| `/api/stats` | GET | Aggregate statistics |

## Step 6: Indexer for Recent Pulls

Subscribe to `CapsuleOpened` and `Transfer` events via:

- [SQD Portal](https://sqd.dev) (Robinhood Chain dataset)
- Custom indexer with viem `watchContractEvent`
- The Graph subgraph

Replace the `setInterval` mocks in `live-openings.tsx` (feed) and `jackpot.tsx` (vault counter) with WebSocket or polling API.

## Step 7: Replace Mock Data

| File | Change |
|------|--------|
| `mock-data.ts` | Keep capsule definitions; remove mock pull logic |
| `tokenized-stocks.ts` | Add `priceFeedAddress`; fetch prices at runtime |
| `open-capsule-flow.tsx` | Accept pull result from tx callback |
| `page.tsx` | Add wagmi hooks, pass wallet address |
| `collections.tsx` | Fetch owned tickers from API |

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_CHAIN_ID=4663
NEXT_PUBLIC_RPC_URL=https://...
NEXT_PUBLIC_CAPSULE_CONTRACT=0x...
DATABASE_URL=postgresql://...
```

## Security Checklist

- [ ] Verify all token contract addresses against official registry
- [ ] Never trust client-side random for pull outcomes
- [ ] Validate Chainlink price staleness before displaying USD values
- [ ] Rate-limit API routes
- [ ] Sanitize user display names in global pulls feed
- [ ] Regional eligibility checks before allowing opens

## Hook Points in Frontend

```typescript
// src/app/page.tsx
const handlePullComplete = useCallback((result: PullResult) => {
  // 1. Refresh portfolio balances
  // 2. Update collection progress
  // 3. Log analytics event
  // 4. POST to /api/pulls to record globally
}, []);
```

## References

- [Building with Stock Tokens](https://docs.robinhood.com/chain/building-with-stock-tokens/)
- [Token Contracts Registry](https://docs.robinhood.com/chain/contracts/)
- [Oracles & Price Feeds](https://docs.robinhood.com/chain/oracles-and-price-feeds/)
- [ERC-8056 Scaled UI Amount](https://docs.robinhood.com/chain/building-with-stock-tokens/#erc-8056-corporate-actions)
- [SQD — Robinhood Tokenized Stocks Guide](https://sqd.dev/learn/robinhood-tokenized-stocks/)
