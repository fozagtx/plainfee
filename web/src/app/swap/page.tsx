import type { Metadata } from "next";
import { Label } from "@/components/ui";
import { Swapper } from "./swapper";

export const metadata: Metadata = {
  title: "Swap · Plainfee",
  description: "Swap ETH and $WIF in the Plainfee pool. The fee you see is the fee you pay, and it burns $WIF.",
};

export default function SwapPage() {
  return (
    <section className="mx-auto flex w-full max-w-(--container-data) flex-col gap-10 px-4 py-12 md:py-16">
      <div className="flex max-w-(--container-narrow) flex-col gap-4">
        <Label>SWAP · ETH / $WIF</Label>
        <h1 className="t-h1 measure-heading">Swap with the fee in plain sight.</h1>
        <p className="lede">
          The fee is set by the pool and recorded in every Swap event: 0.30%, or less if you lock $WIF. All of it goes to
          the burn vault.
        </p>
      </div>
      <Swapper />
    </section>
  );
}
