"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { RecentPull } from "@/lib/types";
import { initialRecentPulls, pullNames, pullStocks } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import { Marquee } from "@/components/ui/marquee";
import { BlurFade } from "@/components/ui/blur-fade";
import { SectionHeader } from "./section-header";
import { RarityBadge } from "./rarity-badge";
import { StockLogo } from "./stock-logo";

export function RecentPulls() {
  const [pulls, setPulls] = useState<RecentPull[]>(initialRecentPulls);

  useEffect(() => {
    const interval = setInterval(() => {
      const name = pullNames[Math.floor(Math.random() * pullNames.length)];
      const stockData = pullStocks[Math.floor(Math.random() * pullStocks.length)];

      setPulls((prev) => [
        {
          id: Date.now().toString(),
          user: name,
          stock: stockData.stock,
          ticker: stockData.ticker,
          rarity: stockData.rarity,
          timestamp: new Date(),
        },
        ...prev.slice(0, 7),
      ]);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="px-5 py-16 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          label="Live feed"
          title="Recent Global Pulls"
          description="Real openings from the community, settling on-chain in real time."
          className="mb-8"
        />

        {/* Marquee ticker */}
        <BlurFade inView className="mb-8 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] py-4">
          <Marquee pauseOnHover className="[--duration:45s] [--gap:3rem]">
            {pulls.map((pull) => (
              <PullChip key={`mq-${pull.id}`} pull={pull} />
            ))}
          </Marquee>
        </BlurFade>

        {/* Detailed list */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <AnimatePresence mode="popLayout" initial={false}>
            {pulls.slice(0, 5).map((pull) => (
              <motion.div
                key={pull.id}
                layout
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex items-center justify-between gap-4 border-b border-white/[0.04] px-5 py-4 last:border-0">
                  <div className="flex items-center gap-3.5">
                    <StockLogo ticker={pull.ticker} size="sm" />
                    <p className="text-sm">
                      <span className="font-medium">{pull.user}</span>
                      <span className="text-muted-foreground"> pulled </span>
                      <span className="font-medium">{pull.tokenAmount} {pull.ticker}</span>
                      {pull.valueUsd && (
                        <span className="text-muted-foreground"> ({formatCurrency(pull.valueUsd)})</span>
                      )}
                    </p>
                  </div>
                  <RarityBadge rarity={pull.rarity} showLabel />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function PullChip({ pull }: { pull: RecentPull }) {
  return (
    <div className="flex items-center gap-2.5 whitespace-nowrap px-2">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rh-green opacity-30" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-rh-green" />
      </span>
      <span className="text-sm font-medium">{pull.user}</span>
      <span className="text-sm text-muted-foreground">→</span>
      <span className="text-sm font-medium">{pull.stock}</span>
      <RarityBadge rarity={pull.rarity} />
    </div>
  );
}
