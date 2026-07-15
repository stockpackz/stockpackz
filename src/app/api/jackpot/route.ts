import { NextResponse } from "next/server";

// Base jackpot seed. Once contracts are live this reads the on-chain
// jackpot vault balance; until then the vault sits at its seeded base.
const BASE_USD = 500;

export function GET() {
  return NextResponse.json({
    valueUsd: BASE_USD,
    growthPerSec: 0,
    updatedAt: new Date().toISOString(),
  });
}
