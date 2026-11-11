import Link from "next/link";
import type { ReactNode } from "react";
import { LiveProof } from "@/components/live-proof";
import { Label, buttonClass } from "@/components/ui";

const REPO = "https://github.com/fozagtx/plainfee";
const SRC = `${REPO}/blob/main/contracts/src`;
const BITQUERY = "https://bitquery.io/investigations/uniswap-v4-hooks-robinhood-chain";

/** The tiers are constants in PlainfeeHook (fees) and constructor arguments set at deploy (thresholds). */
const TIERS = [
  { locked: "0", fee: "0.30%", pips: 3000 },
  { locked: "500", fee: "0.25%", pips: 2500 },
  { locked: "2,500", fee: "0.20%", pips: 2000 },
  { locked: "10,000", fee: "0.15%", pips: 1500 },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero: the claim, and the evidence beside it */}
      <section className="grid items-stretch gap-8 py-12 md:py-16 lg:grid-cols-[1fr_minmax(0,520px)] lg:gap-16">
        <div className="flex flex-col justify-center gap-6">
          <Label>UNISWAP V4 HOOK · $WIF · ROBINHOOD CHAIN</Label>
          <h1 className="measure-heading text-4xl md:text-5xl lg:text-6xl">The fee you see is the fee you pay.</h1>
          <p className="lede max-w-(--container-narrow) text-lg">
            Most hooked trading on this chain shows a 0% fee and takes its cut after the swap, where the pool&apos;s records
            never show it. Plainfee puts its whole fee in the pool&apos;s own fee field, lowers it for locked $WIF, and
            burns $WIF with every fee it earns.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/check" className={buttonClass("primary")}>
              CHECK A POOL – FREE
            </Link>
            <a href={REPO} target="_blank" rel="noreferrer" className={buttonClass("outline")}>
              READ THE CODE
            </a>
          </div>
        </div>
        <LiveProof />
      </section>

      {/* How it works */}
      <Section label="HOW IT WORKS" title="Three parts. Each one is checkable on chain.">
        <div className="grid border border-border bg-card md:grid-cols-3 md:divide-x md:divide-border">
          <Step
            n="01"
            title="A fee you can see"
            icon={<IconEye />}
            code="beforeSwap → fee | OVERRIDE_FEE_FLAG"
            href={`${SRC}/PlainfeeHook.sol`}
          >
            The hook sets each swap&apos;s fee through the pool&apos;s own fee field, so it lands in every Swap event. The
            permissions that would let it take more are switched off in its address.
          </Step>
          <Step
            n="02"
            title="Lock $WIF, pay less"
            icon={<IconLock />}
            code="weightOf(tx.origin) → tier"
            href={`${SRC}/WifLock.sol`}
            className="border-t border-border md:border-t-0"
          >
            Locked $WIF lowers your fee, down to 0.15%. It counts after one hour, so borrowed WIF can&apos;t be locked and
            used in the same transaction. Unlocking takes three days.
          </Step>
          <Step
            n="03"
            title="Every fee burns $WIF"
            icon={<IconFlame />}
            code="harvest() → WIF.burn(amount)"
            href={`${SRC}/BurnVault.sol`}
            className="border-t border-border md:border-t-0"
          >
            One vault is the pool&apos;s only liquidity. It keeps fees apart from deposits. Anyone can call harvest: it
            buys $WIF with the fees and burns all of it.
          </Step>
        </div>
      </Section>

      {/* Tiers */}
      <Section label="FEE TIERS" title="The more $WIF you lock, the less you pay.">
        <div className="border border-border bg-card">
          <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-border px-4 py-3 sm:grid-cols-[180px_1fr_96px]">
            <span className="mono-xs text-subtle">$WIF LOCKED</span>
            <span className="mono-xs hidden text-subtle sm:block">FEE PER SWAP</span>
            <span className="mono-xs text-right text-subtle">FEE</span>
          </div>
          {TIERS.map((t) => (
            <div
              key={t.pips}
              className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border px-4 py-3 last:border-b-0 sm:grid-cols-[180px_1fr_96px]"
            >
              <span className="figure text-base">≥ {t.locked}</span>
              <span className="hidden h-2 bg-background sm:block" aria-hidden>
                <span className="block h-full bg-brand" style={{ width: `${(t.pips / 3000) * 100}%` }} />
              </span>
              <span className="figure text-right text-base">{t.fee}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-subtle">
          The fees are constants and the thresholds are fixed at deploy. The contracts have no owner and nothing can be
          changed afterwards.
        </p>
      </Section>

      {/* Flywheel */}
      <Section label="THE FLYWHEEL" title="Trading makes $WIF scarcer. Scarcer $WIF makes the discount worth more.">
        <div className="grid gap-8 rounded-3xl border border-border bg-card p-6 md:grid-cols-[1fr_1.2fr] md:p-10">
          <ol className="flex flex-col divide-y divide-border">
            {[
              ["TRADE", "Swaps pay the fee shown in the pool, 0.15–0.30%."],
              ["COLLECT", "Every fee accrues to the burn vault, never to a person."],
              ["BURN", "Harvest buys $WIF with the fees and burns it. Supply falls."],
              ["LOCK", "Scarcer $WIF makes a lower fee worth holding for. Locked $WIF can't be sold."],
            ].map(([k, v], i) => (
              <li key={k} className="flex gap-4 py-3 first:pt-0 last:pb-0">
                <span className="mono-xs w-6 shrink-0 pt-1 text-subtle">0{i + 1}</span>
                <div className="flex flex-col gap-1">
                  <span className="mono-control">{k}</span>
                  <span className="text-sm text-subtle">{v}</span>
                </div>
              </li>
            ))}
          </ol>
          <FlywheelDiagram />
        </div>
      </Section>

      {/* Verify */}
      <Section label="DON'T TRUST IT, CHECK IT" title="Three things you can verify without asking us.">
        <div className="grid gap-px border border-border bg-border md:grid-cols-3">
          <Fact k="afterSwapReturnDelta" v="off" note="Read it from the hook address bits on the check page." />
          <Fact k="owner()" v="none" note="No admin, no setter, no proxy. Every value is immutable." />
          <Fact k="Swap.fee" v="= what you pay" note="The fee in each Swap event matches the cost of the swap." />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/check" className={buttonClass("primary")}>
            CHECK A POOL
          </Link>
          <a href={BITQUERY} target="_blank" rel="noreferrer" className={buttonClass("outline")}>
            READ THE BITQUERY REPORT
          </a>
        </div>
      </Section>

      <footer className="mt-16 flex flex-col gap-4 border-t border-border pt-6 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[17px] font-medium tracking-tight">Plainfee</span>
        <nav className="flex flex-wrap gap-1">
          <Link href="/check" className={buttonClass("ghost")}>
            CHECK A POOL
          </Link>
          <a href={REPO} target="_blank" rel="noreferrer" className={buttonClass("ghost")}>
            GITHUB
          </a>
          <a href="https://worldisflat.fun/build" target="_blank" rel="noreferrer" className={buttonClass("ghost")}>
            WORLD IS FLAT HACKATHON
          </a>
        </nav>
      </footer>
    </div>
  );
}

function Section({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-8 border-t border-border py-16">
      <div className="flex max-w-(--container-narrow) flex-col gap-3">
        <Label>{label}</Label>
        <h2 className="measure-heading text-3xl md:text-4xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Step({
  n,
  title,
  icon,
  code,
  href,
  className,
  children,
}: {
  n: string;
  title: string;
  icon: ReactNode;
  code: string;
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-4 p-6 ${className ?? ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-foreground">{icon}</span>
        <span className="mono-xs text-subtle">{n}</span>
      </div>
      <h3 className="text-xl">{title}</h3>
      <p className="text-sm text-subtle">{children}</p>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="mt-auto border-t border-border pt-3 font-mono text-xs text-brand-readable hover:underline"
      >
        {code}
      </a>
    </div>
  );
}

function Fact({ k, v, note }: { k: string; v: string; note: string }) {
  return (
    <div className="flex flex-col gap-2 bg-card p-6">
      <span className="font-mono text-xs text-subtle">{k}</span>
      <span className="figure text-2xl">{v}</span>
      <span className="text-sm text-subtle">{note}</span>
    </div>
  );
}

/* Line icons: 24px viewBox, currentColor, 1.5 stroke. */
const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "square" as const,
  "aria-hidden": true,
};
const IconEye = () => (
  <svg {...iconProps}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IconLock = () => (
  <svg {...iconProps}>
    <rect x="4" y="11" width="16" height="10" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
const IconFlame = () => (
  <svg {...iconProps}>
    <path d="M12 22c4 0 7-2.8 7-7 0-5-4-7-5-11-2 2-3 4-3 6-1-1-2-2-2-4-2 2-4 5-4 9 0 4.2 3 7 7 7Z" />
  </svg>
);

/** A square loop: four nodes, hairline edges, one brand-filled node for the burn. */
function FlywheelDiagram() {
  const nodes = [
    { x: 60, y: 40, label: "TRADE" },
    { x: 300, y: 40, label: "COLLECT" },
    { x: 300, y: 220, label: "BURN", brand: true },
    { x: 60, y: 220, label: "LOCK" },
  ];
  const w = 120;
  const h = 40;
  return (
    <svg viewBox="0 0 420 300" className="h-auto w-full" role="img" aria-label="Trade, collect, burn, lock, and back to trade">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill="var(--foreground)" />
        </marker>
      </defs>
      {[
        [180, 60, 300, 60],
        [360, 80, 360, 220],
        [300, 240, 180, 240],
        [120, 220, 120, 80],
      ].map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--foreground)" strokeWidth="1" markerEnd="url(#arrow)" />
      ))}
      {nodes.map((n) => (
        <g key={n.label}>
          <rect
            x={n.x}
            y={n.y}
            width={w}
            height={h}
            fill={n.brand ? "var(--brand)" : "var(--card)"}
            stroke={n.brand ? "var(--brand)" : "var(--border-strong)"}
          />
          <text
            x={n.x + w / 2}
            y={n.y + h / 2 + 4}
            textAnchor="middle"
            fontFamily="var(--font-jetbrains-mono), monospace"
            fontSize="12"
            fill="var(--foreground)"
          >
            {n.label}
          </text>
        </g>
      ))}
      <text x="210" y="155" textAnchor="middle" fontFamily="var(--font-jetbrains-mono), monospace" fontSize="10" fill="var(--subtle)">
        $WIF SUPPLY ↓
      </text>
    </svg>
  );
}
