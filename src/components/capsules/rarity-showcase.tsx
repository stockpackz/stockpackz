"use client";

import { motion } from "framer-motion";
import type { Rarity, RarityTier } from "@/lib/types";
import { BlurFade } from "@/components/ui/blur-fade";
import { SectionHeader } from "./section-header";
import { StockLogo } from "./stock-logo";
import { cn } from "@/lib/utils";

const METALLIC: Record<Rarity, { bar: string; text: string }> = {
  legendary: { bar: "from-[#f5e6a3] to-[#b8860b]", text: "text-[#f0d78c]" },
  epic: { bar: "from-[#ddd6fe] to-[#7c3aed]", text: "text-[#c4b5fd]" },
  rare: { bar: "from-[#bfdbfe] to-[#2563eb]", text: "text-[#93c5fd]" },
  common: { bar: "from-[#e5e5e5] to-[#737373]", text: "text-[#d4d4d4]" },
};

interface RarityShowcaseProps {
  tiers: RarityTier[];
}

export function RarityShowcase({ tiers }: RarityShowcaseProps) {
  return (
    <section className="px-6 py-14 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          title="Rarity"
          description="Weighted odds. The rarest companies are the hardest to pull."
          className="mb-10"
        />

        <div className="space-y-0">
          {tiers.map((tier, index) => {
            const style = METALLIC[tier.tier];
            return (
              <BlurFade key={tier.tier} delay={index * 0.08} inView>
                <motion.div
                  whileHover={{ x: 3 }}
                  className="flex flex-col gap-4 border-b border-white/[0.05] py-5 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
                >
                  <div className="flex items-center gap-5">
                    <div
                      className={cn(
                        "h-10 w-1.5 rounded-full bg-gradient-to-b",
                        style.bar
                      )}
                    />
                    <div>
                      <p className={cn("text-xl font-bold tracking-tight sm:text-2xl", style.text)}>
                        {tier.label}
                      </p>
                      <p className="mt-0.5 text-xs tracking-[0.2em] text-white/25">
                        {"★".repeat(tier.stars)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 sm:gap-4">
                    {tier.stocks.map((stock) => (
                      <div
                        key={stock.ticker}
                        className="flex items-center gap-2.5 rounded-full bg-white/[0.04] px-3.5 py-2"
                      >
                        <StockLogo ticker={stock.ticker} size="xs" />
                        <span className="text-sm font-medium text-white/60">{stock.name}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </BlurFade>
            );
          })}
        </div>
      </div>
    </section>
  );
}
