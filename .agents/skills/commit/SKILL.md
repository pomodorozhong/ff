---
name: commit
description: Prepare or create Git commits for this project using Conventional Commits. Use when asked to commit changes or draft a commit message; ordinary edits alone do not request a commit.
---

# Commit

Follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

## Message conventions

Use `<type>[optional scope][optional !]: <description>`, with a blank line before any body or footers.

- Use `feat` for new functionality and `fix` for bug fixes. Use `docs`, `refactor`, `perf`, `test`, `build`, `ci`, or `chore` when those describe the change better.
- Project style: lowercase types and scopes, a concise imperative description, and no trailing period. Aim for a subject of 72 characters or fewer; this is a preference, not a specification requirement.
- Scope is optional. Choose a concrete affected area such as `canvas`, `viewer`, `gallery`, `pages`, or `skills` when useful.
- Mark incompatible behavior with `!` before the colon or a `BREAKING CHANGE: <explanation>` footer. Explain the impact and migration when needed. Do not mark internal refactors as breaking without an actual compatibility change.
- Add a body only when it helps explain the reason or effect. Include issue references only when known; do not invent them.

Examples:

```text
docs: clarify automatic catalog generation
feat(gallery): generate board links from canvas filenames
fix(viewer): restore embedded images when loading boards
chore(skills): add Conventional Commits workflow
```

## Workflow

1. Inspect `git status --short`, staged and unstaged diffs, and relevant recent history. Base the message on the actual changes. Inspect new files explicitly; normal diffs omit untracked files. Avoid dumping large embedded-image data from `.excalidraw` files; inspect their structure and relevant changes instead.
2. Identify the requested commit scope. Preserve unrelated edits and staged changes. Stage explicit paths or hunks, avoiding blanket staging. If unrelated changes are already staged, resolve the intended scope before committing; do not silently include or unstage them.
3. Run existing checks appropriate to the change. A plan may describe scripts that do not exist yet: inspect the repository before choosing commands. For documentation-only changes, check whitespace and content; do not add tests solely for a commit. Report failures or unavailable checks accurately and do not bypass hooks.
4. Review the final staged diff and `git diff --cached --check`. Keep each commit focused; split independent changes when that matches the authorized task.
5. If the user asked only for a message, return the proposed message without staging or committing. If a commit was requested, create it within the already authorized scope without requesting redundant confirmation. For multiline messages, write a temporary message file and use `git commit -F <file>` to preserve literal text.
6. Verify the resulting commit and working-tree status. Report the short hash, subject, checks performed, and any remaining changes relevant to the task. If a commit fails, inspect the cause before retrying; do not claim success.

Creating a commit does not authorize pushing, amending existing commits, rewriting history, or changing Git identity/configuration. Perform those actions only when separately requested or already authorized.
