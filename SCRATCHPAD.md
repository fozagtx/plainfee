# SCRATCHPAD.md

Working notes. Anything here can be wrong. Move proven facts to MEMORY.md and delete stale notes.

## Questions to settle before the code depends on them

- [ ] **WIF price.** Needed to set the tier thresholds (10k / 100k / 1M WIF are placeholders for the shape). Check Dexscreener pool `0x71ef4106…8c79` and pick thresholds that are roughly $5, $50 and $500 of WIF.
- [ ] **Seed size.** How much ETH and WIF does the owner want to put in the ETH/WIF Plainfee pool? Even about $50 is enough for real swaps in the demo. Principal stays withdrawable.
- [ ] **Initial price.** Read `sqrtPriceX96` from the main existing WIF pool and initialize ours at the same price, so there's no instant arbitrage loss.
- [ ] **Cost-checker target.** We need a real pool on the largest toll-booth hook to show `0.00% → ~2%` in the demo. Find it on Blockscout: a PoolManager `Initialize` with `hooks` ending in `…cc`, the toll-booth permission byte from the Bitquery report. Then confirm with the Quoter.
- [ ] **Blockscout logs API.** Check the rate limits and whether `getLogs` by `topic1` (poolId) works across all blocks. If not, index Initialize events in a small JSON at build time.

## Hook address bits (v4-core Hooks.sol)

- The low 14 bits of the hook address are the permission flags.
- We want `AFTER_INITIALIZE` (1 << 12), `BEFORE_ADD_LIQUIDITY` (1 << 11) and `BEFORE_SWAP` (1 << 7).
- Mined in `Deploy.s.sol` (no separate MineHook script). Mine the salt with HookMiner against the CREATE2 deployer `0x4e59b44847b379578588920cA78FbF26c0B4956C`.
- Verified 2026-11-11 against `lib/v4-periphery/lib/v4-core/src/libraries/Hooks.sol`. The bits that must stay **off** are `BEFORE_SWAP_RETURNS_DELTA` (1 << 3) and `AFTER_SWAP_RETURNS_DELTA` (1 << 2).

## Harvest math notes

- `modifyLiquidity` returns `(callerDelta, feesAccrued)`. Principal = callerDelta − feesAccrued.
- A zero-liquidity `modifyLiquidity` (liquidityDelta = 0) pokes the position and returns only the fees.
- To burn the ETH side, swap ETH→WIF in our own pool inside the same unlock, then `WIF.burn(balance)`. That swap pays our fee to the vault, and it gets burned on the next harvest.

## Demo script beats (draft, 2 min)

1. 0:00. The Bitquery quote: "shows 0%, takes 2%".
2. 0:15. Paste that pool into CHECK A POOL. The FeeReadout shows the lime marker on 2.00%.
3. 0:35. Paste the Plainfee pool. It shows MATCHES, and the permission table has the return-delta rows off.
4. 0:50. Lock WIF, and the tier drops to 0.25%. Swap, and the Swap event on Blockscout shows `fee = 2500`.
5. 1:20. Harvest. The burn tx and `/burns` total tick up.
6. 1:40. Flywheel diagram, repo, SECURITY.md.

## Notes from the contracts session

- `forge script` fails with "Chain 4663 not supported" if foundry.toml has an `[etherscan]` entry with `chain = 4663`. Verification flags now live in the Makefile `deploy` target.
- A dry-run hook address, `0x…5880`, ends in bits `0x1880` = afterInitialize | beforeAddLiquidity | beforeSwap. Matches.
- Harvest's own ETH→WIF swap pays the harvester's tier fee into the vault position. That fee burns on the next harvest.

## WIF price check (2026-11-11, Dexscreener API)

- Main pool `0x71ef…8c79` (v4 ETH/WIF, about $91k liquidity): 1 WIF = 0.0000005571 ETH = $0.001162. That implies ETH ≈ $2,086 and 1 ETH ≈ 1.795M WIF.
- At that price the current thresholds are 10k WIF ≈ $12, 100k ≈ $116, 1M ≈ $1,162.
- A $50 seed is about 0.012 ETH plus about 21.5k WIF.

## $3 demo budget (decided 2026-11-11, owner)

- Wallet needs about **0.0007 ETH + 1,500 WIF** (≈ $3 total).
  - Seed: about 0.0004 ETH + about 650 WIF (≈ $1.50), withdrawable.
  - Lock 500 WIF (≈ $0.58) to reach the 0.25% tier; it comes back after the cooldown.
  - Swaps of about $0.05 each; harvest burns the fees.
  - Gas: about 0.0003 ETH (the deploy simulated at about 0.0002 ETH).
