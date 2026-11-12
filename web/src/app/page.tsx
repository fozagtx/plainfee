import Link from "next/link";
import type { ReactNode } from "react";
import { Flywheel, HowItWorks, PlainfeePanels, ProblemPanels, TierLadder, TocRail } from "@/components/home-sections";
import { ProofTable } from "@/components/proof-table";
import { SectionHead, buttonClass } from "@/components/ui";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="mx-auto flex w-full max-w-(--container-data) flex-col gap-6 px-4 pt-16 pb-24 md:pt-24">
        <h1 className="t-display max-w-[14ch]">The fee you see is the fee you pay.</h1>
        <p className="measure text-[18px] text-ink-soft">
          Many trading pools show a 0% fee, then quietly take a cut of your trade. Plainfee shows its fee up front, charges
          less when you hold $WIF, and uses every fee to burn $WIF.
        </p>
        <div className="flex flex-wrap gap-2">
          <a href="#check" className={buttonClass("primary")}>
            CHECK A POOL
          </a>
          <Link href="/swap" className={buttonClass("outline")}>
            SWAP $WIF
          </Link>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[1400px] gap-10 px-4">
        <TocRail />
        <div className="flex min-w-0 flex-1 flex-col">
          <Section id="problem">
            <SectionHead title="The problem">
              The fee a pool shows isn&apos;t always the fee you pay. Here is the most traded $WIF pool, checked just now.
            </SectionHead>
            <div className="max-w-(--container-data)">
              <ProblemPanels />
            </div>
          </Section>
        </div>
      </div>

      {/* The table runs the full width of the page */}
      <section id="check" className="flex scroll-mt-24 flex-col gap-8 border-t border-rule py-24">
        <div className="mx-auto w-full max-w-[1400px] px-4 min-[1280px]:pl-[calc(11rem+3.5rem)]">
          <SectionHead title="Check any pool">
            The most traded pools right now, each checked the same way: the fee they show, next to the fee you actually pay.
          </SectionHead>
        </div>
        <ProofTable />
      </section>

      <div className="mx-auto flex w-full max-w-[1400px] gap-10 px-4">
        <div className="hidden w-44 shrink-0 min-[1280px]:block" aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col">
          <Section id="charges">
            <SectionHead title="How Plainfee works" />
            <div className="flex max-w-(--container-data) flex-col gap-8">
              <HowItWorks />
              <PlainfeePanels />
            </div>
          </Section>

          <Section id="lock" loud>
            <SectionHead title="Hold $WIF, pay less" />
            <div className="max-w-(--container-data)">
              <TierLadder />
              <div className="mt-6">
                <Link href="/lock" className={buttonClass("primary")}>
                  LOCK $WIF
                </Link>
              </div>
            </div>
          </Section>

          <Section id="burn" loud>
            <SectionHead title="Every fee burns $WIF" />
            <div className="max-w-(--container-data)">
              <Flywheel />
              <div className="mt-6">
                <Link href="/swap" className={buttonClass("primary")}>
                  SWAP $WIF
                </Link>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ id, loud = false, children }: { id: string; loud?: boolean; children: ReactNode }) {
  return (
    <section id={id} className={`flex scroll-mt-24 flex-col gap-8 border-t ${loud ? "border-ink" : "border-rule"} py-24`}>
      {children}
    </section>
  );
}
