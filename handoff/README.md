# Handoff: start here

**Written:** 2026-11-11, about 19:35 UTC. The owner stepped away mid-session.
**Deadline:** submissions close **2026-11-12 17:30 UTC**. The app must stay live until 2026-11-16 17:30 UTC.

Read these in order:

1. **This file.** Where everything is and what state it's in.
2. [`TODO.md`](TODO.md): everything left to do, in order, with a "done when" for each item.
3. [`KNOWN-ISSUES.md`](KNOWN-ISSUES.md): what's broken right now and what was already ruled out.
4. [`SESSION-LOG.md`](SESSION-LOG.md): the session's history. What the owner asked for, every decision, and the owner's preferences and complaints, in order.
5. Then the repo's `AGENTS.md` (rules), `docs/ARCHITECTURE.md` (spec), `DESIGN.md` (visual system), `MEMORY.md` (verified facts), `SCRATCHPAD.md` (working notes and numbers).

The full raw chat transcript is in `handoff/session/` **on the owner's machine only**. It's git-ignored because the repo is public and the transcript contains private details.

## Where things live

| What | Where | State |
|---|---|---|
| Repo | https://github.com/fozagtx/plainfee (public) | `main` = contracts + home page. `feat/checker` = the checker work in progress |
| Live site | https://plainfee.vercel.app | Home page only. Deployed from the CLI (`vercel deploy --prod` inside `web/`). Not linked to GitHub, so pushes don't deploy |
| Contracts | `contracts/src/` | Done, tested, **not deployed**. Waiting for the owner's funds |
| Checker page | `web/src/app/check/`, `web/src/lib/pool-check.ts` | Logic works from Node against mainnet, but **stuck loading in the browser** (see KNOWN-ISSUES) |
| Swap / Lock / Burns pages | n/a | Not started |
| Local working copy | `~/Desktop/re2.0/plainfee` | |

## Branches

- `main`: scaffold, contracts, the $3 tier change, the Vercel-ready home page. Pushed.
- `feat/contracts`: same as `main`. Pushed.
- `feat/checker`: the checker page, the pool-check library, and this handoff folder. Pushed at the end of this session.

## Status in one paragraph

The three contracts (WifLock, PlainfeeHook, BurnVault) are finished. 30 unit and fuzz tests pass, and a full-path fork test against live mainnet passes. A deploy dry run against mainnet succeeds at about 0.0002 ETH of gas. Nothing is deployed, because the owner has very little money: the plan is sized to about **$3** and still needs funds in a keystore wallet. The website is live but nearly empty, and the owner is unhappy with how it looks (see SESSION-LOG, "Design complaint"). The checker is half done. It is the demo centrepiece and the most important thing to finish.
