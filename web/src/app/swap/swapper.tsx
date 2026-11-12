"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatUnits, maxUint160, maxUint256, parseUnits, type Address } from "viem";
import { useAccount, useBalance, usePublicClient, useReadContracts } from "wagmi";
import { Card, Label, StatusDot, buttonClass, cx } from "@/components/ui";
import { AmountInput, NotDeployed, TxStatus, WalletGate } from "@/components/wallet";
import { ADDRESSES, PLAINFEE } from "@/lib/addresses";
import {
  DEADLINE_SECONDS,
  MAIN_WIF_POOL_KEY,
  SLIPPAGE_BPS,
  fmt,
  hookAbi,
  permit2Abi,
  pips,
  quoterAbi,
  routerAbi,
  swapArgs,
  wifAbi,
  withSlippage,
} from "@/lib/plainfee";
import type { PoolKey } from "@/lib/pool-check";
import { useNow, usePlainfee, useTx } from "@/lib/use-plainfee";

type Side = "buy" | "sell"; // buy = ETH -> WIF (zeroForOne), sell = WIF -> ETH
const GAS_RESERVE = parseUnits("0.00005", 18);

export function Swapper() {
  const pf = usePlainfee();
  const { address } = useAccount();
  const [side, setSide] = useState<Side>("buy");
  const [amount, setAmount] = useState("");
  const debounced = useDebounced(amount, 350);

  if (!pf.deployed) return <NotDeployed what="Swapping opens here" />;

  const wei = parse(debounced);
  const zeroForOne = side === "buy";
  const [inSym, outSym] = zeroForOne ? ["ETH", "WIF"] : ["WIF", "ETH"];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,520px)_1fr] lg:gap-16">
      <Card className="flex flex-col">
        <div className="grid grid-cols-2 border-b border-border" role="tablist">
          {(["buy", "sell"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={side === s}
              onClick={() => {
                setSide(s);
                setAmount("");
              }}
              className={cx(
                "mono-control px-4 py-3 transition-micro",
                side === s ? "bg-foreground text-card" : "text-subtle hover:bg-background",
                s === "sell" && "border-l border-border",
              )}
            >
              {s === "buy" ? "BUY WIF WITH ETH" : "SELL WIF FOR ETH"}
            </button>
          ))}
        </div>
        <WalletGate reason="Connect a wallet to swap. Your fee depends on the WIF that wallet has locked.">
          {(account) =>
            pf.poolKey && pf.hook ? (
              <Trade
                key={side}
                account={account}
                hook={pf.hook}
                poolKey={pf.poolKey}
                zeroForOne={zeroForOne}
                amount={amount}
                setAmount={setAmount}
                wei={wei}
                inSym={inSym}
                outSym={outSym}
              />
            ) : (
              <p className="p-6 text-sm text-subtle">Reading the pool…</p>
            )
          }
        </WalletGate>
      </Card>

      <Compare poolKey={pf.poolKey} zeroForOne={zeroForOne} wei={wei} account={address} inSym={inSym} outSym={outSym} />
    </div>
  );
}

