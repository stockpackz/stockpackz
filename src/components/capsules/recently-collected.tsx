"use client";

import { motion } from "framer-motion";
import { BlurFade } from "@/components/ui/blur-fade";
import { SectionHeader } from "./section-header";
import { StockLogo } from "./stock-logo";
import { recentCollectors } from "@/lib/mock-data";

export function RecentlyCollected() {
  return (
    <section className="px-6 py-14 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          title="Recently Collected"
          description="Collectors completing portfolios around the world."
          className="mb-10"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentCollectors.map((collector, i) => (
            <BlurFade key={`${collector.name}-${i}`} delay={i * 0.05} inView>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className="group flex items-center gap-4 rounded-2xl bg-white/[0.03] px-5 py-4 ring-1 ring-white/[0.05] transition-colors hover:bg-white/[0.05]"
              >
                {/* Avatar */}
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white ring-2 ring-white/10"
                  style={{
                    background: `linear-gradient(135deg, hsl(${collector.hue} 35% 28%), hsl(${collector.hue} 45% 16%))`,
                  }}
                >
                  {collector.initials}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{collector.name}</p>
                  <p className="text-xs text-white/35">completed {collector.collection}</p>
                </div>

                {/* Companies — reveal on hover */}
                <div className="flex -space-x-2.5 transition-all duration-300 group-hover:-space-x-1">
                  {collector.companies.slice(0, 4).map((ticker) => (
                    <StockLogo
                      key={ticker}
                      ticker={ticker}
                      size="xs"
                      className="ring-2 ring-[#0a0a0a] transition-transform duration-300 group-hover:scale-110"
                    />
                  ))}
                  {collector.companies.length > 4 && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-[9px] font-medium text-white/60 ring-2 ring-[#0a0a0a]">
                      +{collector.companies.length - 4}
                    </span>
                  )}
                </div>
              </motion.div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}
