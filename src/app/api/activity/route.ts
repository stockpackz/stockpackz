import { NextResponse } from "next/server";
import { activityTemplates, pullNames } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

/**
 * Returns the latest activity events. Events are generated deterministically
 * from time buckets so consecutive polls agree on recent history, simulating
 * a real indexer feed.
 */
export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 8), 20);

  const BUCKET_MS = 2600;
  const nowBucket = Math.floor(Date.now() / BUCKET_MS);

  const events = Array.from({ length: limit }, (_, i) => {
    const bucket = nowBucket - i;
    // simple deterministic hash of the bucket
    let h = bucket;
    h = ((h >> 16) ^ h) * 0x45d9f3b;
    h = ((h >> 16) ^ h) * 0x45d9f3b;
    h = (h >> 16) ^ h;
    const template = activityTemplates[Math.abs(h) % activityTemplates.length];
    const user =
      template.type === "jackpot"
        ? template.user
        : pullNames[Math.abs(h >> 3) % pullNames.length];
    return {
      id: `evt-${bucket}`,
      type: template.type,
      user,
      target: template.target,
      timestamp: new Date(bucket * BUCKET_MS).toISOString(),
    };
  });

  return NextResponse.json({ events });
}
