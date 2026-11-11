# Session log, 2026-11-11

The history of the working session that produced this repo, in order. The raw transcript is in `handoff/session/` on the owner's machine only (git-ignored).

## The owner and how they work

- GitHub `fozagtx`. Every commit is authored by them only, with **no co-author trailers and no assistant or tool names** in commits, PRs, code comments or docs. This is an absolute rule.
- **Very low budget.** They pushed back hard on a $70 plan, then a $6 one: "you know we can go budget ways but still chose bigger, why?" Always lead with the cheapest version that works. The agreed plan is about $3.
- They want things done, not asked about. Short messages, often typed fast. "continue" means keep building.
- They want the product to look **premium** and to follow their design system exactly. No redundant badges.
- They want real, visible progress: a working UI and a live URL, not just contracts.
- Don't bring up their other, already-submitted hackathon project (Layby).
- Search and fetch: they prefer TinyFish tools.

## Timeline

1. **Pick the target.** The World Is Flat hackathon: one prize of 10,000 USDG, on Robinhood Chain (4663). It must use $WIF on chain and have a flywheel, a repo, a demo video and real transactions.
   - Gap analysis: "hooks and defi" was the thinnest category.
   - Bitquery found that the chain's biggest v4 hook shows 0% and takes about 2% through `afterSwapReturnDelta`.
   - **Idea chosen: Plainfee**, a hook whose fee sits in the pool's own fee field. Locked $WIF lowers the fee, and every fee burns $WIF.
2. **Scaffold.** The owner asked for the repo, AGENTS / MEMORY / SCRATCHPAD / HANDOFF files, a design-engineering plan, the dev environment, and their pasted design system (taken from composio.dev) "in white mood", tailored to the product.
   - Built: Foundry with v4 + OpenZeppelin uniswap-hooks, Next 16 + wagmi, design tokens, DESIGN.md, CI and a Makefile.
3. **Contracts** (owner: "continue building").
   - WifLock (1h warmup, 3-day cooldown), PlainfeeHook (BaseOverrideFee, tiers by `tx.origin`, vault-only liquidity, accepts only its own pool) and BurnVault (deployed by the hook; fees kept apart from principal; `harvest` swaps the ETH side to WIF and burns it).
   - 30 unit and fuzz tests plus a mainnet fork test, all passing. Deploy and Seed scripts; the dry run on mainnet succeeds.
4. **"is it commit to repo"**: it was local only. **"create"**: the public repo was created and pushed.
5. **"testnet or?"**: decided mainnet only. The rules require real transactions, WIF exists only on mainnet, and the fork tests already did the testnet's job.
6. **"whose money goes there?"**: nothing was spent. The vault has no owner; only depositors can withdraw their own principal; fees burn.
7. **Budget.** $70 → $6 → **$3** at the owner's insistence. Tiers lowered to 500 / 2,500 / 10,000 WIF. WIF was $0.001162 and ETH about $2,086 (Dexscreener, main pool).
8. **"have you built the frontend and deployed to vercel on a proper domain"**: no. Deployed the home page to https://plainfee.vercel.app, with header links hidden until each page works.
9. **"why is there no UI? Is this like an open-source hook?"**: explained the two parts (the hook, and the website people use). Started the checker.
   - **Finding:** the main $WIF pool (`0x71ef…8c79`, about $91k liquidity, hook `0xE5e7…e044`) records a 0% fee in its Swap events but charges **1.00%** per swap. Its hook has `afterSwapReturnDelta` on. Measured with a quote at 1e-5 of pool depth: price impact about 0.001%, so it's ruled out.
10. **Design complaint.** The owner re-pasted the full design reference and said the result is nowhere near it: "this is the design system I gave, now look at the [stuff] you gave me". **Accurate criticism:** the tokens are right, but the pages are bare. See TODO #2.
11. **The owner left** and asked for everything to be written into this handoff folder, with the context and chat history preserved.

## Design reference (owner's paste, key points)

Extracted from composio.dev:

- Four identity decisions:
  1. **Nothing is rounded.** The one exception is the showcase or bento card at radius-3xl.
  2. **Borders, never shadows.** Elevation comes from a hairline plus a step from the background to a white card.
  3. **Every control is in mono.** JetBrains Mono 14px, -0.011em tracking, and the labels are written uppercase in the text itself.
  4. **Headings are regular weight.** 400; only h2 is 500. Tracking -0.025em.
- Control copy is terse uppercase with an en dash, for example `GET STARTED – FREE`.
- Headings are capped at about 22 characters per line, the heading block at 520px, and they use text-balance. Ledes are foreground at 65% opacity.
- Colours:
  - The light ground is `#f6f6f6`, and cards are white.
  - Brand `#51a2ff` is for shapes only; `brand-readable` is for text.
  - Highlight `#d4ff4a` always takes dark ink.
- Spacing is a 4px base with 2px steps up to 12px. Buttons are 6px × 8px. `space-8` is the most common gap, and sections sit on a `space-64` beat.
- The layout is 1240px wide. The header floats 1rem from the top with a full border on desktop; on mobile it is flush with a bottom border.
- Motion: 150ms for micro-states and 300ms for chrome, scoped to named properties. Marquees run 32s or 40s linear.
- Icons are 24px line icons drawn in `currentColor`, inline SVG.
- Don't recreate the Composio logo; set the product name in Geist Sans.
- The owner said: "use the design system I pasted, but in **white mood**, and tailor it to what you are building."

## Verified on chain this session

- The main $WIF pool's key: ETH/WIF, fee 0, tickSpacing 200, hook `0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044`. Its permission bits are beforeInitialize, afterSwap and afterSwapReturnDelta. Created in tx `0x4e6a6990…c3b2`.
- Its real cost is 1.0009% in both directions (Quoter `0x8Dc1…8F94` against the StateView spot price).
- A dry-run Plainfee hook address ended in `…5880`, bits `0x1880` = afterInitialize | beforeAddLiquidity | beforeSwap.
