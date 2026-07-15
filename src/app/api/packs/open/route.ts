import { NextResponse } from "next/server";
import { capsuleTypes, pickRandomPull } from "@/lib/mock-data";
import { PACK_ECONOMICS, JACKPOT_ODDS, type SettlementResult } from "@/lib/protocol";

export const dynamic = "force-dynamic";

/**
 * Opens a pack server-side. The random draw happens here — never on the
 * client — mirroring how production delegates the draw to the StockPackz
 * contract with verifiable randomness (contracts/src/StockPackz.sol).
 *
 * Mirrors on-chain economics: 10 USDG in → 9 to the stock swap,
 * 0.60 protocol fee, 0.40 jackpot; independent jackpot roll
 * (roll < 40 / 1,000,000 wins, 90% paid / 10% seed retained).
 */
export async function POST(request: Request) {
  let body: { packId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const capsule = capsuleTypes.find((c) => c.id === body.packId);
  if (!capsule) {
    return NextResponse.json(
      { error: `Unknown packId: ${body.packId}` },
      { status: 404 }
    );
  }

  const pull = pickRandomPull(capsule);

  // Independent jackpot roll from the "same request" (mock).
  const jackpotRoll = Math.floor(Math.random() * JACKPOT_ODDS.denominator);
  const jackpotWon = jackpotRoll < JACKPOT_ODDS.threshold;
  // Mocked current vault size for payout display; on-chain this is the
  // vault balance after the current contribution.
  const jackpotPayout = jackpotWon
    ? Math.round(184_000 * (JACKPOT_ODDS.winnerShareBps / 10_000))
    : 0;

  const executionPrice =
    pull.tokenAmount > 0 ? pull.valueUsd / pull.tokenAmount : 0;

  const result: SettlementResult = {
    packId: capsule.id,
    stock: pull.stock,
    tokenAmount: pull.tokenAmount,
    valueUsd: pull.valueUsd,
    usdgIn: PACK_ECONOMICS.stockAmount,
    executionPrice,
    jackpotContribution: PACK_ECONOMICS.jackpotContribution,
    jackpotWon,
    jackpotPayout,
    settledAt: new Date().toISOString(),
    txHash: `0x${Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("")}`,
  };

  return NextResponse.json(result);
}
