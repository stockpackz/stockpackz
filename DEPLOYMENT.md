# Deployment Guide

Launch-day runbook: frontend on a custom domain, then the PACKZ token on Uniswap v4 — **without seeding liquidity**.

## 1. Frontend → Vercel + Namecheap DNS

Deploy (from the repo root):

```bash
npm i -g vercel
vercel --prod
```

Then add your domain in Vercel (**Project → Settings → Domains**) and create these records in Namecheap (**Domain List → Manage → Advanced DNS**):

| Type | Host | Value | TTL |
| --- | --- | --- | --- |
| A | `@` | `76.76.21.21` | Automatic |
| CNAME | `www` | `cname.vercel-dns.com` | Automatic |

Notes:

- Delete Namecheap's default parking records (`URL Redirect` / `CNAME @ parkingpage`) first, or the A record won't take effect.
- Keep Namecheap's **BasicDNS** (not their web-hosting DNS). Do not use "Namecheap Web Hosting" nameservers.
- Propagation is usually minutes but can take up to 48 h; Vercel shows a live check per record and issues TLS automatically once DNS resolves.

## 2. Token → Uniswap v4 (no liquidity at launch)

### Deploy the token

```bash
cd contracts
export DEPLOYER_PK=0x...          # fresh launch key, funded with gas only
export USDG=0x...                 # USDG on the target chain
export INITIAL_SUPPLY=1000000000  # whole tokens
forge script script/DeployToken.s.sol --rpc-url $RPC_URL --broadcast --verify
```

This deploys PACKZ plus the two tax vaults (Pack Rewards + Jackpot Support) and mints the full supply to the deployer. Nothing touches Uniswap yet.

### Exempt the v4 contracts from the transfer tax

The 1% tax **must not** apply to pool internals, or v4's settlement accounting will revert on every swap:

```solidity
token.setTaxExempt(POOL_MANAGER, true);
token.setTaxExempt(UNIVERSAL_ROUTER, true);
token.setTaxExempt(POSITION_MANAGER, true);
```

Buyers still pay the tax on normal wallet-to-wallet transfers; swaps route through exempt contracts, so the effective tax applies at the pool boundary exactly once.

### Initialize the pool — without adding liquidity

In v4, **creating a pool and funding it are separate actions**. `PoolManager.initialize` only registers the pool and sets its starting price; it moves zero tokens:

```solidity
poolManager.initialize(
    PoolKey({
        currency0: Currency.wrap(USDG),      // sort: lower address = currency0
        currency1: Currency.wrap(PACKZ),
        fee: 10_000,                          // 1% fee tier
        tickSpacing: 200,
        hooks: IHooks(address(0))             // no hook
    }),
    startingSqrtPriceX96                      // your chosen launch price
);
```

What "no liquidity" means in practice:

- The pool exists on-chain with your chosen price, and PACKZ is discoverable/indexable.
- **No one can actually trade** until someone adds liquidity — swaps against an empty pool revert.
- Liquidity is permissionless: any holder (or you, later) can add positions whenever you decide.
- You spend nothing at launch beyond gas, and there is no LP to rug or lock — which is also a clean trust story.

### Launch checklist

- [ ] Contracts verified on the explorer
- [ ] Tax exemptions set for PoolManager, Universal Router, Position Manager
- [ ] Vaults confirmed as tax destinations (send a 1-token test transfer between two non-exempt wallets; check 0.5% lands in each vault)
- [ ] Pool initialized at the intended starting price
- [ ] Admin keys moved to a hardware wallet or multisig
- [ ] Reminder: the protocol is **pre-audit** — do not point real user funds at the pack contracts yet (see `AUDIT_SCOPE.md`)
