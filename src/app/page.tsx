"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import type { CapsuleType, PullResult } from "@/lib/types";
import { capsuleTypes, collections, rarityTiers } from "@/lib/mock-data";
import { Hero } from "@/components/capsules/hero";
import { LiveOpenings } from "@/components/capsules/live-openings";
import { HowToPlay } from "@/components/capsules/how-to-play";
import { CapsuleGrid } from "@/components/capsules/capsule-grid";
import { RarityShowcase } from "@/components/capsules/rarity-showcase";
import { OpenCapsuleFlow } from "@/components/capsules/open-capsule-flow";
import { Statistics } from "@/components/capsules/statistics";
import { Jackpot } from "@/components/capsules/jackpot";
import { Transparency } from "@/components/capsules/transparency";
import { Collections } from "@/components/capsules/collections";
import { FinalCta } from "@/components/capsules/final-cta";
import { PageBackground } from "@/components/capsules/page-background";
import { SiteNav } from "@/components/capsules/site-nav";
import { useWalletReady } from "@/components/capsules/wallet-button";
import { StockpackzLogo } from "@/components/brand/stockpackz-logo";
import { StockTickerStrip } from "@/components/stocks/stock-ticker-strip";
import { StockWatchlist } from "@/components/stocks/stock-watchlist";

export default function StockpackzPage() {
  const walletReady = useWalletReady();
  const [flowOpen, setFlowOpen] = useState(false);
  const [selectedCapsule, setSelectedCapsule] = useState<CapsuleType | null>(null);

  const handleOpenCapsule = useCallback(() => {
    setSelectedCapsule(null);
    setFlowOpen(true);
  }, []);

  const handleSelectCapsule = useCallback((capsule: CapsuleType) => {
    setSelectedCapsule(capsule);
    setFlowOpen(true);
  }, []);

  const handleCloseFlow = useCallback(() => {
    setFlowOpen(false);
    setSelectedCapsule(null);
  }, []);

  const handlePullComplete = useCallback((_result: PullResult) => {}, []);

  return (
    <main className="relative min-h-screen overflow-x-hidden text-foreground">
      <PageBackground />

      <SiteNav />

      <div className="pt-20">
        <Hero onOpenCapsule={handleOpenCapsule} walletReady={walletReady} />
        <StockTickerStrip />
        <LiveOpenings />
        <CapsuleGrid capsules={capsuleTypes} onSelect={handleSelectCapsule} />
        <Jackpot />
        <StockWatchlist />
        <RarityShowcase tiers={rarityTiers} />
        <HowToPlay />
        <Transparency />
        <Statistics />
        <Collections collections={collections} />
        <FinalCta onOpen={handleOpenCapsule} walletReady={walletReady} />
      </div>

      <footer className="border-t border-white/[0.04] px-6 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex justify-center">
            <StockpackzLogo variant="full" href="/" className="w-[180px]" />
          </div>
          <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-white/35">
            Every StockPack purchases real tokenized equities on Robinhood Chain through Uniswap
            v4. No inventory. No IOUs. Every opening settles directly into your wallet.
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-white/25">
            StockPackz is an independent, community-built application deployed on Robinhood Chain
            (chain ID 4663). It is not affiliated with, endorsed by, sponsored by, or operated by
            Robinhood Markets, Inc. or any of its subsidiaries. &ldquo;Robinhood&rdquo; is a
            trademark of its respective owner and is referenced here only to identify the public
            blockchain network. Trading tokenized assets involves risk, including loss of principal.
          </p>
          <div className="mt-12 flex flex-col items-center justify-between gap-6 sm:flex-row">
            <StockpackzLogo variant="wordmark" href="/" className="h-5 w-auto opacity-60" />
            <p className="text-xs text-white/25">
              Built on Robinhood Chain ·{" "}
              <Link href="/docs" className="text-white/40 transition-colors hover:text-white/60">
                Docs
              </Link>{" "}
              ·{" "}
              <a
                href="https://x.com/stockpackz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 transition-colors hover:text-white/60"
              >
                @stockpackz
              </a>{" "}
              ·{" "}
              <a
                href="https://github.com/stockpackz/stockpackz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 transition-colors hover:text-white/60"
              >
                GitHub
              </a>
            </p>
          </div>
        </div>
      </footer>

      <OpenCapsuleFlow
        capsules={capsuleTypes}
        selectedCapsule={selectedCapsule}
        isOpen={flowOpen}
        walletReady={walletReady}
        onClose={handleCloseFlow}
        onPullComplete={handlePullComplete}
      />
    </main>
  );
}
