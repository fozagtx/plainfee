import type { ComponentProps, ReactNode } from "react";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

type ButtonVariant = "primary" | "brand" | "outline" | "ghost";

const buttonVariant: Record<ButtonVariant, string> = {
  primary: "bg-ink text-paper border-ink hover:bg-ink/85",
  brand: "bg-ink text-paper border-ink hover:bg-ink/85",
  outline: "bg-transparent text-ink border-ink/25 hover:border-ink",
  ghost: "bg-transparent text-ink border-transparent hover:bg-paper-sunk",
};

export const buttonClass = (variant: ButtonVariant = "primary", className?: string) =>
  cx(
    "mono-control inline-flex items-center justify-center gap-2 rounded-sm border px-3 py-1.5 transition-chrome",
    "disabled:cursor-not-allowed disabled:opacity-40",
    buttonVariant[variant],
    className,
  );

/** Labels are written in uppercase in the content. */
export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx("t-micro inline-flex items-center gap-1.5 rounded-sm border border-rule px-1.5 py-0.5", className)}>
      {children}
    </span>
  );
}

/** State is a dot beside neutral text. */
export function StatusDot({ tone, children }: { tone: "success" | "destructive" | "warning"; children: ReactNode }) {
  const dot = { success: "bg-match", destructive: "bg-gap-4", warning: "bg-gap-3" }[tone];
  return (
    <span className="t-micro inline-flex items-center gap-2 text-ink">
      <span aria-hidden className={cx("size-1.5", dot)} />
      {children}
    </span>
  );
}

/** A hairline-ruled block. Not a card: no fill, no radius beyond 2px, no shadow. */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("rounded-sm border border-rule", className)} {...props} />;
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx("t-micro text-ink-soft", className)}>{children}</span>;
}

/** Annotation chip (DESIGN.md §5.2). A label, not a badge: flat, no fill. */
export type ChipKind = "hidden" | "post-swap" | "not-in-event" | "unverifiable";
export function Chip({ kind }: { kind: ChipKind }) {
  return <span className="t-micro rounded-sm border border-gap-4 px-1.5 py-0.5 text-danger-ink">{kind}</span>;
}

export const pct = (bps: number) => `${(bps / 100).toFixed(2)}%`;

/**
 * The divergence ramp (DESIGN.md §3). Only a hook that can take tokens outside the fee
 * gets a colour; any other gap is price impact and stays on paper.
 */
export function gapFill(gapBps: number, canTakeOutsideFee: boolean, toleranceBps = 1) {
  if (!canTakeOutsideFee || gapBps <= toleranceBps) return "";
  const pp = gapBps / 100;
  if (pp <= 0.25) return "bg-gap-1";
  if (pp <= 1) return "bg-gap-2";
  if (pp <= 2) return "bg-gap-3";
  return "bg-gap-4 text-ink";
}

/**
 * Claim / proof panels (DESIGN.md §5.2): what the pool shows beside what a swap pays,
 * on the same baseline, divided by one hairline.
 */
export function ClaimProof({
  shownBps,
  paidBps,
  toleranceBps = 1,
  canTakeOutsideFee,
  match = false,
  shownNote,
  proof,
  className,
}: {
  shownBps: number | null;
  paidBps: number | null;
  toleranceBps?: number;
  canTakeOutsideFee: boolean;
  /** Plainfee's own pair: both sides equal, one match hairline. Used once per page. */
  match?: boolean;
  shownNote?: ReactNode;
  proof?: ReactNode;
  className?: string;
}) {
  const known = shownBps !== null && paidBps !== null;
  const hidden = known && canTakeOutsideFee && paidBps - shownBps > toleranceBps;
  return (
    <div className={cx("grid grid-cols-1 border-y border-rule sm:grid-cols-2 sm:divide-x sm:divide-rule", className)}>
      <div className="flex flex-col gap-4 py-6 sm:pr-8">
        <Label>WHAT THE POOL SHOWS</Label>
        <span className="t-data-lg">{shownBps === null ? "—" : pct(shownBps)}</span>
        <div className="flex min-h-6 flex-wrap items-center gap-1.5">
          {hidden ? (
            <>
              <Chip kind="hidden" />
              <Chip kind="post-swap" />
              <Chip kind="not-in-event" />
            </>
          ) : (
            shownNote && <span className="t-small text-ink-soft">{shownNote}</span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-4 border-t border-rule py-6 sm:border-t-0 sm:pl-8">
        <Label>WHAT YOU ACTUALLY PAY</Label>
        <span className={cx("t-data-lg w-fit", match && known && "border-b border-match pb-1")}>
          {paidBps === null ? "—" : pct(paidBps)}
        </span>
        <div className="t-small min-h-6 text-ink-soft">{proof}</div>
      </div>
    </div>
  );
}

/** Kept for the app routes: the panels for any measured pool. */
export function FeeReadout({
  shownBps,
  paidBps,
  toleranceBps = 1,
  canTakeOutsideFee = true,
  className,
}: {
  shownBps: number;
  paidBps: number;
  toleranceBps?: number;
  canTakeOutsideFee?: boolean;
  className?: string;
}) {
  return (
    <ClaimProof
      shownBps={shownBps}
      paidBps={paidBps}
      toleranceBps={toleranceBps}
      canTakeOutsideFee={canTakeOutsideFee}
      className={className}
    />
  );
}

/** A section opener with its § number (DESIGN.md §2). */
export function SectionHead({ n, title, children }: { n: number; title: string; children?: ReactNode }) {
  return (
    <div className="flex max-w-(--container-content) flex-col gap-3">
      <h2 className="t-h1">
        <span className="figure mr-3 text-ink-soft">§{n}</span>
        {title}
      </h2>
      {children && <p className="measure text-ink-soft">{children}</p>}
    </div>
  );
}

export { cx };
