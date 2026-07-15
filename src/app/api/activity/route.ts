import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Live activity feed. Returns real opening events once the on-chain
 * indexer is wired up — no fabricated activity before launch.
 */
export function GET() {
  return NextResponse.json({ events: [] });
}
