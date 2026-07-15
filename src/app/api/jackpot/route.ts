import { NextResponse } from "next/server";

// The vault grows deterministically from a fixed epoch so every
// client (and every poll) sees the same monotonically increasing value.
const EPOCH_MS = Date.UTC(2026, 6, 15); // Jul 15 2026
const BASE_USD = 180_412.62;
const GROWTH_PER_SEC = 0.12;

export function GET() {
  const elapsedSec = (Date.now() - EPOCH_MS) / 1000;
  const value = BASE_USD + elapsedSec * GROWTH_PER_SEC;
  return NextResponse.json({
    valueUsd: Math.round(value * 100) / 100,
    growthPerSec: GROWTH_PER_SEC,
    updatedAt: new Date().toISOString(),
  });
}
