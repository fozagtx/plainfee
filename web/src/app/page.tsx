import Link from "next/link";
import type { ReactNode } from "react";
import { BitsVerifier, Flywheel, PlainfeePanels, ProblemPanels, TierLadder, TocRail } from "@/components/home-sections";
import { ProofTable } from "@/components/proof-table";
import { SectionHead, buttonClass } from "@/components/ui";

const REPO = "https://github.com/fozagtx/plainfee";
const HOOK_SRC = `${REPO}/blob/main/contracts/src/PlainfeeHook.sol`;
const BITQUERY = "https://bitquery.io/investigations/uniswap-v4-hooks-robinhood-chain";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="mx-auto flex w-full max-w-(--container-data) flex-col gap-6 px-4 pt-16 pb-24 md:pt-24">
        <h1 className="t-display max-w-[14ch]">The fee you see is the fee you pay.</h1>
        <p className="measure text-[18px] text-ink-soft">
          A Uniswap v4 hook on Robinhood Chain that charges its whole fee in the pool&apos;s own fee field. Locked $WIF
          lowers it. Every fee buys and burns $WIF.
        </p>
        <div className="flex flex-wrap gap-2">
          <a href="#check" className={buttonClass("primary")}>
            CHECK A POOL
          </a>
          <a href={HOOK_SRC} target="_blank" rel="noreferrer" className={buttonClass("outline")}>
            READ THE HOOK
          </a>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[1400px] gap-10 px-4">
        <TocRail />
        <div className="flex min-w-0 flex-1 flex-col">
          <Section id="problem">
            <SectionHead title="The problem">
              Most hooked volume on this chain runs through one contract that shows 0% and takes about 2% after the swap,
              where the pool&apos;s records never show it (
              <a href={BITQUERY} target="_blank" rel="noreferrer" className="link">
                Bitquery
              </a>
              ). Here is the busiest $WIF pool, measured as this page loaded.
            </SectionHead>
            <div className="max-w-(--container-data)">
              <ProblemPanels />
            </div>
          </Section>
        </div>
      </div>

      {/* §2 goes full-bleed: the widest thing on the site */}
      <section id="check" className="flex scroll-mt-24 flex-col gap-8 border-t border-rule py-24">
        <div className="mx-auto w-full max-w-[1400px] px-4 min-[1280px]:pl-[calc(11rem+3.5rem)]">
          <SectionHead title="Check any pool">
            The busiest Uniswap v4 pools on Robinhood Chain right now, each measured the same way. Sorted by gap, largest
            first. Paste any pool id to check one that isn&apos;t listed.
          </SectionHead>
        </div>
        <ProofTable />
      </section>

      <div className="mx-auto flex w-full max-w-[1400px] gap-10 px-4">
        <div className="hidden w-44 shrink-0 min-[1280px]:block" aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col">
          <Section id="charges">
            <SectionHead title="How Plainfee charges">
              The fee is set in <code className="figure">beforeSwap</code> through the pool&apos;s own fee field, so it
              lands in every Swap event. The permissions that would let the hook take more are not in its address.
            </SectionHead>
            <div className="flex max-w-(--container-data) flex-col gap-8">
              <PlainfeePanels />
              <BitsVerifier />
            </div>
          </Section>

          <Section id="lock" loud>
            <SectionHead title="Lock WIF, pay less" />
            <div className="max-w-(--container-data)">
              <TierLadder />
              <div className="mt-6">
                <Link href="/lock" className={buttonClass("primary")}>
                  LOCK WIF
                </Link>
              </div>
            </div>
          </Section>

          <Section id="burn" loud>
            <SectionHead title="Every fee burns WIF" />
            <div className="max-w-(--container-data)">
              <Flywheel />
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href="/burns" className={buttonClass("primary")}>
                  SEE EVERY BURN
                </Link>
                <Link href="/swap" className={buttonClass("outline")}>
                  SWAP ETH / WIF
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
