import { type Hex, parseAbiItem } from "viem";
import { ADDRESSES, MAIN_WIF_POOL_ID, PLAINFEE } from "./addresses";
import { TOLERANCE_BPS, checkPool, type PoolCheck } from "./pool-check";
import { serverClient } from "./server-client";

const SWAP = parseAbiItem(
  "event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)",
);

/** About five minutes of blocks. Busier windows exceed the RPC's 10,000-log cap. */
const SCAN_BLOCKS = 3_000n;
const TOP_POOLS = 12;
const CONCURRENCY = 2;
const TTL_MS = 5 * 60_000;

export type ProofRow = PoolCheck & {
  gapBps: number;
  /** A return-delta bit is set, so the hook can take tokens outside the fee field. */
  canTakeOutsideFee: boolean;
  /** The return-delta permissions that are on: where a gap can be taken. */
  takenIn: string[];
  swapsInWindow: number;
  plainfee: boolean;
};

export type ProofTable = {
  block: string;
  scannedFrom: string;
  measuredAt: number;
  rows: ProofRow[];
  failed: number;
};

let cache: { at: number; value: ProofTable } | undefined;
let inflight: Promise<ProofTable> | undefined;

/** The busiest v4 pools right now, plus the main $WIF pool and Plainfee's own, each measured. Cached 5 minutes. */
export function getProofTable(): Promise<ProofTable> {
  if (cache && Date.now() - cache.at < TTL_MS) return Promise.resolve(cache.value);
  inflight ??= build()
    .then((value) => {
      cache = { at: Date.now(), value };
      return value;
    })
    .finally(() => {
      inflight = undefined;
    });
  return cache ? Promise.resolve(cache.value) : inflight;
}

async function build(): Promise<ProofTable> {
  const latest = await serverClient.getBlockNumber();
  const from = latest - SCAN_BLOCKS;
  const logs = await serverClient.getLogs({ address: ADDRESSES.poolManager, event: SWAP, fromBlock: from, toBlock: latest });

  const counts = new Map<Hex, number>();
  for (const l of logs) counts.set(l.args.id!, (counts.get(l.args.id!) ?? 0) + 1);
  const busiest = [...counts].sort((a, b) => b[1] - a[1]).slice(0, TOP_POOLS).map(([id]) => id);

  const plainfeeId = PLAINFEE.poolId?.toLowerCase() as Hex | undefined;
  const ids = [...new Set([MAIN_WIF_POOL_ID, ...(plainfeeId ? [plainfeeId] : []), ...busiest].map((i) => i.toLowerCase() as Hex))];

  const rows: ProofRow[] = [];
  let failed = 0;
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = await Promise.allSettled(ids.slice(i, i + CONCURRENCY).map((id) => checkPool(serverClient, id)));
    batch.forEach((r) => {
      if (r.status !== "fulfilled") {
        failed++;
        return;
      }
      const c = r.value;
      const takenIn = c.permissions.filter((p) => p.on && p.movesValue).map((p) => p.name);
      rows.push({
        ...c,
        gapBps: Math.max(0, c.paidBps - c.shownBps),
        canTakeOutsideFee: takenIn.length > 0,
        takenIn,
        swapsInWindow: counts.get(c.poolId) ?? 0,
        plainfee: c.poolId === plainfeeId,
      });
    });
  }

  // Worst offender first: gaps a hook can take, by size, then everything else by gap.
  const rank = (r: ProofRow) => (r.canTakeOutsideFee && r.gapBps > TOLERANCE_BPS ? 1e6 + r.gapBps : r.gapBps);
  rows.sort((a, b) => rank(b) - rank(a));

  return { block: latest.toString(), scannedFrom: from.toString(), measuredAt: Date.now(), rows, failed };
}
