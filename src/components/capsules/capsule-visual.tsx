"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CapsuleVisualProps {
  primary?: string;
  secondary?: string;
  accent?: string;
  size?: "sm" | "md" | "lg" | "hero";
  floating?: boolean;
  spinning?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-24 w-[4.5rem]",
  md: "h-32 w-24",
  lg: "h-44 w-32",
  hero: "h-56 w-40 sm:h-64 sm:w-44",
};

export function CapsuleVisual({
  primary = "#0a0a0a",
  secondary = "#1a1a1a",
  accent = "#00c805",
  size = "md",
  floating = false,
  spinning = false,
  className,
}: CapsuleVisualProps) {
  return (
    <motion.div
      className={cn("relative", className)}
      animate={
        floating
          ? { y: [0, -10, 0] }
          : spinning
            ? { rotateY: [0, 360, 720, 1080] }
            : undefined
      }
      transition={
        floating
          ? { duration: 5, repeat: Infinity, ease: "easeInOut" }
          : spinning
            ? { duration: 1.4, ease: "easeInOut" }
            : undefined
      }
      style={{ perspective: 1000, transformStyle: "preserve-3d" }}
    >
      {/* Ground reflection */}
      <div
        aria-hidden
        className="absolute -bottom-8 left-1/2 h-4 w-3/4 -translate-x-1/2 rounded-[100%] bg-rh-green/10 blur-xl"
      />

      {/* Ambient glow */}
      <div
        aria-hidden
        className="absolute inset-0 scale-150 rounded-full opacity-40 blur-3xl"
        style={{ background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)` }}
      />

      {/* Capsule body */}
      <div
        className={cn(
          "relative overflow-hidden rounded-[999px] shadow-[inset_0_-16px_40px_rgba(0,0,0,0.6),0_20px_60px_rgba(0,0,0,0.5),0_0_80px_rgba(0,200,5,0.08)]",
          sizeClasses[size]
        )}
        style={{
          background: `linear-gradient(165deg, ${secondary} 0%, ${primary} 35%, ${primary} 65%, ${secondary} 100%)`,
        }}
      >
        {/* Top highlight */}
        <div className="absolute inset-x-[15%] top-[8%] h-[18%] rounded-full bg-white/[0.12] blur-sm" />

        {/* Center seam */}
        <div
          className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}44, transparent)` }}
        />

        {/* Accent ring */}
        <div
          className="absolute inset-[3px] rounded-[999px] border border-white/[0.06]"
          style={{ boxShadow: `inset 0 0 20px ${accent}15` }}
        />

        {/* Inner core */}
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
          <div
            className="h-3 w-3 rounded-full shadow-[0_0_12px_currentColor]"
            style={{ backgroundColor: accent, color: accent }}
          />
        </div>

        {/* Bottom shadow */}
        <div className="absolute inset-x-[10%] bottom-[6%] h-[12%] rounded-full bg-black/40 blur-md" />
      </div>
    </motion.div>
  );
}
