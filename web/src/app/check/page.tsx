import type { Metadata } from "next";
import { Suspense } from "react";
import { Label } from "@/components/ui";
import { Checker } from "./checker";

export const metadata: Metadata = {
  title: "Check a pool · Plainfee",
  description: "Paste any Uniswap v4 pool on Robinhood Chain and see the fee it shows next to the fee a swap really pays.",
};

export default function CheckPage() {
  return (
    <section className="mx-auto flex w-full max-w-(--container-data) flex-col gap-10 px-4 py-12 md:py-16">
      <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,520px)] lg:gap-16">
        <div className="flex max-w-(--container-narrow) flex-col gap-4">
          <Label>COST CHECKER · UNISWAP V4 · ROBINHOOD CHAIN</Label>
          <h1 className="t-h1 measure-heading">Check what a pool really charges.</h1>
          <p className="lede">
            A hook can take value after a swap without it showing up in the pool&apos;s fee. Paste any pool ID and see
            both numbers side by side.
          </p>
        </div>
        <ol className="divide-y divide-border border border-border bg-card">
          {[
            ["SHOWN FEE", "The fee the pool writes into the fee field of its own Swap events."],
            ["PAID FEE", "We quote a swap of 0.001% of the pool's depth, too small to move the price, and compare it with the spot price."],
            ["PERMISSIONS", "We read the hook's permissions from the last 14 bits of its address. ReturnDelta bits let a hook take tokens outside the fee."],
          ].map(([k, v], i) => (
            <li key={k} className="flex gap-4 p-4">
              <span className="mono-xs w-6 shrink-0 pt-0.5 text-subtle">0{i + 1}</span>
              <div className="flex flex-col gap-1">
                <span className="mono-control">{k}</span>
                <span className="text-sm text-subtle">{v}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <Suspense fallback={null}>
        <Checker />
      </Suspense>
    </section>
  );
}
