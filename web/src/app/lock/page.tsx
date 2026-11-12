import type { Metadata } from "next";
import { Label } from "@/components/ui";
import { Locker } from "./locker";

export const metadata: Metadata = {
  title: "Lock WIF · Plainfee",
  description: "Lock $WIF to lower the fee you pay on every Plainfee swap, down to 0.15%.",
};

export default function LockPage() {
  return (
    <section className="mx-auto flex w-full max-w-(--container-data) flex-col gap-10 px-4 py-12 md:py-16">
      <div className="flex max-w-(--container-narrow) flex-col gap-4">
        <Label>LOCK $WIF</Label>
        <h1 className="t-h1 measure-heading">Lock $WIF, pay a lower fee.</h1>
        <p className="lede">
          The more $WIF your wallet has locked, the lower the fee on every swap it makes in the Plainfee pool. Locked $WIF
          can&apos;t be sold while it&apos;s locked, and every fee the pool earns burns $WIF.
        </p>
      </div>
      <Locker />
    </section>
  );
}
