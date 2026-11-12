"use client";

import { useState } from "react";
import { addressUrl } from "@/lib/pool-check";
import { cx } from "@/components/ui";

/** An address or id: mono, first 6 / last 4, with a copy control and (optionally) an explorer link. */
export function Addr({ value, href, full = false, className }: { value: string; href?: string | null; full?: boolean; className?: string }) {
  const [copied, setCopied] = useState(false);
  const text = full ? value : `${value.slice(0, 6)}…${value.slice(-4)}`;
  const link = href === undefined && value.length === 42 ? addressUrl(value as `0x${string}`) : href;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked: the full value is still in the title */
    }
  };
  return (
    <span className={cx("figure inline-flex items-center gap-1.5 whitespace-nowrap", className)} title={value}>
      {link ? (
        <a href={link} target="_blank" rel="noreferrer" className="link">
          {text}
        </a>
      ) : (
        <span>{text}</span>
      )}
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${value}`}
        className="t-micro rounded-sm px-1 text-ink-soft transition-chrome hover:bg-paper-sunk hover:text-ink"
      >
        {copied ? "copied" : "copy"}
      </button>
    </span>
  );
}
