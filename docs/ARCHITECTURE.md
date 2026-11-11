# Architecture

Plainfee is a Uniswap v4 hook on Robinhood Chain (chain 4663). It does three things:

1. It puts its fee in the pool's own fee field, so the `Swap` event, every DEX feed and every wallet show the fee the trader really pays.
2. It cuts that fee for wallets that have locked $WIF.
3. It burns $WIF with every fee the pool earns.

This document is the engineering spec. Decisions marked **Decided** are settled. Decisions marked **Open** need an answer before the code that depends on them.

## Why it exists

On 26 Oct 2026 Bitquery published a census of Uniswap v4 hooks on Robinhood Chain. Its findings:

- 74.5% of v4 trades run through a hook.
- One contract carries most of those trades.
- That contract shows a 0% fee, then takes 1% plus a per-pool cut (about 2% by value) using `afterSwapReturnDelta`. The pool's own records never show it.

Plainfee is built to be the opposite, and to prove it from the hook's address alone.

Source: https://bitquery.io/investigations/uniswap-v4-hooks-robinhood-chain

## System map

```
trader ──swap──▶ Universal Router ──▶ PoolManager ──beforeSwap──▶ PlainfeeHook
                                          │                          │ reads weight(tx.origin)
                                          │                          ▼
                                          │                       WifLock
                                          │
                                          └── LP fees accrue to the only LP ──▶ BurnVault
                                                                                  │ harvest()
                                                                                  ▼
                                                                    ETH side swapped to WIF
                                                                    WIF.burn(all)
```

## Contracts

### PlainfeeHook — `contracts/src/PlainfeeHook.sol`

It extends `BaseOverrideFee` from OpenZeppelin `uniswap-hooks` v1.2.1.

**Permissions (Decided).** These bits are encoded in the hook address, and the cost checker reads them:

| Flag | On | Why |
|---|---|---|
| `afterInitialize` | yes | Rejects any pool that isn't a dynamic-fee pool (done by BaseOverrideFee). |
| `beforeAddLiquidity` | yes | Only BurnVault may add liquidity, so every fee burns. |
| `beforeSwap` | yes | Returns this swap's fee with `OVERRIDE_FEE_FLAG`. |
| `beforeSwapReturnDelta` | **no** | No custom accounting before the swap. |
| `afterSwap` / `afterSwapReturnDelta` | **no** | No slice taken on the way out. This is the hidden-fee mechanism. |
| everything else | no | |

**Fee schedule (Decided structure, Open numbers).** Fees are in pips (1e-6), the unit v4 uses.

| Locked WIF (by `tx.origin`) | Fee | Pips |
|---|---|---|
| 0 | 0.30% | 3000 |
| ≥ 10,000 | 0.25% | 2500 |
| ≥ 100,000 | 0.20% | 2000 |
| ≥ 1,000,000 | 0.15% | 1500 |

- All values are `immutable`. There is no owner, no setter and no upgrade path.
- **Invariant:** for every swap, `fee <= BASE_FEE`, and discounts only ever lower it.
- **Open:** the tier thresholds are to be tuned to the WIF price at deploy time (Dexscreener pool `0x71ef…8c79`).

**Why `tx.origin` (Decided, documented in SECURITY.md).** In v4, `sender` is the router, not the trader. `hookData` can be spoofed: anyone could name a whale and take the whale's discount. `tx.origin` can't be spoofed by a third party. The cost is that smart-contract wallets and relayed transactions get the base fee. That is acceptable, because the worst case is paying the advertised fee, never more.

**Built-in restrictions (Decided, 2026-11-11).**
- PlainfeeHook deploys BurnVault in its own constructor. The vault's `hook` is simply `msg.sender`, so the two are linked with no owner and no circular address prediction.
- `afterInitialize` accepts only the vault's ETH/WIF key (dynamic fee, tick spacing 60). No other pool can use the hook, so every Plainfee pool burns WIF.
- The tier thresholds are constructor arguments (immutable), set from `TIER1_WIF`/`TIER2_WIF`/`TIER3_WIF` at deploy time.

### WifLock — `contracts/src/WifLock.sol`

- `lock(amount)` moves WIF in. `requestUnlock()` starts a cooldown. `withdraw()` returns the WIF after the cooldown ends.
- `weightOf(account)` counts only WIF that was locked at least `WARMUP` ago and has no pending unlock.
- **Decided:** `WARMUP = 1 hour` and `COOLDOWN = 3 days`. Together they block a flash-lock: borrow WIF, lock it, swap at the discount and unlock, all in one transaction.
- No owner. Locked WIF can only leave to its locker.
- **Decided:** a position is `matured` plus one `pending` bucket. Topping up resets the warmup of the pending bucket only; WIF that has already matured keeps counting. `requestUnlock` covers the whole position and drops its weight to 0 at once. You can't lock more while an unlock is pending.

