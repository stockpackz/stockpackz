import { parseEventLogs } from "viem";
import {
  readContract,
  writeContract,
  waitForTransactionReceipt,
} from "wagmi/actions";
import { wagmiConfig } from "./chain";
import { TOKENIZED_STOCKS, toStockToken } from "./tokenized-stocks";
import type { SettlementResult } from "./protocol";
import type { CapsuleType } from "./types";

/* ------------------------------------------------------------------ */
/* Deployment configuration                                            */
/* ------------------------------------------------------------------ */

export const STOCKPACKZ_ADDRESS = process.env
  .NEXT_PUBLIC_STOCKPACKZ_ADDRESS as `0x${string}` | undefined;
export const USDG_ADDRESS = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as const;

/** $PACKZ — launched on Flap (bonding curve), Robinhood Chain. */
export const PACKZ_ADDRESS = "0xaab3d2e25869dd9661e7a886b9a51c02ee6c7777" as const;
export const PACKZ_FLAP_URL =
  "https://flap.sh/robinhood/0xaab3d2e25869dd9661e7a886b9a51c02ee6c7777" as const;

/** Frontend pack id -> on-chain pack id (set by DeployProtocol.s.sol). */
export const ONCHAIN_PACK_IDS: Record<string, bigint> = {
  ai: 1n,
  "future-tech": 2n,
};

export function isOnchainPack(capsuleId: string): boolean {
  return Boolean(STOCKPACKZ_ADDRESS) && capsuleId in ONCHAIN_PACK_IDS;
}

/* ------------------------------------------------------------------ */
/* Minimal ABIs                                                        */
/* ------------------------------------------------------------------ */

