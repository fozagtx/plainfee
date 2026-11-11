# Everything left to do

Ordered by what wins the hackathon. Each item has a **done when**. Items marked 💰 spend the owner's real money: **ask first, every time**.

Judging criteria, verbatim: "a real reason to use $wif, a flywheel that holds up, and something that works and is built well."

---

## 1. ✅ DONE: fix the checker in the browser (server route `/api/check`)

See KNOWN-ISSUES #1 for symptoms and leads.
**Done when:** `/check?pool=0x71ef…8c79` shows SHOWN 0.00% / PAID 1.00% with the lime marker and the permissions table in a real browser, within about 5s.

## 2. 🟡 MOSTLY DONE 2026-11-11 23:10 UTC: design pass. Home redesigned (live proof hero, how-it-works, tiers, flywheel, verify, footer) and check page has an explainer card. Waiting for owner feedback.

The owner wants the reference system applied properly, in light theme ("white mood"), and the product to feel premium. Reference: `DESIGN.md`, plus the full paste in SESSION-LOG.

**Home `/`**
- Hero with a **live** result: fetch the main WIF pool with `checkPool` and show the FeeReadout (0.00% shown / 1.00% paid) beside "The fee you see is the fee you pay." Real data only.
- A "How it works" section: a 3-column hairline grid (visible fee → $WIF discount → burn), each with a mono label and a one-line explanation.
- A tier table: 0 / 500 / 2,500 / 10,000 WIF locked → 0.30 / 0.25 / 0.20 / 0.15%.
- A flywheel section: a radius-3xl showcase card (the only rounded surface allowed), with a simple line diagram in an inline SVG of line icons.
- Proof section: links to GitHub, contracts on Blockscout (once deployed) and the Bitquery report.
- Footer with hairline top border and mono links.

**Rules:** sections paced at `space-64`, headings ≤ 22ch, ledes at 65% opacity, `space-8` gaps, no shadows, no radius except that one card, transitions scoped to named properties at 150/300ms, and no redundant badges.

**`/check`**
- Fill the empty right side on desktop: put the form left and an explainer card right ("What we measure"), or move the results up into a 2-column layout.
- Make the result the hero of the page: a big FeeReadout, then the details grid.

**Done when:** screenshots at 1280px and 390px look composed and dense like the reference, and the owner approves.

## 3. 💰 Owner checkpoint, then the mainnet deploy (about $3 in total)

The owner has very little money. **Never propose more than the $3 plan.**
- **Wallet needs:** about 0.0007 ETH + 1,500 WIF on Robinhood Chain, imported with `cast wallet import plainfee`.
- **Tiers:** already set to 500 / 2,500 / 10,000 WIF (Deploy.s.sol defaults).
- **Initial price:** read `sqrtPriceX96` from the main WIF pool. `cast call 0xF3334192D15450CdD385c8B70e03f9A6bD9E673b "getSlot0(bytes32)(uint160,int24,uint24,uint24)" 0x71ef4106340f0a3b9c19ec994eef4fc44a1d2513f38faac39d7636b156548c79 --rpc-url https://rpc.mainnet.chain.robinhood.com`. The first value was about 1.0227e32 when checked.
- **Steps, each only after the owner says yes:**
  1. `make deploy-dry` with `SQRT_PRICE_X96=<value>`.
  2. `make deploy`. This writes `contracts/deployments/4663.json` and verifies on Blockscout.
  3. Seed about $1.50: `forge script script/Seed.s.sol` with `VAULT`, `LIQUIDITY`, `ETH_WEI ≈ 4e14`, `MAX_WIF ≈ 650e18`. Compute `LIQUIDITY` from the amounts (`L ≈ sqrt(eth_wei × wif_wei)` for a full range).
  4. Lock 500 WIF, wait 1 hour, make a $0.05 swap. The Swap event should show `fee = 2500`.
  5. `harvest(0)`. WIF supply goes down.
- Put the hook, vault and poolId into Vercel env vars (`NEXT_PUBLIC_PLAINFEE_HOOK`, `_VAULT`, `_POOL_ID`) and into `web/.env.local`, then redeploy.

**Done when:** all three contracts are verified on Blockscout, and there are real swap, lock and harvest transactions.

## 4. `/lock`, `/swap`, `/burns` pages ($0 to build)

- **`/lock`:** connect the wallet, show the position from `positionOf` (matured, pending and warm-up countdown), lock, request unlock, withdraw. Show the current fee tier via `hook.feeFor(address)`.
- **`/swap`:** ETH↔WIF on the Plainfee pool through the Universal Router (`0x204F…0498`, v4 swap command) or a minimal router. Show "YOU PAY 0.25% – SAME AS SHOWN", with a FeeReadout for the user's own tier.
- **`/burns`:** `vault.totalBurned()`, the `Burned` event list with Blockscout links, accrued fees waiting, and a HARVEST button (anyone can call it; `minWifOut` from the spot price with 1% tolerance).
- Switch each header link on in `web/src/components/header.tsx` (`live: true`) only when the page works.

**Done when:** each page works against the deployed contracts with the owner's wallet.

## 5. Submission (before 2026-11-12 17:30 UTC)

- `SECURITY.md` in plain words:
  - the discount follows `tx.origin`, so contract wallets pay the base fee;
  - harvest sandwich risk is bounded by `minWifOut`;
  - the code is unaudited;
  - there is no owner, so nothing can be paused;
  - the seed is tiny by design.
- README: live URL, contract addresses, how to verify the fee claim yourself, and a test summary.
- A 2-minute demo video following the beats in `SCRATCHPAD.md`. The strongest moment is checking the main $WIF pool (0% shown, 1% paid) and then the Plainfee pool (shown = paid).
- Submit the form at worldisflat.fun/build and post an update in the project dispatches.
- Merge `feat/checker` into `main`, deploy, and keep the site up until 2026-11-16.

## 6. Nice to have

- ✅ CI is green (pnpm version read from web/package.json; `pnpm typecheck` runs `next typegen` first).

- `vercel git connect` so pushes auto-deploy.
- A private RPC key (QuickNode or Alchemy) if the public RPC rate-limits the checker.
- A final security pass on BurnVault before real funds go in (the owner was offered this and hasn't answered).
