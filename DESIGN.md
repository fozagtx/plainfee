# Plainfee — Design DNA

> The fee you see is the fee you pay.

This document is the design system for Plainfee: the thesis, the tokens, the
components, and the page build. It is the single source of truth. If a design
decision isn't in here, it should be argued into here before it's built.

The tokens live in `web/src/app/globals.css`. Change a value here first, then in CSS.

---

## §0 — Thesis

Plainfee's product claim is *a number next to the number it claims to be*.
Every design decision follows from that one sentence.

The competing hook shows 0% and takes its cut after the swap. It almost certainly
looks **expensive** — gradients, glow, depth, motion. That is the register of
something with margin to hide. So Plainfee cannot win by looking more polished.
It wins by looking like a **measurement**: flat, undecorated, document-like,
with the raw data one click away.

The hackathon is called *World Is Flat*. Take it literally. No gradient, no
shadow, no bevel, no glow, no depth anywhere in the product. Flatness is the
argument, not a style.

**Three rules that override everything else:**

1. **Every claim sits next to its check.** A number without a way to verify it
   is a marketing number. If you write one, you must put the verification
   control within the same visual block — a link to the `Swap` event, the
   address bits, the TSV.
2. **Decoration implies margin.** Anything ornamental reads as "paid for by a
   fee you didn't see." Spend the budget on data density instead.
3. **The tool is the pitch.** The cost checker is not a feature section at the
   bottom of a landing page. It is the landing page's reason to exist.

---

## §1 — Voice

Declarative. Short. Verifiable. Closer to a lab report than a pitch deck.

| Write this | Not this |
|---|---|
| "0.30%, charged in `beforeSwap`." | "Industry-leading low fees." |
| "The hook address has no return-delta bits. Check it." | "Fully trustless and transparent." |
| "Locked WIF: 0.30% → 0.15%." | "Unlock incredible savings!" |
| "Every fee buys and burns WIF." | "A revolutionary deflationary flywheel." |

**Banned:** revolutionary, seamless, powerful, next-generation, unlock the
future, trust us, any exclamation mark outside the $WIF tier module.

**Required:** every percentage is written to two decimal places. Every address
is monospace and either full-length or first-6/last-4 with a copy control —
never a decorative truncation you can't act on.

Name the problem without naming the competitor. "Most hooked volume on this
chain runs through one contract that shows 0% and takes about 2% after the
swap" is a fact with a citation (Bitquery). Naming it is a fight you don't need.

---

## §2 — Type

Numbers are the product. The type system exists to make them comparable.

```
--font-sans:    "Geist", "Inter Tight", system-ui, sans-serif
--font-mono:    "Geist Mono", ui-monospace, "SF Mono", monospace
--font-monitor: var(--font-mono)   /* no pixel face: same mono, monitor colours */
```

- **Sans** — headings and prose only.
- **Mono** — *every* number, address, fee, percentage, event field, code
  identifier. No exceptions. Always `font-variant-numeric: tabular-nums` so
  figures align vertically in a column and a reader can compare them without
  moving their eyes horizontally.
- **Monitor** — the Ledger Strip (§5.1) and the burn counter. Same mono face,
  set in the monitor colours (amber on black). The colours carry the "live
  machine output" signal; no pixel or novelty typeface.

### Scale

| Token | Size / Line | Use |
|---|---|---|
| `display` | 72 / 0.95, -0.03em | Hero claim only. One per page. |
| `h1` | 40 / 1.1, -0.02em | Section openers (§ headings) |
| `h2` | 24 / 1.25 | Sub-sections |
| `body` | 16 / 1.6 | Prose. Max 68ch measure. |
| `small` | 13 / 1.5 | Captions, footnotes, table cells |
| `micro` | 11 / 1.3, 0.06em, uppercase | Labels, chips, column headers |
| `data-lg` | 48 / 1, mono tabular | The two compared fees |
| `data` | 15 / 1.4, mono tabular | Table figures |

Headings carry a § number (`§1 The problem`). It tells the reader this page is
a document with sections they can cite, not a funnel they're being moved through.

---

## §3 — Color

One accent. It happens to serve two masters at once — Uniswap's magenta and
WIF's hat pink live in the same hue family, so a single accent reads as both
"native to v4" and "this is the WIF token." Don't add a second.

```
/* Surface — flat, no gradients, ever */
--paper:        #FAFAF8   /* page */
--paper-sunk:   #F2F2EE   /* table header, inset blocks */
--ink:          #121212   /* text */
--ink-soft:     #5C5C58   /* secondary text */
--rule:         #E0E0DA   /* 1px hairlines — the only separator */

/* Accent — WIF / v4 */
--accent:       #FF007A
--accent-sunk:  #FFE5F0   /* tier row fill, chip background */

/* Divergence ramp — shown fee vs paid fee gap */
--match:        #1F7A4D   /* gap ≈ 0. Used sparingly. */
--gap-1:        #FFF3C4   /* 0.01–0.25pp */
--gap-2:        #FFD98A   /* 0.25–1.00pp */
--gap-3:        #FF9F45   /* 1.00–2.00pp */
--gap-4:        #E5484D   /* > 2.00pp */

/* Monitor — Ledger Strip only */
--monitor-bg:   #0B0B0B
--monitor-fg:   #FFA726
```