export const erc20Abi = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [{ type: "address" }, { type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [{ type: "address" }, { type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export const stockPackzAbi = [
  {
    type: "function",
    name: "openPack",
    stateMutability: "nonpayable",
    inputs: [
      { name: "packId", type: "uint256" },
      { name: "maxSlippageBps", type: "uint16" },
      { name: "creditAmount", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "jackpotBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "openings",
    stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "user", type: "address" },
      { name: "packId", type: "uint256" },
      { name: "packVersion", type: "uint256" },
      { name: "amountPaid", type: "uint256" },
      { name: "stockAmount", type: "uint256" },
      { name: "protocolFee", type: "uint256" },
      { name: "jackpotContribution", type: "uint256" },
      { name: "requestId", type: "uint256" },
      { name: "adapter", type: "address" },
      { name: "userMaxSlippageBps", type: "uint16" },
      { name: "selectedStock", type: "address" },
      { name: "selectedMaxSlippageBps", type: "uint16" },
      { name: "selectedMinimumQuote", type: "uint256" },
      { name: "stockAmountReceived", type: "uint256" },
      { name: "jackpotRoll", type: "uint256" },
      { name: "jackpotThresholdSnapshot", type: "uint256" },
      { name: "jackpotWinner", type: "bool" },
      { name: "jackpotPayout", type: "uint256" },
      { name: "optionsHash", type: "bytes32" },
      { name: "createdAt", type: "uint64" },
      { name: "subsidyAmount", type: "uint256" },
      { name: "baseXP", type: "uint256" },
      { name: "xpMultiplierBps", type: "uint16" },
      { name: "tierId", type: "uint8" },
      { name: "status", type: "uint8" },
    ],
  },
  {
    type: "event",
    name: "PackOpeningStarted",
    inputs: [
      { name: "openingId", type: "uint256", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "packId", type: "uint256", indexed: true },
      { name: "amountPaid", type: "uint256", indexed: false },
    ],
  },
] as const;

/** OpeningStatus enum mirror. */
export const OPENING_STATUS = {
  Settled: 4,
  SettlementFailed: 5,
} as const;

/* ------------------------------------------------------------------ */
/* Real on-chain pack opening                                          */
/* ------------------------------------------------------------------ */

export class OpeningError extends Error {
  constructor(message: string, readonly openingId?: bigint) {
    super(message);
  }
}

/**
 * Full on-chain opening: approve USDG if needed, open the pack, nudge the
 * keeper, and poll until the opening settles into the user's wallet.
 */
export async function openPackOnchain(
  capsule: CapsuleType,
  account: `0x${string}`
): Promise<SettlementResult> {
  const core = STOCKPACKZ_ADDRESS;
  if (!core) throw new OpeningError("Contracts not configured");
  const onchainPackId = ONCHAIN_PACK_IDS[capsule.id];
  if (onchainPackId === undefined) throw new OpeningError("Pack not on-chain");

  const price = BigInt(Math.round(capsule.price * 1e6));

  // 0. Check the wallet actually holds enough USDG before prompting anything.
  const usdgBalance = await readContract(wagmiConfig, {
    address: USDG_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account],
  });
  if (usdgBalance < price) {
    const have = (Number(usdgBalance) / 1e6).toFixed(2);
    const need = (Number(price) / 1e6).toFixed(2);
    throw new OpeningError(
      `Not enough USDG: this pack costs ${need} USDG but your wallet holds ${have}. Get USDG on Robinhood Chain, then try again.`
    );
  }

  // 1. Ensure USDG allowance.
  const allowance = await readContract(wagmiConfig, {
    address: USDG_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: [account, core],
  });
  if (allowance < price) {
    const approveHash = await writeContract(wagmiConfig, {
      address: USDG_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [core, price],
    });
    await waitForTransactionReceipt(wagmiConfig, { hash: approveHash });
  }

  // 2. Open the pack (5% max slippage, no credits).
  const openHash = await writeContract(wagmiConfig, {
    address: core,
    abi: stockPackzAbi,
    functionName: "openPack",
    args: [onchainPackId, 500, 0n],
  });
  const receipt = await waitForTransactionReceipt(wagmiConfig, { hash: openHash });

  const logs = parseEventLogs({
    abi: stockPackzAbi,
    eventName: "PackOpeningStarted",
    logs: receipt.logs,
  });
  const openingId = logs[0]?.args.openingId;
  if (openingId === undefined) throw new OpeningError("Opening id not found in receipt");

  // 3. Nudge the keeper to fulfill randomness immediately.
  void fetch("/api/keeper", { method: "POST" }).catch(() => {});

  // 4. Poll until settled (keeper + settlement usually < 10s).
  const deadline = Date.now() + 90_000;
  for (;;) {
    if (Date.now() > deadline) {
      throw new OpeningError(
        "Settlement is taking longer than expected — your funds are safe. Check back shortly or request a refund.",
        openingId
      );
    }
    await new Promise((r) => setTimeout(r, 1_800));

    const opening = await readContract(wagmiConfig, {
      address: core,
      abi: stockPackzAbi,
      functionName: "openings",
      args: [openingId],
    });
    const status = opening[25];

    if (status === OPENING_STATUS.SettlementFailed) {
      throw new OpeningError(
        "The stock swap could not fill within slippage bounds. You can retry or take a full refund — your USDG is safe in the contract.",
        openingId
      );
    }
    if (status === OPENING_STATUS.Settled) {
      const selectedStock = opening[11].toLowerCase();
      const received = opening[14];
      const jackpotWon = opening[17];
      const jackpotPayout = opening[18];

      const token = Object.values(TOKENIZED_STOCKS).find(
        (t) => t.contractAddress.toLowerCase() === selectedStock
      );
      if (!token) throw new OpeningError("Unknown stock settled");

      const stock = toStockToken(token);
      const tokenAmount = Number(received) / 1e18;
      const stockUsdgIn = Number(opening[5]) / 1e6;

      return {
        packId: capsule.id,
        stock,
        tokenAmount,
        valueUsd: stockUsdgIn,
        usdgIn: stockUsdgIn,
        executionPrice: tokenAmount > 0 ? stockUsdgIn / tokenAmount : 0,
        jackpotContribution: Number(opening[7]) / 1e6,
        jackpotWon,
        jackpotPayout: Number(jackpotPayout) / 1e6,
        settledAt: new Date().toISOString(),
        txHash: openHash,
      };
    }
  }
}
