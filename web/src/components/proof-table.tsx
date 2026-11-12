"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { Addr } from "@/components/addr";
import { Label, buttonClass, cx, gapFill, pct } from "@/components/ui";
import { ADDRESSES } from "@/lib/addresses";
import { EXPLORER, TOLERANCE_BPS, isPoolId, txUrl } from "@/lib/pool-check";
import type { ProofRow, ProofTable as Table } from "@/lib/proof-table";

const REPO = "https://github.com/fozagtx/plainfee";
const NONE = "0x0000000000000000000000000000000000000000";

type Filter = "all" | "hooked" | "can-take" | "wif";
const FILTERS: Array<[Filter, string]> = [
  ["all", "ALL"],
  ["hooked", "HOOKED"],
  ["can-take", "CAN TAKE OUTSIDE FEE"],
  ["wif", "$WIF"],
];

type SortKey = "gap" | "shown" | "paid" | "swaps";

async function fetchPools(): Promise<Table> {
  const res = await fetch("/api/pools");
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "The chain could not be read.");
  return body;
}

const isWif = (r: ProofRow) =>
  [r.key.currency0, r.key.currency1].some((c) => c.toLowerCase() === ADDRESSES.wif.toLowerCase());

const where = (r: ProofRow) => {
  if (r.canTakeOutsideFee) return r.takenIn.join(", ");
  if (r.gapBps > TOLERANCE_BPS) return "price impact";
  return "—";
};

/** TSV of exactly what the table renders. */
function toTsv(rows: ProofRow[], block: string) {
  const head = ["pool_id", "pair", "hook", "shown_fee_pct", "real_fee_pct", "gap_pct", "where_taken", "swaps_in_window", "verified_at_block"];
  const lines = rows.map((r) =>
    [
      r.poolId,
      `${r.symbols[0]}/${r.symbols[1]}`,
      r.key.hooks,
      (r.shownBps / 100).toFixed(4),
      (r.paidBps / 100).toFixed(4),
      (r.gapBps / 100).toFixed(4),
      where(r),
      r.swapsInWindow,
      block,
    ].join("\t"),
  );
  return [head.join("\t"), ...lines].join("\n");
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/tab-separated-values" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const reportUrl = (r?: ProofRow, block?: string) => {
  const title = r ? `Measurement error: ${r.symbols.join("/")} ${r.poolId.slice(0, 10)}` : "Measurement error";
  const body = r
    ? `Pool: ${r.poolId}\nHook: ${r.key.hooks}\nShown: ${pct(r.shownBps)}\nReal: ${pct(r.paidBps)}\nBlock: ${block}\n\nWhat is wrong:\n`
    : "Pool id:\nBlock:\n\nWhat is wrong:\n";
  return `${REPO}/issues/new?${new URLSearchParams({ title, body, labels: "measurement" })}`;
};

