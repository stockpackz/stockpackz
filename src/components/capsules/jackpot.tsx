"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { BlurFade } from "@/components/ui/blur-fade";
import { HERO_GRAPHICS } from "@/lib/capsule-artwork";

function formatJackpot(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function Jackpot() {
  const [value, setValue] = useState(500);

  useEffect(() => {
    async function sync() {
      try {
        const res = await fetch("/api/jackpot");
        if (!res.ok) return;
        const data = (await res.json()) as { valueUsd: number };
        setValue(data.valueUsd);
      } catch {
        /* keep last value on network failure */
      }
    }

    void sync();
    const resync = setInterval(sync, 15_000);
    return () => clearInterval(resync);
  }, []);

  return (
    <section className="relative overflow-hidden px-6 py-16 sm:px-10 lg:px-16">
      {/* Vault glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 55%, rgba(245,230,163,0.06) 0%, transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl text-center">
        <BlurFade inView>
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/30">
            Current Jackpot
          </p>

          <motion.p
            key={Math.floor(value / 100)}
            className="mt-6 text-[clamp(3rem,9vw,6.5rem)] font-bold leading-none tracking-[-0.04em] text-white tabular-nums"
          >
            ${formatJackpot(value)}
          </motion.p>

          <p className="mx-auto mt-8 max-w-md text-lg leading-relaxed text-white/40">
            Every StockPack contributes to a shared jackpot vault. One lucky opening wins the
            vault.
          </p>
          <p className="mt-2 text-sm text-white/25">
            Seeded at $500. Every pack opened makes it grow.
          </p>
        </BlurFade>

        {/* Vault visualization */}
        <BlurFade inView delay={0.15}>
          <div className="relative mx-auto mt-10 flex h-52 w-52 items-center justify-center sm:h-56 sm:w-56">
            {/* Glow rings */}
            <motion.div
              animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(245,230,163,0.12)_0%,transparent_65%)]"
            />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute inset-2 rounded-full border border-dashed border-[#f0d78c]/15"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
              className="absolute inset-7 rounded-full border border-[#f0d78c]/10"
            />

            {/* Vault core */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="relative flex h-32 w-32 items-center justify-center rounded-[28px] bg-gradient-to-b from-[#1a1a14] to-[#0a0a08] shadow-[0_0_60px_rgba(245,230,163,0.15),inset_0_1px_0_rgba(245,230,163,0.15)] ring-1 ring-[#f0d78c]/20 sm:h-36 sm:w-36"
            >
              <Image
                src={HERO_GRAPHICS.icon}
                alt=""
                width={72}
                height={72}
                className="h-16 w-16 object-contain drop-shadow-[0_4px_16px_rgba(245,230,163,0.25)] sm:h-18 sm:w-18"
              />
            </motion.div>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
