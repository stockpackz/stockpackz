"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { BlurFade } from "@/components/ui/blur-fade";
import { HeroPackFan } from "./hero-pack-fan";

interface HeroProps {
  onOpenCapsule: () => void;
  walletReady: boolean;
}

export function Hero({ onOpenCapsule, walletReady }: HeroProps) {
  return (
    <section className="relative px-6 pt-12 pb-10 sm:px-10 lg:px-16 lg:pt-16 lg:pb-12">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-6">
        <div className="relative z-10 text-center lg:text-left">
          <BlurFade delay={0.05}>
            <p className="mb-6 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.28em] text-white/35">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00c805] opacity-50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00c805]" />
              </span>
              Live on Robinhood Chain
            </p>
          </BlurFade>

          <BlurFade delay={0.08}>
            <h1 className="text-[clamp(3.5rem,12vw,7rem)] font-bold leading-[0.9] tracking-[-0.05em] text-white">
              Open.
              <br />
              Own.
              <br />
              Invest.
            </h1>
          </BlurFade>

          <BlurFade delay={0.14}>
            <p className="mx-auto mt-8 max-w-md text-lg leading-relaxed text-white/50 sm:text-xl lg:mx-0">
              Every StockPack holds real tokenized stocks.
            </p>
            <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-white/30 lg:mx-0">
              Own pieces of the world&apos;s greatest companies — instantly.
            </p>
          </BlurFade>

          <BlurFade delay={0.22}>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <motion.button
                type="button"
                onClick={onOpenCapsule}
                whileHover={{ scale: 1.03, boxShadow: "0 0 40px rgba(255,255,255,0.18)" }}
                whileTap={{ scale: 0.98 }}
                className="h-12 rounded-full bg-white px-9 text-[15px] font-semibold text-black"
              >
                {walletReady ? "Open Your First Pack" : "Connect to Open"}
              </motion.button>
              <Link
                href="#packs"
                className="inline-flex h-12 items-center justify-center rounded-full px-6 text-[15px] font-medium text-white/50 transition-colors hover:text-white"
              >
                Browse Packs
              </Link>
            </div>
          </BlurFade>

          <BlurFade delay={0.3}>
            <div className="mt-12 flex items-center justify-center gap-8 lg:justify-start">
              {[
                { value: "14", label: "Tokenized stocks" },
                { value: "5", label: "Curated packs" },
                { value: "$300", label: "Base jackpot" },
              ].map((stat) => (
                <div key={stat.label} className="text-center lg:text-left">
                  <p className="text-2xl font-bold tabular-nums tracking-tight text-white">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/30">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </BlurFade>
        </div>

        <BlurFade delay={0.1} className="relative flex min-h-[460px] items-center justify-center sm:min-h-[560px]">
          <div className="relative h-[460px] w-full max-w-2xl sm:h-[560px]">
            <HeroPackFan />
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
