# How to Connect Your Wallet & Play

## Quick answer

1. Click **Connect Wallet** (top-right or hero)
2. Approve your browser wallet (MetaMask, Rabby, etc.)
3. Switch to **Robinhood Chain** if prompted (Chain ID **4663**)
4. Click **Open Pack** or tap any pack card
5. Choose a pack → watch the reveal → receive fractional stock tokens

---

## Supported wallets

Any **EVM-compatible** wallet works:

| Wallet | Notes |
|--------|-------|
| **Robinhood Wallet** | Native Robinhood Chain support (iOS/Android) |
| **MetaMask** | Add network manually or auto-switch on connect |
| **Rabby** | Multi-chain, works with injected connector |
| **Coinbase Wallet** | Browser extension |
| **Phantom** | EVM mode supported |

## Network details

Add Robinhood Chain manually if your wallet doesn't auto-detect:

| Property | Value |
|----------|-------|
| Network name | Robinhood Chain |
| Chain ID | **4663** |
| RPC URL | `https://rpc.mainnet.chain.robinhood.com` |
| Currency | ETH |
| Explorer | [robinhoodchain.blockscout.com](https://robinhoodchain.blockscout.com) |

Official guide: [Add network to your wallet](https://docs.robinhood.com/chain/add-network-to-wallet/)

---

## Step-by-step

### 1. Connect

Click **Connect Wallet** in the header. The app uses wagmi with the injected connector — your browser extension wallet will pop up.

If you're on the wrong network, click **Switch Network** (red button) to change to Robinhood Chain.

### 2. Choose a pack

| Pack | Price | What's inside |
|------|-------|---------------|
| AI Pack | $9.99 | NVDA, AMD, INTC, MU |
| Magnificent Seven | $14.99 | AAPL, MSFT, AMZN, META, TSLA, GOOGL, NVDA |
| Dividend Kings | $7.99 | JNJ, PG, KO, PEP |
| Healthcare | $8.99 | JNJ, PG, PEP |
| Future Tech | $11.99 | NVDA, AMD, COIN, MU |

Tip: every pack card is expandable — tap the chevron to see each possible company with its market price, rarity, and pull odds before you buy.

### 3. Open

- The pack lifts from the page and rotates in a studio spotlight
- The seal tears with escaping green light, then the pack bursts open
- Your company logo spins and decelerates into a massive name reveal
- The settlement pipeline animates: `USDG → Uniswap v4 → Token → Wallet`
- Your winning token appears with fractional amount (e.g. `0.05 NVDA ≈ $7.14`)
- **Legendary** pulls trigger confetti

### 4. After the pull

- **Done** — token stays in your portfolio
- **Open Again** — replay the full sequence with another pack

---

## Preview vs production

| Feature | Preview (now) | Production |
|---------|---------------|------------|
| Wallet connect | ✅ Real | ✅ Real |
| Network switch | ✅ Real | ✅ Real |
| Pack open | Simulated random pull | Smart contract + payment |
| Token transfer | Mock (UI only) | Real ERC-20 transfer |
| Price data | Static mock | Chainlink feeds |

The preview lets you experience the full UI flow after connecting. Production requires the Pack smart contract — see [Backend Integration](./07-backend-integration.md).

---

## Troubleshooting

**"Connect Wallet" does nothing**
→ Install MetaMask or another EVM wallet extension.

**Wrong network warning**
→ Click "Switch Network" or manually add Robinhood Chain (4663).

**No ETH for gas**
→ You need a small amount of ETH on Robinhood Chain for transactions. Bridge via [Robinhood Chain bridging docs](https://docs.robinhood.com/chain/bridging/).

**Wallet connected but can't open**
→ Ensure chain ID is exactly **4663**, not Ethereum mainnet.

---

## Technical implementation

Wallet logic lives in:

- `src/lib/chain.ts` — wagmi config + Robinhood Chain definition
- `src/components/providers/web3-provider.tsx` — WagmiProvider wrapper
- `src/components/capsules/wallet-button.tsx` — Connect/disconnect/switch UI
- `src/components/capsules/open-capsule-flow.tsx` — Gates play on `walletReady`
