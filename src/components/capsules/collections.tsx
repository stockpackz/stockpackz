"use client";

import Image from "next/image";
import { Award, Gift, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import type { Collection } from "@/lib/types";
import { BlurFade } from "@/components/ui/blur-fade";
import { SectionHeader } from "./section-header";
import { StockLogo } from "./stock-logo";
import { getCapsuleArtwork } from "@/lib/capsule-artwork";

interface CollectionsProps {
  collections: Collection[];
}

const COLLECTION_ART: Record<string, string> = {
  "ai-collection": "ai",
  "mag7-collection": "mag7",
  "dividend-kings": "dividend",
  healthcare: "healthcare",
  "future-tech": "future-tech",
};

export function Collections({ collections }: CollectionsProps) {
  return (
    <section id="collections" className="px-6 py-14 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          title="Collections"
          description="Complete a portfolio. Earn your badge, bonus stock, and a free pack."
          className="mb-10"
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection, index) => {
            const progress = Math.round(
              (collection.owned.length / collection.stocks.length) * 100
            );
            const artId = COLLECTION_ART[collection.id];
            const art = artId ? getCapsuleArtwork(artId) : null;

            return (
              <BlurFade key={collection.id} delay={index * 0.06} inView>
                <motion.div
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 26 }}
                  className="group relative overflow-hidden rounded-[24px] bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-6 ring-1 ring-white/[0.05] transition-shadow hover:shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
                >
                  {/* Collection artwork ghost */}
                  {art && (
                    <div className="pointer-events-none absolute -right-8 -top-6 h-36 w-24 opacity-[0.14] transition-all duration-500 group-hover:opacity-25 group-hover:-rotate-3">
                      <Image src={art} alt="" fill className="object-contain" sizes="96px" />
                    </div>
                  )}

                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-[17px] font-semibold tracking-tight text-white">
                          {collection.name}
                        </h3>
                        <p className="mt-1 max-w-[220px] text-sm text-white/35">
                          {collection.description}
                        </p>
                      </div>
                    </div>

                    {/* Company logos */}
                    <div className="mt-7 flex flex-wrap items-center gap-2.5">
                      {collection.stocks.map((ticker, ti) => {
                        const owned = collection.owned.includes(ticker);
                        return (
                          <motion.div
                            key={ticker}
                            animate={{ y: [0, -3, 0] }}
                            transition={{
                              duration: 4 + ti * 0.35,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: ti * 0.25,
                            }}
                            className="group/logo relative"
                          >
                            <StockLogo
                              ticker={ticker}
                              size="md"
                              className={
                                owned
                                  ? "ring-2 ring-white/20"
                                  : "opacity-30 grayscale transition-opacity group-hover:opacity-60"
                              }
                            />
                            {/* Hover tooltip */}
                            <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-black/90 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover/logo:opacity-100">
                              {ticker}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Completion rewards */}
                    <div className="mt-6 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${
                          collection.badgeEarned
                            ? "bg-rh-green/10 text-rh-green ring-rh-green/25"
                            : "bg-white/[0.04] text-white/45 ring-white/[0.07]"
                        }`}
                      >
                        <TrendingUp className="h-3 w-3" strokeWidth={2} />+$
                        {collection.bonusStockUsd} bonus stock
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${
                          collection.badgeEarned
                            ? "bg-rh-green/10 text-rh-green ring-rh-green/25"
                            : "bg-white/[0.04] text-white/45 ring-white/[0.07]"
                        }`}
                      >
                        <Gift className="h-3 w-3" strokeWidth={2} />
                        {collection.freePacks === 1
                          ? "1 free pack"
                          : `${collection.freePacks} free packs`}
                      </span>
                    </div>

                    {/* Footer: completion + badge preview */}
                    <div className="mt-6 flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold tabular-nums tracking-tight text-white">
                          {progress}%
                        </p>
                        <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-white/30">
                          complete
                        </p>
                      </div>
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all ${
                          collection.badgeEarned
                            ? "bg-[#f5e6a3]/10 text-[#f0d78c] ring-1 ring-[#f0d78c]/25 shadow-[0_0_24px_rgba(240,215,140,0.12)]"
                            : "bg-white/[0.04] text-white/20 ring-1 ring-white/[0.06]"
                        }`}
                        title={collection.badgeEarned ? "Badge earned" : "Badge preview"}
                      >
                        <Award className="h-5 w-5" strokeWidth={1.5} />
                      </div>
                    </div>
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
