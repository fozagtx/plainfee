"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FeeReadout, Label, StatusDot, buttonClass } from "@/components/ui";
import { MAIN_WIF_POOL_ID } from "@/lib/addresses";
import { TOLERANCE_BPS, addressUrl, type PoolCheck } from "@/lib/pool-check";

async function fetchMainPool(): Promise<PoolCheck> {
  const res = await fetch(`/api/check?pool=${MAIN_WIF_POOL_ID}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "The chain could not be read.");
  return body as PoolCheck;
}

/** The home page's evidence: the busiest $WIF pool, checked live as the page loads. */
export function LiveProof() {
  const { data, error } = useQuery({ queryKey: ["check", MAIN_WIF_POOL_ID, undefined], queryFn: fetchMainPool, staleTime: 30_000 });
  const returnDelta = data?.permissions.find((p) => p.name === "afterSwapReturnDelta");

  return (
    <div className="flex flex-col border border-border bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
        <Label>LIVE · BUSIEST $WIF POOL ON THE CHAIN</Label>
        <span className="mono-xs text-subtle">ETH / WIF</span>
      </div>

      {data ? (
        <FeeReadout
          shownBps={data.shownBps}
          paidBps={data.paidBps}
          toleranceBps={TOLERANCE_BPS}
          className="border-0 border-b"
        />
      ) : (
        <div className="grid grid-cols-2 divide-x divide-border border-b border-border" aria-busy>
          {["SHOWN FEE", "PAID FEE"].map((l) => (
            <div key={l} className="flex flex-col gap-2 p-4">
              <Label>{l}</Label>
              <span className="figure text-4xl text-subtle">{error ? "—" : "…"}</span>
            </div>
          ))}
        </div>
      )}

      <dl className="divide-y divide-border text-sm">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="mono-xs text-subtle">HOOK</dt>
          <dd className="font-mono text-xs">
            {data ? (
              <a href={addressUrl(data.key.hooks)} target="_blank" rel="noreferrer" className="text-brand-readable underline">
                {data.key.hooks.slice(0, 6)}…{data.key.hooks.slice(-4)}
              </a>
            ) : (
              "…"
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="mono-xs text-subtle">afterSwapReturnDelta</dt>
          <dd>
            {returnDelta ? (
              returnDelta.on ? (
                <StatusDot tone="destructive">ON</StatusDot>
              ) : (
                <StatusDot tone="success">OFF</StatusDot>
              )
            ) : (
              <span className="mono-control text-subtle">…</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-auto flex items-center justify-between gap-4 border-t border-border px-4 py-3">
        <span className="text-xs text-subtle">
          {error ? "The chain could not be read just now." : "Read from Robinhood Chain as this page loaded."}
        </span>
        <Link href={`/check?pool=${MAIN_WIF_POOL_ID}`} className={buttonClass("ghost")}>
          FULL CHECK →
        </Link>
      </div>
    </div>
  );
}
