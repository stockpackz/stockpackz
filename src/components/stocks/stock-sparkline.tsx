"use client";

import { cn } from "@/lib/utils";

interface StockSparklineProps {
  data: number[];
  positive?: boolean;
  className?: string;
  width?: number;
  height?: number;
}

export function StockSparkline({
  data,
  positive = true,
  className,
  width = 72,
  height = 28,
}: StockSparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  const stroke = positive ? "rgba(52, 211, 153, 0.9)" : "rgba(248, 113, 113, 0.9)";
  const fill = positive ? "rgba(52, 211, 153, 0.12)" : "rgba(248, 113, 113, 0.12)";

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      <polygon points={areaPoints} fill={fill} />
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
