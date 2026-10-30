---
name: ai-review-change
description: Review the current change against the Definition of Done and prove it works. Use when a branch or diff should be checked for correctness, convention violations, and missing verification, or before considering any code change complete.
effort: high
---

# Review Change

Review the change that exists against [`impl/definition-of-done.md`](../../../.documentation/impl/definition-of-done.md) and run the gates it applies.

The `ai-review` agent carries the method and what to look for. This skill adds the running order and the gate commands.

## Workflow

1. Establish the diff against `origin/main`. Separate it from unrelated local changes and say which is which.
2. Walk the Definition of Done item by item. Report each as met, not met, or not applicable.
3. Run the applicable gates and report the actual output.
4. Confirm the obligations below for the code that changed.
5. Report findings ranked by severity, then the gate results.

## Gates

Run only what the diff touches. All commands run from the repository root.

| Touched                            | Command                                                                                                                                  |
| :--------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| Any file                           | `npm run prettier:check`                                                                                                                 |
| Any `.ts`                          | `npm run lint`                                                                                                                           |
| Any `src/*.ts`                     | `npm run build`                                                                                                                          |
| Any `.ts`                          | `npx vitest run test/<module>.spec.ts` or `npx ng test --no-watch`, then `npm test`                                                      |
| Any Markdown                       | `npm run docs:lint`                                                                                                                      |
| `studio/` or user-visible behavior | Visual proof on the served studio, see **Visual Testing** in [`impl/testing.md`](../../../.documentation/impl/testing.md#visual-testing) |

Run the narrowest scope first. Widen once the narrow scope passes.

## Obligations

A gate cannot judge these. Walk the `General` and `Documentation` sections of [`impl/definition-of-done.md`](../../../.documentation/impl/definition-of-done.md) item by item and report each one as met, not met, or not applicable.

## Rules

- **Run The Gates**: A review that only reads the diff is half a review. Report the command and its output.
- **Do Not Claim Success**: Paste the output. A claim without output is not a result.
- **Report Failures Plainly**: A failing gate is stated with its output, never summarized as minor.
- **Fix Only What You Touched**: If `prettier:check` fails, format the touched files with `npx prettier --write <path>`. Lint has no autofix; resolve flagged issues by hand. There is no standalone typecheck script: `npm run build` is the type check, and the lint parses the specs with type information.
- **Do Not Fix**: Report findings. Apply them only when asked.
- **Clean Is A Result**: Say so when the change holds up. Do not invent findings.
- **Name The Missing**: An absent test, an absent documentation update and an unrun gate are findings in their own right.
