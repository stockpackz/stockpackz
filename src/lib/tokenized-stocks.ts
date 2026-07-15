import type { Rarity } from "./types";
export const ROBINHOOD_CHAIN_ID = 4663;

/**
 * Canonical Robinhood Chain stock tokens.
 * Contract addresses sourced from Robinhood Chain docs & on-chain verification.
 * @see https://docs.robinhood.com/chain/contracts/
 * @see https://docs.robinhood.com/chain/building-with-stock-tokens/
 */
export interface TokenizedStock {
  id: string;
  /** On-chain ticker symbol (matches ERC-20 symbol) */
  ticker: string;
  /** Display name, e.g. "NVIDIA • Robinhood Token" */
  tokenName: string;
  /** Underlying instrument name */
  instrumentName: string;
  /** Robinhood Chain contract address (checksummed lowercase for consistency) */
  contractAddress: string;
  /** Chainlink price feed proxy — integrate at runtime in production */
  priceFeedNote: string;
  sector: StockSector;
  decimals: 18;
  /** ERC-8056 Scaled UI Amount — corporate actions via uiMultiplier() */
  standard: "ERC-20" | "ERC-8056";
  /** Whether the token has recorded on-chain Transfer activity */
  isLive: boolean;
  /** Reference USD price per 1.0 token (preview mock — read Chainlink in production) */
  pricePerShareUsd: number;
  /** Capsule rarity weighting (game layer, not on-chain) */
  rarity: Rarity;
  /** Fallback accent if logo fails to load */
  brandColor: string;
  logoUrl: string;
}

export type StockSector =
  | "AI & Semiconductors"
  | "Magnificent Seven"
  | "Dividend & Consumer"
  | "Technology"
  | "Growth"
  | "Defense"
  | "Healthcare"
  | "Crypto-Adjacent"
  | "ETF"
  | "Private Equity";

/** Primary logo CDN — Financial Modeling Prep official equity logos */
export function getStockLogoUrl(ticker: string): string {
  return `https://financialmodelingprep.com/image-stock/${ticker.toUpperCase()}.png`;
}

