"use client";

import { Coins, Shield, Shuffle, Clock, Landmark, Layers } from "lucide-react";
import { motion } from "framer-motion";
import { BlurFade } from "@/components/ui/blur-fade";

const FACTS = [
  { icon: Layers, value: "142", label: "Tokenized Stocks", detail: "Real equities as ERC-20 tokens" },
  { icon: Landmark, value: "Robinhood", label: "Chain", detail: "Purpose-built L2 for real-world assets" },
  { icon: Coins, value: "Uniswap v4", label: "Settlement", detail: "Every pack swaps on-chain liquidity" },
  { icon: Shuffle, value: "Verifiable", label: "Randomness", detail: "Provably fair reveals, on-chain" },
  { icon: Shield, value: "Self", label: "Custody", detail: "Stocks settle to your wallet" },
  { icon: Clock, value: "24/7", label: "Markets", detail: "Open packs any time, any day" },
];

export function Statistics() {
  return (
    <section className="px-6 py-14 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FACTS.map((fact, i) => (
            <BlurFade key={fact.label} delay={i * 0.06} inView>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className="group h-full rounded-3xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-7 ring-1 ring-white/[0.05] transition-shadow hover:shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
              >
                <fact.icon
                  className="h-5 w-5 text-white/30 transition-colors group-hover:text-white/60"
                  strokeWidth={1.5}
                />
                <p className="mt-6 text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl">
                  {fact.value}
                </p>
                <p className="mt-1 text-sm font-medium uppercase tracking-[0.18em] text-white/35">
                  {fact.label}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-white/30">{fact.detail}</p>
              </motion.div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}
