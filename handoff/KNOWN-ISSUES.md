# Known issues

## 1. The checker hangs on "READING THE CHAIN…" in the browser (blocking)

**Symptom.** `http://localhost:3311/check?pool=0x71ef4106340f0a3b9c19ec994eef4fc44a1d2513f38faac39d7636b156548c79` (production build served with `pnpm start -p 3311`) never leaves the loading state. No console errors or warnings appear. The network panel shows about 16 `POST https://rpc.mainnet.chain.robinhood.com/` requests, all returning HTTP 200.

**What works.** The same `checkPool()` from `web/src/lib/pool-check.ts` runs fine from Node. It was run via `npx tsx` with a viem `createPublicClient({ chain: robinhood, transport: http() })` and returns in about 1.5s:

```
shownBps 0 (from the latest Swap event)   paidBps 100.09 (both directions)
permissions on: beforeInitialize, afterSwap, afterSwapReturnDelta
```

So the method and the RPC are fine. The problem is in the browser path.

**Not yet checked (start here):**
- Open each RPC response body. HTTP 200 can still carry a JSON-RPC `error` (rate limit, "query spans … blocks", "logs matched exceeds limit of 10000"). If viem's http transport retries, the query can look like it hangs.
- Browser limits: 12 parallel `eth_getLogs` calls (one per 10M-block window, see `findInitialize`) may trip the public RPC's per-IP rate limit. Fix: query windows newest-first, or one at a time, or cache the pool key.
- The client comes from wagmi's `usePublicClient()`. Check whether that transport has `batch` on (JSON-RPC batching could put several getLogs in one POST and fail as a whole) and what `retryCount`/timeout it uses. Try a dedicated `createPublicClient` in `pool-check` usage, as in the Node test.
- `useQuery` is `enabled: Boolean(active && client)`. Confirm `client` isn't undefined on first render and that `queryKey` changes when `address` loads.
- Fastest diagnosis: add a temporary `console.log` per step in `checkPool`, or run `checkPool` from `browser_evaluate`.

**RPC limits learned (public endpoint):**
- `eth_getLogs` block range ≤ 10,000,000 blocks (inclusive-count, so `to - from ≤ 9,999,999`).
- At most 10,000 logs per response. An unfiltered `Initialize` scan over 10M blocks exceeds this, so always filter by pool-id topic.
- Chain head was about 111.94M blocks. The main WIF pool was created in window 20M–30M (block `0x1be4ee8`).

## 2. The site looks bare against the design system (owner is upset)

The tokens are applied correctly: radius 0, hairlines, JetBrains Mono uppercase controls, Geist light headings, ground `#f6f6f6`, white cards. But the **pages are nearly empty**. The home page is one heading, a lede and two buttons. There's none of the composition the reference has: dense hairline grids, sections paced at `space-64`, a radius-3xl showcase/bento card, product-like mockups, a mono label system across every section.

The owner pasted the full reference again (it's in SESSION-LOG). See TODO "Design pass" for what the pages need. Keep **light theme only** ("white mood"). Every number must come from the chain (AGENTS.md: no mock data outside `/system`).

## 3. Vercel isn't connected to GitHub

Pushes don't deploy. Deploy with `cd web && vercel deploy --prod --yes`, or run `vercel git connect` once.

## 4. `tsconfig.tsbuildinfo` can hold stale errors

After changing `target` (now ES2020, needed for BigInt literals), `tsc` kept reporting ES2017 errors until `web/tsconfig.tsbuildinfo` was deleted.
