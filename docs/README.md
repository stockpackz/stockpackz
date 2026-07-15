# Stockpackz Documentation

Welcome to the **Stockpackz** documentation — a premium pack-opening experience for real tokenized equities on Robinhood Chain.

## Documentation Index

| Document | Description |
|----------|-------------|
| [Overview](./01-overview.md) | Product vision, page structure, and design principles |
| [Tokenized Stocks](./02-tokenized-stocks.md) | Real Robinhood Chain ERC-20 tokens, contracts, logos, pricing |
| [Packs](./03-capsules.md) | Pack types, rarity system, odds, and the pack explorer |
| [Architecture](./04-architecture.md) | Next.js project structure, components, and data flow |
| [Opening Flow](./05-opening-flow.md) | The cinematic pack opening sequence, phase by phase |
| [Collections](./06-collections.md) | Portfolio collections and NFT badges |
| [Backend Integration](./07-backend-integration.md) | Connecting to Robinhood Chain, Chainlink, and your API |
| [How to Play](./08-how-to-play.md) | Connect wallet and open packs |

## Quick Start

```bash
npm install
npm run dev
```

- **App:** [http://localhost:3000](http://localhost:3000)
- **Docs:** [http://localhost:3000/docs](http://localhost:3000/docs)

## Key Facts

- **Product:** Stockpackz
- **Chain:** Robinhood Chain (chain ID `4663`)
- **Tokens:** ERC-20 / ERC-8056 stock tokens with Chainlink price feeds
- **Settlement:** Uniswap v4 swap into the user's own wallet (production design)
- **Logos:** Financial Modeling Prep CDN

## References

### Protocol & chain

- [Robinhood Chain — Building with Stock Tokens](https://docs.robinhood.com/chain/building-with-stock-tokens/)
- [Robinhood Chain — Token Contracts Registry](https://docs.robinhood.com/chain/contracts/)
- [Robinhood Chain — Oracles & Price Feeds](https://docs.robinhood.com/chain/oracles-and-price-feeds/)
- [Uniswap v4 documentation](https://docs.uniswap.org/contracts/v4/overview) · [GitHub](https://github.com/Uniswap/v4-core)
- [Chainlink Data Feeds](https://docs.chain.link/data-feeds) · [GitHub](https://github.com/smartcontractkit/chainlink)

### Frontend stack

| Library | Docs | GitHub |
|---------|------|--------|
| Next.js 16 (App Router) | [nextjs.org/docs](https://nextjs.org/docs) | [vercel/next.js](https://github.com/vercel/next.js) |
| Tailwind CSS v4 | [tailwindcss.com/docs](https://tailwindcss.com/docs) | [tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss) |
| shadcn/ui | [ui.shadcn.com](https://ui.shadcn.com) | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) |
| Magic UI | [magicui.design](https://magicui.design) | [magicuidesign/magicui](https://github.com/magicuidesign/magicui) |
| Framer Motion | [motion.dev](https://motion.dev) | [motiondivision/motion](https://github.com/motiondivision/motion) |
| wagmi | [wagmi.sh](https://wagmi.sh) | [wevm/wagmi](https://github.com/wevm/wagmi) |
| viem | [viem.sh](https://viem.sh) | [wevm/viem](https://github.com/wevm/viem) |
| canvas-confetti | — | [catdad/canvas-confetti](https://github.com/catdad/canvas-confetti) |
