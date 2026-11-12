"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { buttonClass, cx, gapFill, pct } from "@/components/ui";
import { ADDRESSES } from "@/lib/addresses";
import { TOLERANCE_BPS, isPoolId } from "@/lib/pool-check";
import type { ProofRow, ProofTable as Table } from "@/lib/proof-table";

const REPO = "https://github.com/fozagtx/plainfee";

type Filter = "all" | "hidden" | "wif";
const FILTERS: Array<[Filter, string]> = [
  ["all", "ALL POOLS"],
  ["hidden", "HIDDEN FEES"],
  ["wif", "$WIF POOLS"],
];

type SortKey = "hidden" | "shown" | "paid";

export async function fetchPools(): Promise<Table> {
  const res = await fetch("/api/pools");
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Couldn't load this right now.");
  return body;
}

const isWif = (r: ProofRow) =>
  [r.key.currency0, r.key.currency1].some((c) => c.toLowerCase() === ADDRESSES.wif.toLowerCase());

/** A hidden fee is only counted when the pool is set up so it can take one. */
const hiddenBps = (r: ProofRow) => (r.canTakeOutsideFee && r.gapBps > TOLERANCE_BPS ? r.gapBps : 0);

const reportUrl = `${REPO}/issues/new?${new URLSearchParams({ title: "A pool's numbers look wrong", body: "Which pool:\n\nWhat looks wrong:\n" })}`;

/** Every busy pool, the fee it shows next to the fee you pay. Hidden fees first. */
export function ProofTable() {
  const router = useRouter();
  const query = useQuery({ queryKey: ["pools"], queryFn: fetchPools, staleTime: 5 * 60_000, retry: 1 });
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "hidden", desc: true });
  const [draft, setDraft] = useState("");

  const rows = useMemo(() => {
    const all = query.data?.rows ?? [];
    const kept = all.filter((r) => (filter === "hidden" ? hiddenBps(r) > 0 : filter === "wif" ? isWif(r) : true));
    if (sort.key === "hidden") return sort.desc ? kept : [...kept].reverse(); // server order ranks hidden fees first
    const val = (r: ProofRow) => (sort.key === "shown" ? r.shownBps : r.paidBps);
    return [...kept].sort((a, b) => (sort.desc ? val(b) - val(a) : val(a) - val(b)));
  }, [query.data, filter, sort]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (isPoolId(draft)) router.push(`/check?pool=${draft.trim()}`);
  };

  const head = (key: SortKey | null, label: string, align = "text-left") => (
    <th scope="col" className={cx("t-micro px-4 py-2 font-normal text-ink-soft", align)}>
      {key ? (
        <button
          type="button"
          onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : true }))}
          className="t-micro hover:text-ink"
          aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : undefined}
        >
          {label}
          {sort.key === key ? (sort.desc ? " ↓" : " ↑") : ""}
        </button>
      ) : (
        label
      )}
    </th>
  );

  return (
    <div className="flex flex-col border-y border-rule">
      <div className="flex flex-col gap-3 border-b border-rule bg-paper-sunk px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1">
          {FILTERS.map(([f, label]) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cx("t-micro rounded-sm border px-2 py-1 transition-chrome", filter === f ? "border-ink text-ink" : "border-transparent text-ink-soft hover:text-ink")}
            >
              {label}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="flex min-w-0 gap-2 lg:w-[440px]">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Paste a pool ID to check it"
            spellCheck={false}
            autoComplete="off"
            aria-label="Pool ID"
            className="min-w-0 flex-1 rounded-sm border border-rule bg-paper px-2 py-1.5 text-[13px] outline-none focus-visible:border-ink"
          />
          <button type="submit" disabled={!isPoolId(draft)} className={buttonClass("primary")}>
            CHECK
          </button>
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse">
          <thead className="border-b border-rule bg-paper-sunk">
            <tr>
              {head(null, "POOL")}
              {head("shown", "FEE SHOWN", "text-right")}
              {head("paid", "FEE YOU PAY", "text-right")}
              {head("hidden", "HIDDEN FEE", "text-right")}
            </tr>
          </thead>
          <tbody className="t-data">
            {query.isPending && (
              <tr>
                <td colSpan={4} className="t-small px-4 py-6 text-ink-soft">
                  Checking the most traded pools. This takes about 30 seconds the first time.
                </td>
              </tr>
            )}
            {query.isError && (
              <tr>
                <td colSpan={4} className="t-small px-4 py-6 text-danger-ink">
                  Couldn&apos;t load the pools right now. Try again in a minute.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const hidden = hiddenBps(r);
              return (
                <tr key={r.poolId} className="border-b border-rule last:border-b-0">
                  <td className="px-4 py-3">
                    <a href={`/check?pool=${r.poolId}`} className="link font-sans text-[15px]">
                      {r.symbols[0]} / {r.symbols[1]}
                    </a>
                    {r.plainfee && <span className="t-micro ml-2 text-ink-soft">PLAINFEE</span>}
                  </td>
                  <td className="px-4 py-3 text-right">{pct(r.shownBps)}</td>
                  <td className={cx("px-4 py-3 text-right", r.plainfee && "text-match")}>{pct(r.paidBps)}</td>
                  <td className={cx("px-4 py-3 text-right", gapFill(r.gapBps, r.canTakeOutsideFee))}>
                    {hidden > 0 ? `+${pct(hidden)}` : <span className="text-ink-soft">none</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {query.data && (
        <div className="t-small flex flex-wrap justify-between gap-2 border-t border-rule px-4 py-3 text-ink-soft">
          <span className="measure">
            &ldquo;Fee you pay&rdquo; comes from a tiny test trade. A few hundredths of a percent can be the trade itself
            moving the price, which isn&apos;t counted as hidden. Updated every 5 minutes.
          </span>
          <a href={reportUrl} target="_blank" rel="noreferrer" className="link">
            Numbers look wrong? Tell us
          </a>
        </div>
      )}
    </div>
  );
}
