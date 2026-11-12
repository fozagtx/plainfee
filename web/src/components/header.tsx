import Link from "next/link";
import { LedgerStrip } from "@/components/ledger-strip";
import { WalletButton } from "@/components/wallet";

const NAV = [
  { href: "/check", label: "CHECK A POOL" },
  { href: "/swap", label: "SWAP" },
  { href: "/lock", label: "LOCK WIF" },
  { href: "/burns", label: "BURNS" },
];

function NavLinks({ className }: { className?: string }) {
  return (
    <nav className={className}>
      {NAV.map((item) => (
        <Link key={item.href} href={item.href} className="mono-control shrink-0 rounded-sm px-2 py-1 whitespace-nowrap transition-chrome hover:bg-paper-sunk">
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** The Ledger Strip, then a flat hairline-ruled nav. Sticky, never floating. */
export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-paper">
      <LedgerStrip />
      <div className="border-b border-rule">
        <div className="mx-auto flex h-12 max-w-[1400px] items-center justify-between gap-4 px-4">
          <Link href="/" className="text-[17px] font-medium tracking-tight">
            Plainfee
          </Link>
          <div className="flex items-center gap-1">
            <NavLinks className="hidden items-center gap-1 md:flex" />
            <WalletButton />
          </div>
        </div>
        <NavLinks className="flex items-center gap-1 overflow-x-auto border-t border-rule px-2 py-1 md:hidden" />
      </div>
    </header>
  );
}
