/**
 * Open a pack and follow it to settlement.
 *
 * Flow: approve USDG → openPack → randomness → swap → stock in wallet.
 * A failed swap never loses funds: retry with wider slippage or refund.
 */
import { StockPackzClient, NotDeployedError } from "@stockpackz/sdk";

const client = new StockPackzClient({ chain: "robinhood" });

async function main() {
  const packId = 1n;

  // Everything the buyer pays is knowable up front.
  const pack = await client.packs.get(packId);
  console.log(`Opening "${pack.name}"`);
  console.log(`  price:    ${format(pack.price)} USDG`);
  console.log(`  to stock: ${format(pack.stockAmount)} USDG`);
  console.log(`  treasury: ${format(pack.protocolFee)} USDG`);
  console.log(`  jackpot:  ${format(pack.jackpotContribution)} USDG`);

  const opening = await client.packs.open({ packId, maxSlippageBps: 100 });
  console.log(`Opening #${opening.id} — waiting for verifiable randomness…`);

  const settled = await client.openings.waitForSettlement(opening.id);

  switch (settled.status) {
    case "settled":
      console.log(`Pulled ${settled.selectedStock}`);
      console.log(`Received ${settled.stockAmountReceived} tokens, directly in your wallet`);
      if (settled.jackpotWinner) {
        console.log(`JACKPOT: ${format(settled.jackpotPayout)} USDG`);
      }
      break;

    case "settlement-failed":
      // Bounded retry, or take the full refund.
      console.log("Swap failed — retrying with wider slippage");
      await client.openings.retry(settled.id, 300);
      break;

    default:
      console.log(`Terminal state: ${settled.status}`);
  }
}

const format = (usdg: bigint) => (Number(usdg) / 1e6).toFixed(2);

main().catch((error) => {
  if (error instanceof NotDeployedError) console.log(error.message);
  else throw error;
});
