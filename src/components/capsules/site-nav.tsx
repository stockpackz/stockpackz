"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { StockpackzLogo } from "@/components/brand/stockpackz-logo";
import { WalletButton } from "./wallet-button";

const LINKS = [
  { label: "Packs", href: "/#packs", id: "packs" },
  { label: "Stocks", href: "/#stocks", id: "stocks" },
  { label: "Collections", href: "/#collections", id: "collections" },
  { label: "Token", href: "/token", id: "token" },
  { label: "Docs", href: "/docs", id: "docs" },
];

export function SiteNav() {
  const pathname = usePathname();
  const routeTab = pathname?.startsWith("/docs") ? "docs" : pathname?.startsWith("/token") ? "token" : null;
  const [sectionActive, setSectionActive] = useState<string | null>(null);
  const active = routeTab ?? sectionActive;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    if (routeTab) {
      return () => window.removeEventListener("scroll", onScroll);
    }

    const sections = LINKS.map((l) => l.id)
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setSectionActive(entry.target.id);
        }
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    sections.forEach((s) => observer.observe(s));

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [routeTab]);

  return (
    <motion.header
      initial={{ y: -70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 210, damping: 26, delay: 0.1 }}
      className="fixed inset-x-0 top-4 z-40 flex justify-center px-4"
    >
      <nav
        className={`flex w-full max-w-[820px] items-center justify-between gap-2 rounded-full py-2 pr-2 pl-4 ring-1 transition-all duration-500 sm:gap-4 ${
          scrolled
            ? "bg-black/70 shadow-[0_12px_40px_rgba(0,0,0,0.6)] ring-white/[0.09] backdrop-blur-2xl"
            : "bg-white/[0.04] ring-white/[0.06] backdrop-blur-xl"
        }`}
      >
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <StockpackzLogo variant="icon" className="h-6 w-6" priority />
          <StockpackzLogo variant="wordmark" className="hidden h-3 w-auto lg:block" />
        </Link>

        <div className="hidden items-center sm:flex">
          {LINKS.map((link) => {
            const isActive = active === link.id;
            return (
              <Link
                key={link.id}
                href={link.href}
                className="relative rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors lg:px-4"
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="absolute inset-0 rounded-full bg-white/[0.08] ring-1 ring-white/[0.08]"
                  />
                )}
                <span
                  className={`relative z-10 transition-colors ${
                    isActive ? "text-white" : "text-white/45 hover:text-white"
                  }`}
                >
                  {link.label}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="shrink-0">
          <WalletButton />
        </div>
      </nav>
    </motion.header>
  );
}
