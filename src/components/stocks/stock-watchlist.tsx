"use client";

import { motion } from "framer-motion";
import { BlurFade } from "@/components/ui/blur-fade";
import { SectionHeader } from "@/components/capsules/section-header";
import { StockLogo } from "@/components/capsules/stock-logo";
import { StockSparkline } from "./stock-sparkline";
import { getMockQuote } from "@/lib/stock-market-mock";
import { LIVE_TOKENIZED_STOCKS } from "@/lib/tokenized-stocks";
import { formatCurrency } from "@/lib/utils";

export function StockWatchlist() {
  return (
    <section id="stocks" className="px-6 py-14 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          title="On the chain"
          description="Real tokenized equities. Every pack pulls from this set."
          className="mb-10"
        />

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {LIVE_TOKENIZED_STOCKS.map((stock, index) => {
            const quote = getMockQuote(stock);
            const positive = quote.changePercent >= 0;

            return (
              <BlurFade key={stock.id} delay={Math.min(index * 0.03, 0.3)} inView>
                <motion.div
                  whileHover={{ y: -3 }}
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                  className="h-full rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/[0.04] transition-colors hover:bg-white/[0.05]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <StockLogo
                      ticker={stock.ticker}
                      logoUrl={stock.logoUrl}
                      color={stock.brandColor}
                      size="sm"
                    />
                    <StockSparkline
                      data={quote.sparkline}
                      positive={positive}
                      width={52}
                      height={22}
                    />
                  </div>
                  <p className="mt-3 text-sm font-semibold tracking-tight text-white">
                    {stock.ticker}
                  </p>
                  <p className="truncate text-[11px] text-white/30">{stock.instrumentName}</p>
                  <div className="mt-2.5 flex items-baseline justify-between">
                    <p className="text-[15px] font-bold tabular-nums tracking-tight text-white">
                      {formatCurrency(quote.price)}
                    </p>
                    <p
                      className={`text-xs font-medium tabular-nums ${
                        positive ? "text-emerald-400/80" : "text-red-400/80"
                      }`}
                    >
                      {positive ? "+" : ""}
                      {quote.changePercent.toFixed(2)}%
                    </p>
                  </div>
                </motion.div>
              </BlurFade>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-white/25">
          More stocks join as their on-chain liquidity reaches the required depth.
        </p>
      </div>
    </section>
  );
}
