"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SiteNav } from "@/components/capsules/site-nav";
import { PageBackground } from "@/components/capsules/page-background";
import { StockpackzLogo } from "@/components/brand/stockpackz-logo";
import { cn } from "@/lib/utils";

export interface DocSection {
  slug: string;
  title: string;
  content: string;
}

interface DocsViewerProps {
  sections: DocSection[];
}

export function DocsViewer({ sections }: DocsViewerProps) {
  const [active, setActive] = useState(sections[0]?.slug ?? "");

  const current = sections.find((s) => s.slug === active) ?? sections[0];
  const currentIndex = sections.findIndex((s) => s.slug === current.slug);
  const prev = currentIndex > 0 ? sections[currentIndex - 1] : null;
  const next = currentIndex < sections.length - 1 ? sections[currentIndex + 1] : null;

  function go(slug: string) {
    setActive(slug);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="relative min-h-screen text-foreground">
      <PageBackground />
      <SiteNav />

      <div className="mx-auto max-w-6xl px-5 pt-28 pb-20 sm:px-8">
        {/* Page header */}
        <div className="mb-10">
          <p className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.25em] text-rh-green">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-rh-green" />
            Documentation
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            How Stockpackz works.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/45">
            Everything under the hood — tokenized stocks, verifiable randomness, Uniswap v4
            settlement, and self-custody on Robinhood Chain.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[230px_minmax(0,1fr)]">
          {/* Sidebar */}
          <nav className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl bg-white/[0.03] p-2 ring-1 ring-white/[0.06] backdrop-blur-xl">
              <ul className="space-y-0.5">
                {sections.map((section, i) => {
                  const isActive = active === section.slug;
                  return (
                    <li key={section.slug}>
                      <button
                        type="button"
                        onClick={() => go(section.slug)}
                        className={cn(
                          "relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] transition-colors",
                          isActive
                            ? "text-white"
                            : "text-white/45 hover:bg-white/[0.04] hover:text-white"
                        )}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="docs-active"
                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                            className="absolute inset-0 rounded-xl bg-white/[0.07] ring-1 ring-white/[0.08]"
                          />
                        )}
                        <span
                          className={cn(
                            "relative z-10 w-5 text-[11px] font-mono tabular-nums",
                            isActive ? "text-rh-green" : "text-white/25"
                          )}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="relative z-10 font-medium">{section.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>

          {/* Content */}
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.article
                key={current.slug}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="docs-prose rounded-3xl bg-white/[0.02] px-6 py-8 ring-1 ring-white/[0.05] backdrop-blur-xl sm:px-10 sm:py-10"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{current.content}</ReactMarkdown>
              </motion.article>
            </AnimatePresence>

            {/* Prev / next */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {prev ? (
                <button
                  type="button"
                  onClick={() => go(prev.slug)}
                  className="group rounded-2xl bg-white/[0.03] px-5 py-4 text-left ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.05] hover:ring-white/[0.1]"
                >
                  <span className="text-[11px] uppercase tracking-[0.2em] text-white/30">
                    Previous
                  </span>
                  <span className="mt-1 block text-sm font-medium text-white/70 transition-colors group-hover:text-white">
                    ← {prev.title}
                  </span>
                </button>
              ) : (
                <span />
              )}
              {next && (
                <button
                  type="button"
                  onClick={() => go(next.slug)}
                  className="group rounded-2xl bg-white/[0.03] px-5 py-4 text-right ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.05] hover:ring-white/[0.1] sm:col-start-2"
                >
                  <span className="text-[11px] uppercase tracking-[0.2em] text-white/30">
                    Next
                  </span>
                  <span className="mt-1 block text-sm font-medium text-white/70 transition-colors group-hover:text-white">
                    {next.title} →
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 sm:px-8">
          <StockpackzLogo variant="full" href="/" className="h-10 w-auto opacity-80" />
          <p className="max-w-md text-center text-xs leading-relaxed text-white/30">
            Every StockPack purchases real tokenized equities on Robinhood Chain through Uniswap
            v4. No inventory. No IOUs.
          </p>
        </div>
      </footer>
    </div>
  );
}