/** DESIGN.md §5.3: the cost checker as a table. Full-bleed, sorted by gap, with TSV and error reports. */
export function ProofTable() {
  const router = useRouter();
  const query = useQuery({ queryKey: ["pools"], queryFn: fetchPools, staleTime: 5 * 60_000, retry: 1 });
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "gap", desc: true });
  const [draft, setDraft] = useState("");
  const [help, setHelp] = useState(false);

  const rows = useMemo(() => {
    const all = query.data?.rows ?? [];
    const kept = all.filter((r) =>
      filter === "hooked" ? r.key.hooks !== NONE : filter === "can-take" ? r.canTakeOutsideFee : filter === "wif" ? isWif(r) : true,
    );
    if (sort.key === "gap") return sort.desc ? kept : [...kept].reverse(); // server order is the gap ranking
    const val = (r: ProofRow) => (sort.key === "shown" ? r.shownBps : sort.key === "paid" ? r.paidBps : r.swapsInWindow);
    return [...kept].sort((a, b) => (sort.desc ? val(b) - val(a) : val(a) - val(b)));
  }, [query.data, filter, sort]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (isPoolId(draft)) router.push(`/check?pool=${draft.trim()}`);
  };

  const block = query.data?.block;
  const head = (key: SortKey | null, label: string, align = "text-left") => (
    <th scope="col" className={cx("t-micro px-3 py-2 font-normal text-ink-soft", align)}>
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
      {/* Chrome row */}
      <div className="flex flex-col gap-3 border-b border-rule bg-paper-sunk px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <form onSubmit={submit} className="flex min-w-0 flex-1 gap-2 lg:max-w-md">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="paste a v4 pool id, 0x…"
            spellCheck={false}
            autoComplete="off"
            aria-label="Pool id"
            className="figure min-w-0 flex-1 rounded-sm border border-rule bg-paper px-2 py-1.5 text-[13px] outline-none focus-visible:border-ink"
          />
          <button type="submit" disabled={!isPoolId(draft)} className={buttonClass("primary")}>
            CHECK
          </button>
        </form>
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
          <span className="mx-1 hidden h-4 w-px bg-rule sm:block" aria-hidden />
          <button type="button" onClick={() => setHelp((h) => !h)} aria-expanded={help} className={buttonClass("ghost")}>
            HOW TO READ THIS
          </button>
          <button
            type="button"
            disabled={!query.data}
            onClick={() => query.data && download(`plainfee-pools-${query.data.block}.tsv`, toTsv(rows, query.data.block))}
            className={buttonClass("ghost")}
          >
            DOWNLOAD TSV
          </button>
          <a href={reportUrl(undefined, block)} target="_blank" rel="noreferrer" className={buttonClass("ghost")}>
            REPORT AN ERROR
          </a>
        </div>
      </div>

      {help && (
        <div className="t-small grid gap-4 border-b border-rule px-4 py-4 text-ink-soft md:grid-cols-3">
          <p>
            <span className="t-micro block text-ink">SHOWN FEE</span>
            The fee the pool writes into the <code className="figure">fee</code> field of its latest Swap event.
          </p>
          <p>
            <span className="t-micro block text-ink">REAL FEE</span>
            A quote for a swap of 0.001% of the pool&apos;s depth, compared with the spot price. The worse of the two
            directions. Price impact at this size is about 0.001%.
          </p>
          <p>
            <span className="t-micro block text-ink">GAP</span>
            Coloured only when the hook&apos;s address sets a return-delta bit, the permission that lets it take tokens
            outside the fee. Any other gap is price impact from thin liquidity and stays grey.
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse">
          <thead className="border-b border-rule bg-paper-sunk">
            <tr>
              {head(null, "POOL")}
              {head(null, "HOOK")}
              {head("shown", "SHOWN FEE", "text-right")}
              {head("paid", "REAL FEE", "text-right")}
              {head("gap", "GAP", "text-right")}
              {head(null, "WHERE THE GAP IS TAKEN")}
              {head(null, "VERIFIED AT BLOCK", "text-right")}
              {head(null, "")}
            </tr>
          </thead>
          <tbody className="t-data">
            {query.isPending &&
              Array.from({ length: 6 }, (_, i) => (
                <tr key={i} className="border-b border-rule last:border-b-0">
                  <td colSpan={8} className="t-small px-3 py-3 text-ink-soft">
                    {i === 0 ? "Measuring the busiest pools of the last ~3,000 blocks. The first load takes about 30 seconds." : " "}
                  </td>
                </tr>
              ))}
            {query.isError && (
              <tr>
                <td colSpan={8} className="t-small px-3 py-3 text-danger-ink">
                  The chain could not be read just now. {query.error.message}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.poolId} className="border-b border-rule last:border-b-0">
                <td className="px-3 py-2">
                  <div className="flex flex-col">
                    <a href={`/check?pool=${r.poolId}`} className="link font-sans text-[15px]">
                      {r.symbols[0]} / {r.symbols[1]}
                    </a>
                    <Addr value={r.poolId} href={txUrl(r.initTx)} className="t-small text-ink-soft" />
                  </div>
                </td>
                <td className="px-3 py-2">{r.key.hooks === NONE ? <span className="text-ink-soft">none</span> : <Addr value={r.key.hooks} />}</td>
                <td className="px-3 py-2 text-right">{pct(r.shownBps)}</td>
                <td className={cx("px-3 py-2 text-right", r.plainfee && "text-match")}>{pct(r.paidBps)}</td>
                <td className={cx("px-3 py-2 text-right", gapFill(r.gapBps, r.canTakeOutsideFee))}>
                  {r.gapBps > TOLERANCE_BPS ? `+${(r.gapBps / 100).toFixed(2)}pp` : <span className="text-ink-soft">0.00pp</span>}
                </td>
                <td className={cx("t-small px-3 py-2", !r.canTakeOutsideFee && "text-ink-soft")}>
                  <span className="figure">{where(r)}</span>
                </td>
                <td className="px-3 py-2 text-right">
                  <a href={`${EXPLORER}/block/${block}`} target="_blank" rel="noreferrer" className="link">
                    {Number(block).toLocaleString("en-US")}
                  </a>
                </td>
                <td className="px-3 py-2 text-right">
                  <a href={reportUrl(r, block)} target="_blank" rel="noreferrer" className="t-micro link text-ink-soft">
                    report
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {query.data && (
        <div className="t-small flex flex-wrap justify-between gap-2 border-t border-rule px-4 py-2 text-ink-soft">
          <span>
            {query.data.rows.length} pools: the busiest of blocks{" "}
            <span className="figure">
              {Number(query.data.scannedFrom).toLocaleString("en-US")}–{Number(query.data.block).toLocaleString("en-US")}
            </span>
            , plus the main $WIF pool{query.data.rows.some((r) => r.plainfee) ? " and Plainfee's pool" : ""}.
            {query.data.failed > 0 && ` ${query.data.failed} could not be measured this round.`}
          </span>
          <Label>REMEASURED EVERY 5 MINUTES</Label>
        </div>
      )}
    </div>
  );
}
