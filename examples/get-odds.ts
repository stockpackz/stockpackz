/**
 * Read a pack's exact selection odds.
 *
 * Odds are on-chain weights over a 10,000 denominator, snapshotted per
 * opening — what you read here is exactly what your opening uses.
 */
import { StockPackzClient, NotDeployedError } from "@stockpackz/sdk";

const client = new StockPackzClient({ chain: "robinhood" });

async function main() {
  const odds = await client.packs.odds(1n);

  console.log("AI Pack — selection odds");
  for (const entry of odds) {
    const pct = (entry.probability * 100).toFixed(2);
    console.log(`  ${entry.token}  ${pct}%  (weight ${entry.weight}/10000)`);
  }

  const total = odds.reduce((sum, entry) => sum + entry.weight, 0);
  console.log(`Total weight: ${total} (always exactly 10,000)`);
}

main().catch((error) => {
  if (error instanceof NotDeployedError) console.log(error.message);
  else throw error;
});
