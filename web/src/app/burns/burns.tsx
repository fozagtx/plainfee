"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address, Hash } from "viem";
import { usePublicClient, useReadContracts } from "wagmi";
import { Card, Label, StatusDot, buttonClass } from "@/components/ui";
import { NotDeployed, Stat, TxStatus, WalletGate } from "@/components/wallet";
import { ADDRESSES } from "@/lib/addresses";
import { fmt, quoterAbi, short, vaultAbi, wifAbi, withSlippage } from "@/lib/plainfee";
import { addressUrl, txUrl, type PoolKey } from "@/lib/pool-check";
import { usePlainfee, useTx } from "@/lib/use-plainfee";

const MAX_RANGE = 10_000_000n; // public RPC cap per eth_getLogs
const FALLBACK_LOOKBACK = 5_000_000n; // about six days at 0.1s blocks
const DEPLOY_BLOCK = process.env.NEXT_PUBLIC_PLAINFEE_DEPLOY_BLOCK ? BigInt(process.env.NEXT_PUBLIC_PLAINFEE_DEPLOY_BLOCK) : undefined;

export function Burns() {
  const pf = usePlainfee();
  if (!pf.deployed) return <NotDeployed what="The burn counter and every burn transaction appear here" />;
  if (!pf.vault || !pf.poolKey) return <Card className="p-6 text-sm text-subtle">Reading the vault…</Card>;
  return <Ledger vault={pf.vault} poolKey={pf.poolKey} />;
}

function Ledger({ vault, poolKey }: { vault: Address; poolKey: PoolKey }) {
  const reads = useReadContracts({
    allowFailure: false,
    query: { refetchInterval: 20_000 },
    contracts: [
      { address: vault, abi: vaultAbi, functionName: "totalBurned" },
      { address: vault, abi: vaultAbi, functionName: "accruedEth" },
      { address: vault, abi: vaultAbi, functionName: "accruedWif" },
      { address: ADDRESSES.wif, abi: wifAbi, functionName: "totalSupply" },
    ],
  });
  const [totalBurned, accruedEth, accruedWif, supply] = reads.data ?? [];

  return (
    <div className="flex flex-col gap-10">
      <Card className="grid grid-cols-2 divide-border md:grid-cols-4 md:divide-x">
        <Stat label="WIF BURNED BY PLAINFEE" value={fmt(totalBurned, 2)} note="vault.totalBurned()" className="border-b border-border md:border-b-0" />
        <Stat label="WIF SUPPLY NOW" value={fmt(supply, 0)} note="WIF.totalSupply()" className="border-b border-l border-border md:border-b-0 md:border-l-0" />
        <Stat label="ETH FEES WAITING" value={fmt(accruedEth, 8)} note="Collected, not yet burned" />
        <Stat label="WIF FEES WAITING" value={fmt(accruedWif, 2)} note="Collected, not yet burned" className="border-l border-border md:border-l-0" />
      </Card>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[1fr_minmax(0,520px)] lg:gap-16">
        <History vault={vault} />
        <Card className="flex flex-col self-start">
          <div className="border-b border-border px-6 py-4">
            <Label>BURN NOW</Label>
          </div>
          <p className="px-6 pt-6 text-sm text-subtle">
            Harvest collects the pool&apos;s new fees, swaps the ETH part for WIF in this same pool and burns all of it.
            Anyone can call it, and nobody earns anything from it except lower supply. Fees that arrived since the last
            harvest aren&apos;t in the numbers above until someone calls it.
          </p>
          <WalletGate reason="Connect a wallet to call harvest. You pay only the gas.">
            {() => <Harvest vault={vault} poolKey={poolKey} accruedEth={accruedEth} />}
          </WalletGate>
        </Card>
      </div>
    </div>
  );
}

