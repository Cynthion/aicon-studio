# Backlog

The single source of truth for work items, in priority order; bugs come first. A shipped item is deleted, not annotated, and the commit history holds what shipped.

## Bugs

None.

## Features

- **Rasterize Without A Browser**:
  - **Context**: every fill and every reference image is rasterized by Playwright's Chromium, a browser install of about 150 MB that `npm ci` does not download, see [`user/getting-started.md`](../user/getting-started.md).
  - **Proposal**: replace it with `@resvg/resvg-js`, a native SVG rasterizer. Its anti-aliasing differs from Chromium's, so the fills change slightly; the golden fixtures in `test/fixtures/` are regenerated and the change needs its own visual proof on a drawn set, see [`impl/testing.md`](testing.md).
- **Rename Icons In The UI**:
  - **Context**: the Icons view adds, orders and removes icons, but a stem is renamed by editing `aicon-studio.json` by hand. A rename touches the entry, `references/<stem>.svg`, the `from` of its rotations, and the files of every set and the target.
  - **Proposal**: a rename route beside `POST /api/icons` that decides what happens to the files of the sets and the target, and a **Rename** in the row menu.
- **Adopt Leftovers**:
  - **Context**: **Adopt** copies every SVG file of a set, so it brings back the files of an icon removed since, and a test set adopts with icons missing.
  - **Proposal**: adopt the files of the icons of `aicon-studio.json` only, and say which icons the set lacks before copying.
- **First Release**:
  - **Context**: the package is `"private": true` and runs from a clone, linked by a `file:` dev dependency where another repository uses it.
  - **Proposal**: drop `"private"`, add `impl/releasing.md` with the publishing steps, publish `@cynthion/aicon-studio`, and document `npx`, the dev dependency by version and the global install in [`user/getting-started.md`](../user/getting-started.md). Then switch the consumers from `file:` to the version.
- **Prove The Folder Picker On Windows And Linux**:
  - **Context**: `POST /api/pick-folder` runs a PowerShell `FolderBrowserDialog` on Windows and `zenity` on Linux, written from their documentation and never run, see **HTTP API** in [`tech/pipeline.md`](../tech/pipeline.md#http-api).
  - **Proposal**: run **Browse…** on each platform, fix what differs, and record the proof.
- **Keyboard Grid In Sets**:
  - **Context**: the Sets table is reached cell by cell with `Tab`, one stop per icon and column.
  - **Proposal**: a grid with arrow-key navigation and one tab stop, `@angular/aria` Grid, see [`impl/angular.md`](angular.md).
- **Recovery Per Failure**:
  - **Context**: a failed drawing shows **failed** and the message in the job status, whatever the cause: a rate limit, a safety block or a client error.
  - **Proposal**: name the cause in the cell and offer the action that fits it, such as waiting out a rate limit or rewording a blocked subject.
- **Push The Job State**:
  - **Context**: the page reads `GET /api/state` every two seconds while a job runs, see **HTTP API** in [`tech/pipeline.md`](../tech/pipeline.md#http-api).
  - **Proposal**: server-sent events for the job, so a drawing shows the moment it is written.

## Security Findings

None, kept per [`impl/security-review.md`](security-review.md).
