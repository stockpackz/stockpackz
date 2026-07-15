function hashTicker(ticker: string): number {
  return ticker.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

/** Deterministic mock % change for preview UI */
export function getMockChangePercent(ticker: string): number {
  const h = hashTicker(ticker);
  return Math.round(((h % 400) / 100 - 2) * 100) / 100;
}

/** Deterministic sparkline points seeded by ticker */
export function getMockSparkline(ticker: string, points = 16): number[] {
  const h = hashTicker(ticker);
  const data: number[] = [];
  let value = 50 + (h % 30);

  for (let i = 0; i < points; i++) {
    const wave = Math.sin((i + h) * 0.55) * 8;
    const drift = (h % 7) - 3;
    value = Math.max(12, Math.min(88, value + wave * 0.15 + drift * 0.08));
    data.push(value);
  }

  return data;
}

export function getMockQuote(stock: { ticker: string; pricePerShareUsd: number }) {
  const changePercent = getMockChangePercent(stock.ticker);
  const change = (stock.pricePerShareUsd * changePercent) / 100;
  return {
    price: stock.pricePerShareUsd,
    change,
    changePercent,
    sparkline: getMockSparkline(stock.ticker),
  };
}

/** Hero / ticker featured tickers */
export const FEATURED_TICKERS = [
  "NVDA",
  "AAPL",
  "TSLA",
  "MSFT",
  "AMZN",
  "META",
  "GOOGL",
  "AMD",
  "COIN",
  "SPCX",
  "SPY",
  "JNJ",
] as const;
