import Link from "next/link";
import { WalletButton } from "@/components/wallet";

/** Flip `live` as each route ships, so the public site never links to a 404. */
const NAV = [
  { href: "/check", label: "CHECK A POOL", live: true },
  { href: "/swap", label: "SWAP", live: true },
  { href: "/lock", label: "LOCK WIF", live: true },
  { href: "/burns", label: "BURNS", live: true },
].filter((item) => item.live);

function NavLinks({ className }: { className?: string }) {
  return (
    <nav className={className}>
      {NAV.map((item) => (
        <Link key={item.href} href={item.href} className="mono-control shrink-0 whitespace-nowrap px-2 py-1.5 transition-chrome hover:bg-background">
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** Floating, fully bordered on desktop. On mobile it is flush, with the links on their own scrollable row. */
export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-card md:top-4 md:mx-auto md:w-[calc(100%-2rem)] md:max-w-(--container-page) md:border">
      <div className="flex h-12 items-center justify-between gap-4 px-4">
        <Link href="/" className="text-[17px] font-medium tracking-tight">
          Plainfee
        </Link>
        <div className="flex items-center gap-1">
          <NavLinks className="hidden items-center gap-1 md:flex" />
          <WalletButton />
        </div>
      </div>
      <NavLinks className="flex items-center gap-1 overflow-x-auto border-t border-border px-2 py-1 md:hidden" />
    </header>
  );
}
