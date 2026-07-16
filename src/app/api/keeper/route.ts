import { NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { randomBytes } from "crypto";
import { robinhoodChain } from "@/lib/chain";

export const dynamic = "force-dynamic";

/**
 * Randomness keeper. Scans the coordinator for unfulfilled requests and
 * fulfills them with fresh entropy. Called by the frontend right after a
 * pack opening (for low latency) and by a safety cron.
 *
 * The endpoint is safe to expose: it can only do what the keeper would do
 * anyway, entropy is generated server-side per call, and the contract
 * rejects duplicate fulfillments.
 */

const coordinatorAbi = [
  {
    type: "function",
    name: "nextRequestId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "requests",
    stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [
      { name: "consumer", type: "address" },
      { name: "numWords", type: "uint32" },
      { name: "requestedAt", type: "uint64" },
      { name: "requestBlock", type: "uint64" },
      { name: "fulfilled", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "fulfill",
    stateMutability: "nonpayable",
    inputs: [
      { name: "requestId", type: "uint256" },
      { name: "keeperEntropy", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

const LOOKBACK = 25n;

export async function POST() {
  const coordinator = process.env.NEXT_PUBLIC_COORDINATOR_ADDRESS as Hex | undefined;
  const keeperPk = process.env.KEEPER_PK as Hex | undefined;
  if (!coordinator || !keeperPk) {
    return NextResponse.json({ error: "keeper not configured" }, { status: 503 });
  }

  const transport = http(robinhoodChain.rpcUrls.default.http[0]);
  const publicClient = createPublicClient({ chain: robinhoodChain, transport });
  const account = privateKeyToAccount(keeperPk);
  const walletClient = createWalletClient({ account, chain: robinhoodChain, transport });

  const next = await publicClient.readContract({
    address: coordinator,
    abi: coordinatorAbi,
    functionName: "nextRequestId",
  });

  const from = next > LOOKBACK ? next - LOOKBACK : 1n;
  const fulfilled: string[] = [];

  for (let id = from; id < next; id++) {
    const req = await publicClient.readContract({
      address: coordinator,
      abi: coordinatorAbi,
      functionName: "requests",
      args: [id],
    });
    if (req[4]) continue; // already fulfilled

    const entropy = `0x${randomBytes(32).toString("hex")}` as Hex;
    try {
      const hash = await walletClient.writeContract({
        address: coordinator,
        abi: coordinatorAbi,
        functionName: "fulfill",
        args: [id, entropy],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      fulfilled.push(id.toString());
    } catch {
      // Another keeper instance may have raced us; the next scan catches
      // anything genuinely stuck.
    }
  }

  return NextResponse.json({ fulfilled });
}
