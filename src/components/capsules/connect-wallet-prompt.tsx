"use client";

import { motion } from "framer-motion";
import { WalletButton } from "./wallet-button";
import { StockpackzLogo } from "@/components/brand/stockpackz-logo";

interface ConnectWalletPromptProps {
  onClose?: () => void;
}

export function ConnectWalletPrompt({ onClose }: ConnectWalletPromptProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative w-full overflow-hidden rounded-3xl bg-white/[0.04] p-10 text-center backdrop-blur-2xl"
    >
      <div className="relative">
        <StockpackzLogo variant="icon" className="mx-auto h-14 w-14" />
        <h3 className="mt-6 text-2xl font-semibold tracking-tight text-white">Connect to open</h3>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/40">
          Connect your wallet on Robinhood Chain to open packs and receive tokenized stocks.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3">
          <WalletButton />
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-white/30 transition-colors hover:text-white/60"
            >
              Maybe later
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