**The divergence ramp is the most important thing in this file.** It is the
visual form of the entire product claim. Rules:

- The ramp fills the *cell background*, never the text.
- An honest pool must render as plain `--paper` with grey text. No green
  badge, no checkmark, no celebration. Honesty is the baseline, not an
  achievement — and a table where most rows are quiet makes the orange ones
  impossible to miss.
- `--match` green appears only once per page, on Plainfee's own row.
- Never use the ramp for anything that isn't a shown-vs-paid gap. It must mean
  exactly one thing.
- **A gap only gets the ramp when the hook can take value outside the fee**
  (any return-delta bit set in its address). A hookless or fee-only pool can't,
  so any gap there is price impact from thin liquidity and renders grey with
  the note `price impact`. The ramp accuses; it must never accuse a pool that
  structurally cannot do the thing.

`--accent` (#FF007A) is 3.9:1 on paper, so it is for figures 24px and up and
for fills. Small accent text is not allowed; links are ink with an underline.

Dark mode: invert surfaces, keep the ramp identical. The ramp is data, and data
doesn't have a theme. (Light ships first; dark is not built yet.)

---

## §4 — Layout

A document, not a landing page.

- Content column: **720px**. Prose stays inside it.
- Data column: **1120px**. Tables and comparison panels break out.
- The checker table goes **full-bleed**. It is the widest thing on the site.
- Left rail: sticky § table of contents, `micro` type, `--ink-soft`, current
  section in `--ink`. Shown at 1280px and wider; below that it is gone — no hamburger.
- Vertical rhythm on an 8px base. Section gap 96px, block gap 32px.
- Separation is done with **1px `--rule` hairlines only**. No cards, no
  rounded containers, no drop shadows. If two things need separating, a line
  separates them.
- Border radius: `2px` globally. Effectively square, enough to not look broken.

---

## §5 — Components

### 5.1 Ledger Strip

A persistent black bar above the nav, `--font-monitor`, `--monitor-fg`,
28px tall. Live protocol state, tabular, every figure read from the chain:

```
BLOCK 112,577,826   WIF SUPPLY 999,412,908.44   WIF BURNED 0.00   POOLS CHECKED 14
```

Numbers tick in place on new blocks. The block number is the proof that it's
live. If the feed is stale, show the last block and a `STALE` flag rather than
a frozen number pretending to be current — a transparency product cannot have a
dishonest status indicator. Before the contracts are deployed, `WIF BURNED`
reads `NOT DEPLOYED`, never a placeholder number, and the large burn counter
is not rendered at all.

### 5.2 Claim / Proof panels — *the hero component*

Two panels side by side, divided by a single vertical hairline, equal width,
no card chrome on either.

**Left — `WHAT THE POOL SHOWS`.** The fee in `data-lg`, mono. Underneath,
annotation chips in `--gap-4` red marking what the number omits.

**Right — `WHAT YOU ACTUALLY PAY`.** The same figure position, same size, same
baseline — so the eye lands on the difference and nothing else. Underneath,
the `Swap` event field it came from, as a link.

Annotation chip vocabulary:

```
hidden        — not shown anywhere in the pool's records
post-swap     — taken after the swap settles
not-in-event  — absent from the Swap event's fee field
unverifiable  — cannot be checked from on-chain data alone
```

Chips are `micro`, 2px radius, `--gap-4` text on transparent, 1px border. They
are labels, not badges — flat, no fill.

On Plainfee's own panel pair, both sides show the same number and the right
panel carries a single `--match` hairline underline. That's the whole payoff.
Don't animate it, don't add a checkmark. Sameness is the point; making a
spectacle of it undercuts it.

### 5.3 Proof Table — the cost checker

Table-first. No hero above it on its own route; the input sits in the table's
own chrome.

Chrome row, left to right:
`[ paste a v4 pool id ]` · tag filters · `How to read this` ·
`Download TSV` · `Report an error`

Columns:

| Pool | Hook | Shown fee | Real fee | Gap | Where the gap is taken | Verified at block |
|---|---|---|---|---|---|---|

- `Gap` cell carries the divergence ramp fill (subject to the §3 rule).
- Every pool and hook address is mono, copyable, and links to the explorer.
- Sortable by gap, descending, by default — the worst offender is the first
  thing a visitor sees and you never had to name it in prose.
- `Download TSV` and `Report an error` are **not optional**. They are what
  makes this read as a measurement rather than an accusation. `Report an error`
  opens a GitHub issue with the pool id and block filled in.
- Empty state is the full table of known pools, not an illustration. The known
  pools are the busiest v4 pools of the last ~3,000 blocks, plus the main $WIF
  pool and Plainfee's own pool. There is always something to look at.

### 5.4 Tier ladder

The WIF discount. A plain ascending list, hairline-separated, no cards. The
values are the contract's (`PlainfeeHook` fees, thresholds set at deploy):

```
     no lock      0.30%    ────────────────────────────
  lock    500     0.25%    ───────────────────────
  lock  2,500     0.20%    ──────────────────
  lock 10,000     0.15%    ──────────────
```

Bar rendered as a monospace rule, not a `<div>` with a background. It should
look typed. `--accent-sunk` fill on the user's current tier row when a wallet
is connected; `--accent` on the figure itself.

### 5.5 Flywheel

Three labelled boxes and two arrows, drawn with hairlines and mono labels.
`fee → vault buys WIF → WIF burned → discount worth more`. Static.

Resist every instinct to animate this. An animated flywheel is the single most
common gesture in tokenomics marketing and it is a tell: motion is what you add
when the mechanism doesn't convince on its own. A static diagram with real
numbers under each box convinces more.

### 5.6 Address-bits verifier

A small, self-contained module and the most technically persuasive thing on
the page. Render the hook address as its bits, with the permission flags
labelled underneath, and the return-delta bits called out as **unset**:

```
0x…5880
     └─ BEFORE_SWAP              set
     └─ AFTER_SWAP_RETURN_DELTA  unset
     └─ BEFORE_SWAP_RETURN_DELTA unset
```

Caption, `small`, `--ink-soft`: "Anyone can check this. The permissions are
encoded in the address itself." Then the one-line snippet to verify it.

---

## §6 — Motion

Near-zero. Permitted:

- Number ticks on new block (120ms, no easing flourish)
- Table sort reorder (160ms)
- Hover underline on links

Banned: parallax, scroll-jacking, reveal-on-scroll, animated gradients,
counters that roll up from zero on page load, anything with a spring.

A counter that animates from 0 to its value is telling the reader a number is
exciting. Plainfee's position is that the number is simply correct.

---

## §7 — The $WIF tension

There are two registers in this product and they must not blend:

- **Plain** — the chrome, the tables, the proofs, the prose. Grey, flat,
  quiet, typographic.
- **Loud** — the WIF tier ladder and the burn counter. Full-bleed condensed
  uppercase, `--accent`.

Keep them in separate blocks with a hairline between. Never mix: no pink
tables, no playful copy inside the checker, no dog anywhere near a number.

No dog, no mascot, no illustration. A memecoin project that shows discipline
with its own meme reads as serious about the rest of the product.

---

## §8 — Reference map

| Reference | Take |
|---|---|
| [Kepler](https://www.seesaw.website/websites/keplr) | §5.2 claim/proof panels, §2 § numbering, annotation chip vocabulary |
| [PlasticList](https://www.seesaw.website/websites/plasticlist) | §5.3 proof table, divergence ramp, TSV + error-report posture |
| [Stripe BFCM Live](https://www.seesaw.website/websites/stripe-bfcm-2024) | §5.1 ledger strip, monitor face, machine-readable register |
| [Mirrorlane](https://www.seesaw.website/websites/mirrorlane) | Fees as a first-class page, "after costs" framing |
| [UMA](https://www.seesaw.website/websites/uma) | Persistent live-state strip, two-word thesis as hero |
| [Unichain](https://www.seesaw.website/websites/unichain) | v4 family resemblance, magenta, mono for all figures |
| [Bitkey](https://www.seesaw.website/websites/bitkey) | §7 loud register for the WIF blocks |

---

## §9 — Page build

```
Ledger Strip                      live state, always visible
─────────────────────────────────────────────────────────────
Hero                              "The fee you see is the fee you pay."
                                  one line of sub. two buttons: Check a pool · Read the hook
─────────────────────────────────────────────────────────────
§1  The problem                   claim/proof panels (§5.2) — the competing shape
                                  one sentence of prose. the Bitquery citation. nothing else.
─────────────────────────────────────────────────────────────
§2  Check any pool                proof table (§5.3), full-bleed
                                  sorted by gap descending
─────────────────────────────────────────────────────────────
§3  How Plainfee charges          claim/proof panels again — this time both sides match
                                  address-bits verifier (§5.6) directly underneath
─────────────────────────────────────────────────────────────
§4  Lock WIF, pay less            tier ladder (§5.4) — LOUD register
─────────────────────────────────────────────────────────────
§5  Every fee burns WIF           static flywheel (§5.5) + burn counter — LOUD register
─────────────────────────────────────────────────────────────
Footer                            MIT · contract addresses
```

Note the order: the problem and the tool come **before** the token. A reader
who hits the WIF discount after already watching the checker expose a gap
understands the discount as a fee mechanism. A reader who hits it first reads
the whole site as a token pitch.

---

## §10 — Checklist before shipping

- [ ] No gradient, shadow, glow, or blur anywhere in the CSS
- [ ] Every number is mono with `tabular-nums`
- [ ] The divergence ramp means one thing and only one thing
- [ ] An honest pool renders grey, not green
- [ ] TSV download works and the data matches what's rendered
- [ ] `Report an error` goes somewhere real
- [ ] Ledger Strip shows `STALE` rather than a frozen number
- [ ] Nothing animates from zero on load
- [ ] No mascot or illustration anywhere
- [ ] The competitor is described, never named
