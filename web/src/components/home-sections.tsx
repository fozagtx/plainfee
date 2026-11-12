"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { Addr } from "@/components/addr";
import { ClaimProof, Label, cx, pct } from "@/components/ui";
import { MAIN_WIF_POOL_ID, PLAINFEE } from "@/lib/addresses";
import { hookAbi } from "@/lib/plainfee";
import { PERMISSIONS, TOLERANCE_BPS, txUrl, type PoolCheck } from "@/lib/pool-check";
import { usePlainfee } from "@/lib/use-plainfee";

async function fetchCheck(pool: string): Promise<PoolCheck> {
  const res = await fetch(`/api/check?pool=${pool}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "The chain could not be read.");
  return body;
}

const usePoolCheck = (pool: string | undefined) =>
  useQuery({ queryKey: ["check", pool, undefined], queryFn: () => fetchCheck(pool!), enabled: Boolean(pool), staleTime: 30_000 });

const canTake = (c: PoolCheck) => c.permissions.some((p) => p.on && p.movesValue);

/** §1: the busiest $WIF pool, measured as the page loads. */
export function ProblemPanels() {
  const { data, error } = usePoolCheck(MAIN_WIF_POOL_ID);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Label>
          {data ? `${data.symbols[0]} / ${data.symbols[1]} · THE BUSIEST $WIF POOL` : "THE BUSIEST $WIF POOL"}
        </Label>
        <Addr value={MAIN_WIF_POOL_ID} href={data ? txUrl(data.initTx) : null} className="t-small text-ink-soft" />
      </div>
      <ClaimProof
        shownBps={data?.shownBps ?? null}
        paidBps={data?.paidBps ?? null}
        toleranceBps={TOLERANCE_BPS}
        canTakeOutsideFee={data ? canTake(data) : false}
        shownNote={error ? "The chain could not be read just now." : !data ? "Reading the chain…" : undefined}
        proof={
          data?.recordedSwapTx ? (
            <>
              Shown: the <code className="figure">fee</code> field of the{" "}
              <a href={txUrl(data.recordedSwapTx)} target="_blank" rel="noreferrer" className="link">
                latest Swap event
              </a>
              . Paid: a quote at 0.001% of pool depth.
            </>
          ) : null
        }
      />
    </div>
  );
}

/** §3: Plainfee's own pool. Both sides fill in from the chain once the pool exists. */
export function PlainfeePanels() {
  const { data, error } = usePoolCheck(PLAINFEE.poolId);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Label>ETH / WIF · PLAINFEE POOL</Label>
        {PLAINFEE.poolId ? (
          <Addr value={PLAINFEE.poolId} href={data ? txUrl(data.initTx) : null} className="t-small text-ink-soft" />
        ) : (
          <span className="t-micro text-ink-soft">NOT DEPLOYED YET</span>
        )}
      </div>
      <ClaimProof
        shownBps={data?.shownBps ?? null}
        paidBps={data?.paidBps ?? null}
        toleranceBps={TOLERANCE_BPS}
        canTakeOutsideFee={data ? canTake(data) : false}
        match
        shownNote={
          !PLAINFEE.poolId
            ? "The pool is not on chain yet. Both figures are read from it once it is."
            : error
              ? "The chain could not be read just now."
              : !data
                ? "Reading the chain…"
                : "Charged in beforeSwap, through the pool's own fee field."
        }
        proof={
          data?.recordedSwapTx ? (
            <>
              From the{" "}
              <a href={txUrl(data.recordedSwapTx)} target="_blank" rel="noreferrer" className="link">
                latest Swap event
              </a>
              , and a quote at 0.001% of pool depth.
            </>
          ) : null
        }
      />
    </div>
  );
}

/** The flags PlainfeeHook.getHookPermissions() requests: afterInitialize, beforeAddLiquidity, beforeSwap. */
const PLAINFEE_MASK = 0x1880;
const LABEL = (name: string) => name.replace(/([A-Z])/g, "_$1").toUpperCase();

/** DESIGN.md §5.6: the hook's permissions, read from the last 14 bits of its address. */
export function BitsVerifier() {
  const hook = PLAINFEE.hook;
  const bits = hook ? Number(BigInt(hook) & 0x3fffn) : PLAINFEE_MASK;
  const show = ["beforeSwap", "afterSwap", "beforeSwapReturnDelta", "afterSwapReturnDelta", "afterAddLiquidityReturnDelta", "afterRemoveLiquidityReturnDelta"];
  const rows = PERMISSIONS.filter((p) => show.includes(p.name));
  const binary = bits.toString(2).padStart(14, "0");
  return (
    <div className="grid gap-6 border-y border-rule py-6 md:grid-cols-[1fr_1fr]">
      <pre className="figure overflow-x-auto text-[13px] leading-6">
        {hook ? <Addr value={hook} full className="text-[13px]" /> : <span className="text-ink-soft">address assigned at deploy</span>}
        {"\n"}
        <span className="text-ink-soft">last 14 bits </span>
        {binary}
        {"\n"}
        {rows.map((p) => {
          const on = (bits & (1 << p.bit)) !== 0;
          return (
            <span key={p.name} className={cx(!on && "text-ink-soft")}>
              {"     └─ "}
              {LABEL(p.name).padEnd(36, " ")}
              {on ? "set" : "unset"}
              {"\n"}
            </span>
          );
        })}
      </pre>
      <div className="flex flex-col gap-3">
        <p className="t-small text-ink-soft">
          Anyone can check this. The permissions are encoded in the address itself, so the hook cannot add a
          return-delta later.
          {!hook && " Until deploy, these are the flags the contract requests (mask 0x1880)."}
        </p>
        <pre className="figure overflow-x-auto rounded-sm bg-paper-sunk px-3 py-2 text-[12px]">
          {`cast to-base $(( 0x${hook ? hook.slice(-4) : PLAINFEE_MASK.toString(16).padStart(4, "0")} & 0x3fff )) 2`}
        </pre>
      </div>
    </div>
  );
}

/** Contract constants (PlainfeeHook) and the thresholds Deploy.s.sol sets. Replaced by chain reads after deploy. */
const CODE_TIERS = [
  { threshold: 0n, fee: 3000 },
  { threshold: 500n * 10n ** 18n, fee: 2500 },
  { threshold: 2_500n * 10n ** 18n, fee: 2000 },
  { threshold: 10_000n * 10n ** 18n, fee: 1500 },
];

/** DESIGN.md §5.4, in the loud register: the bars are typed rules, not boxes. */
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
                "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 border-b border-ink/15 py-3 last:border-b-0 md:grid-cols-[260px_160px_1fr]",
                current && "bg-accent-sunk",
              )}
            >
              <span className="text-[22px] font-semibold uppercase tracking-tight md:text-[28px]">
                {t.threshold === 0n ? "No lock" : `Lock ${locked}`}
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
        {pf.tiers
          ? "Read from the hook. Locked $WIF counts after one hour; unlocking takes three days."
          : "From the contract: fees are constants in PlainfeeHook, thresholds are fixed at deploy. Locked $WIF counts after one hour; unlocking takes three days."}
        {mine.data !== undefined && ` Your wallet pays ${pct(Number(mine.data) / 100)}.`}
      </p>
    </div>
  );
}

type Ledger = { block: string; wifBurned: string | null; wifSupply: string };

/** DESIGN.md §5.5 + burn counter: a static diagram with the live numbers under it. */
export function Flywheel() {
  const ledger = useQuery<Ledger>({ queryKey: ["ledger"], enabled: false });
  const d = ledger.data;
  const burned = !d
    ? "—"
    : d.wifBurned === null
      ? "NOT DEPLOYED"
      : (Number(BigInt(d.wifBurned) / 10n ** 16n) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });

  const boxes = [
    ["SWAP FEE", "0.15–0.30%", "set in beforeSwap"],
    ["VAULT BUYS WIF", "harvest()", "anyone can call it"],
    ["WIF BURNED", burned, "WIF.burn(amount)"],
    ["DISCOUNT WORTH MORE", "less supply", "per locked WIF"],
  ];
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 items-stretch gap-y-2 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
        {boxes.map(([k, v, note], i) => (
          <div key={k} className="contents">
            {i > 0 && (
              <span className="figure flex items-center justify-center px-2 text-ink-soft" aria-hidden>
                <span className="md:hidden">↓</span>
                <span className="hidden md:inline">→</span>
              </span>
            )}
            <div className="flex flex-col gap-2 rounded-sm border border-ink px-3 py-3">
              <span className="t-micro">{k}</span>
              <span className="figure text-[20px]">{v}</span>
              <span className="t-small text-ink-soft">{note}</span>
            </div>
          </div>
        ))}
      </div>
      {d?.wifBurned != null && (
        <div className="flex flex-col gap-1 bg-monitor-bg px-4 py-6 text-monitor-fg md:px-8">
          <span className="t-monitor text-[12px] opacity-60">WIF BURNED BY PLAINFEE · BLOCK {Number(d.block).toLocaleString("en-US")}</span>
          <span className="t-monitor text-[44px] leading-none md:text-[72px]">{burned}</span>
        </div>
      )}
    </div>
  );
}

const TOC = [
  ["problem", "The problem"],
  ["check", "Check any pool"],
  ["charges", "How Plainfee charges"],
  ["lock", "Lock WIF, pay less"],
  ["burn", "Every fee burns WIF"],
] as const;

/** The sticky section rail. Shown at 1280px and wider only. */
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
