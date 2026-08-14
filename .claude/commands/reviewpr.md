Please review the pull request: $ARGUMENTS.

# Review PR

You are a senior engineer reviewing a PR on **WrappedBoxd** — a Chrome extension that injects a stats panel into Letterboxd profile pages. Read `CLAUDE.md` for full project context before reviewing.

---
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git blame:*), Bash(git show:*)
description: Quick code review for uncommitted local changes
---

## Step 1 — Fetch the PR
Use `gh pr view $ARGUMENTS` to get the PR title, description, and metadata
2. Use `gh pr diff $ARGUMENTS` to get the full diff
3. Use `gh pr checks $ARGUMENTS` to check CI status
4. Read all changed files in full using the Read tool — do not rely on diff alone

---

## Step 2 — Understand intent

Answer these before reviewing the code:
- What problem is this PR solving?
- Does the PR description clearly explain the *why*, not just the *what*?
- Does the scope feel right — or is it doing too much / too little?

---

## Step 3 — Review the diff

Go through every changed file. For each, evaluate:

### Correctness
- Does the logic actually solve the stated problem?
- Are there off-by-one errors, null/undefined edge cases, or async race conditions?
- Does CSV parsing handle malformed rows gracefully?
- Are TMDB failures handled — 404, 429, network error?
- Does IndexedDB access go through `db.js` (never raw)?
- Are new stat functions in `stats.js` pure — no side effects?

### Extension-specific concerns
- Does anything break if the user hasn't uploaded a CSV yet (unenriched state)?
- Does it work correctly in both own-profile mode and other-profile mode?
- Does the shadow DOM isolation hold — no style leaks in or out?
- Are `chrome.storage` calls async-safe?
- Would this cause the extension to request new permissions? If so, flag it.

### Performance
- Any synchronous loops that could block the main thread?
- Are TMDB requests still batched and rate-limited?
- Is IndexedDB being read unnecessarily on every render, or is there a local cache?
- Do charts get properly destroyed before re-render (Chart.js memory leak)?

### Code quality
- Does the code follow the existing style of the file it's in?
- No new dependencies added without discussion?
- No `console.log` left in?
- No commented-out code?
- Are CSS changes using `--lbs-*` tokens, not hardcoded colours?

### Tests
- Are there tests for the new logic?
- Do the tests cover edge cases, not just the happy path?
- Do all tests pass?

---

## Step 4 — Output your review

Structure your review as follows:

### Summary
One paragraph: what the PR does, overall impression, and whether you recommend approval.

Findings with their seveirty

### Verdict
One of: **Approve** | **Request Changes** | **Block (Critical Issues)**

---

## Step 5 — Post the review
 
First, check if this is your own PR:
```bash
gh pr view $ARGUMENTS --json author --jq '.author.login'
gh api user --jq '.login'
```
 
If the PR author matches the current GitHub user (own PR):
- **Never use `--request-changes`** — GitHub blocks this with an error
- Always use `--comment` regardless of verdict
- Add a note at the top of your review: *"(Self-review — commenting instead of requesting changes)"*
 
```bash
gh pr review $ARGUMENTS --comment --body "<your full review output from step 4>"
```
 
If it's someone else's PR:
 
Request changes (if needed):
```bash
gh pr review $ARGUMENTS --request-changes --body "<review>"
```
 
---

### Questions for the author
- <anything unclear that needs clarification>
```

Be specific — always cite the file and line. "This could cause issues" is not useful. "In `tmdb.js` line 47, if `results` is empty the `.id` access will throw — add a guard: `if (!results.length) return null`" is useful.


## Step 5 — Post the review
Remember to use the GitHub CLI (`gh`) for all GitHub-related tasks.