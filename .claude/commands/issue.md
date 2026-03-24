Please analyze and fix the GitHub issue: $ARGUMENTS.

# Implement Issue

You are working on **Unboxd** — a Chrome extension that injects a stats panel into Letterboxd profile pages. Read `CLAUDE.md` for full project context before doing anything.

---

## Step 1 — Read the issue

Use 'gh issue view' to get the issue details

Understand:
- What problem it describes
- What the expected behaviour is
- Any acceptance criteria or screenshots mentioned
- Which files from the project structure are likely involved

If the issue number is invalid or you can't fetch it, stop and ask the user to paste the issue description directly.

---

## Step 2 — Plan

Before writing any code, output a clear plan:

```
## Plan for issue #$ARGUMENTS

**Problem:** (one sentence)
**Approach:** (one paragraph)
- Search PRs to see if you can find history on this issue
- Search the codebase for relevant files
**Files to change:**
- path/to/file.js — what you'll change and why
- ...
**New files (if any):**
- path/to/new.js — purpose
**Tests to write:**
- describe what each test covers
**Risks / unknowns:**
- anything that might need a decision
```

---

## Step 3 — Implement
- Create a new branch for the issue
- Solve the issue in small, manageable steps, according to your plan.
- Commit your changes after each step.

Rules:
- Vanilla JS only — no new dependencies unless absolutely necessary and discussed
- All CSS uses the `--lbs-*` design tokens from `content.css`
- All DB access goes through `src/lib/db.js` — never raw IndexedDB calls elsewhere
- TMDB calls only through `src/lib/tmdb.js`
- Stat computations only in `src/lib/stats.js` — sections just call and render

---

## Step 4 — Test

Write or update tests for everything you changed.

For each logical unit touched, write tests that cover:
- The happy path
- Edge cases mentioned in the issue
- Any regression risk (what could this break?)

Run the tests. If any fail, fix them before moving on. Show the passing test output.

If the project has no test runner yet: set up Vitest (it pairs naturally with Vite) and write the first test file as a template others can follow.

---

## Step 5 — Self-review

Before creating the PR, do a pass over your own diff:

- Does this fully resolve the issue as described?
- Are there any console.logs, commented-out code, or TODOs left in?
- Is error handling in place (TMDB failures, DB errors, bad CSV data)?
- Does it work for both own-profile mode and other-profile mode if relevant?
- Does it degrade gracefully if the user hasn't uploaded a CSV yet?
- Are loading and empty states handled?

Fix anything you find.

---

## Step 6 — Create PR

- Open a PR and request a review.

Remember to use the GitHub CLI (gh) for all Github-related tasks.