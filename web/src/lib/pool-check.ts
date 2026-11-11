import { type Address, type Hex, type PublicClient, erc20Abi, parseAbiItem, zeroAddress } from "viem";
import { ADDRESSES } from "./addresses";

/**
 * The cost checker. For any Uniswap v4 pool on Robinhood Chain it reports:
 *  - SHOWN FEE: the fee the pool writes into its own `Swap` events (the `fee` field), and
 *  - PAID FEE: what a swap really costs, measured by quoting a swap far too small to move the price
 *    and comparing the output with the spot price.
 * Any gap between the two is value a hook takes outside the fee field.
 */

const INITIALIZE = parseAbiItem(
  "event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks, uint160 sqrtPriceX96, int24 tick)",
);
const SWAP = parseAbiItem(
  "event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)",
);

const STATE_VIEW_ABI = [
  {
    type: "function",
    name: "getSlot0",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "protocolFee", type: "uint24" },
      { name: "lpFee", type: "uint24" },
    ],
  },
  {
    type: "function",
    name: "getLiquidity",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [{ name: "liquidity", type: "uint128" }],
  },
] as const;

const POOL_KEY = {
  name: "poolKey",
  type: "tuple",
  components: [
    { name: "currency0", type: "address" },
    { name: "currency1", type: "address" },
    { name: "fee", type: "uint24" },
    { name: "tickSpacing", type: "int24" },
    { name: "hooks", type: "address" },
  ],
} as const;

