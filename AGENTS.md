# AGENTS.md

Instructions for any coding agent working in this repo. Read this file, then `HANDOFF.md`, before touching code.

## What this is

**Plainfee** is a Uniswap v4 hook on Robinhood Chain (chain 4663). Its fee sits in the pool's own fee field, so what you see is what you pay. Locking $WIF lowers the fee, and every fee the pool earns burns $WIF.

It is the entry for the **World Is Flat hackathon** (one prize, 10,000 USDG).

- **Submissions close 2026-11-12 17:30 UTC.** After that, edits lock.
- The app must stay live until **2026-11-16 17:30 UTC**.
- Rules: https://worldisflat.fun/build/rules

The spec is `docs/ARCHITECTURE.md`. The visual language is `DESIGN.md`.

## Session files (keep them current)

| File | Purpose | Update when |
|---|---|---|
| `HANDOFF.md` | Where things stand, what's next, blockers. The next agent starts here. | End of every session, and before any long-running step |
| `MEMORY.md` | Durable decisions and facts, with the reason for each | A decision is made or a fact is verified |
| `SCRATCHPAD.md` | Working notes, half-formed ideas, command output worth keeping | Freely. Prune when a note graduates to MEMORY or is wrong |
| `docs/ARCHITECTURE.md` | The spec. Mark changes **Decided** or **Open** | A contract interface or flow changes |
| `DESIGN.md` | Tokens and component specs | Before changing `web/src/app/globals.css` |

## Layout

```
contracts/          Foundry. solc 0.8.26, cancun, via-ir
  src/              Addresses.sol, then PlainfeeHook, WifLock, BurnVault
  test/             unit + fuzz;  test/fork/ hits mainnet
  script/           deploy + hook-salt mining
  deployments/      4663.json written by the deploy script (committed)
  lib/              submodules: v4-periphery (v4-core, permit2), uniswap-hooks v1.2.1, forge-std
web/                Next.js 16, React 19, Tailwind v4, wagmi 3, viem 2
  src/app/          routes;  globals.css = design tokens
  src/components/   ui.tsx primitives, header, providers
  src/lib/          addresses, wagmi config
docs/               ARCHITECTURE.md
```

## Commands

```bash
make install     # submodules + web deps
make build       # forge build
make test        # unit + fuzz, no network
make test-fork   # fork tests vs mainnet (reads contracts/.env)
make web-dev     # http://localhost:3000
make check       # what CI runs
```

## Ground rules

**Contracts**
- Import v4 types from `@uniswap/v4-core/src/...`. There is exactly one copy of v4-core: `lib/v4-periphery/lib/v4-core`. Base hooks come from `@openzeppelin/uniswap-hooks/`.
- No owner, no setters, no proxies. Every parameter is `immutable` or `constant`. If something seems to need an admin, write it up in ARCHITECTURE.md as **Open** and ask.
- Never request `afterSwapReturnDelta` or `beforeSwapReturnDelta`. The product's whole claim depends on those bits being off.
- Every external function gets a unit test. Every invariant in ARCHITECTURE.md gets a fuzz or invariant test. Every path touching real WIF gets a fork test.
- Known limits go in `SECURITY.md` in plain words, the way they are written in ARCHITECTURE.md.
- Addresses are checksummed. Run `cast to-check-sum-address` if unsure. Mainnet addresses live only in `src/Addresses.sol` and `web/src/lib/addresses.ts`, and the two must match.

**Deploying (mainnet only; there's no test deployment for the submission)**
- Ask the owner before any transaction that spends real funds: deploy, pool init, seeding liquidity, harvest.
- Use a keystore account (`cast wallet import plainfee`). Never put a raw key in a file that git can see.
- Verify on Blockscout right after deploy. Write addresses to `contracts/deployments/4663.json` and the web `.env.local`.

**Web**
- Follow `DESIGN.md`: radius 0, hairlines, no shadows, uppercase mono controls written in uppercase in the content, headings at weight 400/500.
- Never use `brand` for text. Use `brand-readable`. Never put white text on `highlight`, `warning` or `success`.
- Every number on screen comes from the chain and links to its proof. No sample or mock data outside `/system`.
- Use `buttonClass()` on links. Never nest a `<button>` in an `<a>`.
- Next 16 differs from older versions. Read `web/node_modules/next/dist/docs/` before using an API you're unsure of (see `web/AGENTS.md`).

**Git**
- Commits are authored by the repo owner only. No co-author trailers, and no assistant or tool names in commits, PRs, code comments or docs.
- Keep `main` deployable. Use short branches (`feat/hook`, `feat/checker`) and merge when green.

**Naming**
- Never use "Robinhood" or its logo in the product name, logo or handles (hackathon rule 11). Saying "on Robinhood Chain" in descriptions is fine.
