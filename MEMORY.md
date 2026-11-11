# MEMORY.md

Durable facts and decisions. Each entry gives the date, the fact or decision, and the reason. When something here turns out to be wrong, delete it rather than adding a contradiction.

## Hackathon

- **2026-11-11. Target:** World Is Flat hackathon. One winner gets 10,000 USDG; there is no second place.
  - Submissions close 2026-11-12 17:30 UTC. Round one closes 11-14 and the final closes 11-16, both 17:30 UTC.
  - Submit with a repo, a demo video and real transactions. The app must stay live until the final closes.
- **2026-11-11. Judging criteria, verbatim:** "a real reason to use $wif, a flywheel that holds up, and something that works and is built well."
  - Judges vote, and the community counts as one more judge (voting burns WIF).
  - Judges include a security expert, QuickNode devrel, the GetBlock CEO and an Ava Labs gaming BD lead.
- **2026-11-11. Why this idea:** 47 entries already cover stock savings (Equalship, Ajo), stock gifts (Santa), prediction and fantasy games (Fallpit, Flat Street, WIF League), stop-losses (Lastbell), bounties (Proof of Ship) and about 16 agent projects. "Hooks and defi" is the thinnest category.
- **2026-11-11. The hook:** Bitquery (26 Oct 2026) found that the chain's biggest v4 hook shows 0% and takes about 2% via `afterSwapReturnDelta`. Plainfee is built as the visible-fee opposite.

## Verified on chain (2026-11-11)

- **WIF** `0x5173b8eA6923c2d40267890D45C46a3480954773`: 18 decimals and no `owner()`. It has `burn(uint256)` and `burnFrom(address,uint256)`. Supply was about 999,995,890, so roughly 4.1k had been burned. The fork test proves `burn` lowers `totalSupply`.
- **Uniswap v4 on 4663:**
  - PoolManager `0x8366a39CC670B4001A1121B8F6A443A643e40951`
  - PositionManager `0x58daec3116aae6D93017bAAea7749052E8a04fA7`
  - StateView `0xF3334192D15450CdD385c8B70e03f9A6bD9E673b`
  - Quoter `0x8Dc178eFB8111BB0973Dd9d722ebeFF267c98F94`
  - Universal Router 2.1.2 `0x204FAca1764B154221e35c0d20aBb3c525710498`
  - Permit2 is canonical. The CREATE2 deployer `0x4e59…956C` exists.
- **Public RPC:** `https://rpc.mainnet.chain.robinhood.com` (rate-limited). Explorer: robinhoodchain.blockscout.com. viem ships `robinhood` in `viem/chains`.
- The v4 `Swap` event includes `uint24 fee`. That is the "pool's own fee field" a dynamic-fee override writes to. `DYNAMIC_FEE_FLAG = 0x800000` and `OVERRIDE_FEE_FLAG = 0x400000`.

## Toolchain decisions

- **2026-11-11. Hook base:** `BaseHook` is no longer in v4-periphery `main`. It now lives in OpenZeppelin `uniswap-hooks` (v1.2.1), which also provides `BaseOverrideFee`, the exact dynamic-fee pattern we need. `HookMiner` is in `lib/v4-periphery/test/shared/`.
- **2026-11-11. Single v4-core:** remap `@uniswap/v4-core/` to `lib/v4-periphery/lib/v4-core/`, so uniswap-hooks and periphery compile against the same types.
- **2026-11-11. Compiler:** solc 0.8.26, `evm_version = cancun` (v4 uses transient storage), via-ir, 1M optimizer runs.
- **2026-11-11. Web:** Next 16.4.6 (cacheComponents is on), Tailwind 4.3, wagmi 3.7 + viem 2.57, injected connector only. Light theme only.

## Design

- **2026-11-11.** The design system is adapted from the owner's measured composio.dev reference (square, hairline, uppercase mono controls, light headings), light theme. `brand-readable` was derived as `#003985` (10.1:1 on #f6f6f6). See DESIGN.md.
- **2026-11-11.** Owner preference: no redundant status badges (for example, no MAINNET badge when mainnet is the only network). The product should feel premium.