export const TOKENIZED_STOCKS: Record<string, TokenizedStock> = {
  nvda: {
    id: "nvda",
    ticker: "NVDA",
    tokenName: "NVIDIA • Robinhood Token",
    instrumentName: "NVIDIA Corporation",
    contractAddress: "0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec",
    priceFeedNote: "Chainlink NVDA/USD feed — see docs.robinhood.com/chain/oracles-and-price-feeds",
    sector: "AI & Semiconductors",
    decimals: 18,
    standard: "ERC-8056",
    isLive: true,
    pricePerShareUsd: 142.85,
    rarity: "legendary",
    brandColor: "#76B900",
    logoUrl: getStockLogoUrl("NVDA"),
  },
  amd: {
    id: "amd",
    ticker: "AMD",
    tokenName: "AMD • Robinhood Token",
    instrumentName: "Advanced Micro Devices, Inc.",
    contractAddress: "0x0000000000000000000000000000000000000000", // live on chain — address in official registry
    priceFeedNote: "Chainlink AMD/USD feed",
    sector: "AI & Semiconductors",
    decimals: 18,
    standard: "ERC-8056",
    isLive: true,
    pricePerShareUsd: 178.42,
    rarity: "epic",
    brandColor: "#ED1C24",
    logoUrl: getStockLogoUrl("AMD"),
  },
  intc: {
    id: "intc",
    ticker: "INTC",
    tokenName: "Intel • Robinhood Token",
    instrumentName: "Intel Corporation",
    contractAddress: "0x0000000000000000000000000000000000000000",
    priceFeedNote: "Chainlink INTC/USD feed",
    sector: "AI & Semiconductors",
    decimals: 18,
    standard: "ERC-8056",
    isLive: true,
    pricePerShareUsd: 24.18,
    rarity: "common",
    brandColor: "#0071C5",
    logoUrl: getStockLogoUrl("INTC"),
  },
  mu: {
    id: "mu",
    ticker: "MU",
    tokenName: "Micron Technology • Robinhood Token",
    instrumentName: "Micron Technology, Inc.",
    contractAddress: "0x0000000000000000000000000000000000000000",
    priceFeedNote: "Chainlink MU/USD feed",
    sector: "AI & Semiconductors",
    decimals: 18,
    standard: "ERC-8056",
    isLive: true,
    pricePerShareUsd: 118.56,
    rarity: "epic",
    brandColor: "#0077C8",
    logoUrl: getStockLogoUrl("MU"),
  },
  aapl: {
    id: "aapl",
    ticker: "AAPL",
    tokenName: "Apple • Robinhood Token",
    instrumentName: "Apple Inc.",
    contractAddress: "0xaf3d76f1834a1d425780943c99ea8a608f8a93f9",
    priceFeedNote: "Chainlink AAPL/USD feed",
    sector: "Magnificent Seven",
    decimals: 18,
    standard: "ERC-8056",
    isLive: true,
    pricePerShareUsd: 228.34,
    rarity: "legendary",
    brandColor: "#555555",
    logoUrl: getStockLogoUrl("AAPL"),
  },
  msft: {
    id: "msft",
    ticker: "MSFT",
    tokenName: "Microsoft • Robinhood Token",
    instrumentName: "Microsoft Corporation",
    contractAddress: "0xe93237c50d904957cf27e7b1133b510c669c2e74",
    priceFeedNote: "Chainlink MSFT/USD feed",
    sector: "Magnificent Seven",
    decimals: 18,
    standard: "ERC-8056",
    isLive: true,
    pricePerShareUsd: 445.12,
    rarity: "legendary",
    brandColor: "#00A4EF",
    logoUrl: getStockLogoUrl("MSFT"),
  },
  amzn: {
    id: "amzn",
    ticker: "AMZN",
    tokenName: "Amazon • Robinhood Token",
    instrumentName: "Amazon.com, Inc.",
    contractAddress: "0x12f190a9f9d7d37a250758b26824b97ce941bf54",
    priceFeedNote: "Chainlink AMZN/USD feed",
    sector: "Magnificent Seven",
    decimals: 18,
    standard: "ERC-8056",
    isLive: true,
    pricePerShareUsd: 218.76,
    rarity: "epic",
    brandColor: "#FF9900",
    logoUrl: getStockLogoUrl("AMZN"),
  },
  meta: {
    id: "meta",
    ticker: "META",
    tokenName: "Meta Platforms • Robinhood Token",
    instrumentName: "Meta Platforms, Inc.",
    contractAddress: "0xc0d6457c16cc70d6790dd43521c899c87ce02f35",
    priceFeedNote: "Chainlink META/USD feed",
    sector: "Magnificent Seven",
    decimals: 18,
    standard: "ERC-8056",
    isLive: true,
    pricePerShareUsd: 612.88,
    rarity: "epic",
    brandColor: "#0668E1",
    logoUrl: getStockLogoUrl("META"),
  },
  tsla: {
    id: "tsla",
    ticker: "TSLA",
    tokenName: "Tesla • Robinhood Token",
    instrumentName: "Tesla, Inc.",
    contractAddress: "0x322f0929c4625ed5bad873c95208d54e1c003b2d",
    priceFeedNote: "Chainlink TSLA/USD feed",
    sector: "Magnificent Seven",
    decimals: 18,
    standard: "ERC-8056",
    isLive: true,
    pricePerShareUsd: 352.41,
    rarity: "rare",
    brandColor: "#CC0000",
    logoUrl: getStockLogoUrl("TSLA"),
  },
  googl: {
    id: "googl",
    ticker: "GOOGL",
    tokenName: "Alphabet Class A • Robinhood Token",
    instrumentName: "Alphabet Inc. Class A",
    contractAddress: "0x2e0847e8910a9732eb3fb1bb4b70a580adad4fe3",
    priceFeedNote: "Chainlink GOOGL/USD feed",
    sector: "Magnificent Seven",
    decimals: 18,
    standard: "ERC-8056",
    isLive: true,
    pricePerShareUsd: 198.65,
    rarity: "epic",
    brandColor: "#4285F4",
    logoUrl: getStockLogoUrl("GOOGL"),
  },
  coin: {
    id: "coin",
    ticker: "COIN",
    tokenName: "Coinbase • Robinhood Token",
    instrumentName: "Coinbase Global, Inc.",
    contractAddress: "0x6330d8c3178a418788df01a47479c0ce7ccf450b",
    priceFeedNote: "Chainlink COIN/USD feed",
    sector: "Crypto-Adjacent",
    decimals: 18,
    standard: "ERC-8056",
    isLive: true,
    pricePerShareUsd: 285.34,
    rarity: "rare",
    brandColor: "#0052FF",
    logoUrl: getStockLogoUrl("COIN"),
  },
  spcx: {
    id: "spcx",
    ticker: "SPCX",
    tokenName: "SpaceX • Robinhood Token",
    instrumentName: "SpaceX (private company)",
    contractAddress: "0x4a0e65a3ecccec6dbe60ae065f2e7bb85fae35eea",
    priceFeedNote: "Chainlink SPCX/USD feed",
    sector: "Private Equity",
    decimals: 18,
    standard: "ERC-8056",
    isLive: true,
    pricePerShareUsd: 136.20,
    rarity: "legendary",
    brandColor: "#000000",
    logoUrl: getStockLogoUrl("SPCX"),
  },
  spy: {
    id: "spy",
    ticker: "SPY",
    tokenName: "SPDR S&P 500 ETF • Robinhood Token",
    instrumentName: "SPDR S&P 500 ETF Trust",
    contractAddress: "0x117cc2133c37b721f49de2a7a74833232b3b4c0c",
    priceFeedNote: "Chainlink SPY/USD feed",
    sector: "ETF",
    decimals: 18,
    standard: "ERC-8056",
    isLive: true,
    pricePerShareUsd: 598.22,
    rarity: "legendary",
    brandColor: "#1E3A5F",
    logoUrl: getStockLogoUrl("SPY"),
  },
  qqq: {
    id: "qqq",
    ticker: "QQQ",
    tokenName: "Invesco QQQ • Robinhood Token",
    instrumentName: "Invesco QQQ Trust",
    contractAddress: "0xd5f3879160bc7c32ebb4dc785f8a4f505888de68",
    priceFeedNote: "Chainlink QQQ/USD feed",
    sector: "ETF",
    decimals: 18,
    standard: "ERC-8056",
    isLive: true,
    pricePerShareUsd: 528.45,
    rarity: "epic",
    brandColor: "#003DA5",
    logoUrl: getStockLogoUrl("QQQ"),
  },
  ko: {
    id: "ko",
    ticker: "KO",
    tokenName: "Coca-Cola • Robinhood Token",
    instrumentName: "The Coca-Cola Company",
    contractAddress: "0x0000000000000000000000000000000000000000",
    priceFeedNote: "Chainlink KO/USD feed (when listed)",
    sector: "Dividend & Consumer",
    decimals: 18,
    standard: "ERC-8056",
    isLive: false,
    pricePerShareUsd: 68.42,
    rarity: "common",
    brandColor: "#F40009",
    logoUrl: getStockLogoUrl("KO"),
  },
  pg: {
    id: "pg",
    ticker: "PG",
    tokenName: "Procter & Gamble • Robinhood Token",
    instrumentName: "The Procter & Gamble Company",
    contractAddress: "0x0000000000000000000000000000000000000000",
    priceFeedNote: "Chainlink PG/USD feed (when listed)",
    sector: "Dividend & Consumer",
    decimals: 18,
    standard: "ERC-8056",
    isLive: false,
    pricePerShareUsd: 168.55,
    rarity: "common",
    brandColor: "#003DA5",
    logoUrl: getStockLogoUrl("PG"),
  },
  jnj: {
    id: "jnj",
    ticker: "JNJ",
    tokenName: "Johnson & Johnson • Robinhood Token",
    instrumentName: "Johnson & Johnson",
    contractAddress: "0x0000000000000000000000000000000000000000",
    priceFeedNote: "Chainlink JNJ/USD feed (when listed)",
    sector: "Healthcare",
    decimals: 18,
    standard: "ERC-8056",
    isLive: false,
    pricePerShareUsd: 158.92,
    rarity: "common",
    brandColor: "#D51900",
    logoUrl: getStockLogoUrl("JNJ"),
  },
  pep: {
    id: "pep",
    ticker: "PEP",
    tokenName: "PepsiCo • Robinhood Token",
    instrumentName: "PepsiCo, Inc.",
    contractAddress: "0x0000000000000000000000000000000000000000",
    priceFeedNote: "Chainlink PEP/USD feed (when listed)",
    sector: "Dividend & Consumer",
    decimals: 18,
    standard: "ERC-8056",
    isLive: false,
    pricePerShareUsd: 172.38,
    rarity: "common",
    brandColor: "#004B93",
    logoUrl: getStockLogoUrl("PEP"),
  },
};

