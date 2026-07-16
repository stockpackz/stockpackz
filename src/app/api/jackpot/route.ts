import { NextResponse } from "next/server";
import { createPublicClient, http, type Hex } from "viem";
import { robinhoodChain } from "@/lib/chain";

export const dynamic = "force-dynamic";

// Base jackpot seed shown until the on-chain vault is funded/deployed.
const BASE_USD = 500;

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

  let valueUsd = BASE_USD;
  if (core) {
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
      valueUsd = Number(balance) / 1e6;
    } catch {
      // RPC hiccup: fall back to the seed rather than erroring the UI.
    }
  }

  return NextResponse.json({
    valueUsd,
    growthPerSec: 0,
    updatedAt: new Date().toISOString(),
  });
}
