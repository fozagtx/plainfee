# Plainfee design system

Square, hairline-ruled and mono-labelled. **Light theme only.** It is adapted from a measured reference system for developer tooling (the composio.dev marketing site, extracted 11 Nov 2026), and tailored here to a product whose job is to show numbers people can trust.

The tokens live in `web/src/app/globals.css`, and the living specimen is at `/system`. Change a value here first, then in CSS.

> Square corners, hairline borders, uppercase mono controls, light headings, and figures you can check.

## The four identity decisions

1. **Nothing is rounded.** Every Tailwind radius token resolves to 0. The one exception is `rounded-3xl` (1.5rem), reserved for a showcase card. Don't use it in the app.
2. **Borders, never shadows.** Elevation is a 1px `border` plus a surface step from `background` (#f6f6f6) to `card` (#fff). There is one shadow, `shadow-elevated`, for floating artwork only (a phone mockup in the demo video). Never put it on UI.
3. **Every control is set in mono.** Buttons, nav, tags and labels use JetBrains Mono 14px with -0.011em tracking (`.mono-control`). Labels are **written in uppercase in the content**, never with `text-transform`.
4. **Headings are regular weight.** Display, h1 and h3 use 400; h2 uses 500. Nothing is bold. Size and -0.025em tracking do the work.

## Plainfee-specific decisions

5. **Numbers are the product.** Every fee, amount, burn and threshold uses `.figure` (mono with tabular numerals) so columns line up and a change of one digit is visible.
6. **The highlight marker means "this is the number you weren't shown."** Acid lime `#d4ff4a` sits behind a figure only when the paid fee is higher than the shown fee. Don't use it for decoration; that would cheapen the one signal it carries.
7. **Show the proof next to the claim.** Any on-chain number links to its Blockscout transaction or contract (`brand-readable` text, underlined). If a number can't be linked, it doesn't go on the page.
8. **No status that carries no information.** Don't badge "MAINNET" when mainnet is the only network. Flag only the abnormal case.

## Colour

| Token | Value | Use | Contrast |
|---|---|---|---|
| `background` | `#f6f6f6` | page ground | — |
| `card` | `#ffffff` | raised surface | — |
| `foreground` | `#0a0a0a` | all text | 18.3:1 ground · 19.8:1 card |
| `subtle` | foreground @ 65% | ledes, secondary text | 6.1:1 ground |
| `muted-foreground` | `#737373` | **avoid for text**, kept from the source | 4.39:1 ground, **fails AA small** |
| `border` | `#e4e4e4` | hairline ground↔card | — |
| `border-strong` | `#d4d4d4` | rules inside cards, table rows | — |
| `brand` | `#51a2ff` | fills, bars, chart series | 2.44:1, **never text** |
| `brand-readable` | `#003985` | links, brand-coloured text | 10.1:1 ground |
| `brand-ink` | `#0a0a0a` | text on a `brand` fill | 7.5:1 |
| `highlight` | `#d4ff4a` | the hidden-fee marker | dark ink only, 17.2:1 |
| `success` | `#15803d` | dot / border beside neutral text | 5.0:1 card |
| `destructive` | `#b91c1c` | dot / border beside neutral text | 6.5:1 card |
| `warning` | `#f5a524` | dot only, never white text on it | — |
| `ring` | `#a3a3a3` | focus outline (neutral, so it stays visible on brand fills) | — |

All contrast figures were computed with WCAG 2.1 relative luminance on 11 Nov 2026.

## Type

| Role | Family | Where |
|---|---|---|
| `font-sans` | Geist Sans | headings, running text |
| `font-mono` | JetBrains Mono | controls, labels, figures |
| `font-code` | Geist Mono | tx hashes, addresses, code |

| Step | Size / line | Weight | Tracking |
|---|---|---|---|
| display | 36 → 48 (md) → 64 (lg) | 400 | -0.025em |
| h1 | 36 / 40 | 400 | -0.025em |
| h2 | 24 / 32 | 500 | -0.025em |
| h3 | 18 / 28 | 400 | -0.025em |
| body | 16 / 24 | 400 | -0.011em |
| lede | 18 / 28, `subtle` | 400 | -0.011em |
| mono-control | 14 / 20 | 400 | -0.011em |
| mono-xs (labels) | 10 / 14 | 400 | **+0.025em** |
| figure-xl | 36 / 40 mono, tabular | 400 | -0.011em |

Headings get `.measure-heading` (max 22ch) and `text-wrap: balance`. Put heading blocks inside `max-w-(--container-narrow)` (520px).

## Space and layout

- The base unit is 4px. Controls step in 2px: a button is `py-1.5 px-2` (6px × 8px).
- `gap-2` (8px) is the default gap. Sections are separated by `gap-16` (64px).
- There is one page width, `--container-page` = 1240px, with a 16px gutter (`px-4`) on mobile.
- **Header:** on desktop it floats `top-4`, measures `calc(100% - 2rem)` capped at 1240px and has a full border. On mobile it is flush to the top with a bottom border only. It is 48px tall.

## Motion

- 150ms `--ease-standard` for micro-states (hover tint, focus), via `.transition-micro`.
- 300ms for interactive chrome (nav, buttons, header), via `.transition-chrome`.
- Transitions are scoped to named properties. Never use `transition: all`.
- `prefers-reduced-motion` turns everything off.
- One allowed flourish: when a harvest lands, the total-burned figure counts up once over 600ms with ease-out. No marquees and no looping animation.

## Iconography

Line icons on a 24×24 viewBox, `stroke="currentColor"`, 1.5px stroke, inline SVG, 14–16px next to a 14px label with `gap-2`. No filled or duotone icons.

## Components (`web/src/components/ui.tsx`)

| Component | Spec |
|---|---|
| `Button` / `buttonClass` | `primary` (ink fill, white text), `brand` (blue fill, dark ink), `outline` (card fill, strong hairline), `ghost`. Mono uppercase. Disabled at 40% opacity. Use `buttonClass` on links; never put a `<button>` inside an `<a>`. |
| `Tag` | Hairline, card fill, mono 14px, `px-1.5 py-0.5`. For hook permissions: `DYNAMIC FEE`, `NO RETURN DELTA`. |
| `StatusDot` | An 8px square dot plus neutral mono text. It replaces filled state chips. |
| `Card` | `border border-border bg-card`, no radius, no shadow. Inner rules use `divide-border`. |
| `Label` | `mono-xs`, `subtle`, uppercase in the content. Sits above a figure. |
| `FeeReadout` | **The signature component.** Two ruled cells: SHOWN FEE and PAID FEE, as `figure` at 36px. When paid > shown, the paid figure gets the highlight, plus `StatusDot destructive "X.XX% NOT SHOWN"`. When they're equal: `StatusDot success "MATCHES"`. |

Still to build, in the same language:

- `PermissionTable`: the 14 hook flags as ruled rows, with on/off as a square filled or empty, and the return-delta rows called out.
- `TierLadder`: four rows (threshold → fee), with the user's row marked by a 2px `brand` left rule.
- `BurnLedger`: a ruled table (time · WIF burned · ETH in · tx) using figures and `font-code` hashes.

## Copy

- Controls are terse and uppercase, and include the offer: `SWAP – 0.25% FEE`, `LOCK WIF`, `CHECK A POOL`. Use an en dash with spaces, not a hyphen.
- Headlines are plain claims. Avoid hype words and invented metrics. Every number shown comes from the chain.
- The project name is set in Geist Sans, medium, 17px. There is no wordmark. Never use Robinhood's name or logo in the product's name, logo or handles (hackathon rule 11).
