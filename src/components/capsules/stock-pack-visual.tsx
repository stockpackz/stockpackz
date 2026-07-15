"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { HERO_GRAPHICS } from "@/lib/capsule-artwork";

interface StockPackVisualProps {
  className?: string;
}

export function StockPackVisual({ className }: StockPackVisualProps) {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <div className="absolute bottom-[-6%] left-1/2 h-20 w-[55%] -translate-x-1/2 rounded-[100%] bg-white/[0.05] blur-2xl" />

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10"
        style={{ perspective: 1400 }}
      >
        <motion.div
          animate={{ rotateY: [-6, 6, -6] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="relative mx-auto w-[200px] sm:w-[240px] lg:w-[280px]"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="relative aspect-[3/4.5] drop-shadow-[0_40px_80px_rgba(0,0,0,0.85)]">
            <Image
              src={HERO_GRAPHICS.pack}
              alt="StockPack"
              fill
              priority
              className="object-contain"
              sizes="280px"
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
