"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BaseError, ContractFunctionRevertedError, type Abi, type Address, type Hash } from "viem";
import { usePublicClient, useReadContracts, useWriteContract } from "wagmi";
import { PLAINFEE } from "@/lib/addresses";
import { hookAbi, isAddress, vaultAbi, type Tier } from "@/lib/plainfee";
import type { PoolKey } from "@/lib/pool-check";

const HOOK = isAddress(PLAINFEE.hook) ? PLAINFEE.hook : undefined;

/**
 * Everything the pages need about the deployment, read from the hook itself.
 * Only the hook address is configured; the lock, the vault, the tiers and the pool key come from the chain.
 */
export function usePlainfee() {
  const hook = HOOK;
  const base = useReadContracts({
    allowFailure: false,
    query: { enabled: Boolean(hook), staleTime: Infinity },
    contracts: hook
      ? ([
          { address: hook, abi: hookAbi, functionName: "wifLock" },
          { address: hook, abi: hookAbi, functionName: "vault" },
          { address: hook, abi: hookAbi, functionName: "threshold1" },
          { address: hook, abi: hookAbi, functionName: "threshold2" },
          { address: hook, abi: hookAbi, functionName: "threshold3" },
          { address: hook, abi: hookAbi, functionName: "BASE_FEE" },
          { address: hook, abi: hookAbi, functionName: "FEE_TIER_1" },
          { address: hook, abi: hookAbi, functionName: "FEE_TIER_2" },
          { address: hook, abi: hookAbi, functionName: "FEE_TIER_3" },
        ] as const)
      : [],
  });

  const d = base.data as readonly [`0x${string}`, `0x${string}`, bigint, bigint, bigint, number, number, number, number] | undefined;
  const vault = d?.[1];

  const key = useReadContracts({
    allowFailure: false,
    query: { enabled: Boolean(vault), staleTime: Infinity },
    contracts: vault ? ([{ address: vault, abi: vaultAbi, functionName: "poolKey" }] as const) : [],
  });
  const poolKey = (key.data?.[0] as PoolKey | undefined) ?? undefined;

  const tiers: Tier[] | undefined = d
    ? [
        { threshold: 0n, fee: d[5] },
        { threshold: d[2], fee: d[6] },
        { threshold: d[3], fee: d[7] },
        { threshold: d[4], fee: d[8] },
      ]
    : undefined;

  return {
    deployed: Boolean(hook),
    hook,
    wifLock: d?.[0],
    vault,
    poolKey,
    tiers,
    error: base.error ?? key.error,
    ready: Boolean(d && poolKey),
  };
}

export type TxState =
  | { status: "idle" }
  | { status: "wallet"; label: string }
  | { status: "pending"; label: string; hash: Hash }
  | { status: "done"; label: string; hash: Hash }
  | { status: "error"; label: string; error: string; hash?: Hash };

/** Loose on purpose: each page passes a parseAbi ABI, and viem checks the encoding at call time. */
type WriteArgs = { address: Address; abi: Abi; functionName: string; args?: readonly unknown[]; value?: bigint };

/** Sends one transaction, waits for its receipt, then refreshes every chain read on the page. */
export function useTx() {
  const { writeContractAsync } = useWriteContract();
  const client = usePublicClient();
  const queryClient = useQueryClient();
  const [state, setState] = useState<TxState>({ status: "idle" });

  async function run(label: string, args: WriteArgs) {
    setState({ status: "wallet", label });
    let hash: Hash | undefined;
    try {
      hash = await writeContractAsync(args as Parameters<typeof writeContractAsync>[0]);
      setState({ status: "pending", label, hash });
      const receipt = await client!.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("The transaction reverted on chain.");
      setState({ status: "done", label, hash });
      await queryClient.invalidateQueries();
      return true;
    } catch (err) {
      setState({ status: "error", label, error: explain(err), hash });
      return false;
    }
  }

  const busy = state.status === "wallet" || state.status === "pending";
  return { state, run, busy, reset: () => setState({ status: "idle" }) };
}

/** A one-line reason a wallet or contract call failed, named after the contract's own error when there is one. */
export function explain(err: unknown): string {
  if (err instanceof BaseError) {
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError && revert.data?.errorName) {
      return REVERTS[revert.data.errorName] ?? `The contract refused: ${revert.data.errorName}.`;
    }
    if (err.walk((e) => (e as { name?: string }).name === "UserRejectedRequestError")) return "You cancelled it in your wallet.";
    return err.shortMessage;
  }
  return err instanceof Error ? err.message.split("\n")[0] : String(err);
}

const REVERTS: Record<string, string> = {
  ZeroAmount: "Enter an amount above zero.",
  UnlockPending: "You've already asked to unlock. Withdraw after the cooldown, then lock again.",
  NothingLocked: "You have no WIF locked.",
  NoUnlockRequested: "Ask to unlock first.",
  CooldownActive: "The three-day cooldown hasn't ended yet.",
  Slippage: "The price moved before the harvest went through. Try again.",
  V4TooLittleReceived: "The price moved past your limit. Try again.",
};

/** Unix seconds, refreshed every `everyMs`, so countdowns move without reading the clock during render. */
export function useNow(everyMs = 15_000) {
  const [now, setNow] = useState<bigint>(0n);
  useEffect(() => {
    const tick = () => setNow(BigInt(Math.floor(Date.now() / 1000)));
    tick();
    const t = setInterval(tick, everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}
