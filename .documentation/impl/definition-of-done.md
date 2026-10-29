# Definition Of Done

A change is done when every applicable item below holds. Stating that something works is not sufficient: prove it by running the command and reading its output.

## General

- **Conventions**: The conventions of the touched area are followed: [`impl/ubiquitous-language.md`](ubiquitous-language.md) for every name, [`impl/a11y.md`](a11y.md) for every control, [`impl/angular.md`](angular.md) for the Angular page.
- **Testing**: Test conventions from [`impl/testing.md`](testing.md) are followed. Changed behavior is tested first: its cases were approved and its specs failed before the code was written.
- **Build Output**: `dist/` is never hand-edited; `npm run build` writes it.
- **Fixtures**: a file under `test/fixtures/` is what the pipeline wrote, byte for byte, and is regenerated deliberately, never edited by hand.
- **Scope**: The diff is limited to the area the task touches. No unrelated renames, moves, or refactors.
- **Secrets**: No API key or other credential is committed. The settings file lives outside the repository.
- **Backlog**: A shipped item is removed from [`impl/backlog.md`](backlog.md). Anything found on the way that is not part of the item goes to it.

---

## Verification

Every command runs from the repository root.

| Area          | Command                                                                                     | Gate  |
| :------------ | :------------------------------------------------------------------------------------------ | :---: |
| Formatting    | `npm run prettier:check`                                                                    |  CI   |
| Lint          | `npm run lint`                                                                              |  CI   |
| Markdown Lint | `npm run docs:lint`                                                                         |  CI   |
| Build         | `npm run build`                                                                             |  CI   |
| Tests         | `npm test`                                                                                  |  CI   |
| Visual Proof  | The served studio, see **Visual Testing** in [`impl/testing.md`](testing.md#visual-testing) | Local |

- **Chain**: `ci.yml` runs the CI gates in this order on every push to `main` and every pull request, and stops at the first failing step. It installs Chromium before the tests, because the pipeline rasterizes with it.
- **No Typecheck Script**: `npm run build` is the type check; `tsc` compiles `src/` to `dist/`, and `ng build` the page to `dist/studio/browser`. The specs are type-checked by the lint, which parses them with type information.
- **Visual Proof**: a user-visible change is proven against the served studio, not only against a passing test. Reuse a studio that is already listening, never start or stop one that is already running.
- **No Commit Hooks**: There is no Husky, lint-staged or commit hook. Every gate is run deliberately.
- **Narrowest Scope First**: Run the narrowest scope first, such as one spec file. Widen to the full suite once the narrow scope passes.

### Markdown Gates

- **One Command**: `npm run docs:lint` runs `markdownlint-cli2` over the repository. It checks style, and through `markdownlint-rule-relative-links` it checks that every relative link and heading anchor resolves.
- **Repository Wide**: Always the whole repository, because a link breaks when its target moves rather than when its source changes.
- **Rules**: `.markdownlint.json` holds the rule configuration and is read by both the command and the editor extension.
- **Exclusions**: `.markdownlint-cli2.jsonc` lists the paths that must not be linted: build output, drawn sets, the untracked `.research/` and `.plan/` artifacts, and Claude Code's own worktrees under `.claude/worktrees/`.
- **Link Notation**: Autolinks, `<https://example.com>`, fail the gate. Every link carries descriptive text, see [`impl/documentation.md`](documentation.md).
- **Editor**: The `davidanson.vscode-markdownlint` extension reports violations while editing. A clean editor is the fastest way to arrive at a green gate.
- **Indentation**: Markdown indentation uses spaces, with no line-length limit and trailing whitespace kept, set in `.editorconfig`. Tabs inside a fenced code block are left alone, because the block is verbatim content.

---

## Documentation

- **Conventions**: Documentation guidelines from [`impl/documentation.md`](documentation.md) are followed.
- **User Documentation**: A change to what the studio does, accepts or writes updates the matching `user/*.md`. The root [`README.md`](../../README.md) changes only when the quick start does.
- **Technical Documentation**: A change to the pipeline, the set record or the API updates [`tech/pipeline.md`](../tech/pipeline.md). It does not restate the `user/` document it relates to.
- **Implementation Documentation**: A change to the repository setup or a convention updates the matching `impl/*.md`.
- **Index**: A new, renamed or removed document is reflected in [`README.md`](../README.md).
- **Links Resolve**: `npm run docs:lint` passes. A broken relative link or anchor is a defect, not a formatting detail.

---

## Release

- **Branches**: `main` is the release branch. `feature/*` holds work in progress; its pull request runs the same CI gates and publishes nothing.
- **Package**: Not published yet, `"private": true`. The steps arrive with **First Release** in [`impl/backlog.md`](backlog.md).
- **Dependencies**: Renovate proposes updates once a month, grouped in `renovate.json`, see [`impl/renovate.md`](renovate.md). A Playwright bump can change the golden fixtures, see [`impl/testing.md`](testing.md).
