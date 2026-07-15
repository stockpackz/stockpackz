"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { HERO_GRAPHICS } from "@/lib/capsule-artwork";

interface MiniPackProps {
  accent?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  shaking?: boolean;
  className?: string;
  /** Use generated hero pack render */
  useArt?: boolean;
  artSrc?: string;
}

const sizeMap = {
  sm: "w-14",
  md: "w-24",
  lg: "w-36",
};

export function MiniPack({
  accent = "#00c805",
  label,
  size = "md",
  shaking = false,
  className,
  useArt = true,
  artSrc,
}: MiniPackProps) {
  const src = artSrc ?? HERO_GRAPHICS.pack;

  if (useArt) {
    return (
      <motion.div
        animate={
          shaking
            ? { rotate: [0, -3, 3, -3, 3, -1.5, 1.5, 0], y: [0, -2, 0, -2, 0] }
            : undefined
        }
        transition={
          shaking ? { duration: 0.7, repeat: Infinity, ease: "easeInOut" } : undefined
        }
        className={cn("relative shrink-0", sizeMap[size], className)}
      >
        <div className="relative aspect-[3/4.5] drop-shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
          <Image src={src} alt={label ?? "StockPack"} fill className="object-contain" sizes="160px" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      animate={
        shaking
          ? { rotate: [0, -3, 3, -3, 3, -1.5, 1.5, 0], y: [0, -2, 0, -2, 0] }
          : undefined
      }
      transition={
        shaking ? { duration: 0.7, repeat: Infinity, ease: "easeInOut" } : undefined
      }
      className={cn("relative shrink-0", sizeMap[size], className)}
    >
      <div className="relative aspect-[3/4.2] overflow-hidden rounded-[4px] bg-[#0a0a0a] shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
        <div
          className="absolute inset-x-0 top-0 h-[16%]"
          style={{
            background: `linear-gradient(120deg, ${accent} 0%, ${accent}aa 60%, ${accent}66 100%)`,
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-[10%]"
          style={{
            background: `linear-gradient(-60deg, ${accent} 0%, ${accent}88 70%)`,
          }}
        />
        <div className="absolute inset-x-[10%] top-[21%] bottom-[15%] flex flex-col items-center justify-center gap-1 rounded-[3px] border border-white/[0.06] bg-gradient-to-b from-[#101010] to-[#080808]">
          <Image
            src="/graphics/stockpackz-icon-v4.png"
            alt=""
            width={40}
            height={40}
            className={cn(
              "opacity-90",
              size === "sm" ? "h-5 w-5" : size === "md" ? "h-8 w-8" : "h-14 w-14"
            )}
          />
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[30%] bg-gradient-to-r from-white/[0.07] to-transparent" />
      </div>
    </motion.div>
  );
}
