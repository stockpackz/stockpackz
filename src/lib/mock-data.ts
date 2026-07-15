import type {
  ActivityEvent,
  CapsuleType,
  Collection,
  RarityTier,
  RecentPull,
  Stats,
} from "./types";
import {
  TOKENIZED_STOCKS,
  toStockToken,
  generatePullAmount,
  ALL_TOKENIZED_STOCKS,
} from "./tokenized-stocks";

const t = (key: keyof typeof TOKENIZED_STOCKS) => toStockToken(TOKENIZED_STOCKS[key]);

export const capsuleTypes: CapsuleType[] = [
  {
    id: "ai",
    name: "AI Pack",
    description: "The companies building the future of intelligence",
    price: 9.99,
    assetCount: 4,
    stocks: [t("nvda"), t("amd"), t("intc"), t("mu")],
    artwork: { primary: "#0A0A0A", secondary: "#111111", accent: "#00C805" },
    rarityPreview: ["common", "epic", "legendary"],
    globalOpened: 412_800,
    completionPercent: 34,
  },
  {
    id: "mag7",
    name: "Magnificent Seven",
    description: "The titans that move markets",
    price: 14.99,
    assetCount: 7,
    stocks: [t("aapl"), t("msft"), t("amzn"), t("meta"), t("tsla"), t("googl"), t("nvda")],
    artwork: { primary: "#0D0D0D", secondary: "#141414", accent: "#C8C8CE" },
    rarityPreview: ["rare", "epic", "legendary"],
    globalOpened: 389_200,
    completionPercent: 28,
  },
  {
    id: "dividend",
    name: "Dividend Kings",
    description: "Generations of shareholder returns",
    price: 7.99,
    assetCount: 4,
    stocks: [t("jnj"), t("pg"), t("ko"), t("pep")],
    artwork: { primary: "#0F0F0F", secondary: "#161616", accent: "#D4AF37" },
    rarityPreview: ["common", "rare"],
    globalOpened: 256_400,
    completionPercent: 61,
  },
  {
    id: "healthcare",
    name: "Healthcare",
    description: "Essential health infrastructure",
    price: 8.99,
    assetCount: 3,
    stocks: [t("jnj"), t("pg"), t("pep")],
    artwork: { primary: "#0A0A0A", secondary: "#121212", accent: "#7CC4FF" },
    rarityPreview: ["common", "rare"],
    globalOpened: 178_900,
    completionPercent: 45,
  },
  {
    id: "future-tech",
    name: "Future Tech",
    description: "Semiconductors, crypto-adjacent & growth",
    price: 11.99,
    assetCount: 4,
    stocks: [t("nvda"), t("amd"), t("coin"), t("mu")],
    artwork: { primary: "#0B0B0B", secondary: "#151515", accent: "#A855F7" },
    rarityPreview: ["rare", "epic", "legendary"],
    globalOpened: 298_600,
    completionPercent: 22,
  },
];

export const collections: Collection[] = [
  {
    id: "ai-collection",
    name: "AI Collection",
    description: "Complete the AI & semiconductor portfolio",
    stocks: ["NVDA", "AMD", "INTC", "MU"],
    owned: ["NVDA", "AMD", "INTC"],
    badgeEarned: false,
    bonusStockUsd: 5,
    freePacks: 1,
  },
  {
    id: "mag7-collection",
    name: "Magnificent Seven",
    description: "Own the market's titans on Robinhood Chain",
    stocks: ["AAPL", "MSFT", "AMZN", "META", "TSLA", "GOOGL", "NVDA"],
    owned: ["AAPL", "MSFT", "NVDA"],
    badgeEarned: false,
    bonusStockUsd: 10,
    freePacks: 2,
  },
  {
    id: "dividend-kings",
    name: "Dividend Kings",
    description: "Generations of shareholder returns",
    stocks: ["JNJ", "PG", "KO", "PEP"],
    owned: ["JNJ", "PG", "KO", "PEP"],
    badgeEarned: true,
    bonusStockUsd: 4,
    freePacks: 1,
  },
  {
    id: "healthcare",
    name: "Healthcare",
    description: "Essential health infrastructure",
    stocks: ["JNJ", "PG", "PEP"],
    owned: ["JNJ"],
    badgeEarned: false,
    bonusStockUsd: 3,
    freePacks: 1,
  },
  {
    id: "future-tech",
    name: "Future Tech",
    description: "Next-generation technology exposure",
    stocks: ["NVDA", "AMD", "COIN", "MU"],
    owned: ["NVDA", "AMD"],
    badgeEarned: false,
    bonusStockUsd: 6,
    freePacks: 1,
  },
];

export const rarityTiers: RarityTier[] = [
  {
    tier: "legendary",
    label: "Legendary",
    stars: 5,
    stocks: [
      { name: "SpaceX", ticker: "SPCX" },
      { name: "OpenAI", ticker: "OPEN" },
    ],
  },
  {
    tier: "epic",
    label: "Epic",
    stars: 4,
    stocks: [
      { name: "NVIDIA", ticker: "NVDA" },
      { name: "Broadcom", ticker: "AVGO" },
    ],
  },
  {
    tier: "rare",
    label: "Rare",
    stars: 3,
    stocks: [
      { name: "Apple", ticker: "AAPL" },
      { name: "Microsoft", ticker: "MSFT" },
    ],
  },
  {
    tier: "common",
    label: "Common",
    stars: 2,
    stocks: [
      { name: "Disney", ticker: "DIS" },
      { name: "Ford", ticker: "F" },
    ],
  },
];

