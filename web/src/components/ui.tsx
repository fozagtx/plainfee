import type { ComponentProps, ReactNode } from "react";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

type ButtonVariant = "primary" | "brand" | "outline" | "ghost";

const buttonVariant: Record<ButtonVariant, string> = {
  primary: "bg-foreground text-card border-foreground hover:bg-foreground/85",
  brand: "bg-brand text-brand-ink border-brand hover:bg-brand/85",
  outline: "bg-card text-foreground border-border-strong hover:bg-background",
  ghost: "bg-transparent text-foreground border-transparent hover:bg-card hover:border-border",
};

export const buttonClass = (variant: ButtonVariant = "primary", className?: string) =>
  cx(
    "mono-control inline-flex items-center justify-center gap-2 border px-2 py-1.5 transition-chrome",
    "disabled:cursor-not-allowed disabled:opacity-40",
    buttonVariant[variant],
    className,
  );

/** Labels are written in uppercase in the content, e.g. "SWAP – 0.25% FEE". No text-transform. */
export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx("mono-control inline-flex items-center gap-1.5 border border-border-strong bg-card px-1.5 py-0.5", className)}>
      {children}
    </span>
  );
}

/** State is a dot beside neutral text, never a white label on a coloured chip. */
export function StatusDot({ tone, children }: { tone: "success" | "destructive" | "warning"; children: ReactNode }) {
  const dot = { success: "bg-success", destructive: "bg-destructive", warning: "bg-warning" }[tone];
  return (
    <span className="mono-control inline-flex items-center gap-2 text-foreground">
      <span aria-hidden className={cx("size-2", dot)} />
      {children}
    </span>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("border border-border bg-card", className)} {...props} />;
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx("mono-xs text-subtle", className)}>{children}</span>;
}

/**
 * The signature component: the fee a pool shows next to the fee a swap really pays.
 * When they differ, the real number gets the highlight marker.
 */
export function FeeReadout({ shownBps, paidBps }: { shownBps: number; paidBps: number }) {
  const hidden = paidBps - shownBps;
  const fmt = (bps: number) => `${(bps / 100).toFixed(2)}%`;
  return (
    <Card className="grid grid-cols-2 divide-x divide-border">
      <div className="flex flex-col gap-2 p-4">
        <Label>SHOWN FEE</Label>
        <span className="figure text-4xl">{fmt(shownBps)}</span>
      </div>
      <div className="flex flex-col gap-2 p-4">
        <Label>PAID FEE</Label>
        <span className={cx("figure w-fit text-4xl", hidden > 0 && "bg-highlight px-1")}>{fmt(paidBps)}</span>
        {hidden > 0 ? (
          <StatusDot tone="destructive">{fmt(hidden)} NOT SHOWN</StatusDot>
        ) : (
          <StatusDot tone="success">MATCHES</StatusDot>
        )}
      </div>
    </Card>
  );
}

export { cx };
