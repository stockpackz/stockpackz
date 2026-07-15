import type { Rarity } from "@/lib/types";
import { cn } from "@/lib/utils";

const rarityLabels: Record<Rarity, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

interface RarityBadgeProps {
  rarity: Rarity;
  className?: string;
  showLabel?: boolean;
}

export function RarityBadge({ rarity, className, showLabel = false }: RarityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        `rarity-${rarity}`,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", `rarity-dot-${rarity}`)} />
      {showLabel && rarityLabels[rarity]}
    </span>
  );
}