export const initialActivityEvents: ActivityEvent[] = [
  { id: "1", type: "pull", user: "Alex", target: "NVIDIA", timestamp: new Date(Date.now() - 8000) },
  { id: "2", type: "collection", user: "Sarah", target: "Magnificent Seven", timestamp: new Date(Date.now() - 22000) },
  { id: "3", type: "pull", user: "John", target: "Berkshire", timestamp: new Date(Date.now() - 41000) },
  { id: "4", type: "pack_open", user: "Emma", target: "AI Pack", timestamp: new Date(Date.now() - 58000) },
  { id: "5", type: "pull", user: "Marcus", target: "SpaceX", timestamp: new Date(Date.now() - 76000) },
];

export const initialRecentPulls: RecentPull[] = [
  { id: "1", user: "Achebe", stock: "Tesla", ticker: "TSLA", tokenAmount: 0.042, valueUsd: 14.8, rarity: "rare", timestamp: new Date(Date.now() - 12000) },
  { id: "2", user: "Alex", stock: "Apple", ticker: "AAPL", tokenAmount: 0.08, valueUsd: 18.27, rarity: "legendary", timestamp: new Date(Date.now() - 45000) },
  { id: "3", user: "John", stock: "SpaceX", ticker: "SPCX", tokenAmount: 0.12, valueUsd: 16.34, rarity: "legendary", timestamp: new Date(Date.now() - 89000) },
  { id: "4", user: "Emily", stock: "NVIDIA", ticker: "NVDA", tokenAmount: 0.095, valueUsd: 13.57, rarity: "legendary", timestamp: new Date(Date.now() - 120000) },
];

export const stats: Stats = {
  totalOpened: 1_400_000,
  totalValueDistributed: 28_400_000,
  uniqueCompanies: 142,
  biggestPullEver: { user: "Marcus T.", stock: "NVIDIA", value: 81_000 },
};

export const allTokenizedStocks = ALL_TOKENIZED_STOCKS;

export function pickRandomStock(capsule: CapsuleType) {
  const weights = { common: 50, rare: 30, epic: 15, legendary: 5 };
  const totalWeight = capsule.stocks.reduce((sum, s) => sum + weights[s.rarity], 0);
  let random = Math.random() * totalWeight;

  for (const stock of capsule.stocks) {
    random -= weights[stock.rarity];
    if (random <= 0) return stock;
  }
  return capsule.stocks[0];
}

export function pickRandomPull(capsule: CapsuleType) {
  const stock = pickRandomStock(capsule);
  const token = TOKENIZED_STOCKS[stock.id as keyof typeof TOKENIZED_STOCKS];
  const { tokenAmount, valueUsd } = generatePullAmount(token);
  return { stock, tokenAmount, valueUsd };
}

export const pullNames = [
  "Jordan", "Maya", "Chris", "Priya", "Leo", "Sofia", "Daniel", "Aisha",
  "Ryan", "Nina", "Omar", "Elena", "James", "Yuki", "Carlos", "Sarah", "Emma",
];

export const pullStocks = [
  { stock: "NVIDIA", ticker: "NVDA", rarity: "legendary" as const },
  { stock: "Apple", ticker: "AAPL", rarity: "legendary" as const },
  { stock: "Tesla", ticker: "TSLA", rarity: "rare" as const },
  { stock: "AMD", ticker: "AMD", rarity: "epic" as const },
  { stock: "Microsoft", ticker: "MSFT", rarity: "epic" as const },
  { stock: "SpaceX", ticker: "SPCX", rarity: "legendary" as const },
  { stock: "Amazon", ticker: "AMZN", rarity: "epic" as const },
  { stock: "Berkshire", ticker: "BRK.B", rarity: "legendary" as const },
];

export const activityTemplates: Omit<ActivityEvent, "id" | "timestamp">[] = [
  { type: "pull", user: "Alex", target: "NVIDIA" },
  { type: "pull", user: "Sarah", target: "Apple" },
  { type: "collection", user: "Jordan", target: "Magnificent Seven" },
  { type: "pack_open", user: "Emma", target: "AI Pack" },
  { type: "pull", user: "John", target: "Berkshire" },
  { type: "pull", user: "Marcus", target: "SpaceX" },
  { type: "collection", user: "Priya", target: "Dividend Kings" },
  { type: "pack_open", user: "Leo", target: "Future Tech" },
  { type: "pull", user: "Nina", target: "Tesla" },
  { type: "pull", user: "Omar", target: "Microsoft" },
  { type: "pull", user: "Yuki", target: "Amazon" },
  { type: "jackpot", user: "Lucas", target: "the Jackpot" },
  { type: "pack_open", user: "Elena", target: "Dividend Kings" },
  { type: "pull", user: "Chris", target: "AMD" },
];

export interface CollectorProfile {
  name: string;
  initials: string;
  hue: number;
  collection: string;
  companies: string[];
}

export const recentCollectors: CollectorProfile[] = [
  { name: "Maya R.", initials: "MR", hue: 145, collection: "Magnificent Seven", companies: ["AAPL", "MSFT", "AMZN", "META", "TSLA", "GOOGL", "NVDA"] },
  { name: "Daniel K.", initials: "DK", hue: 210, collection: "AI Collection", companies: ["NVDA", "AMD", "INTC", "MU"] },
  { name: "Sofia L.", initials: "SL", hue: 45, collection: "Dividend Kings", companies: ["JNJ", "PG", "KO", "PEP"] },
  { name: "James T.", initials: "JT", hue: 0, collection: "Healthcare", companies: ["JNJ", "PG", "PEP"] },
  { name: "Aisha B.", initials: "AB", hue: 280, collection: "Future Tech", companies: ["NVDA", "AMD", "COIN", "MU"] },
  { name: "Ryan P.", initials: "RP", hue: 170, collection: "Magnificent Seven", companies: ["AAPL", "MSFT", "AMZN", "META", "TSLA", "GOOGL", "NVDA"] },
];
