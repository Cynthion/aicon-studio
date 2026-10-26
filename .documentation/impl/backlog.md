# Backlog

The single source of truth for work items, in priority order; bugs come first. A shipped item is deleted, not annotated, and the commit history holds what shipped.

## Bugs

None.

## Features

- **Angular UI**:
  - **Context**: `src/studio.html` is the page moved out of its first home as is: one vanilla file with its own rendering, state and dialogs.
  - **Proposal**: rebuild the page with Angular and ngx-formidable for better forms and dialogs, against the existing HTTP API in [`tech/pipeline.md`](../tech/pipeline.md), which stays the seam. The server keeps serving one built page; the API does not change for it.
- **Rasterize Without A Browser**:
  - **Context**: every fill and every reference image is rasterized by Playwright's Chromium, a browser install of about 150 MB that `npm ci` does not download, see [`user/getting-started.md`](../user/getting-started.md).
  - **Proposal**: replace it with `@resvg/resvg-js`, a native SVG rasterizer. Its anti-aliasing differs from Chromium's, so the fills change slightly; the golden fixtures in `test/fixtures/` are regenerated and the change needs its own visual proof on a drawn set, see [`impl/testing.md`](testing.md).
- **Edit Icons In The UI**:
  - **Context**: the studio edits subjects and styles, but an icon is added, removed or renamed by editing `aicon-studio.json` by hand.
  - **Proposal**: add, remove and rename icons, drawn and rotated, in the Icons view, through routes beside `PUT /api/subjects/<stem>`.
- **First Release**:
  - **Context**: the package is `"private": true` and runs from a clone, linked by a `file:` dev dependency where another repository uses it.
  - **Proposal**: drop `"private"`, add `impl/releasing.md` with the publishing steps, publish `@cynthion/aicon-studio`, and document `npx`, the dev dependency by version and the global install in [`user/getting-started.md`](../user/getting-started.md). Then switch the consumers from `file:` to the version.

## Security Findings

None, kept per [`impl/security-review.md`](security-review.md).
