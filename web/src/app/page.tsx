import { buttonClass, Label } from "@/components/ui";

export default function Home() {
  return (
    <section className="flex flex-col gap-8 py-12 md:py-24">
      <div className="flex max-w-(--container-narrow) flex-col gap-4">
        <Label>UNISWAP V4 HOOK · $WIF · ROBINHOOD CHAIN</Label>
        <h1 className="measure-heading text-4xl md:text-5xl lg:text-6xl">The fee you see is the fee you pay.</h1>
        <p className="lede text-lg">
          Most hooked trading on this chain runs through one contract that shows a 0% fee and takes about 2%. Plainfee puts
          its fee in the pool&apos;s own fee field, cuts it for locked $WIF, and burns $WIF with every cent it takes.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href="https://github.com/fozagtx/plainfee"
          target="_blank"
          rel="noreferrer"
          className={buttonClass("primary")}
        >
          READ THE CODE
        </a>
        <a
          href="https://bitquery.io/investigations/uniswap-v4-hooks-robinhood-chain"
          target="_blank"
          rel="noreferrer"
          className={buttonClass("outline")}
        >
          READ THE BITQUERY REPORT
        </a>
      </div>
    </section>
  );
}