### BurnVault — `contracts/src/BurnVault.sol`

- It is the **only** LP in Plainfee pools: one full-range position, which the vault holds directly through `PoolManager.unlock` rather than through the PositionManager.
- Anyone can `deposit` liquidity and `withdraw` their own principal, pro rata by shares.
- v4's `modifyLiquidity` returns `(callerDelta, feesAccrued)`. The vault separates principal from fees on **every** call (deposit, withdraw and harvest), so fees can never leave with principal.
- **Decided:** shares are liquidity units. Fees never compound into the position, so 1 share is always 1 unit of liquidity. Collected fees sit in `accruedEth` / `accruedWif` until `harvest`.
- `harvest(minWifOut)` can be called by anyone. It collects accrued fees, swaps the non-WIF side to WIF through the same pool, then calls `WIF.burn(balance)`. It emits `Burned(wifAmount, ethIn, caller)`.
- **Decided:** 100% of fees burn in v1. LPs earn nothing. We seed liquidity ourselves for the hackathon.
- **Open (v2):** an immutable split, for example 50% burn and 50% to LPs. It would make the flywheel self-sustaining past the seed.

**Sandwich risk on harvest.** Harvest swaps on chain, so the caller passes `minWifOut`. The keeper and the UI compute it from `sqrtPriceX96` with a fixed tolerance. This goes in SECURITY.md.

## Pools

- **Decided, v1:** native ETH / WIF, dynamic fee, tick spacing 60. ETH is `currency0` (`address(0)` sorts first).
- **Open (stretch):** a Stock Token / WIF pool for the Stock Tokens category. It is blocked on getting Stock Token addresses (the docs contracts page currently returns 404) and on the restricted-country rules.

## The flywheel

```
more swaps ─▶ more fees ─▶ more WIF bought and burned ─▶ discount tiers worth more ─▶ more WIF locked ─▶ lockers swap here ─┐
     ▲                                                                                                                  │
     └──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

This answers the judges' first question, "what is the real reason to use $WIF?": holding it lowers your trading cost, and trading destroys it.

## Web — `web/`

Next.js 16 (App Router, cache components), React 19, Tailwind v4, wagmi 3 + viem 2, injected connector. Light theme only. See [DESIGN.md](../DESIGN.md).

| Route | Purpose | Data |
|---|---|---|
| `/` | The claim, plus a link to the Bitquery report | static |
| `/check?pool=<id>` | **Cost checker** for any v4 pool on the chain | see below |
| `/swap` | ETH⇄WIF through the Plainfee pool, showing your tier fee before you sign | Quoter, WifLock |
| `/lock` | Lock, request unlock and withdraw WIF; shows your current tier | WifLock |
| `/burns` | Every `Burned` event, the total burned, and a link to each tx | vault logs |
| `/system` | Design system specimen | static |

**Cost checker method.**

1. Resolve the PoolKey from the pool's `Initialize` event (PoolManager log, `topic1 = poolId`) via the Blockscout logs API.
2. Decode the hook's permission bits from the low 14 bits of its address, and flag any `*ReturnDelta` permission.
3. **Shown fee** = the `fee` field of the pool's latest `Swap` event. For static pools, fall back to `StateView.getSlot0().lpFee`.
4. **Paid fee** = `1 − quotedOut / (amountIn × midPrice)`, using `Quoter.quoteExactInputSingle` with a small `amountIn` (so price impact is negligible) and `midPrice` from `sqrtPriceX96`. The quoter runs the whole swap, hooks included, so a hidden afterSwap cut shows up here.
5. Render `FeeReadout(shown, paid)`.

## Verification plan

| Layer | Tool | What it must prove |
|---|---|---|
| Unit | `forge test` | Fee never above base; tier boundaries; vault-only liquidity; fees can never leave with principal |
| Fuzz | Foundry fuzz, 512 runs (5,000 in CI) | Lock, unlock and swap sequences can't beat the warmup |
| Fork | `test/fork/*` against mainnet | Real WIF `burn`, real PoolManager, full harvest path |
| On chain | Blockscout | Verified source; real swap, lock and harvest transactions for the submission |
| Web | `pnpm lint`, `tsc`, Playwright smoke | Checker output for our pool and for the largest toll-booth pool |
