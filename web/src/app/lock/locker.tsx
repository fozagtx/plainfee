"use client";

import { useState } from "react";
import { formatUnits, maxUint256, parseUnits, type Address } from "viem";
import { useReadContracts } from "wagmi";
import { Card, Label, StatusDot, buttonClass, cx } from "@/components/ui";
import { AmountInput, NotDeployed, Stat, TxStatus, WalletGate } from "@/components/wallet";
import { ADDRESSES } from "@/lib/addresses";
import { fmt, hookAbi, pips, wifAbi, wifLockAbi, type Tier } from "@/lib/plainfee";
import { addressUrl } from "@/lib/pool-check";
import { useNow, usePlainfee, useTx } from "@/lib/use-plainfee";

export function Locker() {
  const pf = usePlainfee();
  if (!pf.deployed) return <NotDeployed what="Locking opens here" />;
  if (pf.error) return <ReadError />;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[1fr_minmax(0,520px)] lg:gap-16">
      <TierTable tiers={pf.tiers} hook={pf.hook} wifLock={pf.wifLock} />
      <Card className="flex flex-col">
        <div className="border-b border-border px-6 py-4">
          <Label>YOUR LOCK</Label>
        </div>
        <WalletGate reason="Connect the wallet you trade from. The discount follows the wallet that signs the swap.">
          {(account) =>
            pf.wifLock && pf.hook && pf.tiers ? (
              <Position account={account} hook={pf.hook} wifLock={pf.wifLock} tiers={pf.tiers} />
            ) : (
              <p className="p-6 text-sm text-subtle">Reading the chain…</p>
            )
          }
        </WalletGate>
      </Card>
    </div>
  );
}

function ReadError() {
  return (
    <Card className="p-6">
      <StatusDot tone="destructive">THE CHAIN COULD NOT BE READ</StatusDot>
      <p className="mt-2 text-sm text-subtle">Reload the page in a moment.</p>
    </Card>
  );
}

function TierTable({ tiers, hook, wifLock }: { tiers?: Tier[]; hook?: Address; wifLock?: Address }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="border border-border bg-card">
        <div className="grid grid-cols-2 border-b border-border px-4 py-3">
          <span className="mono-xs text-subtle">$WIF LOCKED</span>
          <span className="mono-xs text-right text-subtle">FEE PER SWAP</span>
        </div>
        {(tiers ?? []).map((t) => (
          <div key={t.fee} className="grid grid-cols-2 border-b border-border px-4 py-3 last:border-b-0">
            <span className="figure">≥ {fmt(t.threshold, 0)}</span>
            <span className="figure text-right">{pips(t.fee)}</span>
          </div>
        ))}
        {!tiers && <p className="px-4 py-3 text-sm text-subtle">Reading the tiers from the hook…</p>}
      </div>
      <ul className="flex flex-col gap-2 text-sm text-subtle">
        <li>New WIF starts counting one hour after you lock it, so WIF borrowed for one transaction never earns a discount.</li>
        <li>Unlocking takes three days and ends your discount the moment you ask.</li>
        <li>No one else can move your WIF. The contract has no owner.</li>
      </ul>
      <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
        {wifLock && (
          <a href={addressUrl(wifLock)} target="_blank" rel="noreferrer" className="text-brand-readable underline">
            WIFLOCK CONTRACT
          </a>
        )}
        {hook && (
          <a href={addressUrl(hook)} target="_blank" rel="noreferrer" className="text-brand-readable underline">
            HOOK CONTRACT
          </a>
        )}
      </div>
    </div>
  );
}

