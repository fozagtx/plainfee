import type { Metadata } from "next";
import { Label } from "@/components/ui";
import { Burns } from "./burns";

export const metadata: Metadata = {
  title: "Burns · Plainfee",
  description: "Every $WIF the Plainfee pool has burned, read from the chain, and the button that burns the next batch.",
};

export default function BurnsPage() {
  return (
    <section className="mx-auto flex w-full max-w-(--container-data) flex-col gap-10 px-4 py-12 md:py-16">
      <div className="flex max-w-(--container-narrow) flex-col gap-4">
        <Label>BURNS</Label>
        <h1 className="t-h1 measure-heading">Every fee ends up burned.</h1>
        <p className="lede">
          The pool&apos;s fees collect in the burn vault. Harvest turns them into $WIF and burns it. Each burn below is a
          transaction you can open.
        </p>
      </div>
      <Burns />
    </section>
  );
}
