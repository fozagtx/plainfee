# HANDOFF.md

**Last updated:** 2026-11-11 16:10 UTC
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

Not started:

- Contracts: PlainfeeHook, WifLock, BurnVault, deploy and salt-mining scripts.
- Web routes: `/check`, `/swap`, `/lock`, `/burns`. The header links to them, so they 404 until built.
- SECURITY.md, the README sections for the submission, the demo video, the deploy and the Vercel project.

## Next steps, in order

1. **Contracts (branch `feat/contracts`):**
   - WifLock and its tests, then PlainfeeHook and its tests (tier boundaries, fee ≤ base, vault-only liquidity, flash-lock blocked).
   - Then BurnVault and its tests (principal and fees separated, harvest burns).
   - Then a fork test of the full path on mainnet: init pool → deposit → swap → harvest → supply down.
2. **Scripts:** `script/MineHook.s.sol` (HookMiner salt) and `script/Deploy.s.sol` (WifLock → hook at the mined salt → BurnVault → initialize ETH/WIF at the market price). Each writes `deployments/4663.json`.
3. **Owner checkpoint:** confirm seed size and tier thresholds (see SCRATCHPAD), then deploy to mainnet, verify on Blockscout, seed, and make the first swap, lock and harvest.
4. **Web, in order:** `/check` (the demo centrepiece), `/swap`, `/lock`, `/burns`. Then the Vercel deploy.
5. **Submission:** SECURITY.md, README, 2-minute video (beats in SCRATCHPAD), the form at worldisflat.fun/build. Post an update in the project dispatches.

## Blockers / needs from the owner

- Real ETH and WIF on Robinhood Chain for the deploy, the seed and the demo transactions.
- A decision on the tier thresholds once the WIF price is known.
- Optional: an Alchemy or QuickNode RPC key (the public RPC is rate-limited).
