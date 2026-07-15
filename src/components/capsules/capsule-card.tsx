"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { CapsuleType, Rarity } from "@/lib/types";
import { formatCurrency, cn } from "@/lib/utils";
import { getCapsuleArtwork } from "@/lib/capsule-artwork";
import { BlurFade } from "@/components/ui/blur-fade";
import { StockLogo } from "./stock-logo";

interface CapsuleCardProps {
  capsule: CapsuleType;
  index: number;
  onSelect: (capsule: CapsuleType) => void;
}

const RARITY_WEIGHTS: Record<Rarity, number> = { common: 50, rare: 30, epic: 15, legendary: 5 };

const RARITY_STYLE: Record<Rarity, string> = {
  legendary: "text-[#f0d78c]",
  epic: "text-[#c4b5fd]",
  rare: "text-[#93c5fd]",
  common: "text-white/45",
};

export function CapsuleCard({ capsule, index, onSelect }: CapsuleCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [4, -4]), { stiffness: 220, damping: 28 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-4, 4]), { stiffness: 220, damping: 28 });
  const artworkSrc = getCapsuleArtwork(capsule.id);

  const totalWeight = capsule.stocks.reduce((sum, s) => sum + RARITY_WEIGHTS[s.rarity], 0);

  function handleMouseMove(e: React.MouseEvent) {
    if (!ref.current || expanded) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <BlurFade delay={index * 0.07} inView>
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX: expanded ? 0 : rotateX, rotateY: expanded ? 0 : rotateY, transformStyle: "preserve-3d" }}
        whileHover={expanded ? undefined : { y: -8 }}
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
        className="group relative"
      >
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-b from-white/[0.07] to-white/[0.02] ring-1 ring-white/[0.06] transition-shadow duration-500 group-hover:shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
          {/* Stage */}
          <button
            type="button"
            onClick={() => onSelect(capsule)}
            className="relative block w-full text-left"
          >
            <div className="relative flex aspect-[4/4.4] items-center justify-center overflow-hidden">
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(ellipse 70% 55% at 50% 45%, ${capsule.artwork.accent}16 0%, transparent 60%), radial-gradient(ellipse at center, #131313 0%, #050505 72%)`,
                }}
              />
              <motion.div
                animate={{ y: [0, -8, 0], rotate: [0, 0.6, 0, -0.6, 0] }}
                transition={{ duration: 6 + index * 0.5, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 h-[74%] w-[56%]"
              >
                <Image
                  src={artworkSrc}
                  alt={capsule.name}
                  fill
                  className="object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.8)] transition-transform duration-700 group-hover:scale-[1.05]"
                  sizes="(max-width: 640px) 80vw, 360px"
                />
              </motion.div>

              <div className="absolute right-5 bottom-5 left-5 z-20 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {capsule.stocks.slice(0, 4).map((stock, si) => (
                    <motion.div
                      key={stock.id}
                      animate={{ y: [0, -3, 0] }}
                      transition={{
                        duration: 3.5 + si * 0.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: si * 0.3,
                      }}
                    >
                      <StockLogo
                        ticker={stock.ticker}
                        logoUrl={stock.logoUrl}
                        color={stock.brandColor}
                        size="sm"
                        className="ring-2 ring-[#0a0a0a]"
                      />
                    </motion.div>
                  ))}
                  {capsule.stocks.length > 4 && (
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[10px] font-medium text-white/70 ring-2 ring-[#0a0a0a] backdrop-blur-md">
                      +{capsule.stocks.length - 4}
                    </div>
                  )}
                </div>
                <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-semibold tabular-nums text-white backdrop-blur-md">
                  {formatCurrency(capsule.price)}
                </span>
              </div>
            </div>
          </button>

          {/* Info */}
          <div className="border-t border-white/[0.05] px-6 py-5">
            <div className="flex items-start justify-between gap-3">
              <button type="button" onClick={() => onSelect(capsule)} className="text-left">
                <h3 className="text-lg font-semibold tracking-tight text-white">{capsule.name}</h3>
                <p className="mt-1 text-sm leading-snug text-white/40">{capsule.description}</p>
              </button>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-white/40 transition-colors hover:bg-white/[0.1] hover:text-white"
              >
                <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
                  <ChevronDown className="h-4 w-4" />
                </motion.span>
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between text-[11px] text-white/35">
              <span>{capsule.assetCount} stocks inside</span>
              <span>Settles on-chain</span>
            </div>

            {/* Explorer */}
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-6 space-y-1.5">
                    <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-white/30">
                      Inside this pack
                    </p>
                    {capsule.stocks.map((stock) => {
                      const odds = (RARITY_WEIGHTS[stock.rarity] / totalWeight) * 100;
                      return (
                        <div
                          key={stock.id}
                          className="flex items-center gap-3.5 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.04]"
                        >
                          <StockLogo
                            ticker={stock.ticker}
                            logoUrl={stock.logoUrl}
                            color={stock.brandColor}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">{stock.name}</p>
                            <p className={cn("text-[11px] capitalize", RARITY_STYLE[stock.rarity])}>
                              {stock.rarity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium tabular-nums text-white/70">
                              {formatCurrency(stock.pricePerShareUsd)}
                            </p>
                            <p className="text-[11px] tabular-nums text-white/30">
                              {odds.toFixed(0)}% odds
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </BlurFade>
  );
}
