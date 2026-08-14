# Contributing to WrappedBoxd

Thanks for wanting to help. WrappedBoxd is a small open source project — contributions of any size are welcome, whether that's fixing a typo, reporting a bug, or building a whole new stats section.

Read this before opening an issue or submitting a PR. It'll save everyone time.

---

## Table of contents

- [I found a bug](#i-found-a-bug)
- [I have a feature idea](#i-have-a-feature-idea)
- [I want to pick up an existing issue](#i-want-to-pick-up-an-existing-issue)
- [Setting up the project locally](#setting-up-the-project-locally)
- [Making a pull request](#making-a-pull-request)
- [Code style](#code-style)
- [What we won't accept](#what-we-wont-accept)

---

## I found a bug

Before opening an issue:
- Search existing issues to see if it's already reported
- Make sure you're on the latest version of the extension

When you open a bug report, include:

**1. What happened**
A clear description of the bug. What did you see? What did you expect to see?

**2. Steps to reproduce**
```
1. Go to letterboxd.com/yourname
2. Click on the Genres tab
3. See error
```

**3. Your setup**
- Chrome version
- How many films in your diary (rough number)
- Did you upload a CSV, or are you using RSS-only mode?

**4. Console errors (if any)**
Open DevTools → Console → paste any red errors here. This is the most useful thing you can give us.

**5. Screenshots**
If it's a visual bug, a screenshot is worth a thousand words.

> **Note on data privacy**: never paste your actual diary data or CSV contents into a GitHub issue. If we need to reproduce a data-specific bug, we'll ask you to share a small anonymised sample.

---

## I have a feature idea

Feature requests are welcome. Before opening one:

- Check the existing issues — it might already be planned or discussed
- Check the [roadmap](../../projects) if there is one

When you open a feature request, explain:

**1. The problem you're trying to solve**
Not just "add X" — *why* do you want X? What are you trying to understand about your film watching that you can't currently?

Good: *"I watch a lot of films with friends and want to see how my ratings differ when I rewatch something versus see it fresh — the rewatch stats section doesn't break this down."*

Not as useful: *"Add a rewatch comparison chart."*

**2. What you'd expect it to look like**
A rough description, sketch, or screenshot from another app is fine. Don't worry about it being polished.

**3. Is this specific to your own profile, other profiles, or both?**
This affects the implementation significantly — other profiles only have RSS data (50 most recent entries).

---

## I want to pick up an existing issue

Great. Here's how to do it without stepping on anyone's toes:

**1. Check if it's already assigned**
If the issue has someone assigned, it's being worked on. Leave a comment asking for an update if it's been more than 2 weeks with no activity — sometimes people pick things up and disappear.

**2. Comment before you start**
Leave a comment saying you'd like to work on it. Something like: *"I'd like to take this on — planning to start this weekend."* This prevents two people building the same thing in parallel.

**3. Wait for acknowledgment**
A maintainer will assign it to you. Once assigned, it's yours. If you don't hear back within 48 hours, go ahead and start anyway.

**4. Ask questions early**
If anything in the issue is unclear, ask in the issue comments before writing code — not after. A 5-minute clarification now saves hours of rework later.

**5. Set expectations**
If life gets in the way and you can't finish, that's completely fine — just leave a comment so someone else can pick it up. No judgment.

---

## Setting up the project locally

**Requirements**
- Node.js 18+
- Chrome
- A Letterboxd account with some diary entries

No TMDB API key needed. TMDB enrichment goes through a proxy (`https://unboxd-proxy.vercel.app`) that handles authentication server-side.

**1. Clone and install**
```bash
git clone https://github.com/USERNAME/wrappedboxd.git
cd wrappedboxd
npm install
```

**2. Build in dev mode**
```bash
npm run dev
```
Vite will watch for changes and rebuild into `dist/` on every save.

**3. Load the extension in Chrome**
1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `dist/` folder

**4. After code changes**
Vite rebuilds automatically. Then in `chrome://extensions`, click the refresh icon on the WrappedBoxd card. Reload your Letterboxd tab.

**5. Test with your own data**
- Export your diary from Letterboxd: Settings → Import & Export → Export Your Data
- Visit `letterboxd.com/yourname`
- The onboarding panel will walk you through uploading your CSVs (watched, ratings, diary — all optional except watched) and then enrich your films with TMDB data automatically

**Running tests**
```bash
npm test
```

Tests use Vitest. They cover the stat computation functions in `src/lib/stats.js` and the CSV parser. You don't need a real diary to run them.

---

## Making a pull request

**Keep PRs small and focused**
One PR = one thing. A PR that fixes a chart bug and adds a new filter and refactors the DB layer will sit in review for a long time. Three small PRs will each get reviewed and merged quickly.

**Branch naming**
```
fix/director-photos-not-loading
feat/runtime-stats-section
chore/update-chartjs
```

**Before you open the PR**

- [ ] `npm test` passes with no failures
- [ ] `npm run build` completes without errors
- [ ] You've manually tested in Chrome (not just unit tests)
- [ ] No `console.log` left in
- [ ] No commented-out code
- [ ] CSS changes use `--lbs-*` tokens, not hardcoded colours
- [ ] The extension works for both own-profile mode and other-profile mode if your change touches either

**PR description**
Use this template:

```markdown
## What
Short description of what this PR does.

## Why
What problem does it solve? Link the issue if there is one.
Closes #<issue number>

## Changes
- `src/lib/stats.js` — added computeRewatchRatio()
- `src/content/sections/overview.js` — display rewatch ratio in overview strip

## Testing
How did you test this? What edge cases did you check?

## Screenshots (if UI change)
Before / after screenshots if anything visual changed.
```

**Review process**
- A maintainer will review within a few days
- We might ask for changes — that's normal, not a rejection
- Once approved, we'll merge it
- Small, well-scoped PRs get reviewed faster than large ones

---

## Code style

No linter is enforced yet, but follow the existing style in whatever file you're editing:

- **Vanilla JS** — no new frameworks, no TypeScript
- **ES modules** — `import`/`export`, no CommonJS `require`
- **Async/await** — not `.then()` chains
- **Named exports** — not default exports (makes it easier to find things)
- **Descriptive variable names** — `enrichedFilms` not `ef`, `directorMap` not `dm`
- **Stat functions are pure** — `src/lib/stats.js` functions take data in, return data out, no side effects, no DOM touches
- **DB access only through `db.js`** — never raw IndexedDB calls in other files
- **TMDB calls only through `tmdb.js`** — never `fetch('unboxd-proxy.vercel.app...')` elsewhere
- **CSS uses `--lbs-*` tokens** — defined in `src/content/content.css`

---

## What we won't accept

To keep the project focused and sustainable:

- **Write-back to Letterboxd** — logging films, changing ratings, anything that submits to Letterboxd's servers. This risks ToS issues and is out of scope for v1.
- **New dependencies without discussion** — open an issue first if you think a library is needed
- **New server-side components** — the proxy at `unboxd-proxy.vercel.app` already exists to handle TMDB auth. Changes that require additional hosted infrastructure need discussion first.
- **Firefox / Safari support** — Chrome only for now. PRs that add other browser support without also maintaining Chrome parity won't be merged.
- **AI features that send your data externally** — all processing stays local
- **Scraping Letterboxd aggressively** — the extension should be a good citizen. No bulk scraping, no bypassing rate limits.

If you're unsure whether something fits, just open an issue and ask before building it. Better to have a 5-minute conversation than to spend a weekend on something we can't merge.

---

## Questions?

Open a [GitHub Discussion](../../discussions) if you have a question that isn't a bug or feature request. That's the best place for general questions about the codebase, architecture, or roadmap.

---

## Acknowledgements

Parts of this codebase were written with [Claude Code](https://claude.ai/code) (Anthropic) as a coding assistant.
