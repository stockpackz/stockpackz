export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface Stock {
  id: string;
  /** Underlying company / instrument name */
  name: string;
  /** On-chain ticker (ERC-20 symbol) */
  ticker: string;
  /** Full Robinhood token name */
  tokenName: string;
  /** Robinhood Chain contract address */
  contractAddress: string;
  /** USD price per 1.0 token (from Chainlink in production) */
  pricePerShareUsd: number;
  /** @deprecated Use pricePerShareUsd */
  price: number;
  rarity: Rarity;
  brandColor: string;
  /** @deprecated Use brandColor */
  color: string;
  logoUrl: string;
  sector: string;
  isLive: boolean;
  decimals: number;
}

export interface CapsuleType {
  id: string;
  name: string;
  description: string;
  price: number;
  assetCount: number;
  stocks: Stock[];
  artwork: {
    primary: string;
    secondary: string;
    accent: string;
  };
  rarityPreview: Rarity[];
  /** Mock: total packs opened globally */
  globalOpened: number;
  /** Mock: average collector completion % */
  completionPercent: number;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  stocks: string[];
  owned: string[];
  badgeEarned: boolean;
}

export interface RecentPull {
  id: string;
  user: string;
  stock: string;
  ticker: string;
  tokenAmount?: number;
  valueUsd?: number;
  rarity: Rarity;
  timestamp: Date;
}

export interface Stats {
  totalOpened: number;
  totalValueDistributed: number;
  uniqueCompanies: number;
  biggestPullEver: {
    user: string;
    stock: string;
    value: number;
  };
}

export type ActivityEventType = "pull" | "collection" | "pack_open" | "jackpot";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  user: string;
  target: string;
  timestamp: Date;
}

export interface RarityTier {
  tier: Rarity;
  label: string;
  stars: number;
  stocks: { name: string; ticker: string }[];
}

export interface PullResult {
  stock: Stock;
  capsule: CapsuleType;
  tokenAmount: number;
  valueUsd: number;
}
