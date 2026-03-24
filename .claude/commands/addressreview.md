Address review feedback on pull request: $ARGUMENTS.

# Address Review

You are working on **Unboxd** — a Chrome extension that injects a stats panel into Letterboxd profile pages. Read `CLAUDE.md` for full project context before doing anything.

---

## Step 1 — Read the PR and its reviews

```bash
gh pr view $ARGUMENTS --json title,body,files,commits
gh pr reviews $ARGUMENTS --json author,state,body
gh pr diff $ARGUMENTS
```

Collect all review comments. Separate them by severity:

- 🔴 **Must fix** — explicitly marked as blocking, or clearly a bug/broken behaviour
- 🟡 **Should fix** — important but reviewer left it to your judgment
- 🟢 **Nice to have** — optional, only do these if they're small and safe

---

## Step 2 — Plan your response

Output this before touching any code:

```
## Addressing review on PR #$ARGUMENTS

**Must fix (will implement):**
- <item>: <your approach>

**Should fix (will implement):**
- <item>: <your approach>

**Nice to have (will / won't implement):**
- <item>: <reason — too risky to scope-creep, or: quick win, doing it>

**Won't fix (need to discuss):**
- <item>: <why you disagree or need clarification>
```

If any "must fix" item is unclear or contradictory, stop and ask the user for clarification before proceeding. Don't guess at reviewer intent.

---

## Step 3 — Implement

Work through must-fix items first, then should-fix, then nice-to-have if you chose to include them.

For each item:
- Make the minimal change that addresses the feedback
- Don't use addressing feedback as an excuse to refactor unrelated things
- If a fix touches a stats computation, update the relevant test in `stats.test.js`
- If a fix touches UI, verify it works in both own-profile and other-profile mode

---

## Step 4 — Reply to each review comment

For every piece of feedback (even things you're not changing), leave a reply:

```bash
# Get comment IDs
gh api repos/USERNAME/unboxd/pulls/$ARGUMENTS/comments --jq '.[].id'

# Reply to each comment
gh api repos/USERNAME/unboxd/pulls/$ARGUMENTS/comments \
  --method POST \
  --field body="<your reply>" \
  --field in_reply_to=<comment_id>
```

Reply templates:
- Fixed: *"Done — changed in `path/to/file.js`. [link to commit]"*
- Won't fix: *"Leaving this for now — [reason]. Happy to revisit in a follow-up."*
- Need clarification: *"Could you clarify what you mean by X? I want to make sure I address this correctly."*

Replace `USERNAME` with your GitHub username.

---

## Step 5 — Update the PR

```bash
git add -A
git commit -m "review: address feedback on PR #$ARGUMENTS

- <bullet per thing you fixed>
- <bullet per thing you fixed>"
git push
```

Then leave a top-level comment on the PR summarising what you did:

```bash
gh pr comment $ARGUMENTS --body "$(cat <<'EOF'
## Review addressed

**Fixed:**
- <item and what you changed>
- <item and what you changed>

**Left as-is:**
- <item and why>

Ready for re-review.
EOF
)"
```

---

## Step 6 — Re-run tests

```bash
npm test
```

All tests must pass before this is considered done. If a fix broke an existing test, fix the test too — but make sure you're fixing a test that was wrong, not hiding a regression.