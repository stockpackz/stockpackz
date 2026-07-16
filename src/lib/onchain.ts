import { parseEventLogs } from "viem";
import {
  getBalance,
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

/** Canonical WETH on Robinhood Chain (deepest WETH/USDG v4 pool: 0.3%). */
export const WETH_ADDRESS = "0x0bd7d308f8e1639fab988df18a8011f41eacad73" as const;
/** UniswapV4NativeAdapter — permissionless swapExactInput, used to convert WETH → USDG. */
export const ADAPTER_ADDRESS = "0x0b17df805a8c0921cb1b141f4515612028d8e4a7" as const;

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

const wethAbi = [
  ...erc20Abi,
  {
    type: "function",
    name: "deposit",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
] as const;

const adapterAbi = [
  {
    type: "function",
    name: "quote",
    stateMutability: "view",
    inputs: [{ type: "address" }, { type: "address" }, { type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "swapExactInput",
    stateMutability: "nonpayable",
    inputs: [
      { name: "inputToken", type: "address" },
      { name: "outputToken", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
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
 * Covers a USDG shortfall from the user's WETH via the protocol's own
 * Uniswap v4 adapter (permissionless swap). Wraps native ETH into WETH
 * first when the wallet holds ETH but not WETH.
 */
async function acquireUsdgWithWeth(account: `0x${string}`, shortfall: bigint): Promise<void> {
  // Rate probe: how much USDG does 0.001 WETH buy right now?
  const probeIn = 10n ** 15n;
  let usdgPerProbe: bigint;
  try {
    usdgPerProbe = await readContract(wagmiConfig, {
      address: ADAPTER_ADDRESS,
      abi: adapterAbi,
      functionName: "quote",
      args: [WETH_ADDRESS, USDG_ADDRESS, probeIn],
    });
  } catch {
    throw new OpeningError(
      "Not enough USDG and the WETH conversion route is unavailable. Get USDG on Robinhood Chain, then try again."
    );
  }
  if (usdgPerProbe === 0n) {
    throw new OpeningError("WETH/USDG pool has no liquidity right now. Pay with USDG instead.");
  }

  // WETH needed for the shortfall, +3% headroom for fee drift/slippage.
  const wethNeeded = (shortfall * probeIn * 103n) / (usdgPerProbe * 100n);

  const wethBalance = await readContract(wagmiConfig, {
    address: WETH_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account],
  });

  if (wethBalance < wethNeeded) {
    // Try wrapping native ETH to make up the difference (keep a gas reserve).
    const toWrap = wethNeeded - wethBalance;
    const gasReserve = 5n * 10n ** 14n; // 0.0005 ETH
    const { value: ethBalance } = await getBalance(wagmiConfig, { address: account });
    if (ethBalance < toWrap + gasReserve) {
      const needEth = Number(wethNeeded) / 1e18;
      throw new OpeningError(
        `Not enough funds: this pack needs ${(Number(shortfall) / 1e6).toFixed(2)} more USDG (≈${needEth.toFixed(5)} ETH/WETH). Top up USDG, WETH, or ETH on Robinhood Chain and try again.`
      );
    }
    const wrapHash = await writeContract(wagmiConfig, {
      address: WETH_ADDRESS,
      abi: wethAbi,
      functionName: "deposit",
      value: toWrap,
    });
    await waitForTransactionReceipt(wagmiConfig, { hash: wrapHash });
  }

  // Approve + swap WETH -> USDG, delivered straight back to the user.
  const wethAllowance = await readContract(wagmiConfig, {
    address: WETH_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: [account, ADAPTER_ADDRESS],
  });
  if (wethAllowance < wethNeeded) {
    const approveHash = await writeContract(wagmiConfig, {
      address: WETH_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [ADAPTER_ADDRESS, wethNeeded],
    });
    await waitForTransactionReceipt(wagmiConfig, { hash: approveHash });
  }
  const swapHash = await writeContract(wagmiConfig, {
    address: ADAPTER_ADDRESS,
    abi: adapterAbi,
    functionName: "swapExactInput",
    args: [
      WETH_ADDRESS,
      USDG_ADDRESS,
      wethNeeded,
      shortfall,
      account,
      BigInt(Math.floor(Date.now() / 1000) + 300),
    ],
  });
  await waitForTransactionReceipt(wagmiConfig, { hash: swapHash });
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

  // 0. Check the wallet holds enough USDG; if not, cover the shortfall by
  //    converting the user's WETH (wrapping native ETH first if needed).
  const usdgBalance = await readContract(wagmiConfig, {
    address: USDG_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account],
  });
  if (usdgBalance < price) {
    await acquireUsdgWithWeth(account, price - usdgBalance);
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

  // 4. Poll until settled (keeper + settlement usually < 10s). Keep
  //    re-nudging the keeper while waiting — a single dropped nudge must
  //    never strand an opening.
  const deadline = Date.now() + 120_000;
  let pollCount = 0;
  for (;;) {
    if (Date.now() > deadline) {
      throw new OpeningError(
        "Settlement is taking longer than expected — your funds are safe. Check back shortly or request a refund.",
        openingId
      );
    }
    await new Promise((r) => setTimeout(r, 1_800));
    if (pollCount++ % 3 === 1) {
      void fetch("/api/keeper", { method: "POST" }).catch(() => {});
    }

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