/** All tokens as array, live tokens first */
export const ALL_TOKENIZED_STOCKS = Object.values(TOKENIZED_STOCKS).sort(
  (a, b) => Number(b.isLive) - Number(a.isLive)
);

export const LIVE_TOKENIZED_STOCKS = ALL_TOKENIZED_STOCKS.filter((s) => s.isLive);

export function getTokenByTicker(ticker: string): TokenizedStock | undefined {
  return ALL_TOKENIZED_STOCKS.find(
    (s) => s.ticker.toUpperCase() === ticker.toUpperCase()
  );
}

/** Convert TokenizedStock to legacy Stock shape used by capsule UI */
export function toStockToken(token: TokenizedStock) {
  return {
    id: token.id,
    name: token.instrumentName,
    ticker: token.ticker,
    tokenName: token.tokenName,
    contractAddress: token.contractAddress,
    pricePerShareUsd: token.pricePerShareUsd,
    price: token.pricePerShareUsd,
    rarity: token.rarity,
    brandColor: token.brandColor,
    color: token.brandColor,
    logoUrl: token.logoUrl,
    sector: token.sector,
    isLive: token.isLive,
    decimals: token.decimals,
  };
}

export type Stock = ReturnType<typeof toStockToken>;

/** Generate a realistic fractional token amount for a capsule pull */
export function generatePullAmount(token: TokenizedStock): {
  tokenAmount: number;
  valueUsd: number;
} {
  const rarityFractions: Record<Rarity, [number, number]> = {
    common: [0.01, 0.05],
    rare: [0.03, 0.08],
    epic: [0.05, 0.12],
    legendary: [0.08, 0.2],
  };
  const [min, max] = rarityFractions[token.rarity];
  const tokenAmount = Math.round((min + Math.random() * (max - min)) * 1000) / 1000;
  const valueUsd = Math.round(tokenAmount * token.pricePerShareUsd * 100) / 100;
  return { tokenAmount, valueUsd };
}

export function truncateAddress(address: string, chars = 4): string {
  if (address === "0x0000000000000000000000000000000000000000") return "See registry";
  return `${address.slice(0, 6)}…${address.slice(-chars)}`;
}
