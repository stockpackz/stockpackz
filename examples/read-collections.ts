/**
 * Read collection progress for a wallet.
 *
 * Completion is computed from live token balances — no locking or burning.
 * Completed collections can claim a soulbound badge on-chain.
 */
import { StockPackzClient, NotDeployedError } from "@stockpackz/sdk";

const client = new StockPackzClient({ chain: "robinhood" });

async function main() {
  const wallet = "0x0000000000000000000000000000000000000001";

  const progress = await client.collections.progressOf(wallet);

  for (const collection of progress) {
    const bar = "█".repeat(collection.owned) + "░".repeat(collection.required - collection.owned);
    const state = collection.complete ? "COMPLETE — badge claimable" : `${collection.owned}/${collection.required}`;
    console.log(`${collection.name.padEnd(20)} ${bar} ${state}`);
  }
}

main().catch((error) => {
  if (error instanceof NotDeployedError) console.log(error.message);
  else throw error;
});
