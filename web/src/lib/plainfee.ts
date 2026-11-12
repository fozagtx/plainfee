import { encodeAbiParameters, formatUnits, parseAbi, parseAbiParameters, type Address } from "viem";
import { ADDRESSES } from "@/lib/addresses";
import type { PoolKey } from "@/lib/pool-check";

/** The parts of each contract the web app reads and writes. Mirrors contracts/src. */
export const hookAbi = parseAbi([
  "function wifLock() view returns (address)",
  "function vault() view returns (address)",
  "function feeFor(address trader) view returns (uint24)",
  "function threshold1() view returns (uint256)",
  "function threshold2() view returns (uint256)",
  "function threshold3() view returns (uint256)",
  "function BASE_FEE() view returns (uint24)",
  "function FEE_TIER_1() view returns (uint24)",
  "function FEE_TIER_2() view returns (uint24)",
  "function FEE_TIER_3() view returns (uint24)",
]);

export const wifLockAbi = parseAbi([
  "function WARMUP() view returns (uint256)",
  "function COOLDOWN() view returns (uint256)",
  "function lock(uint256 amount)",
  "function requestUnlock()",
  "function withdraw()",
  "function weightOf(address account) view returns (uint256)",
  "function positionOf(address account) view returns (uint256 matured, uint256 pending, uint256 pendingSince, uint256 unlockRequestedAt)",
  "error ZeroAmount()",
  "error UnlockPending()",
  "error NothingLocked()",
  "error NoUnlockRequested()",
  "error CooldownActive(uint256 availableAt)",
]);

export const vaultAbi = parseAbi([
  "function poolKey() view returns ((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks))",
  "function poolId() view returns (bytes32)",
  "function totalBurned() view returns (uint256)",
  "function accruedEth() view returns (uint256)",
  "function accruedWif() view returns (uint256)",
  "function totalShares() view returns (uint256)",
  "function harvest(uint256 minWifOut) returns (uint256 burned)",
  "event Burned(uint256 wifAmount, uint256 ethIn, address indexed caller)",
  "error Slippage(uint256 wifOut, uint256 minWifOut)",
]);

export const wifAbi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function totalSupply() view returns (uint256)",
]);

export const permit2Abi = parseAbi([
  "function allowance(address user, address token, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)",
  "function approve(address token, address spender, uint160 amount, uint48 expiration)",
]);

export const routerAbi = parseAbi(["function execute(bytes commands, bytes[] inputs, uint256 deadline) payable"]);

export const quoterAbi = parseAbi([
  "function quoteExactInputSingle(((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) poolKey, bool zeroForOne, uint128 exactAmount, bytes hookData) params) returns (uint256 amountOut, uint256 gasEstimate)",
]);

/** The busiest $WIF pool, read from its Initialize event. Used to compare quotes. */
export const MAIN_WIF_POOL_KEY: PoolKey = {
  currency0: "0x0000000000000000000000000000000000000000",
  currency1: ADDRESSES.wif,
  fee: 0,
  tickSpacing: 200,
  hooks: "0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044",
};

const V4_SWAP = "0x10";
const SWAP_EXACT_IN_SINGLE = "06";
const SETTLE_ALL = "0c";
const TAKE_ALL = "0f";
const KEY = "(address,address,uint24,int24,address)";

/**
 * Calldata for one exact-input swap through the Universal Router.
 * The router on chain 4663 is the build with per-hop price checks, so the params carry minHopPriceX36 (0 = off).
 */
export function swapArgs(key: PoolKey, zeroForOne: boolean, amountIn: bigint, minOut: bigint, deadline: bigint) {
  const k = [key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks] as const;
  const [payIn, takeOut] = zeroForOne ? [key.currency0, key.currency1] : [key.currency1, key.currency0];
  const swap = encodeAbiParameters(parseAbiParameters(`(${KEY},bool,uint128,uint128,uint256,bytes)`), [
    [k, zeroForOne, amountIn, minOut, 0n, "0x"],
  ]);
  const settle = encodeAbiParameters(parseAbiParameters("address,uint256"), [payIn, amountIn]);
  const take = encodeAbiParameters(parseAbiParameters("address,uint256"), [takeOut, minOut]);
  const input = encodeAbiParameters(parseAbiParameters("bytes,bytes[]"), [
    `0x${SWAP_EXACT_IN_SINGLE}${SETTLE_ALL}${TAKE_ALL}`,
    [swap, settle, take],
  ]);
  return [V4_SWAP, [input], deadline] as const;
}

export const pips = (fee: number | bigint) => `${(Number(fee) / 10_000).toFixed(2)}%`;

/** Token amounts: grouped thousands, at most `dp` decimals, no trailing zeros. */
export function fmt(value: bigint | undefined, dp = 4, decimals = 18) {
  if (value === undefined) return "…";
  const [whole, frac = ""] = formatUnits(value, decimals).split(".");
  const grouped = BigInt(whole).toLocaleString("en-US");
  const cut = frac.slice(0, dp).replace(/0+$/, "");
  if (value > 0n && whole === "0" && !cut) return `< 0.${"0".repeat(dp - 1)}1`;
  return cut ? `${grouped}.${cut}` : grouped;
}

export const short = (v: string) => `${v.slice(0, 6)}…${v.slice(-4)}`;

export type Tier = { threshold: bigint; fee: number };

export const DEADLINE_SECONDS = 600n;
export const SLIPPAGE_BPS = 50n; // 0.5%
export const withSlippage = (amount: bigint) => (amount * (10_000n - SLIPPAGE_BPS)) / 10_000n;
export const isAddress = (v: string | undefined): v is Address => Boolean(v && /^0x[0-9a-fA-F]{40}$/.test(v));
