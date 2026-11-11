# HANDOFF.md

**Last updated:** 2026-11-11 (contracts session)
**Deadline:** submissions close **2026-11-12 17:30 UTC**, about 25h from this update.

## State

Done and verified:

- **Repo scaffolded:**
  - Foundry workspace with v4-periphery (v4-core, permit2), OpenZeppelin uniswap-hooks v1.2.1 and forge-std v1.17.0 as submodules.
  - Next 16 web app with wagmi, viem and React Query.
  - Makefile, CI workflow, MIT license.
- **Toolchain proven:** `forge build` passes. `make test-fork` passes 4/4 against mainnet: chain id, WIF metadata, `WIF.burn` lowers supply, and v4 contracts are deployed.
- **Web:**
  - Design tokens are in `web/src/app/globals.css`.
  - Primitives are in `web/src/components/ui.tsx`: Button, buttonClass, Tag, StatusDot, Card, Label, FeeReadout.
  - The floating header, `/` (the claim) and `/system` (specimen) exist.
  - `pnpm lint`, `tsc` and `pnpm build` all pass.
- **Docs:** `docs/ARCHITECTURE.md` (spec), `DESIGN.md`, `AGENTS.md`, `MEMORY.md`, `SCRATCHPAD.md`.

- **Contracts (branch `feat/contracts`):** `WifLock`, `PlainfeeHook` (deploys `BurnVault`), `BurnVault`.
  - `make test`: 30 unit and fuzz tests pass (tier boundaries, fee ≤ base, flash-lock blocked, tx.origin discount, vault-only liquidity, other pools rejected, principal vs fees, harvest burns, slippage).
  - `make test-fork`: 5 pass, including `FullPath` on live mainnet: real PoolManager, real WIF; Swap event shows 3000 then 1500 after a lock; harvest lowers real WIF supply; principal withdraws.
- **Scripts:** `script/Deploy.s.sol` mines the salt (HookMiner against the CREATE2 deployer), deploys everything, initializes the pool and writes `deployments/4663.json` on a real broadcast only. `script/Seed.s.sol` deposits liquidity. `make deploy-dry` simulates on mainnet: about 5.0M gas, about 0.0002 ETH.

Not started:

- Web routes: `/check`, `/swap`, `/lock`, `/burns`. The header links to them, so they 404 until built.
- SECURITY.md, the README sections for the submission, the demo video, the deploy and the Vercel project.

## Next steps, in order

1. **Owner checkpoint:** read `sqrtPriceX96` from the main WIF pool (SCRATCHPAD), confirm seed size and tier thresholds (see SCRATCHPAD), then deploy to mainnet, verify on Blockscout, seed, and make the first swap, lock and harvest.
2. **Web, in order:** `/check` (the demo centrepiece), `/swap`, `/lock`, `/burns`. Then the Vercel deploy.
   - Before the web work, merge `feat/contracts` into `main`.
3. **Submission:** SECURITY.md, README, 2-minute video (beats in SCRATCHPAD), the form at worldisflat.fun/build. Post an update in the project dispatches.

## Blockers / needs from the owner

- **GitHub:** public at https://github.com/fozagtx/plainfee (main and feat/contracts pushed).
- About 0.0007 ETH + 1,500 WIF on Robinhood Chain (the $3 plan in SCRATCHPAD), in a keystore account `plainfee`.
- Optional: an Alchemy or QuickNode RPC key (the public RPC is rate-limited).
