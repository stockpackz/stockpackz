"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Copy, LogOut, Pencil, Sparkles, Trophy } from "lucide-react";
import { truncateAddress } from "./wallet-button";

function storageKey(address: string) {
  return `stockpackz:name:${address.toLowerCase()}`;
}

function avatarGradient(address: string) {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = (hash * 31 + address.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `linear-gradient(135deg, hsl(${hue} 65% 45%), hsl(${(hue + 60) % 360} 70% 30%))`;
}

interface ProfileCollection {
  id: string;
  name: string;
  total: number;
  owned: string[];
  completed: boolean;
}

interface ProfileXp {
  lifetimeXP: number;
  seasonXP: number;
  level: number;
  dailyStreak: number;
  nextLevel: number;
  nextLevelXp: number;
  progressPct: number;
}

interface ProfileMenuProps {
  address: string;
  onDisconnect: () => void;
}

export function ProfileMenu({ address, onDisconnect }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [xp, setXp] = useState<ProfileXp | null>(null);
  const [cols, setCols] = useState<ProfileCollection[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(localStorage.getItem(storageKey(address)) ?? "");
  }, [address]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/profile?address=${address}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          xp: ProfileXp;
          collections: ProfileCollection[];
        };
        if (!cancelled) {
          setXp(data.xp);
          setCols(data.collections);
        }
      } catch {
        /* keep previous */
      }
    }
    void load();
    const id = setInterval(load, 20_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [address]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setEditing(false);
      }
    }
    if (open) document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const displayName = name || truncateAddress(address);
  const completedCount = cols.filter((c) => c.completed).length;

  function saveName() {
    const trimmed = draft.trim().slice(0, 24);
    setName(trimmed);
    if (trimmed) localStorage.setItem(storageKey(address), trimmed);
    else localStorage.removeItem(storageKey(address));
    setEditing(false);
  }

  function copyAddress() {
    void navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-white/[0.06] p-1 pr-2.5 transition-colors hover:bg-white/[0.1]"
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ background: avatarGradient(address) }}
        >
          {displayName.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-[110px] truncate text-xs font-medium text-white/70 sm:inline">
          {displayName}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[calc(100%+10px)] z-50 w-[300px] overflow-hidden rounded-2xl bg-[#0b0b0b]/95 shadow-[0_24px_60px_rgba(0,0,0,0.7)] ring-1 ring-white/[0.08] backdrop-blur-2xl"
          >
            <div className="border-b border-white/[0.06] p-4">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: avatarGradient(address) }}
                >
                  {displayName.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  {editing ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        ref={inputRef}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveName();
                          if (e.key === "Escape") setEditing(false);
                        }}
                        maxLength={24}
                        placeholder="Your name"
                        className="h-8 w-full min-w-0 rounded-lg bg-white/[0.06] px-2.5 text-sm text-white outline-none ring-1 ring-white/[0.1] placeholder:text-white/25 focus:ring-[#00c805]/50"
                      />
                      <button
                        type="button"
                        onClick={saveName}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#00c805]/15 text-[#4ade80] transition-colors hover:bg-[#00c805]/25"
                        aria-label="Save name"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(name);
                          setEditing(true);
                        }}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white/30 transition-colors hover:bg-white/[0.08] hover:text-white"
                        aria-label="Edit display name"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={copyAddress}
                    className="mt-0.5 flex items-center gap-1 text-[11px] tabular-nums text-white/35 transition-colors hover:text-white/60"
                  >
                    {truncateAddress(address)}
                    {copied ? (
                      <Check className="h-3 w-3 text-[#4ade80]" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>

              {xp && (
                <div className="mt-3 rounded-xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-white/35">
                      <Sparkles className="h-3 w-3 text-[#c4b5fd]" />
                      Level {xp.level}
                    </span>
                    <span className="text-[11px] tabular-nums text-white/50">
                      {xp.lifetimeXP.toLocaleString()} XP
                    </span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-[#c4b5fd]/80"
                      style={{ width: `${xp.progressPct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-white/30">
                    {xp.nextLevelXp - xp.lifetimeXP > 0
                      ? `${(xp.nextLevelXp - xp.lifetimeXP).toLocaleString()} XP to level ${xp.nextLevel}`
                      : "Max curve level"}
                    {xp.dailyStreak > 0 ? ` · ${xp.dailyStreak}d streak` : ""}
                  </p>
                </div>
              )}
            </div>

            <div className="p-2">
              <div className="flex items-center justify-between px-2 pb-1.5 pt-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/30">
                  Collections
                </p>
                <p className="text-[10px] tabular-nums text-white/30">
                  {completedCount}/{cols.length || "—"} complete
                </p>
              </div>
              <div className="max-h-[220px] space-y-0.5 overflow-y-auto">
                {cols.length === 0 && (
                  <p className="px-2.5 py-3 text-[12px] text-white/35">Loading holdings…</p>
                )}
                {cols.map((collection) => {
                  const pct = Math.round((collection.owned.length / Math.max(1, collection.total)) * 100);
                  return (
                    <div
                      key={collection.id}
                      className="rounded-xl px-2.5 py-2 transition-colors hover:bg-white/[0.04]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <p className="truncate text-[13px] font-medium text-white/85">
                            {collection.name}
                          </p>
                          {collection.completed && (
                            <Trophy className="h-3 w-3 shrink-0 text-[#f0d78c]" />
                          )}
                        </div>
                        <span
                          className={`shrink-0 text-[11px] tabular-nums ${
                            collection.completed ? "font-semibold text-[#4ade80]" : "text-white/35"
                          }`}
                        >
                          {collection.completed
                            ? "Complete"
                            : `${collection.owned.length}/${collection.total}`}
                        </span>
                      </div>
                      <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className={`h-full rounded-full ${
                            collection.completed ? "bg-[#00c805]" : "bg-white/25"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-white/[0.06] p-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onDisconnect();
                }}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] font-medium text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" />
                Disconnect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
