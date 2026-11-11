"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { Card, FeeReadout, Label, StatusDot, buttonClass, cx } from "@/components/ui";
import { MAIN_WIF_POOL_ID, PLAINFEE } from "@/lib/addresses";
import { TOLERANCE_BPS, addressUrl, checkPool, isPoolId, txUrl, type PoolCheck } from "@/lib/pool-check";

const EXAMPLES = [
  { id: MAIN_WIF_POOL_ID, label: "MAIN $WIF POOL" },
  ...(PLAINFEE.poolId ? [{ id: PLAINFEE.poolId, label: "PLAINFEE POOL" }] : []),
];

const pct = (bps: number) => `${(bps / 100).toFixed(2)}%`;
const short = (v: string) => `${v.slice(0, 6)}…${v.slice(-4)}`;

export function Checker() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const poolParam = params.get("pool") ?? "";
  const [draft, setDraft] = useState(poolParam);
  const client = usePublicClient();
  const { address } = useAccount();

  const active = isPoolId(poolParam) ? poolParam.toLowerCase() : null;
  const query = useQuery({
    queryKey: ["check", active, address],
    queryFn: () => checkPool(client!, active!, address),
    enabled: Boolean(active && client),
    staleTime: 30_000,
    retry: 1,
  });

  const go = (id: string) => {
    setDraft(id);
    router.replace(`${pathname}?pool=${id}`, { scroll: false });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (isPoolId(draft)) go(draft.trim());
  };

  const invalid = draft.trim() !== "" && !isPoolId(draft);

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label htmlFor="pool" className="mono-xs text-subtle">
          POOL ID (32 BYTES, 0x…)
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="pool"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="0x71ef4106…8c79"
            spellCheck={false}
            autoComplete="off"
            aria-invalid={invalid}
            className={cx(
              "min-w-0 flex-1 border bg-card px-3 py-2 font-mono text-sm outline-none transition-micro",
              "focus-visible:border-foreground",
              invalid ? "border-destructive" : "border-border-strong",
            )}
          />
          <button type="submit" disabled={!isPoolId(draft)} className={buttonClass("primary", "px-4")}>
            CHECK
          </button>
        </div>
        {invalid && <p className="text-sm text-destructive">A pool ID is 0x followed by 64 hex characters.</p>}
        <div className="flex flex-wrap items-center gap-2">
          <Label>TRY</Label>
          {EXAMPLES.map((ex) => (
            <button key={ex.id} type="button" onClick={() => go(ex.id)} className={buttonClass("outline")}>
              {ex.label}
            </button>
          ))}
        </div>
      </form>

      {query.isFetching && !query.data && (
        <Card className="p-4">
          <span className="mono-control text-subtle">READING THE CHAIN…</span>
        </Card>
      )}
      {query.error && (
        <Card className="border-destructive p-4">
          <StatusDot tone="destructive">COULD NOT CHECK THIS POOL</StatusDot>
          <p className="mt-2 text-sm text-subtle">{shortError(query.error)}</p>
        </Card>
      )}
      {query.data && <Result data={query.data} />}
    </div>
  );
}

function shortError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.split("\n")[0].slice(0, 240);
}

function Result({ data }: { data: PoolCheck }) {
  const takesOutsideFee = data.permissions.some((p) => p.on && p.movesValue);
  const gap = data.paidBps - data.shownBps;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl">
          {data.symbols[0]} / {data.symbols[1]}
        </h2>
        <span className="mono-xs text-subtle">
          POOL{" "}
          <a href={txUrl(data.initTx)} target="_blank" rel="noreferrer" className="text-brand-readable underline">
            {short(data.poolId)}
          </a>
        </span>
      </div>

      <FeeReadout shownBps={data.shownBps} paidBps={data.paidBps} toleranceBps={TOLERANCE_BPS} />

      <p className="lede max-w-(--container-narrow)">
        {gap > TOLERANCE_BPS
          ? `Every swap in this pool records a ${pct(data.shownBps)} fee, but costs ${pct(data.paidBps)}. The difference is taken outside the fee field.`
          : `This pool records a ${pct(data.shownBps)} fee, and that is what a swap costs.`}
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="border-b border-border px-4 py-3">
            <Label>HOW WE MEASURED</Label>
          </div>
          <dl className="divide-y divide-border text-sm">
            <Row label="SHOWN FEE">
              {pct(data.shownBps)}{" "}
              <span className="text-subtle">
                {data.shownSource === "swap-event" && data.recordedSwapTx ? (
                  <>
                    from the fee field of the{" "}
                    <a href={txUrl(data.recordedSwapTx)} target="_blank" rel="noreferrer" className="text-brand-readable underline">
                      latest swap
                    </a>
                  </>
                ) : data.shownSource === "pool-key" ? (
                  "from the pool's fixed fee (no swaps yet)"
                ) : (
                  "from the pool's current dynamic fee (no swaps yet)"
                )}
              </span>
            </Row>
            {data.directions.map((d) => (
              <Row key={d.label} label={`PAID ${d.label}`}>
                {pct(d.paidBps)} <span className="text-subtle">quoted on a swap of 0.001% of pool depth</span>
              </Row>
            ))}
            <Row label="HOOK">
              <a href={addressUrl(data.key.hooks)} target="_blank" rel="noreferrer" className="font-mono text-brand-readable underline">
                {short(data.key.hooks)}
              </a>
            </Row>
          </dl>
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Label>HOOK PERMISSIONS (FROM THE ADDRESS BITS)</Label>
            {takesOutsideFee ? (
              <StatusDot tone="destructive">CAN MOVE VALUE</StatusDot>
            ) : (
              <StatusDot tone="success">FEE ONLY</StatusDot>
            )}
          </div>
          <ul className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0">
            {data.permissions.map((p) => (
              <li
                key={p.name}
                className={cx(
                  "flex items-center justify-between gap-2 px-4 py-1.5 font-mono text-xs",
                  !p.on && "text-subtle",
                  p.on && p.movesValue && "bg-highlight text-foreground",
                )}
              >
                <span>{p.name}</span>
                <span>{p.on ? "ON" : "off"}</span>
              </li>
            ))}
          </ul>
          <p className="border-t border-border px-4 py-3 text-xs text-subtle">
            The four ReturnDelta permissions let a hook add or take tokens outside the pool&apos;s fee. They are marked when on.
          </p>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="mono-xs w-36 shrink-0 text-subtle">{label}</dt>
      <dd className="figure">{children}</dd>
    </div>
  );
}
