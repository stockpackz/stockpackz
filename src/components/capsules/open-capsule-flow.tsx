"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { ArrowRight, Check, X } from "lucide-react";
import type { CapsuleType, PullResult } from "@/lib/types";
import { pickRandomPull } from "@/lib/mock-data";
import { PACK_ECONOMICS, JACKPOT_ODDS, BURN_ECONOMICS, PACK_XP, type SettlementResult } from "@/lib/protocol";
import { formatCurrency } from "@/lib/utils";
import { StockLogo } from "./stock-logo";
import { ConnectWalletPrompt } from "./connect-wallet-prompt";
import { MiniPack } from "./mini-pack";
import { StockpackzLogo } from "@/components/brand/stockpackz-logo";
import { getCapsuleArtwork } from "@/lib/capsule-artwork";

type FlowPhase =
  | "idle"
  | "connect"
  | "selecting"
  | "focus"
  | "rotating"
  | "tearing"
  | "burst"
  | "reveal"
  | "swap"
  | "result";

interface OpenCapsuleFlowProps {
  capsules: CapsuleType[];
  selectedCapsule: CapsuleType | null;
  isOpen: boolean;
  walletReady: boolean;
  onClose: () => void;
  onPullComplete?: (result: PullResult) => void;
}

/* ------------------------------------------------------------------ */
/* Placeholder crinkle sound — short filtered noise bursts (WebAudio)  */
/* ------------------------------------------------------------------ */

let audioCtx: AudioContext | null = null;

function playCrinkle(intensity = 0.5) {
  try {
    audioCtx ??= new AudioContext();
    const ctx = audioCtx;
    if (ctx.state === "suspended") void ctx.resume();

    const duration = 0.05 + Math.random() * 0.04;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2400 + Math.random() * 3200;
    filter.Q.value = 1.5;
    const gain = ctx.createGain();
    gain.gain.value = 0.04 * intensity;

    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  } catch {
    /* audio unavailable — silent */
  }
}

/* ------------------------------------------------------------------ */

const CINEMATIC_PHASES: FlowPhase[] = ["focus", "rotating", "tearing", "burst", "reveal", "swap", "result"];