function Harvest({ vault, poolKey, accruedEth }: { vault: Address; poolKey: PoolKey; accruedEth?: bigint }) {
  const client = usePublicClient();
  const tx = useTx();

  const harvest = async () => {
    // minWifOut bounds the vault's own ETH->WIF swap against sandwiching. It covers the ETH already collected;
    // newly poked fees only add to the output, so the bound stays safe.
    let minWifOut = 0n;
    if (accruedEth && accruedEth > 0n) {
      const { result } = await client!.simulateContract({
        address: ADDRESSES.quoter,
        abi: quoterAbi,
        functionName: "quoteExactInputSingle",
        args: [{ poolKey, zeroForOne: true, exactAmount: accruedEth, hookData: "0x" }],
      });
      minWifOut = withSlippage(result[0]);
    }
    await tx.run("HARVEST", { address: vault, abi: vaultAbi, functionName: "harvest", args: [minWifOut] });
  };

  return (
    <div className="flex flex-col">
      <div className="p-6">
        <button type="button" disabled={tx.busy} onClick={harvest} className={buttonClass("primary", "px-4")}>
          HARVEST AND BURN
        </button>
      </div>
      <TxStatus state={tx.state} />
    </div>
  );
}

type Burn = { hash: Hash; block: bigint; wif: bigint; eth: bigint; caller: Address };

/** Every Burned event the vault has emitted, newest first. */
function History({ vault }: { vault: Address }) {
  const client = usePublicClient();
  const burns = useQuery({
    queryKey: ["burns", vault],
    enabled: Boolean(client),
    refetchInterval: 30_000,
    queryFn: async (): Promise<Burn[]> => {
      const head = await client!.getBlockNumber();
      let from = DEPLOY_BLOCK ?? (head > FALLBACK_LOOKBACK ? head - FALLBACK_LOOKBACK : 0n);
      const out: Burn[] = [];
      while (from <= head) {
        const to = from + MAX_RANGE - 1n < head ? from + MAX_RANGE - 1n : head;
        const logs = await client!.getContractEvents({ address: vault, abi: vaultAbi, eventName: "Burned", fromBlock: from, toBlock: to });
        for (const l of logs) {
          out.push({ hash: l.transactionHash, block: l.blockNumber, wif: l.args.wifAmount!, eth: l.args.ethIn!, caller: l.args.caller! });
        }
        from = to + 1n;
      }
      return out.reverse();
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <Label>EVERY BURN, FROM THE CHAIN</Label>
      <div className="border border-border bg-card">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-4 border-b border-border px-4 py-3">
          <span className="mono-xs text-subtle">WIF BURNED</span>
          <span className="mono-xs text-subtle">FROM ETH FEES</span>
          <span className="mono-xs text-right text-subtle">TRANSACTION</span>
        </div>
        {burns.data?.map((b) => (
          <div key={b.hash} className="grid grid-cols-[1fr_1fr_auto] items-center gap-4 border-b border-border px-4 py-3 last:border-b-0">
            <span className="figure">{fmt(b.wif, 2)}</span>
            <span className="figure text-subtle">{fmt(b.eth, 8)} ETH</span>
            <span className="flex flex-col items-end gap-0.5 font-mono text-xs">
              <a href={txUrl(b.hash)} target="_blank" rel="noreferrer" className="text-brand-readable underline">
                {short(b.hash)}
              </a>
              <a href={addressUrl(b.caller)} target="_blank" rel="noreferrer" className="text-subtle hover:underline">
                by {short(b.caller)}
              </a>
            </span>
          </div>
        ))}
        {burns.data?.length === 0 && <p className="px-4 py-3 text-sm text-subtle">No burns yet. The first harvest will appear here.</p>}
        {burns.isLoading && <p className="px-4 py-3 text-sm text-subtle">Reading the vault&apos;s Burned events…</p>}
        {burns.error && (
          <div className="px-4 py-3">
            <StatusDot tone="destructive">THE CHAIN COULD NOT BE READ</StatusDot>
          </div>
        )}
      </div>
    </div>
  );
}
