"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Flame, Key, Lock, Sparkles, Vault } from "lucide-react";
import { useAccount } from "wagmi";
import { SiteNav } from "@/components/capsules/site-nav";
import { PageBackground } from "@/components/capsules/page-background";
import { StockpackzLogo } from "@/components/brand/stockpackz-logo";
import {
  BURN_ECONOMICS,
  LEVEL_CURVE,
  LEVEL_UNLOCKS,
  MEMBERSHIP_TIERS,
  PACK_ECONOMICS,
  PACK_XP,
} from "@/lib/protocol";
import { formatCurrency } from "@/lib/utils";

/**
 * Demo wallet state — production reads MembershipTierManager, XPManager,
 * PackPrinter, and the vaults on Robinhood Chain.
 */
const DEMO = {
  packzBalance: 0,
  lifetimeXP: 0,
  seasonXP: 0,
  level: 1,
  prestigeCount: 0,
  packKeys: 0,
  nextKeyHours: 0,
  totalBurned: 0,
  rewardsVaultUsd: 0,
  jackpotUsd: 300,
};

export function TokenUtilityPage() {
  const { isConnected } = useAccount();
  const [hoveredTier, setHoveredTier] = useState<number | null>(null);

  const currentTier = useMemo(
    () =>
      [...MEMBERSHIP_TIERS].reverse().find((t) => DEMO.packzBalance >= t.minTokens) ??
      MEMBERSHIP_TIERS[0],
    []
  );
  const nextTier = MEMBERSHIP_TIERS.find((t) => t.minTokens > DEMO.packzBalance) ?? null;

  const nextLevel = LEVEL_CURVE.find((l) => l.xp > DEMO.lifetimeXP) ?? LEVEL_CURVE.at(-1)!;
  const prevLevelXp = [...LEVEL_CURVE].reverse().find((l) => l.xp <= DEMO.lifetimeXP)?.xp ?? 0;
  const levelProgress = Math.min(
    100,
    Math.round(((DEMO.lifetimeXP - prevLevelXp) / (nextLevel.xp - prevLevelXp)) * 100)
  );

  return (
    <div className="relative min-h-screen text-foreground">
      <PageBackground />
      <SiteNav />

      <div className="mx-auto max-w-6xl px-5 pt-28 pb-20 sm:px-8">
        {/* Header */}
        <div className="mb-12">
          <p className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.25em] text-rh-green">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-rh-green" />
            $PACKZ — Live on Robinhood Chain
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Hold more. Unlock more.
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/45">
            The token is an optional membership layer — packs always work without it. Holders get
            deterministic, fully-funded benefits: discounts, bonus stock value, XP multipliers,
            and the Pack Printer. Never hidden odds changes.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="https://flap.sh/robinhood/0xaab3d2e25869dd9661e7a886b9a51c02ee6c7777"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center rounded-full bg-rh-green px-6 text-sm font-semibold text-black transition-transform hover:scale-[1.03]"
            >
              Buy $PACKZ on Flap
            </a>
            <a
              href="https://robinhoodchain.blockscout.com/token/0xaab3d2e25869dd9661e7a886b9a51c02ee6c7777"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-white/[0.05] px-5 font-mono text-xs text-white/55 ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.08] hover:text-white/80"
            >
              0xaab3…7777
            </a>
          </div>
        </div>

        {/* Wallet status */}
        <div className="mb-12 grid gap-4 lg:grid-cols-3">
          {/* Tier card */}
          <div className="rounded-3xl bg-white/[0.03] p-6 ring-1 ring-white/[0.06] backdrop-blur-xl">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/30">Your tier</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {isConnected ? currentTier.name : "—"}
            </p>
            <p className="mt-1 text-sm tabular-nums text-white/45">
              {isConnected ? `${DEMO.packzBalance.toLocaleString()} PACKZ` : "Connect to view"}
            </p>
            {isConnected && nextTier && (
              <div className="mt-4">
                <div className="flex justify-between text-[11px] text-white/35">
                  <span>Next: {nextTier.name}</span>
                  <span className="tabular-nums">
                    {(nextTier.minTokens - DEMO.packzBalance).toLocaleString()} to go
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-rh-green"
                    style={{ width: `${Math.min(100, (DEMO.packzBalance / nextTier.minTokens) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            {isConnected && (
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  ["Discount", `${currentTier.discountPct}%`],
                  ["Subsidy", `+${formatCurrency(currentTier.stockSubsidy)}`],
                  ["XP", `${currentTier.xpMultiplier}x`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-white/[0.04] px-2 py-2.5">
                    <p className="text-sm font-semibold tabular-nums text-white">{value}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/30">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Progression card */}
          <div className="rounded-3xl bg-white/[0.03] p-6 ring-1 ring-white/[0.06] backdrop-blur-xl">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/30">Progression</p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-3xl font-semibold text-white">
                {isConnected ? `Level ${DEMO.level}` : "—"}
              </p>
              {isConnected && DEMO.prestigeCount > 0 && (
                <span className="text-xs text-[#f0d78c]">★ Prestige {DEMO.prestigeCount}</span>
              )}
            </div>
            {isConnected ? (
              <>
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] text-white/35">
                    <span className="tabular-nums">{DEMO.lifetimeXP.toLocaleString()} XP lifetime</span>
                    <span className="tabular-nums">
                      L{nextLevel.level} at {nextLevel.xp.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-white/60" style={{ width: `${levelProgress}%` }} />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-white/[0.04] px-2 py-2.5">
                    <p className="text-sm font-semibold tabular-nums text-white">
                      {DEMO.seasonXP.toLocaleString()}
                    </p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/30">Season XP</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] px-2 py-2.5">
                    <p className="text-sm font-semibold tabular-nums text-white">{DEMO.prestigeCount}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/30">Prestige</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-1 text-sm text-white/45">Connect to view</p>
            )}
          </div>

          {/* Pack Printer card */}
          <div className="rounded-3xl bg-white/[0.03] p-6 ring-1 ring-white/[0.06] backdrop-blur-xl">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-white/30">
              <Key className="h-3 w-3" /> Pack Printer
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-white">
              {isConnected ? `${DEMO.packKeys} keys` : "—"}
            </p>
            {isConnected ? (
              <>
                <p className="mt-1 text-sm text-white/45">
                  {currentTier.keyIntervalHours > 0
                    ? `1 key every ${currentTier.keyIntervalHours}h · next in ~${DEMO.nextKeyHours}h`
                    : "Reach Bronze to start printing"}
                </p>
                <div className="mt-4 space-y-1.5 text-xs">
                  {[
                    ["Standard Key Pack", "1 key", true],
                    ["Founder Pack", "5 keys", currentTier.founderAccess],
                    ["Black Pack", "20 keys + L100", currentTier.blackAccess],
                  ].map(([name, cost, unlocked]) => (
                    <div key={name as string} className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-white/50">
                        {unlocked ? (
                          <Check className="h-3 w-3 text-rh-green" />
                        ) : (
                          <Lock className="h-3 w-3 text-white/25" />
                        )}
                        {name}
                      </span>
                      <span className="tabular-nums text-white/35">{cost}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-1 text-sm text-white/45">Connect to view</p>
            )}
          </div>
        </div>

        {/* Tier table */}
        <section className="mb-12">
          <h2 className="mb-1 text-2xl font-semibold tracking-tight text-white">Membership tiers</h2>
          <p className="mb-6 text-sm text-white/40">
            Benefits use your balance at opening. Every number below is on-chain and configurable —
            odds are never affected by tier.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {MEMBERSHIP_TIERS.map((tier) => {
              const active = isConnected && tier.id === currentTier.id;
              return (
                <motion.div
                  key={tier.id}
                  onHoverStart={() => setHoveredTier(tier.id)}
                  onHoverEnd={() => setHoveredTier(null)}
                  animate={{ y: hoveredTier === tier.id ? -4 : 0 }}
                  className={`rounded-2xl p-5 ring-1 backdrop-blur-xl transition-colors ${
                    active
                      ? "bg-rh-green/[0.06] ring-rh-green/30"
                      : "bg-white/[0.03] ring-white/[0.06]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">{tier.name}</p>
                    {active && (
                      <span className="rounded-full bg-rh-green/15 px-2 py-0.5 text-[10px] font-medium text-rh-green">
                        You
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] tabular-nums text-white/35">
                    {tier.minTokens === 0 ? "No minimum" : `${tier.minTokens.toLocaleString()}+ PACKZ`}
                  </p>
                  <div className="mt-4 space-y-2 text-xs">
                    <Row label="Pack discount" value={tier.discountPct ? `${tier.discountPct}%` : "—"} />
                    <Row label="Stock bonus" value={tier.stockSubsidy ? `+${formatCurrency(tier.stockSubsidy)}` : "—"} />
                    <Row label="XP rate" value={`${tier.xpMultiplier}x`} />
                    <Row
                      label="Pack Printer"
                      value={tier.keyIntervalHours ? `1 / ${tier.keyIntervalHours}h` : "—"}
                    />
                    <Row label="Founder Packs" value={tier.founderAccess ? "Yes" : "—"} />
                    <Row label="Black Packs" value={tier.blackAccess ? "Yes" : "—"} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Economics + burn */}
        <section className="mb-12 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl bg-white/[0.03] p-6 ring-1 ring-white/[0.06] backdrop-blur-xl">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Flame className="h-4 w-4 text-orange-400" /> Every opening burns
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-white/45">
              Holders pay {formatCurrency(PACK_ECONOMICS.price)} + approximately{" "}
              {formatCurrency(BURN_ECONOMICS.burnUsd)} of STOCKPACKZ, burned forever. Non-holders
              pay {formatCurrency(BURN_ECONOMICS.nonHolderTotal)} with no burn. The burn quantity
              tracks the live token price through an oracle — never a fixed amount.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/[0.04] p-4">
                <p className="text-2xl font-semibold tabular-nums text-white">
                  {DEMO.totalBurned.toLocaleString()}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-white/30">
                  PACKZ burned to date
                </p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] p-4">
                <p className="text-2xl font-semibold tabular-nums text-white">
                  {formatCurrency(PACK_ECONOMICS.stockAmount)}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-white/30">
                  Always buys stock
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white/[0.03] p-6 ring-1 ring-white/[0.06] backdrop-blur-xl">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Vault className="h-4 w-4 text-rh-green" /> Funded vaults
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-white/45">
              The 1% token trading tax splits 50/50 into two vaults, converted to USDG by keepers.
              Every subsidy, key opening, and reward is paid from real, pre-funded USDG — never
              minted, never promised.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/[0.04] p-4">
                <p className="text-2xl font-semibold tabular-nums text-white">
                  {formatCurrency(DEMO.rewardsVaultUsd)}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-white/30">
                  Pack Rewards Vault
                </p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] p-4">
                <p className="text-2xl font-semibold tabular-nums text-rh-green">
                  {formatCurrency(DEMO.jackpotUsd)}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-white/30">
                  Global Jackpot
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* XP + unlocks */}
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl bg-white/[0.03] p-6 ring-1 ring-white/[0.06] backdrop-blur-xl">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Sparkles className="h-4 w-4 text-[#c4b5fd]" /> Pack XP
            </h3>
            <p className="mt-2 text-sm text-white/45">
              XP is awarded only after a stock purchase settles — never for failed or refunded
              openings. Your tier multiplies every award.
            </p>
            <div className="mt-5 space-y-2">
              {(
                [
                  ["Standard Pack", PACK_XP.standard],
                  ["Premium Pack", PACK_XP.premium],
                  ["Founder Pack", PACK_XP.founder],
                  ["Black Pack", PACK_XP.black],
                ] as const
              ).map(([name, xpValue]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-2.5 text-sm"
                >
                  <span className="text-white/60">{name}</span>
                  <span className="font-semibold tabular-nums text-white">{xpValue} XP</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white/[0.03] p-6 ring-1 ring-white/[0.06] backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-white">Level unlocks</h3>
            <p className="mt-2 text-sm text-white/45">
              New unlocks ship through an on-chain registry — the XP contract never changes.
            </p>
            <div className="mt-5 space-y-2">
              {LEVEL_UNLOCKS.map((unlock) => {
                const unlocked = isConnected && DEMO.level >= unlock.level;
                return (
                  <div
                    key={unlock.level}
                    className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-2.5 text-sm"
                  >
                    <span className={`flex items-center gap-2 ${unlocked ? "text-white" : "text-white/45"}`}>
                      {unlocked ? (
                        <Check className="h-3.5 w-3.5 text-rh-green" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 text-white/25" />
                      )}
                      {unlock.name}
                    </span>
                    <span className="tabular-nums text-white/35">L{unlock.level}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <p className="mt-10 text-center text-xs leading-relaxed text-white/25">
          The pack product never depends on the token: the guaranteed{" "}
          {formatCurrency(PACK_ECONOMICS.stockAmount)} stock purchase is always funded by the
          buyer, and the product remains fully operational at any token price.
        </p>
      </div>

      <footer className="border-t border-white/[0.05] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 sm:px-8">
          <StockpackzLogo variant="full" href="/" className="h-10 w-auto opacity-80" />
        </div>
      </footer>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/40">{label}</span>
      <span className="font-medium tabular-nums text-white/80">{value}</span>
    </div>
  );
}
