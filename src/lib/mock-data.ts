import type { CapsuleType, Collection, RarityTier } from "./types";
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
  },
];

// Collection progress ("owned") starts empty — it reflects the connected
// wallet's real holdings once the on-chain indexer is wired up.
export const collections: Collection[] = [
  {
    id: "ai-collection",
    name: "AI Collection",
    description: "Complete the AI & semiconductor portfolio",
    stocks: ["NVDA", "AMD", "INTC", "MU"],
    owned: [],
    badgeEarned: false,
    bonusStockUsd: 5,
    freePacks: 1,
  },
  {
    id: "mag7-collection",
    name: "Magnificent Seven",
    description: "Own the market's titans on Robinhood Chain",
    stocks: ["AAPL", "MSFT", "AMZN", "META", "TSLA", "GOOGL", "NVDA"],
    owned: [],
    badgeEarned: false,
    bonusStockUsd: 10,
    freePacks: 2,
  },
  {
    id: "dividend-kings",
    name: "Dividend Kings",
    description: "Generations of shareholder returns",
    stocks: ["JNJ", "PG", "KO", "PEP"],
    owned: [],
    badgeEarned: false,
    bonusStockUsd: 4,
    freePacks: 1,
  },
  {
    id: "healthcare",
    name: "Healthcare",
    description: "Essential health infrastructure",
    stocks: ["JNJ", "PG", "PEP"],
    owned: [],
    badgeEarned: false,
    bonusStockUsd: 3,
    freePacks: 1,
  },
  {
    id: "future-tech",
    name: "Future Tech",
    description: "Next-generation technology exposure",
    stocks: ["NVDA", "AMD", "COIN", "MU"],
    owned: [],
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
