"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { fetchLedger } from "@/components/ledger-strip";
import { ClaimProof, Label, cx, pct } from "@/components/ui";
import { MAIN_WIF_POOL_ID, PLAINFEE } from "@/lib/addresses";
import { hookAbi } from "@/lib/plainfee";
import { TOLERANCE_BPS, type PoolCheck } from "@/lib/pool-check";
import { usePlainfee } from "@/lib/use-plainfee";

async function fetchCheck(pool: string): Promise<PoolCheck> {
  const res = await fetch(`/api/check?pool=${pool}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Couldn't load this right now.");
  return body;
}

const usePoolCheck = (pool: string | undefined) =>
  useQuery({ queryKey: ["check", pool, undefined], queryFn: () => fetchCheck(pool!), enabled: Boolean(pool), staleTime: 30_000 });

const canTake = (c: PoolCheck) => c.permissions.some((p) => p.on && p.movesValue);

/** The busiest $WIF pool, measured as the page loads. */
export function ProblemPanels() {
  const { data, error } = usePoolCheck(MAIN_WIF_POOL_ID);
  const hidden = data && canTake(data) ? data.paidBps - data.shownBps : 0;
  return (
    <div className="flex flex-col gap-3">
      <Label>THE MOST TRADED $WIF POOL · LIVE</Label>
      <ClaimProof
        shownBps={data?.shownBps ?? null}
        paidBps={data?.paidBps ?? null}
        toleranceBps={TOLERANCE_BPS}
        canTakeOutsideFee={data ? canTake(data) : false}
        shownNote={error ? "Couldn't load this right now." : !data ? "Loading…" : undefined}
        proof={hidden > TOLERANCE_BPS ? `${pct(hidden)} of every trade is taken without being shown.` : null}
      />
    </div>
  );
}

/** Plainfee's own pool, once it exists. Both sides are measured the same way as every other pool. */
export function PlainfeePanels() {
  const { data } = usePoolCheck(PLAINFEE.poolId);
  if (!PLAINFEE.poolId || !data) return null;
  return (
    <div className="flex flex-col gap-3">
      <Label>THE PLAINFEE $WIF POOL · LIVE</Label>
      <ClaimProof
        shownBps={data.shownBps}
        paidBps={data.paidBps}
        toleranceBps={TOLERANCE_BPS}
        canTakeOutsideFee={canTake(data)}
        match
        proof="Same number. Nothing taken on the side."
      />
    </div>
  );
}

const POINTS = [
  ["SHOWN UP FRONT", "The fee is part of the price you see before you trade. Nothing is taken after."],
  ["LOWER WITH $WIF", "Lock $WIF and every trade you make costs less, down to 0.15%."],
  ["EVERY FEE BURNS $WIF", "Fees are used to buy $WIF and destroy it, so there's less $WIF over time."],
];

export function HowItWorks() {
  return (
    <div className="grid border-y border-rule md:grid-cols-3 md:divide-x md:divide-rule">
      {POINTS.map(([k, v], i) => (
        <div key={k} className={cx("flex flex-col gap-2 py-6 md:px-6 md:first:pl-0", i > 0 && "border-t border-rule md:border-t-0")}>
          <span className="t-micro">{k}</span>
          <p className="text-ink-soft">{v}</p>
        </div>
      ))}
    </div>
  );
}

/** The fee levels in the contract. Read from the live contract once it exists. */
const CODE_TIERS = [
  { threshold: 0n, fee: 3000 },
  { threshold: 500n * 10n ** 18n, fee: 2500 },
  { threshold: 2_500n * 10n ** 18n, fee: 2000 },
  { threshold: 10_000n * 10n ** 18n, fee: 1500 },
];

export function TierLadder() {
  const pf = usePlainfee();
  const { address } = useAccount();
  const mine = useReadContract({
    address: pf.hook,
    abi: hookAbi,
    functionName: "feeFor",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(pf.hook && address) },
  });
  const tiers = pf.tiers ?? CODE_TIERS;
  const max = Math.max(...tiers.map((t) => t.fee));
  return (
    <div className="flex flex-col">
      <ol className="flex flex-col border-y-2 border-ink">
        {tiers.map((t) => {
          const current = mine.data !== undefined && Number(mine.data) === t.fee;
          const locked = Number(t.threshold / 10n ** 18n).toLocaleString("en-US");
          return (
            <li
              key={t.fee}
              className={cx(
                "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 border-b border-ink/15 py-3 last:border-b-0 md:grid-cols-[300px_160px_1fr]",
                current && "bg-accent-sunk",
              )}
            >
              <span className="text-[22px] font-semibold uppercase tracking-tight md:text-[28px]">
                {t.threshold === 0n ? "No $WIF locked" : `${locked} $WIF`}
              </span>
              <span className="figure text-right text-[28px] text-accent md:text-left md:text-[40px]">{pct(t.fee / 100)}</span>
              <span className="figure col-span-2 overflow-hidden whitespace-nowrap text-ink/70 md:col-span-1" aria-hidden>
                {"─".repeat(Math.round((t.fee / max) * 40))}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="t-small mt-3 text-ink-soft">
        Your lower fee starts one hour after you lock. You can take your $WIF back any time; it arrives three days after you
        ask.
        {mine.data !== undefined && ` Right now you pay ${pct(Number(mine.data) / 100)}.`}
      </p>
    </div>
  );
}

const STEPS = [
  ["YOU TRADE", "and pay the fee you were shown"],
  ["THE FEE BUYS $WIF", "automatically, from the pool"],
  ["THAT $WIF IS BURNED", "gone for good"],
  ["LESS $WIF EXISTS", "so locking it is worth more"],
];

/** The loop, in words, with the live burn total once there is one. */
export function Flywheel() {
  const ledger = useQuery({ queryKey: ["ledger"], queryFn: fetchLedger, refetchInterval: 5_000, retry: 1 });
  const d = ledger.data;
  const burned =
    d?.wifBurned != null
      ? (Number(BigInt(d.wifBurned) / 10n ** 16n) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })
      : null;
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 items-stretch gap-y-2 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
        {STEPS.map(([k, note], i) => (
          <div key={k} className="contents">
            {i > 0 && (
              <span className="flex items-center justify-center px-2 text-ink-soft" aria-hidden>
                <span className="md:hidden">↓</span>
                <span className="hidden md:inline">→</span>
              </span>
            )}
            <div className="flex flex-col gap-2 rounded-sm border border-ink px-3 py-3">
              <span className="t-micro">{k}</span>
              <span className="t-small text-ink-soft">{note}</span>
            </div>
          </div>
        ))}
      </div>
      {burned !== null && (
        <div className="flex flex-col gap-1 bg-monitor-bg px-4 py-6 text-monitor-fg md:px-8">
          <span className="t-monitor text-[12px] opacity-60">$WIF BURNED BY PLAINFEE SO FAR</span>
          <span className="t-monitor text-[44px] leading-none md:text-[72px]">{burned}</span>
        </div>
      )}
    </div>
  );
}

const TOC = [
  ["problem", "The problem"],
  ["check", "Check any pool"],
  ["charges", "How Plainfee works"],
  ["lock", "Hold $WIF, pay less"],
  ["burn", "Every fee burns $WIF"],
] as const;

/** The sticky section menu. Shown at 1280px and wider only. */
export function TocRail() {
  const [active, setActive] = useState<string>(TOC[0][0]);
  useEffect(() => {
    const els = TOC.map(([id]) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <nav aria-label="Sections" className="sticky top-28 hidden w-44 shrink-0 self-start min-[1280px]:block">
      <ol className="flex flex-col gap-2">
        {TOC.map(([id, label]) => (
          <li key={id}>
            <a href={`#${id}`} className={cx("t-micro transition-chrome hover:text-ink", active === id ? "text-ink" : "text-ink-soft")}>
              {label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
