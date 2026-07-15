"use client";

import { BlurFade } from "@/components/ui/blur-fade";
import { IconCloud } from "@/components/ui/icon-cloud";
import { SectionHeader } from "@/components/capsules/section-header";
import { LIVE_TOKENIZED_STOCKS, getStockLogoUrl } from "@/lib/tokenized-stocks";

const cloudLogos = LIVE_TOKENIZED_STOCKS.map((s) => getStockLogoUrl(s.ticker));

export function StockUniverseCloud() {
  return (
    <section className="px-6 py-32 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <SectionHeader
            title="18 Companies. One Chain."
            description="Drag the cloud. Every logo is a real tokenized stock you can pull from a StockPack."
          />

          <BlurFade inView delay={0.1}>
            <div className="relative mx-auto flex max-w-md items-center justify-center">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.06)_0%,transparent_65%)]" />
              <IconCloud images={cloudLogos} />
              <p className="absolute bottom-0 text-center text-xs text-white/25">
                Interactive · {LIVE_TOKENIZED_STOCKS.length} live tokens
              </p>
            </div>
          </BlurFade>
        </div>
      </div>
    </section>
  );
}
