"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { StockLogo } from "@/components/capsules/stock-logo";
import { StockSparkline } from "./stock-sparkline";
import { getMockQuote } from "@/lib/stock-market-mock";
import type { TokenizedStock } from "@/lib/tokenized-stocks";
import { formatCurrency, cn } from "@/lib/utils";

interface StockTickerItemProps {
  stock: TokenizedStock;
  className?: string;
}

export function StockTickerItem({ stock, className }: StockTickerItemProps) {
  const quote = getMockQuote(stock);
  const positive = quote.changePercent >= 0;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-3 rounded-full bg-white/[0.05] px-4 py-2.5 ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.08]",
        className
      )}
    >
      <StockLogo ticker={stock.ticker} logoUrl={stock.logoUrl} color={stock.brandColor} size="xs" />
      <span className="text-sm font-semibold text-white">{stock.ticker}</span>
      <span className="text-sm tabular-nums text-white/55">{formatCurrency(quote.price)}</span>
      <StockSparkline data={quote.sparkline} positive={positive} width={52} height={20} />
      <span
        className={cn(
          "flex items-center gap-0.5 text-xs font-semibold tabular-nums",
          positive ? "text-emerald-400" : "text-red-400"
        )}
      >
        {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {positive ? "+" : ""}
        {quote.changePercent.toFixed(2)}%
      </span>
    </div>
  );
}
