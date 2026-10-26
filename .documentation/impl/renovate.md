# Renovate

Dependency updates arrive as pull requests from the Renovate GitHub App. `renovate.json` holds the configuration; this document is its commentary.

## Setup

- **Schedule**: the whole first day of each month, UTC. Security pull requests ignore it, see [Dependabot](#dependabot).
- **Release Age**: an npm release is proposed only once it is three days old, so a release that is unpublished or turns out malicious never reaches a pull request.
- **Dependency Dashboard**: an issue Renovate keeps current, listing every pending and open update. Ticking a pending update opens its pull request before the schedule.
- **Validation**: `npx --package renovate -- renovate-config-validator --strict`, from the repository root.
- **MCP Servers**: a regex manager reads the `npx` pins in `.mcp.json`. `ux-patterns` is hosted and has no pin.

---

## GitHub Configuration

Settings that live outside the repository, made once by the repository owner. Without them `renovate.json` opens nothing.

### Renovate App

- **Installation**: avatar menu > `Settings` > `Applications` > `Installed GitHub Apps` > `Renovate` > `Configure`. `Repository access` includes this repository.
- **Mode**: the repository runs in `Interactive` mode in the Mend Developer Portal. `Silent` mode opens no pull requests and no issues, and is the default when the app is installed on all repositories.

### Dependabot

Renovate opens every dependency pull request. Of GitHub's Dependabot features only the alerts are on, as the vulnerability feed Renovate reads. The settings are under the repository's `Settings`, `Advanced Security`.

| Feature                     | State | Reason                                                                        |
| :-------------------------- | :---: | :---------------------------------------------------------------------------- |
| Dependency Graph            |  On   | Required by Dependabot alerts                                                 |
| Dependabot Alerts           |  On   | Renovate turns each alert into a security pull request                        |
| Dependabot Security Updates |  Off  | Duplicates Renovate's security pull requests                                  |
| Dependabot Version Updates  |  Off  | Duplicates every Renovate pull request, so no `.github/dependabot.yml` exists |

- **Security Pull Requests**: one per vulnerable package, suffixed `[SECURITY]`, outside any group, ignoring the schedule and the release age.

---

## Pull Requests

| Pull Request                 | Holds                                                                                                                      |
| :--------------------------- | :------------------------------------------------------------------------------------------------------------------------- |
| `all non-major dependencies` | Every minor and patch update of `package.json` and the `.mcp.json` pins, Playwright excepted                               |
| `Playwright`                 | Every `playwright` update, major or not, on its own: its Chromium rasterizes every fill, so a bump can change the fixtures |
| `ESLint (major)`             | `eslint`, `@eslint/js`, `typescript-eslint`                                                                                |
| `Prettier (major)`           | `prettier`                                                                                                                 |
| `Vitest (major)`             | `vitest`                                                                                                                   |
| `GitHub Actions (major)`     | Every action in `.github/workflows/`                                                                                       |
| One per package              | Any other major, `node` in `.nvmrc` and `.tool-versions` included                                                          |

- **Majors Apart**: a major never joins the monthly non-major pull request, so a breaking release cannot block it.
- **Exact Pins**: npm dependencies are pinned exactly, so every npm update edits `package.json` as well as its lockfile.
- **Golden Fixtures**: a Playwright pull request whose CI fails in `test/fill.spec.ts` brings a Chromium that rasterizes differently. Regenerate the fixtures on its branch and look at the fills, see **Golden Fixtures** in [`impl/testing.md`](testing.md#golden-fixtures).

---

## Ceilings

`allowedVersions` holds `typescript` below `6.1`, because `typescript-eslint` peers TypeScript below that minor. Renovate does not warn when a ceiling goes stale: raise it in `renovate.json` once `typescript-eslint` supports the next minor.

---

## Limits

Green CI does not prove these; check them before merging.

- **No Scripts**: the hosted app runs no project scripts, so an update that needs a code change fails CI and needs a fix-up commit on its branch.
- **MCP Servers**: no CI starts an MCP server. A `@playwright/mcp` bump also needs its Chromium build installed, see **AI Tooling** in [`CONTRIBUTING.md`](../../CONTRIBUTING.md#ai-tooling).
- **Engines**: `engines.node` in `package.json` is a range Renovate leaves alone. A Node major raises it by hand.
