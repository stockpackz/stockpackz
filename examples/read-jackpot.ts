/**
 * Read the global jackpot vault.
 *
 * Every opening contributes 0.40 USDG. Wins are rolled per-opening from the
 * same verifiable randomness that selects the stock: roll < threshold wins,
 * paying 90% of the vault and retaining 10% as the next seed.
 */
import { StockPackzClient, NotDeployedError } from "@stockpackz/sdk";

const client = new StockPackzClient({ chain: "robinhood" });

async function main() {
  const jackpot = await client.jackpot.get();

  const probability = Number(jackpot.threshold) / Number(jackpot.denominator);
  const oneIn = Math.round(1 / probability);
  const payout = (jackpot.balance * BigInt(jackpot.winnerShareBps)) / 10_000n;

  console.log(`Jackpot vault: ${(Number(jackpot.balance) / 1e6).toLocaleString()} USDG`);
  console.log(`Odds per opening: 1 in ${oneIn.toLocaleString()}`);
  console.log(`Next winner receives: ${(Number(payout) / 1e6).toLocaleString()} USDG (90%)`);
}

main().catch((error) => {
  if (error instanceof NotDeployedError) console.log(error.message);
  else throw error;
});
