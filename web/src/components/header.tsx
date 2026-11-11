import Link from "next/link";

/** Flip `live` as each route ships, so the public site never links to a 404. */
const NAV = [
  { href: "/check", label: "CHECK A POOL", live: true },
  { href: "/swap", label: "SWAP", live: false },
  { href: "/lock", label: "LOCK WIF", live: false },
  { href: "/burns", label: "BURNS", live: false },
].filter((item) => item.live);

/** Floating, fully bordered on desktop; flush with a bottom rule on mobile. */
export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-card md:top-4 md:mx-auto md:w-[calc(100%-2rem)] md:max-w-(--container-page) md:border">
      <div className="flex h-12 items-center justify-between gap-4 px-4">
        <Link href="/" className="text-[17px] font-medium tracking-tight">
          Plainfee
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="mono-control px-2 py-1.5 transition-chrome hover:bg-background">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
