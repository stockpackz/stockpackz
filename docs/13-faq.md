# FAQ

## Product

**What do I actually own after opening a pack?**
A tokenized stock — an ERC-20 representing real equity exposure on Robinhood Chain — delivered directly to your wallet. Not a point, not an IOU, not a claim on the protocol.

**How much stock do I get?**
Whatever 9.00 USDG buys at the actual on-chain execution price (plus your tier's subsidy, if funded). The protocol never promises a fixed number of shares because prices move.

**Are the odds real?**
Every pack publishes its exact selection weights on-chain in basis points of 10,000. Your opening uses a frozen snapshot of those weights taken when you paid — nothing can change them afterward, including us.

**Does rarity mean bigger payouts?**
No. Rarity is probability, not payout. Every standard opening funds the same guaranteed stock purchase; a Legendary pull is harder to hit, not worth more USDG.

**What happens if the swap fails?**
Your opening parks in a recoverable state. You can retry with new slippage bounds or take a full refund of everything you paid. The protocol takes no fee from failed openings.

**What if the randomness never arrives?**
After a timeout (default 24 hours) you can cancel and receive a full refund. Late randomness for a cancelled opening is rejected.

## Jackpot

**How does the jackpot work?**
Every opening contributes 0.40 USDG to one global vault. Each opening independently rolls a 1-in-25,000 chance (roll < 40 out of 1,000,000). Winners receive 90% of the vault; 10% seeds the next one.

**Can the team withdraw the jackpot?**
No. There is no admin code path that touches the jackpot balance. Withdrawals are capped at accrued protocol fees.

## Token

**Do I need the token?**
No. Packs work identically without it — you pay 10.20 USDG instead of 10.00 + a ~$0.05 burn, and you skip holder perks. The product functions at any token price, including zero.

**What does holding get me?**
Deterministic, published benefits: pack discounts (2–7%), funded stock subsidies (+$0.05–0.30), XP multipliers (1.1–2.0x), Pack Printer keys (Phase 2), and access to Founder and Black Packs. Never hidden odds changes.

**Where does the tax go?**
1% on transfers, split 50/50 between the Pack Rewards Vault and the Jackpot Support Vault. No marketing tax, no dev tax, no reflections, no buyback. Keepers convert accumulated tokens to USDG under strict slippage bounds.

## Development

**Is the protocol audited?**
Not yet — see [AUDIT_SCOPE.md](https://github.com/stockpackz/stockpackz/blob/main/AUDIT_SCOPE.md). Do not use with real funds until an audit completes.

**Can I build on it?**
Yes. The TypeScript SDK (`sdk/`) and runnable examples (`examples/`) are the supported integration surface. Contract interfaces live in `contracts/src/interfaces`.

**How do I report a vulnerability?**
Privately, via GitHub security advisories — never a public issue. See [SECURITY.md](https://github.com/stockpackz/stockpackz/blob/main/SECURITY.md).