function Trade({
  account,
  hook,
  poolKey,
  zeroForOne,
  amount,
  setAmount,
  wei,
  inSym,
  outSym,
}: {
  account: Address;
  hook: Address;
  poolKey: PoolKey;
  zeroForOne: boolean;
  amount: string;
  setAmount: (v: string) => void;
  wei?: bigint;
  inSym: string;
  outSym: string;
}) {
  const tx = useTx();
  const now = useNow();
  const eth = useBalance({ address: account, query: { refetchInterval: 15_000 } });
  const reads = useReadContracts({
    allowFailure: false,
    query: { refetchInterval: 15_000 },
    contracts: [
      { address: ADDRESSES.wif, abi: wifAbi, functionName: "balanceOf", args: [account] },
      { address: ADDRESSES.wif, abi: wifAbi, functionName: "allowance", args: [account, ADDRESSES.permit2] },
      { address: ADDRESSES.permit2, abi: permit2Abi, functionName: "allowance", args: [account, ADDRESSES.wif, ADDRESSES.universalRouter] },
      { address: hook, abi: hookAbi, functionName: "feeFor", args: [account] },
    ],
  });
  const quote = useQuote(poolKey, zeroForOne, wei, account);

  const wifBal = reads.data?.[0];
  const balance = zeroForOne ? eth.data?.value : wifBal;
  const typed = parse(amount);
  const over = typed !== undefined && balance !== undefined && typed > balance;
  const invalid = amount !== "" && (typed === undefined || typed === 0n || over);
  const ready = !invalid && wei !== undefined && wei === typed && quote.data !== undefined;

  // Selling WIF goes through Permit2: approve Permit2 once, then let the router spend through it.
  const [p2Amount, p2Expiry] = reads.data?.[2] ?? [0n, 0];
  const needsErc20 = !zeroForOne && typed !== undefined && (reads.data?.[1] ?? 0n) < typed;
  const needsPermit2 = !zeroForOne && typed !== undefined && (p2Amount < typed || BigInt(p2Expiry) <= now);

  const swap = async () => {
    if (!ready || !quote.data) return;
    const minOut = withSlippage(quote.data);
    const ok = await tx.run("SWAP", {
      address: ADDRESSES.universalRouter,
      abi: routerAbi,
      functionName: "execute",
      args: swapArgs(poolKey, zeroForOne, wei!, minOut, now + DEADLINE_SECONDS),
      value: zeroForOne ? wei : 0n,
    });
    if (ok) setAmount("");
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4 p-6">
        <AmountInput
          id="swap-in"
          label="YOU PAY"
          symbol={inSym}
          value={amount}
          onChange={setAmount}
          balance={fmt(balance, 6)}
          onMax={() => {
            if (balance === undefined) return;
            const max = zeroForOne ? (balance > GAS_RESERVE ? balance - GAS_RESERVE : 0n) : balance;
            setAmount(formatUnits(max, 18));
          }}
          invalid={invalid}
        />
        {over && <p className="text-sm text-destructive">That&apos;s more than your balance.</p>}

        <dl className="divide-y divide-border border border-border text-sm">
          <Row k="YOU GET" v={quote.isFetching && !quote.data ? "…" : quote.data !== undefined ? `${fmt(quote.data, 6)} ${outSym}` : "—"} strong />
          <Row k="AT LEAST" v={quote.data !== undefined ? `${fmt(withSlippage(quote.data), 6)} ${outSym}` : "—"} note={`${Number(SLIPPAGE_BPS) / 100}% slippage limit`} />
          <Row k="YOUR FEE" v={reads.data ? pips(reads.data[3]) : "…"} note="Written into this swap's Swap event" />
        </dl>
        {quote.error && <p className="text-sm text-destructive">This amount can&apos;t be quoted. The pool may not be deep enough for it.</p>}

        {needsErc20 ? (
          <button
            type="button"
            disabled={tx.busy || invalid}
            onClick={() => tx.run("APPROVE", { address: ADDRESSES.wif, abi: wifAbi, functionName: "approve", args: [ADDRESSES.permit2, maxUint256] })}
            className={buttonClass("primary", "px-4")}
          >
            1/3 · ALLOW PERMIT2 TO MOVE YOUR WIF
          </button>
        ) : needsPermit2 ? (
          <button
            type="button"
            disabled={tx.busy || invalid}
            onClick={() =>
              tx.run("PERMIT", {
                address: ADDRESSES.permit2,
                abi: permit2Abi,
                functionName: "approve",
                args: [ADDRESSES.wif, ADDRESSES.universalRouter, maxUint160, Number(now + 30n * 86_400n)],
              })
            }
            className={buttonClass("primary", "px-4")}
          >
            2/3 · LET THE UNISWAP ROUTER USE IT (30 DAYS)
          </button>
        ) : (
          <button type="button" disabled={tx.busy || !ready} onClick={swap} className={buttonClass("primary", "px-4")}>
            {ready ? `SWAP – ${reads.data ? pips(reads.data[3]) : ""} FEE` : "ENTER AN AMOUNT"}
          </button>
        )}
      </div>
      <TxStatus state={tx.state} />
      {tx.state.status === "done" && tx.state.label === "SWAP" && PLAINFEE.poolId && (
        <div className="border-t border-border px-6 py-4">
          <Link href={`/check?pool=${PLAINFEE.poolId}`} className={buttonClass("outline")}>
            CHECK THE FEE YOU JUST PAID →
          </Link>
        </div>
      )}
    </div>
  );
}

