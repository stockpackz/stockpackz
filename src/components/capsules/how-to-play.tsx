"use client";

import { Wallet, Package, Sparkles, Landmark } from "lucide-react";
import { motion } from "framer-motion";
import { BlurFade } from "@/components/ui/blur-fade";
import { SectionHeader } from "./section-header";

const STEPS = [
  {
    icon: Wallet,
    title: "Connect",
    description: "Any EVM wallet. Robinhood Chain adds automatically.",
  },
  {
    icon: Package,
    title: "Choose",
    description: "Pick a themed StockPack — AI, Mag7, Dividend, and more.",
  },
  {
    icon: Sparkles,
    title: "Reveal",
    description: "Watch the pack open. Your stock is selected on-chain.",
  },
  {
    icon: Landmark,
    title: "Own",
    description: "Real tokenized equity settles in your wallet instantly.",
  },
];

export function HowToPlay() {
  return (
    <section id="how" className="px-6 py-14 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <SectionHeader title="How it works" className="mb-12" />

        <BlurFade inView>
          <div className="relative">
            <div className="absolute top-10 right-[10%] left-[10%] hidden h-px bg-white/[0.06] lg:block" />

            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="relative flex flex-col items-center text-center"
                >
                  <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.05] text-white/50">
                    <step.icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  {i < STEPS.length - 1 && (
                    <span className="my-3 text-white/15 lg:hidden">↓</span>
                  )}
                  <p className="mt-5 text-lg font-semibold tracking-tight text-white">
                    {step.title}
                  </p>
                  <p className="mt-2 max-w-[200px] text-sm leading-relaxed text-white/35">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
