"use client";

import { motion } from "framer-motion";
import { BlurFade } from "@/components/ui/blur-fade";
import { StockpackzLogo } from "@/components/brand/stockpackz-logo";

interface FinalCtaProps {
  onOpen: () => void;
  walletReady: boolean;
}

export function FinalCta({ onOpen, walletReady }: FinalCtaProps) {
  return (
    <section className="px-6 py-20 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-3xl text-center">
        <BlurFade inView>
          <StockpackzLogo variant="icon" className="mx-auto mb-8 h-14 w-14" />
          <h2 className="text-[clamp(2.5rem,6vw,4rem)] font-bold leading-[1.05] tracking-[-0.03em] text-white">
            Ready to open?
          </h2>
          <p className="mx-auto mt-5 max-w-md text-lg text-white/35">
            Connect your wallet. Pick a pack. Own real stock.
          </p>
          <motion.button
            type="button"
            onClick={onOpen}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mt-10 h-14 min-w-[220px] rounded-full bg-white px-10 text-[15px] font-semibold text-black"
          >
            {walletReady ? "Open a Pack" : "Connect Wallet"}
          </motion.button>
        </BlurFade>
      </div>
    </section>
  );
}