/** The same trade quoted on the main $WIF pool, so the difference is visible before you swap. */
function Compare({
  poolKey,
  zeroForOne,
  wei,
  account,
  inSym,
  outSym,
}: {
  poolKey?: PoolKey;
  zeroForOne: boolean;
  wei?: bigint;
  account?: Address;
  inSym: string;
  outSym: string;
}) {
  const here = useQuote(poolKey, zeroForOne, wei, account);
  const main = useQuote(MAIN_WIF_POOL_KEY, zeroForOne, wei, account);
  const diff = here.data !== undefined && main.data !== undefined && main.data > 0n ? Number(((here.data - main.data) * 10_000n) / main.data) / 100 : undefined;

  return (
    <div className="flex flex-col gap-4">
      <Label>SAME TRADE, TWO POOLS</Label>
      <Card className="grid grid-cols-2 divide-x divide-border">
        <div className="flex flex-col gap-2 p-4">
          <Label>PLAINFEE POOL</Label>
          <span className="figure text-2xl">{wei ? (here.data !== undefined ? fmt(here.data, outSym === "ETH" ? 8 : 2) : here.isFetching ? "…" : "—") : "—"}</span>
          <span className="mono-xs text-subtle">{outSym} · FEE SHOWN IN THE POOL</span>
        </div>
        <div className="flex flex-col gap-2 p-4">
          <Label>MAIN $WIF POOL</Label>
          <span className="figure text-2xl">{wei ? (main.data !== undefined ? fmt(main.data, outSym === "ETH" ? 8 : 2) : main.isFetching ? "…" : "—") : "—"}</span>
          <span className="mono-xs text-subtle">{outSym} · SHOWS 0%, TAKES 1%</span>
        </div>
      </Card>
      {diff !== undefined && (
        <StatusDot tone={diff >= 0 ? "success" : "warning"}>
          {diff >= 0 ? `${diff.toFixed(2)}% MORE ${outSym} HERE` : `${Math.abs(diff).toFixed(2)}% LESS ${outSym} HERE`}
        </StatusDot>
      )}
      <p className="text-sm text-subtle">
        Both numbers are live quotes from the Uniswap v4 Quoter for the {inSym} amount you typed. A small pool moves its
        price more on a big trade, so the gap can go either way. The difference is that here, the fee is the one the pool
        shows.
      </p>
    </div>
  );
}

function Row({ k, v, note, strong }: { k: string; v: string; note?: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-3 py-2">
      <dt className="mono-xs text-subtle">
        {k}
        {note && <span className="block normal-case tracking-normal text-subtle">{note}</span>}
      </dt>
      <dd className={cx("figure text-right", strong && "text-lg")}>{v}</dd>
    </div>
  );
}

/** Quoter call as the trader, so the hook prices it with the trader's own tier (the hook reads tx.origin). */
function useQuote(key: PoolKey | undefined, zeroForOne: boolean, amount: bigint | undefined, account: Address | undefined) {
  const client = usePublicClient();
  return useQuery({
    queryKey: ["quote", key?.hooks, zeroForOne, amount?.toString(), account],
    enabled: Boolean(client && key && amount && amount > 0n),
    staleTime: 10_000,
    retry: false,
    queryFn: async () => {
      const { result } = await client!.simulateContract({
        address: ADDRESSES.quoter,
        abi: quoterAbi,
        functionName: "quoteExactInputSingle",
        args: [{ poolKey: key!, zeroForOne, exactAmount: amount!, hookData: "0x" }],
        account,
      });
      return result[0];
    },
  });
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function parse(v: string) {
  if (!v) return undefined;
  try {
    return parseUnits(v, 18);
  } catch {
    return undefined;
  }
}
