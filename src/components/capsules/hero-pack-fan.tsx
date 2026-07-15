"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { getCapsuleArtwork } from "@/lib/capsule-artwork";
import { StockLogo } from "./stock-logo";

const CHIPS = [
  { ticker: "NVDA", x: "6%", y: "12%", delay: 0, dur: 5.5 },
  { ticker: "AAPL", x: "88%", y: "18%", delay: 0.8, dur: 6.2 },
  { ticker: "TSLA", x: "2%", y: "62%", delay: 1.6, dur: 5.8 },
  { ticker: "MSFT", x: "92%", y: "58%", delay: 0.4, dur: 6.6 },
  { ticker: "AMZN", x: "14%", y: "88%", delay: 1.2, dur: 6.0 },
  { ticker: "GOOGL", x: "82%", y: "90%", delay: 2.0, dur: 5.6 },
];

const FAN = [
  { id: "mag7", rotate: -14, x: -120, y: 26, scale: 0.86, z: 1 },
  { id: "ai", rotate: 0, x: 0, y: 0, scale: 1, z: 3 },
  { id: "dividend", rotate: 14, x: 120, y: 26, scale: 0.86, z: 2 },
];

export function HeroPackFan() {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [5, -5]), { stiffness: 120, damping: 22 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-7, 7]), { stiffness: 120, damping: 22 });

  function onMove(e: React.MouseEvent) {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }

  function onLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative flex h-full w-full items-center justify-center"
      style={{ perspective: 1400 }}
    >
      {/* Stage glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 62% 48% at 50% 52%, rgba(0,200,5,0.09) 0%, rgba(0,200,5,0.03) 40%, transparent 68%)",
        }}
      />

      {/* Floating stock chips */}
      {CHIPS.map((chip) => (
        <motion.div
          key={chip.ticker}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: chip.dur, repeat: Infinity, ease: "easeInOut", delay: chip.delay }}
          className="absolute z-20 hidden sm:block"
          style={{ left: chip.x, top: chip.y }}
        >
          <div className="flex items-center gap-2 rounded-full bg-white/[0.05] py-1.5 pr-3.5 pl-1.5 ring-1 ring-white/[0.08] backdrop-blur-xl">
            <StockLogo ticker={chip.ticker} size="xs" />
            <span className="text-[11px] font-semibold tracking-wide text-white/60">
              {chip.ticker}
            </span>
          </div>
        </motion.div>
      ))}

      {/* Pack fan */}
      <motion.div
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 h-[340px] w-[240px] sm:h-[420px] sm:w-[290px]"
      >
        {FAN.map((pack, i) => (
          <motion.div
            key={pack.id}
            initial={{ opacity: 0, y: 40, rotate: 0, x: 0 }}
            animate={{ opacity: 1, y: pack.y, rotate: pack.rotate, x: pack.x }}
            transition={{ delay: 0.25 + i * 0.12, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: pack.y - 14, scale: pack.scale + 0.03 }}
            className="absolute inset-0"
            style={{ zIndex: pack.z, scale: pack.scale, transformOrigin: "50% 85%" }}
          >
            <Image
              src={getCapsuleArtwork(pack.id)}
              alt={`${pack.id} StockPack`}
              fill
              priority={pack.id === "ai"}
              className="object-contain drop-shadow-[0_36px_70px_rgba(0,0,0,0.85)]"
              sizes="290px"
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Floor shadow */}
      <div
        aria-hidden
        className="absolute bottom-[4%] left-1/2 h-10 w-[70%] -translate-x-1/2 rounded-[100%] bg-black/70 blur-2xl"
      />
    </div>
  );
}
