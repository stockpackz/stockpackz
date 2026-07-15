import type { Address, Hex } from "viem";

/** Opening lifecycle — mirrors `StockPackz.OpeningStatus` on-chain. */
export type OpeningStatus =
  | "none"
  | "created"
  | "randomness-requested"
  | "randomness-fulfilled"
  | "settled"
  | "settlement-failed"
  | "refunded"
  | "cancelled-and-refunded";

export interface PackEconomics {
  /** Total USDG pulled from the buyer (6 decimals). */
  price: bigint;
  /** USDG swapped into the selected stock. */
  stockAmount: bigint;
  /** USDG accrued to the protocol treasury. */
  protocolFee: bigint;
  /** USDG retained in the global jackpot vault. */
  jackpotContribution: bigint;
}

export interface StockOption {
  token: Address;
  /** Selection weight in basis points of 10,000. */
  weight: number;
  /** Protocol slippage cap for this stock (bps). */
  maxSlippageBps: number;
  /** Liquidity floor — quotes below this fail settlement safely. */
  minimumQuote: bigint;
  active: boolean;
}

export interface Pack extends PackEconomics {
  id: bigint;
  name: string;
  description: string;
  imageURI: string;
  active: boolean;
  startsAt: bigint;
  endsAt: bigint;
  version: bigint;
  baseXP: bigint;
  minTier: number;
  minLevel: bigint;
  maxOpeningsPerWalletPerDay: number;
  globalSupplyCap: bigint;
  options: StockOption[];
}

export interface Opening {
  id: bigint;
  user: Address;
  packId: bigint;
  packVersion: bigint;
  amountPaid: bigint;
  stockAmount: bigint;
  selectedStock: Address;
  stockAmountReceived: bigint;
  jackpotWinner: boolean;
  jackpotPayout: bigint;
  subsidyAmount: bigint;
  status: OpeningStatus;
  txHash?: Hex;
}

export interface MembershipBenefits {
  tierId: number;
  tierName: string;
  discountBps: number;
  xpMultiplierBps: number;
  stockSubsidyUsdg: bigint;
  printerLevel: number;
  founderAccess: boolean;
  blackAccess: boolean;
}

export interface XPProfile {
  lifetimeXP: bigint;
  seasonXP: bigint;
  level: bigint;
  prestigeCount: number;
  dailyStreak: number;
}

export interface JackpotState {
  /** Current vault balance in USDG (6 decimals). */
  balance: bigint;
  /** Win when roll < threshold (out of `denominator`). */
  threshold: bigint;
  denominator: bigint;
  /** Winner share in basis points (default 9,000 = 90%). */
  winnerShareBps: number;
}

export interface OddsEntry {
  token: Address;
  /** Probability as a fraction of 1 (weight / 10,000). */
  probability: number;
  weight: number;
}

export interface OpenPackParams {
  packId: bigint;
  /** Slippage tolerance in bps; tightened by per-stock protocol caps. */
  maxSlippageBps: number;
  /** USDG-denominated Pack Credits to apply. Defaults to 0. */
  creditAmount?: bigint;
}

export interface StockPackzClientConfig {
  /** Named chain preset or a custom RPC URL. */
  chain: "robinhood" | "localhost" | (string & {});
  /** Override contract addresses (required for custom chains). */
  addresses?: Partial<ContractAddresses>;
}

export interface ContractAddresses {
  stockPackz: Address;
  usdg: Address;
  membershipTiers: Address;
  xpManager: Address;
  packCredits: Address;
  collectionBadges: Address;
  token: Address;
}
