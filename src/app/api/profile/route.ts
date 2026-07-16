import { NextResponse } from "next/server";
import { createPublicClient, http, type Hex } from "viem";
import { robinhoodChain } from "@/lib/chain";
import { collections } from "@/lib/mock-data";
import { TOKENIZED_STOCKS } from "@/lib/tokenized-stocks";
import { LEVEL_CURVE } from "@/lib/protocol";

export const dynamic = "force-dynamic";

const XP_MANAGER =
  (process.env.NEXT_PUBLIC_XP_MANAGER_ADDRESS as Hex | undefined) ??
  ("0xA67eeB87552238ea5E7FC976B0C77BB6c066eb78" as Hex);

const xpAbi = [
  {
    type: "function",
    name: "lifetimeXP",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "levelOf",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "profiles",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [
      { name: "lifetimeXP", type: "uint256" },
      { name: "seasonXP", type: "uint256" },
      { name: "seasonId", type: "uint32" },
      { name: "prestigeCount", type: "uint16" },
      { name: "dailyStreak", type: "uint16" },
      { name: "lastActivityAt", type: "uint64" },
    ],
  },
] as const;

const erc20BalanceAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

function levelProgress(lifetimeXP: number) {
  const next = LEVEL_CURVE.find((l) => l.xp > lifetimeXP) ?? LEVEL_CURVE.at(-1)!;
  const prev = [...LEVEL_CURVE].reverse().find((l) => l.xp <= lifetimeXP)?.xp ?? 0;
  const span = Math.max(1, next.xp - prev);
  return {
    nextLevel: next.level,
    nextLevelXp: next.xp,
    progressPct: Math.min(100, Math.round(((lifetimeXP - prev) / span) * 100)),
  };
}

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address") as Hex | null;
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  const client = createPublicClient({
    chain: robinhoodChain,
    transport: http(robinhoodChain.rpcUrls.default.http[0]),
  });

  let lifetimeXP = 0;
  let seasonXP = 0;
  let level = 1;
  let dailyStreak = 0;

  try {
    const [life, lvl, profile] = await Promise.all([
      client.readContract({
        address: XP_MANAGER,
        abi: xpAbi,
        functionName: "lifetimeXP",
        args: [address],
      }),
      client.readContract({
        address: XP_MANAGER,
        abi: xpAbi,
        functionName: "levelOf",
        args: [address],
      }),
      client.readContract({
        address: XP_MANAGER,
        abi: xpAbi,
        functionName: "profiles",
        args: [address],
      }),
    ]);
    lifetimeXP = Number(life);
    level = Number(lvl);
    seasonXP = Number(profile[1]);
    dailyStreak = Number(profile[4]);
  } catch {
    /* XP manager unreachable — return zeros */
  }

  // On-chain stock holdings for collection progress.
  const tickers = [...new Set(collections.flatMap((c) => c.stocks))];
  const ownedTickers: string[] = [];
  await Promise.all(
    tickers.map(async (ticker) => {
      const token = Object.values(TOKENIZED_STOCKS).find((t) => t.ticker === ticker);
      if (!token?.contractAddress || token.contractAddress === "0x0000000000000000000000000000000000000000") {
        return;
      }
      try {
        const bal = await client.readContract({
          address: token.contractAddress as Hex,
          abi: erc20BalanceAbi,
          functionName: "balanceOf",
          args: [address],
        });
        if (bal > 0n) ownedTickers.push(ticker);
      } catch {
        /* skip */
      }
    })
  );
  const ownedSet = new Set(ownedTickers);

  const collectionProgress = collections.map((c) => {
    const owned = c.stocks.filter((ticker) => ownedSet.has(ticker));
    return {
      id: c.id,
      name: c.name,
      total: c.stocks.length,
      owned,
      completed: owned.length === c.stocks.length && c.stocks.length > 0,
      bonusStockUsd: c.bonusStockUsd,
      freePacks: c.freePacks,
    };
  });

  return NextResponse.json({
    address,
    xp: {
      lifetimeXP,
      seasonXP,
      level,
      dailyStreak,
      ...levelProgress(lifetimeXP),
    },
    holdings: ownedTickers,
    collections: collectionProgress,
    xpManager: XP_MANAGER,
  });
}
