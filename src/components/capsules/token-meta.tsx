"use client";

import { cn } from "@/lib/utils";
import type { Stock } from "@/lib/types";
import { truncateAddress } from "@/lib/tokenized-stocks";

interface TokenMetaProps {
  stock: Stock;
  tokenAmount?: number;
  valueUsd?: number;
  className?: string;
  compact?: boolean;
}

export function TokenMeta({ stock, tokenAmount, valueUsd, className, compact }: TokenMetaProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {!compact && (
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
            Robinhood Token
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">{stock.tokenName}</p>
        </div>
      )}

      {!compact && (tokenAmount !== undefined || valueUsd !== undefined) && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
          {tokenAmount !== undefined && (
            <p className="text-lg font-semibold tabular-nums tracking-tight">
              {tokenAmount} {stock.ticker}
            </p>
          )}
          {valueUsd !== undefined && (
            <p className="mt-0.5 text-2xl font-semibold tabular-nums text-rh-green">
              ≈ ${valueUsd.toFixed(2)} USD
            </p>
          )}
          <p className="mt-1 text-[10px] text-muted-foreground">
            @ {stock.pricePerShareUsd.toFixed(2)}/token via Chainlink
          </p>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg bg-white/[0.03] px-3 py-2">
          <dt className="text-muted-foreground">Contract</dt>
          <dd className="mt-0.5 font-mono">{truncateAddress(stock.contractAddress)}</dd>
        </div>
        <div className="rounded-lg bg-white/[0.03] px-3 py-2">
          <dt className="text-muted-foreground">Standard</dt>
          <dd className="mt-0.5">ERC-8056 · 18 dec</dd>
        </div>
        <div className="rounded-lg bg-white/[0.03] px-3 py-2">
          <dt className="text-muted-foreground">Sector</dt>
          <dd className="mt-0.5">{stock.sector}</dd>
        </div>
        <div className="rounded-lg bg-white/[0.03] px-3 py-2">
          <dt className="text-muted-foreground">Status</dt>
          <dd className="mt-0.5">{stock.isLive ? "Live on-chain" : "Coming soon"}</dd>
        </div>
      </dl>
    </div>
  );
}
