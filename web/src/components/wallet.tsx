"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import type { Address } from "viem";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { Card, Label, StatusDot, buttonClass, cx } from "@/components/ui";
import { short } from "@/lib/plainfee";
import { txUrl } from "@/lib/pool-check";
import type { TxState } from "@/lib/use-plainfee";
import { chain } from "@/lib/wagmi";

const REPO = "https://github.com/fozagtx/plainfee";

/** False during server render and hydration, so wallet state (restored from storage) never causes a mismatch. */
const noop = () => () => {};
function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}

function useConnectInjected() {
  const { connect, connectors, isPending, error } = useConnect();
  const injected = connectors[0];
  return {
    connect: () => injected && connect({ connector: injected, chainId: chain.id }),
    isPending,
    error,
  };
}

/** Header control: connect, or show the connected address. */
export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, isPending } = useConnectInjected();
  const mounted = useMounted();
  if (mounted && isConnected && address) {
    return (
      <button type="button" onClick={() => disconnect()} className={buttonClass("outline")} title="Disconnect">
        {short(address)}
      </button>
    );
  }
  return (
    <button type="button" onClick={connect} disabled={isPending} className={buttonClass("primary")}>
      {isPending ? "CONNECTING…" : "CONNECT"}
    </button>
  );
}

/** Renders `children` only with a wallet connected on Robinhood Chain. */
export function WalletGate({ children, reason }: { children: (address: Address) => ReactNode; reason: string }) {
  const { address, isConnected, chainId } = useAccount();
  const { connect, isPending, error } = useConnectInjected();
  const { switchChain, isPending: switching } = useSwitchChain();
  const mounted = useMounted();

  if (!mounted) return <p className="p-6 text-sm text-subtle">Checking for a wallet…</p>;
  if (!isConnected || !address) {
    return (
      <div className="flex flex-col items-start gap-3 p-6">
        <p className="text-sm text-subtle">{reason}</p>
        <button type="button" onClick={connect} disabled={isPending} className={buttonClass("primary", "px-4")}>
          {isPending ? "CONNECTING…" : "CONNECT WALLET"}
        </button>
        {error && <p className="text-sm text-destructive">{error.message.split("\n")[0]}</p>}
      </div>
    );
  }
  if (chainId !== chain.id) {
    return (
      <div className="flex flex-col items-start gap-3 p-6">
        <StatusDot tone="warning">WRONG NETWORK</StatusDot>
        <p className="text-sm text-subtle">Plainfee runs on Robinhood Chain (chain {chain.id}).</p>
        <button
          type="button"
          onClick={() => switchChain({ chainId: chain.id })}
          disabled={switching}
          className={buttonClass("primary", "px-4")}
        >
          SWITCH TO ROBINHOOD CHAIN
        </button>
      </div>
    );
  }
  return <>{children(address)}</>;
}

/** The state of the last transaction, with a link to it once it has a hash. */
export function TxStatus({ state }: { state: TxState }) {
  if (state.status === "idle") return null;
  const link =
    "hash" in state && state.hash ? (
      <a href={txUrl(state.hash)} target="_blank" rel="noreferrer" className="font-mono text-xs text-brand-readable underline">
        {short(state.hash)}
      </a>
    ) : null;
  return (
    <div className="flex flex-col gap-1 border-t border-border px-6 py-4" role="status">
      {state.status === "wallet" && <span className="mono-control text-subtle">{state.label}: CONFIRM IN YOUR WALLET…</span>}
      {state.status === "pending" && (
        <span className="mono-control flex flex-wrap items-center gap-2 text-subtle">
          {state.label}: WAITING FOR THE CHAIN… {link}
        </span>
      )}
      {state.status === "done" && (
        <span className="flex flex-wrap items-center gap-2">
          <StatusDot tone="success">{state.label}: DONE</StatusDot> {link}
        </span>
      )}
      {state.status === "error" && (
        <>
          <span className="flex flex-wrap items-center gap-2">
            <StatusDot tone="destructive">{state.label}: FAILED</StatusDot> {link}
          </span>
          <span className="text-sm text-subtle">{state.error}</span>
        </>
      )}
    </div>
  );
}

/** Shown in place of a page's controls until the contracts are on chain. Says so plainly; shows no numbers. */
export function NotDeployed({ what }: { what: string }) {
  return (
    <Card className="flex flex-col gap-3 p-6">
      <StatusDot tone="warning">NOT ON CHAIN YET</StatusDot>
      <p className="max-w-(--container-narrow) text-sm text-subtle">
        The Plainfee contracts are written and tested, but not deployed yet. {what} as soon as they are. Until then this
        page shows no numbers, because none exist on chain.
      </p>
      <div className="flex flex-wrap gap-2">
        <a href={`${REPO}/tree/main/contracts/src`} target="_blank" rel="noreferrer" className={buttonClass("outline")}>
          READ THE CONTRACTS
        </a>
        <Link href="/check" className={buttonClass("ghost")}>
          CHECK A POOL INSTEAD
        </Link>
      </div>
    </Card>
  );
}

export function AmountInput({
  id,
  label,
  value,
  onChange,
  balance,
  onMax,
  symbol,
  invalid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  balance?: string;
  onMax?: () => void;
  symbol: string;
  invalid?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="mono-xs text-subtle">
          {label}
        </label>
        {balance !== undefined && (
          <span className="mono-xs text-subtle">
            BALANCE {balance}
            {onMax && (
              <button type="button" onClick={onMax} className="ml-2 text-brand-readable underline">
                MAX
              </button>
            )}
          </span>
        )}
      </div>
      <div className={cx("flex items-center border bg-card", invalid ? "border-destructive" : "border-border-strong", "focus-within:border-foreground")}>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(",", "."))}
          className="figure min-w-0 flex-1 bg-transparent px-3 py-2 text-2xl outline-none"
        />
        <span className="mono-control px-3 text-subtle">{symbol}</span>
      </div>
    </div>
  );
}

export function Stat({ label, value, note, className }: { label: string; value: ReactNode; note?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-col gap-1 p-4", className)}>
      <Label>{label}</Label>
      <span className="figure text-2xl">{value}</span>
      {note && <span className="text-xs text-subtle">{note}</span>}
    </div>
  );
}
