"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { cx } from "@/components/ui";
import { fetchPools } from "@/components/proof-table";

export type Ledger = { block: string; blockTime: number; wifSupply: string; wifBurned: string | null };

/** A block older than this, or a feed that hasn't answered in this long, is shown as STALE. */
const STALE_SECONDS = 45;

const n = (v: bigint | number) => v.toLocaleString("en-US");
const wif = (raw: string) => (Number(BigInt(raw) / 10n ** 16n) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function fetchLedger(): Promise<Ledger> {
  const res = await fetch("/api/ledger");
  const body = await res.json();
  if (!res.ok) throw new Error(body.error);
  return body;
}

/** DESIGN.md §5.1: live protocol state above the nav. Every figure is read from the chain. */
export function LedgerStrip() {
  const ledger = useQuery({ queryKey: ["ledger"], queryFn: fetchLedger, refetchInterval: 5_000, retry: 1 });
  // Reads the proof table only if a page already loaded it; never triggers the measurement itself.
  const pools = useQuery({ queryKey: ["pools"], queryFn: fetchPools, enabled: false, staleTime: 5 * 60_000 });
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 5_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);

  const d = ledger.data;
  const stale =
    Boolean(d) && now > 0 && (now / 1000 - d!.blockTime > STALE_SECONDS || now - ledger.dataUpdatedAt > STALE_SECONDS * 1000);

  const items: Array<[string, string]> = d
    ? [
        ["$WIF IN EXISTENCE", wif(d.wifSupply).split(".")[0]],
        ["$WIF BURNED BY PLAINFEE", d.wifBurned === null ? "STARTS AT LAUNCH" : wif(d.wifBurned)],
        ...(pools.data ? ([["POOLS CHECKED", n(pools.data.rows.length)]] as Array<[string, string]>) : []),
      ]
    : [["", ledger.isError ? "OFFLINE" : "LOADING"]];

  return (
    <div className="t-monitor h-7 overflow-x-auto bg-monitor-bg text-[12px] leading-7 text-monitor-fg" aria-live="off">
      <div className="mx-auto flex w-max min-w-full max-w-(--container-data) items-center gap-6 px-4 whitespace-nowrap">
        <span className={cx("inline-flex items-center gap-2", stale && "opacity-60")}>
          <span aria-hidden className="size-1.5 bg-monitor-fg" />
          LIVE
        </span>
        {items.map(([k, v]) => (
          <span key={k}>
            <span className="opacity-60">{k}</span> <span className="transition-[color] duration-[120ms]">{v}</span>
          </span>
        ))}
        {(stale || (ledger.isError && d)) && <span className="bg-monitor-fg px-1 text-monitor-bg">NOT UPDATING</span>}
      </div>
    </div>
  );
}
