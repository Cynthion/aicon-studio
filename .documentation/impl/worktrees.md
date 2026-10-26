# Worktrees

Parallel work on several branches, one checkout per branch. The documentation index is [`README.md`](../README.md).

A worktree is an additional working directory of the same repository. It has its own branch, `node_modules` and `dist/`, and shares commits, branches and stashes with the main checkout. A branch is checked out in at most one worktree.

## Layout

| Path                             | Holds                   |
| :------------------------------- | :---------------------- |
| `aicon-studio/`                  | Main checkout           |
| `aicon-studio.worktrees/<slug>/` | One worktree per branch |

Worktrees live beside the main checkout, not inside it, so its search, file watchers and lint globs never see a second copy of the code.

---

## Create

From any checkout of the repository:

```zsh
npm run worktree:add -- <slug>
```

`scripts/worktree-add.sh`:

- Creates the worktree on a new branch `feature/<slug>` from `origin/main`
- Copies `.claude/settings.local.json` when the main checkout has one
- Runs `npm ci`
- Opens the worktree in a new VS Code window

Without `<slug>`, the script asks for one.

- **Terminal**: the script cannot change the directory of the terminal that ran it. The terminal of the new VS Code window starts in the worktree, and a Claude Code session started there works on that worktree only.
- **No Upstream**: the branch is created with `--no-track`, so `origin/main` is not its upstream. The first push names the remote branch, `git push -u origin feature/<slug>`, unless `push.autoSetupRemote` is set.
- **Existing Branch**: `git worktree add ../aicon-studio.worktrees/<slug> feature/<slug>`, then `npm ci` in it, checks out a branch that already exists.
- **Chromium**: Playwright's browser build is installed per machine, not per worktree, so `npx playwright install chromium` is not repeated.
- **Untracked Files**: a worktree holds tracked files only. The studio's settings file lives outside the repository, so nothing else is copied. `.research/` and `.plan/` are per worktree and are deleted with it.

---

## Run In Parallel

| Process | Port       | Second Instance                                                                                    |
| :------ | :--------- | :------------------------------------------------------------------------------------------------- |
| Studio  | `54400`    | `node src/cli.ts example --port 54401`                                                             |
| Specs   | Free ports | None needed: every spec listens on a free port, see [`impl/testing.md`](testing.md#writing-a-spec) |

The `playwright` MCP server is a client of whatever studio is listening, so a session in a worktree opens the port of its own studio.

---

## Remove

After the pull request is merged, from the main checkout:

```zsh
git worktree remove ../aicon-studio.worktrees/<slug>
git branch -D feature/<slug>
git worktree prune
```

- **Uncommitted Changes**: `git worktree remove` refuses a worktree with modified or untracked files. `--force` discards them.
- **Force Delete**: a squash-merged branch is never an ancestor of `main`, so `git branch -d` refuses it.
- **Prune**: `git worktree prune` drops the records of worktree directories that were deleted without `git worktree remove`.

---

## Claude Code Worktrees

Claude Code creates worktrees of its own under `.claude/worktrees/`: `claude --worktree <name>` on branch `worktree-<name>`, and subagents with `isolation: worktree`. These live inside the main checkout, so `docs:lint` and Prettier ignore `.claude/worktrees/**`. They get no `node_modules` and no untracked files.
