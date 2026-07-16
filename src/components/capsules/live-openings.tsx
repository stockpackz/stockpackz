"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trophy, Package, Award } from "lucide-react";
import type { ActivityEvent } from "@/lib/types";
import { BlurFade } from "@/components/ui/blur-fade";
import { SectionHeader } from "./section-header";
import { StockLogo } from "./stock-logo";
import { ALL_TOKENIZED_STOCKS, getTokenByTicker } from "@/lib/tokenized-stocks";

function resolveToken(target: string) {
  return (
    getTokenByTicker(target) ??
    ALL_TOKENIZED_STOCKS.find((s) =>
      s.instrumentName.toLowerCase().includes(target.toLowerCase())
    )
  );
}

function eventCopy(event: ActivityEvent): { prefix: string; highlight: string } {
  switch (event.type) {
    case "pull":
      return { prefix: `${event.user} pulled`, highlight: event.target };
    case "collection":
      return { prefix: `${event.user} completed`, highlight: event.target };
    case "pack_open":
      return { prefix: `${event.user} opened`, highlight: event.target };
    case "jackpot":
      return { prefix: `${event.user} won`, highlight: "the Jackpot" };
  }
}

function EventIcon({ event }: { event: ActivityEvent }) {
  if (event.type === "pull") {
    const token = resolveToken(event.target);
    if (token) return <StockLogo ticker={token.ticker} size="sm" />;
  }
  const Icon =
    event.type === "jackpot" ? Trophy : event.type === "collection" ? Award : Package;
  return (
    <span
      className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 ${
        event.type === "jackpot"
          ? "bg-[#f5e6a3]/10 text-[#f0d78c] ring-[#f0d78c]/20"
          : "bg-white/[0.06] text-white/50 ring-white/[0.06]"
      }`}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </span>
  );
}

export function LiveOpenings() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/activity?limit=8");
        if (!res.ok) return;
        const data = (await res.json()) as {
          events: (Omit<ActivityEvent, "timestamp"> & { timestamp: string })[];
        };
        setEvents(
          data.events.map((e) => ({ ...e, timestamp: new Date(e.timestamp) }))
        );
      } catch {
        /* keep last events on network failure */
      }
    }

    void poll();
    const interval = setInterval(poll, 2600);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="px-6 py-14 sm:px-10 lg:px-16">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
        <div>
          <SectionHeader
            title="Live Openings"
            description="Packs are opening right now, around the world."
          />
          <div className="mt-8 flex gap-10">
            {[
              { value: "$300", label: "Base jackpot" },
              { value: "5", label: "Curated packs" },
              { value: "14", label: "Tokenized stocks" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold tabular-nums tracking-tight text-white">
                  {stat.value}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/30">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <BlurFade inView>
          <div className="relative">
            {events.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl bg-white/[0.03] px-8 py-14 text-center ring-1 ring-white/[0.05]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-[#00c805] opacity-50" />
                  <span className="relative h-2 w-2 rounded-full bg-[#00c805]" />
                </span>
                <p className="mt-4 text-[15px] font-medium text-white/70">
                  Waiting for the first opening
                </p>
                <p className="mt-1.5 text-sm text-white/35">
                  Every pack opened on Robinhood Chain appears here in real time.
                </p>
              </div>
            )}
            {events.length > 0 && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-[#050505] to-transparent" />
            )}
            <AnimatePresence mode="popLayout" initial={false}>
              {events.slice(0, 5).map((event, i) => {
                const copy = eventCopy(event);
                const isJackpot = event.type === "jackpot";
                return (
                  <motion.div
                    key={event.id}
                    layout
                    initial={{ opacity: 0, y: -24, scale: 0.97 }}
                    animate={{ opacity: 1 - i * 0.16, y: 0, scale: 1 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className={`mb-3 flex items-center gap-4 rounded-2xl px-5 py-4 ring-1 ${
                      isJackpot
                        ? "bg-[#f5e6a3]/[0.05] ring-[#f0d78c]/15"
                        : "bg-white/[0.03] ring-white/[0.05]"
                    }`}
                  >
                    <EventIcon event={event} />
                    <p className="text-[15px] tracking-tight">
                      <span className={i === 0 ? "text-white" : "text-white/60"}>
                        {copy.prefix}{" "}
                      </span>
                      <span
                        className={`font-semibold ${
                          isJackpot ? "text-[#f0d78c]" : i === 0 ? "text-white" : "text-white/70"
                        }`}
                      >
                        {copy.highlight}
                      </span>
                    </p>
                    {i === 0 && (
                      <span className="ml-auto flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-white/30">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute h-full w-full animate-ping rounded-full bg-[#00c805] opacity-50" />
                          <span className="relative h-1.5 w-1.5 rounded-full bg-[#00c805]" />
                        </span>
                        now
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
