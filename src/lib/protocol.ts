/**
 * Protocol economics — mirrors the on-chain StockPackz configuration
 * (contracts/src/StockPackz.sol). One source of truth for the UI.
 */

export const PACK_ECONOMICS = {
  /** Pack price in USDG */
  price: 10,
  /** Guaranteed just-in-time stock purchase */
  stockAmount: 9,
  /** Protocol treasury fee */
  protocolFee: 0.6,
  /** Global jackpot vault contribution */
  jackpotContribution: 0.4,
} as const;

export const JACKPOT_ODDS = {
  /** jackpotWinningNumber < threshold wins */
  threshold: 40,
  denominator: 1_000_000,
  /** 90% paid to the winner, 10% retained as the next seed */
  winnerShareBps: 9_000,
  /** Human readable: ≈ 1 in 25,000 openings */
  approxOneIn: 25_000,
} as const;

export const WEIGHT_DENOMINATOR = 10_000;

/** Token burn (Mode B): holders burn ~$0.05 of PACKZ, non-holders pay a surcharge. */
export const BURN_ECONOMICS = {
  burnUsd: 0.05,
  nonHolderSurcharge: 0.2,
  nonHolderTotal: 10.2,
} as const;

/** Membership tiers — mirrors MembershipTierManager defaults on-chain. */
export interface MembershipTier {
  id: number;
  name: string;
  minTokens: number;
  discountPct: number;
  xpMultiplier: number;
  stockSubsidy: number;
  printerLevel: number;
  /** Hours between Pack Keys (0 = no printer) */
  keyIntervalHours: number;
  founderAccess: boolean;
  blackAccess: boolean;
}

export const MEMBERSHIP_TIERS: MembershipTier[] = [
  { id: 0, name: "Basic", minTokens: 0, discountPct: 0, xpMultiplier: 1.0, stockSubsidy: 0, printerLevel: 0, keyIntervalHours: 0, founderAccess: false, blackAccess: false },
  { id: 1, name: "Bronze", minTokens: 1_000, discountPct: 2, xpMultiplier: 1.1, stockSubsidy: 0.05, printerLevel: 1, keyIntervalHours: 24, founderAccess: false, blackAccess: false },
  { id: 2, name: "Silver", minTokens: 10_000, discountPct: 3, xpMultiplier: 1.25, stockSubsidy: 0.1, printerLevel: 2, keyIntervalHours: 12, founderAccess: false, blackAccess: false },
  { id: 3, name: "Gold", minTokens: 50_000, discountPct: 5, xpMultiplier: 1.5, stockSubsidy: 0.2, printerLevel: 3, keyIntervalHours: 6, founderAccess: true, blackAccess: false },
  { id: 4, name: "Diamond", minTokens: 250_000, discountPct: 7, xpMultiplier: 2.0, stockSubsidy: 0.3, printerLevel: 4, keyIntervalHours: 2, founderAccess: true, blackAccess: true },
];

/** XP per settled opening by pack class; multiplied by the tier multiplier. */
export const PACK_XP = {
  standard: 100,
  premium: 250,
  founder: 500,
  black: 1_000,
} as const;

/** Level curve anchors (lifetime XP → level). */
export const LEVEL_CURVE: { level: number; xp: number }[] = [
  { level: 1, xp: 0 },
  { level: 2, xp: 500 },
  { level: 3, xp: 1_200 },
  { level: 5, xp: 4_500 },
  { level: 10, xp: 15_000 },
  { level: 25, xp: 75_000 },
  { level: 50, xp: 250_000 },
  { level: 100, xp: 1_000_000 },
];

export const LEVEL_UNLOCKS: { level: number; name: string }[] = [
  { level: 5, name: "Profile frame" },
  { level: 10, name: "Premium reveal animation" },
  { level: 20, name: "Founder Pack eligibility" },
  { level: 30, name: "Animated badge" },
  { level: 50, name: "Gold Collector title" },
  { level: 75, name: "Advanced seasonal packs" },
  { level: 100, name: "Black Pack eligibility · Prestige" },
];

/**
 * Client-side mirror of the on-chain opening state machine.
 * Created → RandomnessRequested → RandomnessFulfilled → Settled
 * with SettlementFailed / Refunded failure branches.
 */
export type OpeningState =
  | "awaiting-approval"
  | "payment-submitted"
  | "waiting-randomness"
  | "stock-selected"
  | "executing-swap"
  | "settled"
  | "jackpot-won"
  | "failed";

export const OPENING_STATE_LABEL: Record<OpeningState, string> = {
  "awaiting-approval": "Awaiting wallet approval",
  "payment-submitted": "Payment submitted",
  "waiting-randomness": "Waiting for verifiable randomness",
  "stock-selected": "Stock selected",
  "executing-swap": "Executing Uniswap v4 swap",
  settled: "Settled",
  "jackpot-won": "Jackpot won",
  failed: "Settlement failed",
};

/** Full settlement payload returned by the pack-opening endpoint. */
export interface SettlementResult {
  packId: string;
  stock: import("./types").Stock;
  /** Stock tokens delivered to the wallet */
  tokenAmount: number;
  /** USD value of the delivered tokens */
  valueUsd: number;
  /** USDG spent on the stock leg (always PACK_ECONOMICS.stockAmount) */
  usdgIn: number;
  /** Actual on-chain execution price per token */
  executionPrice: number;
  jackpotContribution: number;
  jackpotWon: boolean;
  jackpotPayout: number;
  txHash: string;
  settledAt: string;
}
