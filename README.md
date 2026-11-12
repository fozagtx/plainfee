# Plainfee

**The fee you see is the fee you pay.**

Plainfee is a Uniswap v4 hook on Robinhood Chain. It puts its fee in the pool's own fee field, cuts that fee for wallets that lock $WIF, and burns $WIF with every fee the pool earns.

`World Is Flat hackathon` · `hooks and defi` · `MIT`

## Why

Bitquery's census of Uniswap v4 hooks on Robinhood Chain (Oct 2026) found that most hooked trading runs through one contract. It shows a 0% fee and takes about 2% of every dollar after the swap, in a way the pool's records never show. Plainfee is built to be checkable instead:

- **Shown fee = paid fee.** The fee is returned from `beforeSwap` as a dynamic-fee override, so it lands in the `fee` field of every `Swap` event. The hook's address has no return-delta permissions, and anyone can verify that from the address bits.
- **A reason to hold $WIF.** Locked WIF lowers your fee, from 0.30% down to 0.15%.
- **A flywheel.** Every fee goes to a vault that buys and burns $WIF. More trading means less WIF in supply, which makes the discount worth more.

There's also a free **cost checker**: paste any v4 pool on the chain and see its shown fee next to what a swap really pays.

## Repo

| Path | What |
|---|---|
| `contracts/` | Foundry: hook, WIF lock, burn vault, fork tests against mainnet |
| `web/` | Next.js app: checker, swap, lock, burns |
| `DESIGN.md` | Design system |

## Run it

```bash
git clone --recursive https://github.com/fozagtx/plainfee && cd plainfee
cp contracts/.env.example contracts/.env
cp web/.env.example web/.env.local
make install
make build && make test-fork
make web-dev
```

Requirements: Foundry ≥ 1.5, Node ≥ 24, pnpm 10.

## Status

Live site: https://plainfee.vercel.app

In active development for the World Is Flat hackathon. Contract addresses, a demo and real transactions will be listed here when deployed.
