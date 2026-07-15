"use client";

import { ArrowDown, Wallet, Shuffle, Repeat, TrendingUp, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import { BlurFade } from "@/components/ui/blur-fade";
import { SectionHeader } from "./section-header";

const STEPS = [
  { icon: DollarSign, title: "USDG", detail: "Your payment enters the pack contract" },
  { icon: Shuffle, title: "Verifiable Randomness", detail: "A provably fair draw selects your stock" },
  { icon: Repeat, title: "Uniswap v4 Swap", detail: "USDG swaps for the tokenized equity on-chain" },
  { icon: TrendingUp, title: "Tokenized Stock", detail: "A real ERC-20 stock token, priced by Chainlink" },
  { icon: Wallet, title: "Your Wallet", detail: "Settles directly to you. Self-custody, always" },
];

export function Transparency() {
  return (
    <section className="px-6 py-14 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          title="How every opening works"
          description="No inventory. No IOUs. Every step happens on-chain."
          className="mb-12"
          align="center"
        />

        <div className="mx-auto flex max-w-md flex-col items-center">
          {STEPS.map((step, i) => (
            <BlurFade key={step.title} delay={i * 0.1} inView className="w-full">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex w-full items-center gap-5 rounded-2xl bg-white/[0.03] px-6 py-5 ring-1 ring-white/[0.05]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-white/60">
                  <step.icon className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <div className="text-left">
                  <p className="font-semibold tracking-tight text-white">{step.title}</p>
                  <p className="mt-0.5 text-sm text-white/35">{step.detail}</p>
                </div>
              </motion.div>

              {i < STEPS.length - 1 && (
                <motion.div
                  initial={{ opacity: 0, scaleY: 0 }}
                  whileInView={{ opacity: 1, scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 + 0.15, duration: 0.3 }}
                  className="flex justify-center py-2"
                >
                  <ArrowDown className="h-4 w-4 text-white/20" />
                </motion.div>
              )}
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}
