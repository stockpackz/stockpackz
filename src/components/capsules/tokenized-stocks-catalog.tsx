"use client";

import { BlurFade } from "@/components/ui/blur-fade";
import { SectionHeader } from "./section-header";
import { StockLogo } from "./stock-logo";
import { StockSparkline } from "@/components/stocks/stock-sparkline";
import { getMockQuote } from "@/lib/stock-market-mock";
import { LIVE_TOKENIZED_STOCKS } from "@/lib/tokenized-stocks";
import { formatCurrency } from "@/lib/utils";

export function TokenizedStocksCatalog() {
  return (
    <section className="px-6 pb-32 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          title="Full Token Catalog"
          description="Every ERC-20 stock token available in StockPacks on Robinhood Chain."
          className="mb-12"
        />

        <div className="divide-y divide-white/[0.04]">
          {LIVE_TOKENIZED_STOCKS.map((token, index) => {
            const quote = getMockQuote(token);
            const positive = quote.changePercent >= 0;

            return (
              <BlurFade key={token.id} delay={index * 0.02} inView>
                <div className="group flex items-center gap-4 py-5 transition-colors hover:bg-white/[0.02] sm:gap-6">
                  <StockLogo
                    ticker={token.ticker}
                    logoUrl={token.logoUrl}
                    color={token.brandColor}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold tracking-tight text-white">{token.ticker}</p>
                    <p className="truncate text-sm text-white/35">{token.instrumentName}</p>
                  </div>
                  <div className="hidden sm:block">
                    <StockSparkline data={quote.sparkline} positive={positive} width={88} height={32} />
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium tabular-nums text-white/80">
                      {formatCurrency(quote.price)}
                    </p>
                    <p
                      className={`text-xs tabular-nums ${
                        positive ? "text-emerald-400/70" : "text-red-400/70"
                      }`}
                    >
                      {positive ? "+" : ""}
                      {quote.changePercent.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </BlurFade>
            );
          })}
        </div>
      </div>
    </section>
  );
}
