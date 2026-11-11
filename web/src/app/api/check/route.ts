import { type NextRequest } from "next/server";
import { createPublicClient, http, isAddress, type PublicClient } from "viem";
import { robinhood } from "viem/chains";
import { checkPool, isPoolId } from "@/lib/pool-check";

/**
 * Runs the cost check on the server: the browser makes one request instead of a burst of RPC calls
 * (the public RPC throttles bursts from browsers), and the CDN caches each answer for 30 seconds.
 */
const client = createPublicClient({
  chain: robinhood,
  transport: http(process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || undefined, {
    timeout: 15_000,
    retryCount: 2,
  }),
}) as PublicClient;

export async function GET(request: NextRequest) {
  const pool = request.nextUrl.searchParams.get("pool") ?? "";
  const trader = request.nextUrl.searchParams.get("trader") ?? "";
  if (!isPoolId(pool)) {
    return Response.json({ error: "A pool ID is 0x followed by 64 hex characters." }, { status: 400 });
  }
  try {
    const result = await checkPool(client, pool, isAddress(trader) ? trader : undefined);
    return Response.json(result, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message.split("\n")[0] : "The chain could not be read.";
    const missing = message.startsWith("No Uniswap v4 pool") || message.includes("no liquidity");
    return Response.json({ error: message }, { status: missing ? 404 : 502 });
  }
}
