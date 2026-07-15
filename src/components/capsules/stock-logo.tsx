"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getStockLogoUrl } from "@/lib/tokenized-stocks";

interface StockLogoProps {
  ticker: string;
  /** Explicit logo URL — falls back to FMP CDN */
  logoUrl?: string;
  color?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  glow?: boolean;
}

const sizeMap = {
  xs: { box: "h-6 w-6", img: 20, text: "text-[8px]", radius: "rounded-lg", pad: "p-0.5" },
  sm: { box: "h-9 w-9", img: 28, text: "text-[9px]", radius: "rounded-xl", pad: "p-1" },
  md: { box: "h-12 w-12", img: 36, text: "text-[10px]", radius: "rounded-xl", pad: "p-1.5" },
  lg: { box: "h-16 w-16", img: 48, text: "text-xs", radius: "rounded-2xl", pad: "p-1.5" },
  xl: { box: "h-24 w-24", img: 72, text: "text-sm", radius: "rounded-2xl", pad: "p-2" },
  "2xl": { box: "h-32 w-32", img: 96, text: "text-base", radius: "rounded-3xl", pad: "p-2.5" },
};

export function StockLogo({
  ticker,
  logoUrl,
  color = "#333333",
  size = "md",
  className,
  glow = false,
}: StockLogoProps) {
  const [failed, setFailed] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const s = sizeMap[size];

  const sources = [
    logoUrl,
    getStockLogoUrl(ticker),
  ].filter(Boolean) as string[];

  const currentSrc = sources[fallbackIndex];

  const handleError = () => {
    if (fallbackIndex < sources.length - 1) {
      setFallbackIndex((i) => i + 1);
    } else {
      setFailed(true);
    }
  };

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
        s.box,
        s.radius,
        glow && "shadow-[0_0_40px_rgba(0,200,5,0.25)] ring-1 ring-rh-green/30",
        className
      )}
    >
      {currentSrc && !failed ? (
        <Image
          src={currentSrc}
          alt={`${ticker} logo`}
          width={s.img}
          height={s.img}
          className={cn("object-contain", s.pad)}
          onError={handleError}
          unoptimized
        />
      ) : (
        <span className={cn("font-semibold tracking-tight text-neutral-700", s.text)}>
          {ticker.slice(0, 4)}
        </span>
      )}
      {!failed && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            background: `radial-gradient(circle at 30% 20%, ${color}, transparent 70%)`,
          }}
        />
      )}
    </div>
  );
}
