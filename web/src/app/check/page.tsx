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
    <section className="flex flex-col gap-10 py-8 md:py-12">
      <div className="flex max-w-(--container-narrow) flex-col gap-4">
        <Label>COST CHECKER · UNISWAP V4 · ROBINHOOD CHAIN</Label>
        <h1 className="measure-heading text-3xl md:text-4xl">Check what a pool really charges.</h1>
        <p className="lede">
          Paste a pool ID. We read the fee the pool writes into its own swap records, then quote a swap too small to move
          the price and measure what it actually costs. A hook can take value after the swap without it showing up in the
          fee. This page shows both numbers side by side.
        </p>
      </div>
      <Suspense fallback={null}>
        <Checker />
      </Suspense>
    </section>
  );
}
