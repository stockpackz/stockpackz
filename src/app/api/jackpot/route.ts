import { NextResponse } from "next/server";
import { createPublicClient, http, type Hex } from "viem";
import { robinhoodChain } from "@/lib/chain";

export const dynamic = "force-dynamic";

/**
 * Jackpot display = on-chain jackpotBalance only.
 * No off-chain "base pot" overlay — what you see is what's locked in the contract.
 */

const jackpotAbi = [
  {
    type: "function",
    name: "jackpotBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

export async function GET() {
  const core = process.env.NEXT_PUBLIC_STOCKPACKZ_ADDRESS as Hex | undefined;
  if (!core) {
    return NextResponse.json({ valueUsd: 0, growthPerSec: 0, updatedAt: new Date().toISOString() });
  }

  try {
    const client = createPublicClient({
      chain: robinhoodChain,
      transport: http(robinhoodChain.rpcUrls.default.http[0]),
    });
    const balance = await client.readContract({
      address: core,
      abi: jackpotAbi,
      functionName: "jackpotBalance",
    });
    return NextResponse.json({
      valueUsd: Number(balance) / 1e6,
      growthPerSec: 0,
      updatedAt: new Date().toISOString(),
      source: "on-chain",
      vault: core,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to read jackpotBalance", valueUsd: 0, growthPerSec: 0 },
      { status: 502 }
    );
  }
}
