import { Button, Card, FeeReadout, Label, StatusDot, Tag } from "@/components/ui";

export const metadata = { title: "System · Plainfee" };

const SWATCHES = [
  ["background", "#f6f6f6", "bg-background"],
  ["card", "#ffffff", "bg-card"],
  ["foreground", "#0a0a0a", "bg-foreground"],
  ["border", "#e4e4e4", "bg-border"],
  ["brand", "#51a2ff", "bg-brand"],
  ["brand-readable", "#003985", "bg-brand-readable"],
  ["highlight", "#d4ff4a", "bg-highlight"],
] as const;

/** Living specimen of DESIGN.md. Every component used in the product renders here first. */
export default function SystemPage() {
  return (
    <div className="flex flex-col gap-16">
      <section className="flex max-w-(--container-narrow) flex-col gap-4">
        <Label>DESIGN SYSTEM</Label>
        <h1 className="measure-heading text-4xl md:text-5xl lg:text-6xl">Square, ruled and plain.</h1>
        <p className="lede text-lg">Hairline borders, uppercase mono controls, light headings. Light theme only.</p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">Colour</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {SWATCHES.map(([name, hex, cls]) => (
            <Card key={name} className="flex flex-col">
              <div className={`h-16 border-b border-border ${cls}`} />
              <div className="flex flex-col gap-1 p-2">
                <span className="mono-control">{name}</span>
                <span className="mono-xs text-subtle">{hex}</span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">Controls</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button>SWAP – 0.25% FEE</Button>
          <Button variant="brand">LOCK WIF</Button>
          <Button variant="outline">CHECK A POOL</Button>
          <Button variant="ghost">DOCS</Button>
          <Button disabled>CONNECT WALLET</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tag>DYNAMIC FEE</Tag>
          <Tag>NO RETURN DELTA</Tag>
          <StatusDot tone="success">MATCHES</StatusDot>
          <StatusDot tone="destructive">1.00% NOT SHOWN</StatusDot>
          <a className="mono-control text-brand-readable underline underline-offset-4" href="#">
            VIEW ON BLOCKSCOUT
          </a>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">Fee readout</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <FeeReadout shownBps={0} paidBps={200} />
          <FeeReadout shownBps={25} paidBps={25} />
        </div>
        <p className="lede text-sm">Sample figures for the specimen only. The product reads every number from the chain.</p>
      </section>
    </div>
  );
}