export function OpenCapsuleFlow({
  capsules,
  selectedCapsule,
  isOpen,
  walletReady,
  onClose,
  onPullComplete,
}: OpenCapsuleFlowProps) {
  const [phase, setPhase] = useState<FlowPhase>("idle");
  const [activeCapsule, setActiveCapsule] = useState<CapsuleType | null>(null);
  const [result, setResult] = useState<PullResult | null>(null);
  const [settlement, setSettlement] = useState<SettlementResult | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const crinkleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (crinkleRef.current) {
      clearInterval(crinkleRef.current);
      crinkleRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setPhase("idle");
    setActiveCapsule(null);
    setResult(null);
    setSettlement(null);
  }, [clearTimers]);

  /** Run the full cinematic timeline for a capsule */
  const startOpening = useCallback(
    (capsule: CapsuleType) => {
      clearTimers();
      setActiveCapsule(capsule);
      setResult(null);
      setSettlement(null);

      // The server-side draw is the authority (mirrors the on-chain
      // verifiable-randomness fulfillment). The reveal is gated on it —
      // no company is ever shown before the draw resolves.
      const draw: Promise<SettlementResult> = fetch("/api/packs/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: capsule.id }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("open failed");
          return (await res.json()) as SettlementResult;
        })
        .catch(() => {
          // Offline/demo fallback: draw locally with the same weights.
          const pull = pickRandomPull(capsule);
          return {
            packId: capsule.id,
            stock: pull.stock,
            tokenAmount: pull.tokenAmount,
            valueUsd: pull.valueUsd,
            usdgIn: PACK_ECONOMICS.stockAmount,
            executionPrice: pull.tokenAmount > 0 ? pull.valueUsd / pull.tokenAmount : 0,
            jackpotContribution: PACK_ECONOMICS.jackpotContribution,
            jackpotWon: false,
            jackpotPayout: 0,
            txHash: "",
            settledAt: new Date().toISOString(),
          } satisfies SettlementResult;
        });

      const at = (ms: number, fn: () => void) => {
        timersRef.current.push(setTimeout(fn, ms));
      };

      setPhase("focus");
      at(850, () => {
        setPhase("rotating");
        crinkleRef.current = setInterval(() => playCrinkle(0.4 + Math.random() * 0.4), 420);
      });
      at(3050, () => {
        if (crinkleRef.current) clearInterval(crinkleRef.current);
        playCrinkle(1);
        setPhase("tearing");
      });
      // The pack stays sealed until the draw settles — then burst → reveal.
      at(4250, () => {
        void draw.then((data) => {
          const pullResult: PullResult = {
            stock: data.stock,
            capsule,
            tokenAmount: data.tokenAmount,
            valueUsd: data.valueUsd,
          };
          setResult(pullResult);
          setSettlement(data);
          setPhase("burst");
          at(1500, () => setPhase("reveal"));
          at(3850, () => setPhase("swap"));
          at(4950, () => {
            setPhase("result");
            if (data.jackpotWon || pullResult.stock.rarity === "legendary") {
              fireLegendaryConfetti();
            }
            onPullComplete?.(pullResult);
          });
        });
      });
    },
    [clearTimers, onPullComplete]
  );

  useEffect(() => {
    // Phase transitions are driven by modal open/close and wallet readiness;
    // the state machine must react synchronously to these external inputs.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!isOpen) {
      reset();
      return;
    }
    if (!walletReady) {
      setPhase("connect");
      return;
    }
    if (selectedCapsule) {
      startOpening(selectedCapsule);
    } else {
      setPhase("selecting");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, walletReady]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleOpenAgain = () => {
    if (!activeCapsule) return;
    setResult(null);
    setSettlement(null);
    startOpening(activeCapsule);
  };

  if (!isOpen) return null;

  const cinematic = CINEMATIC_PHASES.includes(phase);
  const canDismiss = phase === "result" || phase === "selecting" || phase === "connect";
  const stocks = activeCapsule?.stocks ?? [];
  const winner = result?.stock ?? null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        {/* Backdrop — deepens as the camera zooms in */}
        <motion.div
          animate={{
            backgroundColor: cinematic ? "rgba(0,0,0,0.99)" : "rgba(0,0,0,0.94)",
            backdropFilter: cinematic ? "blur(40px)" : "blur(20px)",
          }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
          style={{ backdropFilter: "blur(20px)" }}
          onClick={canDismiss ? handleClose : undefined}
        />

        {/* Studio spotlight */}
        <motion.div
          aria-hidden
          animate={{ opacity: phase === "tearing" || phase === "burst" ? 1 : 0.6 }}
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              phase === "tearing" || phase === "burst"
                ? "radial-gradient(ellipse 45% 40% at 50% 48%, rgba(0,200,5,0.10) 0%, transparent 65%)"
                : "radial-gradient(ellipse 50% 38% at 50% 45%, rgba(255,255,255,0.05) 0%, transparent 65%)",
          }}
        />

        <div className="relative z-10 w-full max-w-md px-4">
          {canDismiss && (
            <button
              type="button"
              onClick={handleClose}
              className="absolute -top-14 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/40 transition-colors hover:bg-white/[0.1] hover:text-white sm:right-0"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {phase === "connect" && <ConnectWalletPrompt onClose={handleClose} />}

          {phase === "selecting" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="max-h-[80vh] overflow-y-auto rounded-3xl bg-white/[0.04] p-6 backdrop-blur-2xl"
            >
              <StockpackzLogo variant="icon" className="mx-auto mb-4 h-10 w-10" />
              <h3 className="text-center text-xl font-semibold tracking-tight text-white">
                Choose a pack
              </h3>
              <p className="mt-1.5 text-center text-sm text-white/40">
                Pick which StockPack to open
              </p>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-white/30">
                Every {formatCurrency(PACK_ECONOMICS.price)} pack: {formatCurrency(PACK_ECONOMICS.stockAmount)} buys
                your stock · {formatCurrency(PACK_ECONOMICS.protocolFee)} protocol ·{" "}
                {formatCurrency(PACK_ECONOMICS.jackpotContribution)} jackpot · 1 in{" "}
                {JACKPOT_ODDS.approxOneIn.toLocaleString()} wins the vault
              </p>
              <p className="mt-1.5 text-center text-[11px] leading-relaxed text-white/30">
                Holders add a ~{formatCurrency(BURN_ECONOMICS.burnUsd)} STOCKPACKZ burn · non-holders
                pay {formatCurrency(BURN_ECONOMICS.nonHolderTotal)} with no burn · +{PACK_XP.standard} XP
                per opening
              </p>
              <div className="mt-6 space-y-2">
                {capsules.map((capsule) => (
                  <button
                    key={capsule.id}
                    type="button"
                    onClick={() => startOpening(capsule)}
                    className="group flex w-full items-center gap-4 rounded-2xl bg-white/[0.03] px-4 py-3.5 transition-all hover:bg-white/[0.07]"
                  >
                    <MiniPack
                      size="sm"
                      accent={capsule.artwork.accent}
                      artSrc={getCapsuleArtwork(capsule.id)}
                      className="transition-transform group-hover:scale-105"
                    />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-white">{capsule.name}</p>
                      <p className="text-xs text-white/35">{capsule.assetCount} assets</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-white/70">
                      {formatCurrency(capsule.price)}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {cinematic && activeCapsule && (
            <div
              className="relative flex h-[560px] flex-col items-center justify-center"
              style={{ perspective: 1200 }}
            >
              {/* ---------- THE PACK (focus → rotating → tearing) ---------- */}
              <AnimatePresence>
                {(phase === "focus" || phase === "rotating" || phase === "tearing") && (
                  <motion.div
                    key="pack"
                    initial={{ scale: 0.55, y: 120, opacity: 0 }}
                    animate={{
                      scale: phase === "focus" ? 1 : 1.12,
                      y: phase === "tearing" ? [0, -2, 1, -1, 0] : 0,
                      opacity: 1,
                    }}
                    exit={{ scale: 1.5, opacity: 0, filter: "blur(12px)" }}
                    transition={{
                      scale: { duration: 1.1, ease: [0.22, 1, 0.36, 1] },
                      opacity: { duration: 0.5 },
                      y: phase === "tearing" ? { duration: 0.3, repeat: 3 } : undefined,
                    }}
                    className="absolute"
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    <motion.div
                      animate={
                        phase === "rotating" || phase === "tearing"
                          ? { rotateY: [-9, 9, -9] }
                          : { rotateY: 0 }
                      }
                      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                      className="relative h-[380px] w-[253px]"
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      <Image
                        src={getCapsuleArtwork(activeCapsule.id)}
                        alt={activeCapsule.name}
                        fill
                        priority
                        className="object-contain drop-shadow-[0_40px_80px_rgba(0,0,0,0.9)]"
                        sizes="253px"
                      />

                      {/* Moving metallic sheen */}
                      <motion.div
                        aria-hidden
                        animate={{ x: ["-130%", "130%"] }}
                        transition={{
                          duration: phase === "focus" ? 3 : 2.2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="pointer-events-none absolute inset-y-[6%] w-[45%] opacity-60"
                        style={{
                          background:
                            "linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.14) 45%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.14) 55%, transparent 100%)",
                        }}
                      />

                      {/* Seal tear — green light escaping from the top */}
                      {phase === "tearing" && (
                        <>
                          <motion.div
                            initial={{ scaleX: 0, opacity: 0 }}
                            animate={{ scaleX: 1, opacity: [0, 1, 0.85] }}
                            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                            className="absolute inset-x-[8%] top-[7%] h-[3px] origin-left rounded-full bg-[#7dffa0]"
                            style={{ boxShadow: "0 0 24px 6px rgba(0,200,5,0.55)" }}
                          />
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.9, 0.6] }}
                            transition={{ duration: 1, delay: 0.25 }}
                            className="absolute inset-x-[4%] -top-[10%] h-[30%]"
                            style={{
                              background:
                                "radial-gradient(ellipse 60% 100% at 50% 100%, rgba(0,200,5,0.35) 0%, transparent 70%)",
                              filter: "blur(6px)",
                            }}
                          />
                        </>
                      )}
                    </motion.div>

                    {/* Floor reflection */}
                    <div
                      aria-hidden
                      className="absolute -bottom-10 left-1/2 h-6 w-44 -translate-x-1/2 rounded-full bg-black/80 blur-xl"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Smoke particles + flying mini logos during tear */}
              {phase === "tearing" && (
                <>
                  {Array.from({ length: 7 }).map((_, i) => (
                    <motion.div
                      key={`smoke-${i}`}
                      initial={{ opacity: 0, y: -40, x: (i - 3) * 14, scale: 0.4 }}
                      animate={{
                        opacity: [0, 0.28, 0],
                        y: -170 - i * 22,
                        x: (i - 3) * 34,
                        scale: 1.6 + i * 0.15,
                      }}
                      transition={{ duration: 1.4, delay: 0.2 + i * 0.08, ease: "easeOut" }}
                      className="pointer-events-none absolute top-[28%] h-10 w-10 rounded-full bg-white/50"
                      style={{ filter: "blur(14px)" }}
                    />
                  ))}
                  {stocks.slice(0, 6).map((stock, i) => (
                    <motion.div
                      key={`fly-${stock.id}`}
                      initial={{ opacity: 0, y: 0, x: 0, scale: 0.4 }}
                      animate={{
                        opacity: [0, 1, 0],
                        y: -220 - (i % 3) * 50,
                        x: (i - 2.5) * 52,
                        rotate: (i - 2.5) * 24,
                        scale: 0.9,
                      }}
                      transition={{ duration: 1.1, delay: 0.3 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                      className="pointer-events-none absolute top-[26%]"
                    >
                      <StockLogo ticker={stock.ticker} logoUrl={stock.logoUrl} size="xs" />
                    </motion.div>
                  ))}
                </>
              )}

              {/* ---------- BURST flash ---------- */}
              {phase === "burst" && (
                <motion.div
                  initial={{ opacity: 0.9, scale: 0.3 }}
                  animate={{ opacity: 0, scale: 2.6 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="pointer-events-none absolute h-72 w-72 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(0,200,5,0.25) 40%, transparent 70%)",
                  }}
                />
              )}

              {/* ---------- SPINNING LOGO (burst = fast + hidden, reveal = decelerate) ---------- */}
              {(phase === "burst" || phase === "reveal") && winner && (
                <div className="flex flex-col items-center" style={{ perspective: 900 }}>
                  {phase === "burst" ? (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1, rotateY: 360 * 5 }}
                      transition={{
                        scale: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                        opacity: { duration: 0.3 },
                        rotateY: { duration: 1.5, ease: "linear" },
                      }}
                      style={{ transformStyle: "preserve-3d", filter: "blur(3px)" }}
                    >
                      <StockLogo
                        ticker={winner.ticker}
                        logoUrl={winner.logoUrl}
                        color={winner.brandColor}
                        size="2xl"
                      />
                    </motion.div>
                  ) : (
                    <>
                      <motion.div
                        initial={{ rotateY: 0, filter: "blur(3px)" }}
                        animate={{ rotateY: 360 * 3, filter: "blur(0px)" }}
                        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                        style={{ transformStyle: "preserve-3d" }}
                      >
                        <StockLogo
                          ticker={winner.ticker}
                          logoUrl={winner.logoUrl}
                          color={winner.brandColor}
                          size="2xl"
                          glow={winner.rarity === "legendary"}
                        />
                      </motion.div>

                      {/* Massive name reveal */}
                      <motion.h2
                        initial={{ opacity: 0, y: 26, scale: 0.94 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.9, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="mt-10 text-center text-[clamp(2.5rem,10vw,4.5rem)] font-bold uppercase leading-none tracking-[-0.03em] text-white"
                      >
                        {winner.name}
                      </motion.h2>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.3, duration: 0.4 }}
                        className={`mt-4 text-xs font-medium uppercase tracking-[0.3em] ${
                          winner.rarity === "legendary"
                            ? "text-[#f0d78c]"
                            : winner.rarity === "epic"
                              ? "text-[#c4b5fd]"
                              : "text-white/35"
                        }`}
                      >
                        {winner.rarity}
                      </motion.p>
                    </>
                  )}
                </div>
              )}

              {/* ---------- SWAP pipeline (<1s) ---------- */}
              {phase === "swap" && winner && (
                <div className="flex flex-col items-center">
                  <StockLogo
                    ticker={winner.ticker}
                    logoUrl={winner.logoUrl}
                    color={winner.brandColor}
                    size="xl"
                  />
                  <div className="mt-12 flex items-center gap-2.5">
                    {["USDG", "Uniswap v4", winner.ticker, "Wallet"].map((step, i) => (
                      <div key={step} className="flex items-center gap-2.5">
                        {i > 0 && (
                          <motion.span
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.2, duration: 0.15 }}
                          >
                            <ArrowRight className="h-3.5 w-3.5 text-[#00c805]" />
                          </motion.span>
                        )}
                        <motion.span
                          initial={{ opacity: 0.2, scale: 0.92 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.2 + 0.05, duration: 0.18 }}
                          className="rounded-full bg-white/[0.06] px-3.5 py-1.5 text-xs font-semibold text-white ring-1 ring-white/[0.08]"
                        >
                          {step}
                        </motion.span>
                      </div>
                    ))}
                  </div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.85 }}
                    className="mt-8 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-white/35"
                  >
                    <Check className="h-3.5 w-3.5 text-[#00c805]" />
                    Settled on-chain
                  </motion.p>
                </div>
              )}

              {/* ---------- RESULT ---------- */}
              {phase === "result" && result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full rounded-3xl bg-white/[0.04] p-8 text-center backdrop-blur-2xl"
                >
                  <StockpackzLogo variant="icon" className="mx-auto mb-4 h-8 w-8 opacity-70" />
                  <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/30">
                    Added to your portfolio
                  </p>

                  <div className="mt-6 flex flex-col items-center">
                    <StockLogo
                      ticker={result.stock.ticker}
                      logoUrl={result.stock.logoUrl}
                      color={result.stock.brandColor}
                      size="xl"
                      glow={result.stock.rarity === "legendary"}
                    />
                    <h3 className="mt-5 text-2xl font-semibold tracking-tight text-white">
                      {result.stock.name}
                    </h3>
                    <p className="mt-3 text-4xl font-bold tabular-nums tracking-tight text-white">
                      {result.tokenAmount}{" "}
                      <span className="text-white/50">{result.stock.ticker}</span>
                    </p>
                    <p className="mt-2 text-lg tabular-nums text-white/40">
                      ≈ {formatCurrency(result.valueUsd)}
                    </p>
                    <p
                      className={`mt-4 text-xs font-medium uppercase tracking-[0.2em] ${
                        result.stock.rarity === "legendary" ? "text-[#f0d78c]" : "text-white/30"
                      }`}
                    >
                      {result.stock.rarity}
                    </p>
                  </div>

                  {settlement?.jackpotWon && (
                    <div className="mt-6 rounded-2xl bg-[#f0d78c]/[0.08] px-4 py-3 ring-1 ring-[#f0d78c]/25">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f0d78c]">
                        Jackpot won
                      </p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-[#f0d78c]">
                        {formatCurrency(settlement.jackpotPayout)}
                      </p>
                    </div>
                  )}

                  {settlement && (
                    <div className="mt-6 space-y-1.5 rounded-2xl bg-white/[0.03] px-4 py-3.5 text-left text-xs">
                      {[
                        ["USDG for stock", formatCurrency(settlement.usdgIn)],
                        [
                          "Execution price",
                          `${formatCurrency(settlement.executionPrice)} / ${settlement.stock.ticker}`,
                        ],
                        ["Jackpot contribution", formatCurrency(settlement.jackpotContribution)],
                        ["XP earned", `+${PACK_XP.standard} XP`],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-white/35">{label}</span>
                          <span className="tabular-nums font-medium text-white/75">{value}</span>
                        </div>
                      ))}
                      {settlement.txHash && (
                        <div className="flex items-center justify-between">
                          <span className="text-white/35">Transaction</span>
                          <span className="font-mono text-white/60">
                            {settlement.txHash.slice(0, 8)}…{settlement.txHash.slice(-6)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-8 flex gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="h-12 flex-1 rounded-full bg-white/[0.06] text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.1] hover:text-white"
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenAgain}
                      className="h-12 flex-1 rounded-full bg-white text-sm font-semibold text-black transition-opacity hover:opacity-90"
                    >
                      Open Again
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function fireLegendaryConfetti() {
  confetti({
    particleCount: 90,
    spread: 75,
    origin: { y: 0.5 },
    colors: ["#f5e6a3", "#d4af37", "#ffffff"],
    disableForReducedMotion: true,
  });
}
