import { PLAINFEE } from "@/lib/addresses";
import { addressUrl } from "@/lib/pool-check";

export function Footer() {
  const contracts: Array<[string, string | undefined]> = [
    ["HOOK", PLAINFEE.hook],
    ["VAULT", PLAINFEE.vault],
  ];
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-10 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3">
          <span className="text-[17px] font-medium tracking-tight">Plainfee</span>
          <dl className="t-small flex flex-col gap-1 text-ink-soft">
            {contracts.map(([k, v]) => (
              <div key={k} className="flex gap-3">
                <dt className="t-micro w-12 pt-0.5">{k}</dt>
                <dd className="figure">
                  {v ? (
                    <a href={addressUrl(v as `0x${string}`)} target="_blank" rel="noreferrer" className="link">
                      {v}
                    </a>
                  ) : (
                    "not deployed yet"
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </footer>
  );
}