const QUOTER_ABI = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          POOL_KEY,
          { name: "zeroForOne", type: "bool" },
          { name: "exactAmount", type: "uint128" },
          { name: "hookData", type: "bytes" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

/** v4-core Hooks.sol, bit 13 down to bit 0 of the hook address. */
export const PERMISSIONS = [
  { bit: 13, name: "beforeInitialize", movesValue: false },
  { bit: 12, name: "afterInitialize", movesValue: false },
  { bit: 11, name: "beforeAddLiquidity", movesValue: false },
  { bit: 10, name: "afterAddLiquidity", movesValue: false },
  { bit: 9, name: "beforeRemoveLiquidity", movesValue: false },
  { bit: 8, name: "afterRemoveLiquidity", movesValue: false },
  { bit: 7, name: "beforeSwap", movesValue: false },
  { bit: 6, name: "afterSwap", movesValue: false },
  { bit: 5, name: "beforeDonate", movesValue: false },
  { bit: 4, name: "afterDonate", movesValue: false },
  { bit: 3, name: "beforeSwapReturnDelta", movesValue: true },
  { bit: 2, name: "afterSwapReturnDelta", movesValue: true },
  { bit: 1, name: "afterAddLiquidityReturnDelta", movesValue: true },
  { bit: 0, name: "afterRemoveLiquidityReturnDelta", movesValue: true },
] as const;

const DYNAMIC_FEE_FLAG = 0x800000;
const MAX_LOG_RANGE = 10_000_000n; // the public RPC's eth_getLogs block-range cap
const Q96 = 2n ** 96n;
/** Quote size as a fraction of the pool's virtual reserve: 1e-5, so price impact is about 0.001%. */
const PROBE_DIVISOR = 100_000n;
/** Gaps below this are rounding and price impact, not a hidden fee. 0.01%. */
export const TOLERANCE_BPS = 1;

export type PoolKey = {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
};

export type Direction = {
  label: string; // e.g. "ETH → WIF"
  paidBps: number;
};

export type PoolCheck = {
  poolId: Hex;
  key: PoolKey;
  symbols: [string, string];
  initTx: Hex;
  /** Fee written into the most recent Swap event, in pips. Null if the pool has never been swapped. */
  recordedFeePips: number | null;
  recordedSwapTx: Hex | null;
  /** What the pool advertises: the Swap-event fee if there is one, else the fee in the key or slot0. */
  shownBps: number;
  shownSource: "swap-event" | "pool-key" | "slot0";
  directions: Direction[];
  /** The worse of the two directions. */
  paidBps: number;
  permissions: { name: string; on: boolean; movesValue: boolean }[];
};

export const isPoolId = (v: string): v is Hex => /^0x[0-9a-fA-F]{64}$/.test(v.trim());

const pipsToBps = (pips: number) => pips / 100;

type InitLog = Awaited<ReturnType<typeof getInitLogs>>[number];
const getInitLogs = (client: PublicClient, poolId: Hex, fromBlock: bigint, toBlock: bigint) =>
  client.getLogs({ address: ADDRESSES.poolManager, event: INITIALIZE, args: { id: poolId }, fromBlock, toBlock });

/** A pool's key never changes, so it is looked up once per server instance. */
const initCache = new Map<Hex, InitLog>();
/** The public RPC throttles bursts, so the 10M-block windows are scanned a few at a time. */
const LOG_CONCURRENCY = 4;

async function findInitialize(client: PublicClient, poolId: Hex, latest: bigint) {
  const cached = initCache.get(poolId);
  if (cached) return cached;
  const ranges: Array<[bigint, bigint]> = [];
  for (let from = 0n; from <= latest; from += MAX_LOG_RANGE) {
    const to = from + MAX_LOG_RANGE - 1n > latest ? latest : from + MAX_LOG_RANGE - 1n;
    ranges.push([from, to]);
  }
  for (let i = 0; i < ranges.length; i += LOG_CONCURRENCY) {
    const batch = await Promise.all(
      ranges.slice(i, i + LOG_CONCURRENCY).map(([from, to]) => getInitLogs(client, poolId, from, to)),
    );
    const found = batch.flat()[0];
    if (found) {
      initCache.set(poolId, found);
      return found;
    }
  }
  return undefined;
}

/** Newest Swap event of the pool. Busy pools can exceed the 10k-log cap, so the window starts small,
 *  then walks back in growing windows to the pool's first block. */
async function findLatestSwap(client: PublicClient, poolId: Hex, latest: bigint, initBlock: bigint) {
  let to = latest;
  let span = 50_000n;
  while (to >= initBlock) {
    const from = to - span + 1n > initBlock ? to - span + 1n : initBlock;
    const logs = await client.getLogs({
      address: ADDRESSES.poolManager,
      event: SWAP,
      args: { id: poolId },
      fromBlock: from,
      toBlock: to,
    });
    if (logs.length) return logs[logs.length - 1];
    to = from - 1n;
    span = span * 10n > MAX_LOG_RANGE ? MAX_LOG_RANGE : span * 10n;
  }
  return undefined;
}

async function symbolOf(client: PublicClient, token: Address) {
  if (token === zeroAddress) return "ETH";
  try {
    return await client.readContract({ address: token, abi: erc20Abi, functionName: "symbol" });
  } catch {
    return `${token.slice(0, 6)}…`;
  }
}

/** Cost of a tiny exact-input swap, in bps, versus the spot price. */
async function measure(
  client: PublicClient,
  key: PoolKey,
  zeroForOne: boolean,
  sqrtPriceX96: bigint,
  liquidity: bigint,
  trader?: Address,
) {
  // Virtual reserves of a v4 position at the current price: x = L / sqrtP, y = L * sqrtP.
  const reserve = zeroForOne ? (liquidity * Q96) / sqrtPriceX96 : (liquidity * sqrtPriceX96) / Q96;
  const amountIn = reserve / PROBE_DIVISOR;
  if (amountIn === 0n) throw new Error("This pool has too little liquidity to measure.");

  const { result } = await client.simulateContract({
    address: ADDRESSES.quoter,
    abi: QUOTER_ABI,
    functionName: "quoteExactInputSingle",
    args: [{ poolKey: key, zeroForOne, exactAmount: amountIn, hookData: "0x" }],
    account: trader,
  });
  const [amountOut] = result;

  const sq = sqrtPriceX96 * sqrtPriceX96;
  const ideal = zeroForOne ? (amountIn * sq) / (Q96 * Q96) : (amountIn * Q96 * Q96) / sq;
  if (ideal === 0n) throw new Error("This pool's price is too extreme to measure.");
  const lossPpm = ((ideal - amountOut) * 1_000_000n) / ideal; // parts per million
  return Number(lossPpm) / 100; // ppm → bps
}

export async function checkPool(client: PublicClient, rawId: string, trader?: Address): Promise<PoolCheck> {
  const poolId = rawId.trim().toLowerCase() as Hex;
  const latest = await client.getBlockNumber();

  const init = await findInitialize(client, poolId, latest);
  if (!init) throw new Error("No Uniswap v4 pool with this ID exists on Robinhood Chain.");
  const a = init.args;
  const key: PoolKey = {
    currency0: a.currency0!,
    currency1: a.currency1!,
    fee: a.fee!,
    tickSpacing: a.tickSpacing!,
    hooks: a.hooks!,
  };

  const [[sqrtPriceX96, , protocolFee, lpFee], liquidity, swap, symbols] = await Promise.all([
    client.readContract({ address: ADDRESSES.stateView, abi: STATE_VIEW_ABI, functionName: "getSlot0", args: [poolId] }),
    client.readContract({ address: ADDRESSES.stateView, abi: STATE_VIEW_ABI, functionName: "getLiquidity", args: [poolId] }),
    findLatestSwap(client, poolId, latest, init.blockNumber),
    Promise.all([symbolOf(client, key.currency0), symbolOf(client, key.currency1)]),
  ]);
  if (liquidity === 0n) throw new Error("This pool has no liquidity in range, so there is nothing to measure.");

  const [s0, s1] = symbols as [string, string];
  const [p01, p10] = await Promise.all([
    measure(client, key, true, sqrtPriceX96, liquidity, trader),
    measure(client, key, false, sqrtPriceX96, liquidity, trader),
  ]);
  const directions: Direction[] = [
    { label: `${s0} → ${s1}`, paidBps: p01 },
    { label: `${s1} → ${s0}`, paidBps: p10 },
  ];

  const recordedFeePips = swap ? swap.args.fee! : null;
  const dynamic = (key.fee & DYNAMIC_FEE_FLAG) !== 0;
  let shownBps: number;
  let shownSource: PoolCheck["shownSource"];
  if (recordedFeePips !== null) {
    shownBps = pipsToBps(recordedFeePips);
    shownSource = "swap-event";
  } else if (!dynamic) {
    shownBps = pipsToBps(key.fee + protocolFee);
    shownSource = "pool-key";
  } else {
    shownBps = pipsToBps(lpFee + protocolFee);
    shownSource = "slot0";
  }

  const bits = BigInt(key.hooks) & 0x3fffn;
  return {
    poolId,
    key,
    symbols: [s0, s1],
    initTx: init.transactionHash,
    recordedFeePips,
    recordedSwapTx: swap?.transactionHash ?? null,
    shownBps,
    shownSource,
    directions,
    paidBps: Math.max(p01, p10),
    permissions: PERMISSIONS.map((p) => ({
      name: p.name,
      on: (bits & (1n << BigInt(p.bit))) !== 0n,
      movesValue: p.movesValue,
    })),
  };
}

export const EXPLORER = "https://robinhoodchain.blockscout.com";
export const txUrl = (hash: Hex) => `${EXPLORER}/tx/${hash}`;
export const addressUrl = (addr: Address) => `${EXPLORER}/address/${addr}`;
