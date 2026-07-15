"use client";

import { Marquee } from "@/components/ui/marquee";
import { StockTickerItem } from "./stock-ticker-item";
import { FEATURED_TICKERS } from "@/lib/stock-market-mock";
import { getTokenByTicker } from "@/lib/tokenized-stocks";

const featuredStocks = FEATURED_TICKERS.map((t) => getTokenByTicker(t)).filter(
  (s): s is NonNullable<typeof s> => Boolean(s)
);

export function StockTickerStrip() {
  return (
    <div className="relative py-5">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#050505] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#050505] to-transparent" />
      <Marquee pauseOnHover className="[--duration:40s] [--gap:0.75rem]">
        {featuredStocks.map((stock) => (
          <StockTickerItem key={stock.ticker} stock={stock} />
        ))}
      </Marquee>
      <Marquee reverse pauseOnHover className="mt-2 [--duration:48s] [--gap:0.75rem]">
        {[...featuredStocks].reverse().map((stock) => (
          <StockTickerItem key={`r-${stock.ticker}`} stock={stock} />
        ))}
      </Marquee>
    </div>
  );
}