function Position({ account, hook, wifLock, tiers }: { account: Address; hook: Address; wifLock: Address; tiers: Tier[] }) {
  const [amount, setAmount] = useState("");
  const tx = useTx();
  const now = useNow();

  const reads = useReadContracts({
    allowFailure: false,
    query: { refetchInterval: 15_000 },
    contracts: [
      { address: ADDRESSES.wif, abi: wifAbi, functionName: "balanceOf", args: [account] },
      { address: ADDRESSES.wif, abi: wifAbi, functionName: "allowance", args: [account, wifLock] },
      { address: wifLock, abi: wifLockAbi, functionName: "positionOf", args: [account] },
      { address: wifLock, abi: wifLockAbi, functionName: "WARMUP" },
      { address: wifLock, abi: wifLockAbi, functionName: "COOLDOWN" },
      { address: hook, abi: hookAbi, functionName: "feeFor", args: [account] },
    ],
  });

  if (!reads.data) return <p className="p-6 text-sm text-subtle">{reads.error ? "The chain could not be read." : "Reading your lock…"}</p>;
  const [balance, allowance, [matured, pending, pendingSince, unlockRequestedAt], warmup, cooldown, fee] = reads.data;

  let wei: bigint | undefined;
  try {
    wei = amount ? parseUnits(amount, 18) : undefined;
  } catch {
    wei = undefined;
  }
  const invalid = amount !== "" && (wei === undefined || wei === 0n || wei > balance);
  const needsApproval = wei !== undefined && allowance < wei;
  const unlocking = unlockRequestedAt > 0n;
  const total = matured + pending;
  const countsAt = pendingSince + warmup;
  const withdrawAt = unlockRequestedAt + cooldown;
  const next = tiers.find((t) => t.threshold > matured);

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
        <Stat label="YOUR FEE NOW" value={pips(fee)} note={next ? `${fmt(next.threshold - matured, 0)} more counting WIF for ${pips(next.fee)}` : "Lowest tier"} />
        <Stat label="COUNTING" value={fmt(matured, 2)} note="WIF that sets your tier" />
      </div>
      <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
        <Stat
          label="WARMING UP"
          value={fmt(pending, 2)}
          note={pending > 0n ? `Counts from ${when(countsAt)}` : "Nothing waiting"}
        />
        <Stat label="IN YOUR WALLET" value={fmt(balance, 2)} note="WIF" />
      </div>

      {unlocking ? (
        <div className="flex flex-col gap-3 p-6">
          <StatusDot tone="warning">UNLOCKING {fmt(total, 2)} WIF</StatusDot>
          <p className="text-sm text-subtle">
            {now >= withdrawAt ? "The cooldown is over. Withdraw to get your WIF back." : `You can withdraw from ${when(withdrawAt)}.`}
          </p>
          <button
            type="button"
            disabled={tx.busy || now < withdrawAt}
            onClick={() => tx.run("WITHDRAW", { address: wifLock, abi: wifLockAbi, functionName: "withdraw" })}
            className={buttonClass("primary", "px-4")}
          >
            WITHDRAW {fmt(total, 2)} WIF
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-6">
          <AmountInput
            id="lock-amount"
            label="LOCK MORE"
            symbol="WIF"
            value={amount}
            onChange={setAmount}
            balance={fmt(balance, 2)}
            onMax={() => setAmount(formatUnits(balance, 18))}
            invalid={invalid}
          />
          {invalid && <p className="text-sm text-destructive">Enter an amount up to your balance.</p>}
          {needsApproval ? (
            <button
              type="button"
              disabled={tx.busy || invalid}
              onClick={() =>
                tx.run("APPROVE", { address: ADDRESSES.wif, abi: wifAbi, functionName: "approve", args: [wifLock, maxUint256] })
              }
              className={buttonClass("primary", "px-4")}
            >
              1/2 · ALLOW THE LOCK TO TAKE YOUR WIF
            </button>
          ) : (
            <button
              type="button"
              disabled={tx.busy || invalid || !wei}
              onClick={async () => {
                if (await tx.run("LOCK", { address: wifLock, abi: wifLockAbi, functionName: "lock", args: [wei!] })) setAmount("");
              }}
              className={buttonClass("primary", "px-4")}
            >
              {wei ? `LOCK ${amount} WIF` : "LOCK WIF"}
            </button>
          )}
          {total > 0n && (
            <button
              type="button"
              disabled={tx.busy}
              onClick={() => tx.run("REQUEST UNLOCK", { address: wifLock, abi: wifLockAbi, functionName: "requestUnlock" })}
              className={cx(buttonClass("ghost"), "self-start")}
            >
              UNLOCK ALL {fmt(total, 2)} WIF (3-DAY COOLDOWN, DISCOUNT ENDS NOW)
            </button>
          )}
        </div>
      )}
      <TxStatus state={tx.state} />
    </div>
  );
}

const when = (unix: bigint) =>
  new Date(Number(unix) * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
