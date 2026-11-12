import { createPublicClient, http, type PublicClient } from "viem";
import { robinhood } from "viem/chains";

/** One chain client for every server route. The public RPC throttles bursts, so callers keep concurrency low. */
export const serverClient = createPublicClient({
  chain: robinhood,
  transport: http(process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || undefined, {
    timeout: 15_000,
    retryCount: 3,
    retryDelay: 400,
  }),
}) as PublicClient;
