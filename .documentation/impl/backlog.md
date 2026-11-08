# Backlog

The single source of truth for work items, in priority order; bugs come first. A shipped item is deleted, not annotated, and the commit history holds what shipped.

## Bugs

- **SIGTERM Closes Chromium, Not The Studio**:
  - **Context**: Playwright closes its Chromium on `SIGTERM` without ending the process, so a studio sent `SIGTERM` during a job keeps serving while every drawing in flight fails with `Target page, context or browser has been closed`. The job log lists them under **Other failures**, with the studio's own error as **Message of the endpoint**. `Ctrl+C`, `SIGINT`, ends the studio as it should.
  - **Proposal**: end the process on `SIGTERM` as on `SIGINT`, and record a failure the studio caused, not the endpoint, under a cause of its own.
- **Flaky Rate-Limit Stop Spec**:
  - **Context**: `ends a rate-limit pause at a stop` in `test/failure.spec.ts` asserts that the pause ends within 2 seconds of the stop. Under the load of `npm test` it fails about one run in two, on `main` as well; alone, it passes.
  - **Proposal**: measure the end of the pause against the stop without a wall-clock bound that load can break, or run the timing specs apart from the rest, see [`impl/testing.md`](testing.md).

## Features

- **Rasterize Without A Browser**:
  - **Context**: every fill and every reference image is rasterized by Playwright's Chromium, a browser install of about 150 MB that `npm ci` does not download, see [`user/getting-started.md`](../user/getting-started.md).
  - **Proposal**: replace it with `@resvg/resvg-js`, a native SVG rasterizer. Its anti-aliasing differs from Chromium's, so the fills change slightly; the golden fixtures in `test/fixtures/` are regenerated and the change needs its own visual proof on a drawn set, see [`impl/testing.md`](testing.md).
- **Adopt Leftovers**:
  - **Context**: **Adopt** copies every SVG file of a set, so it brings back the files of an icon removed since, and a test set adopts with icons missing.
  - **Proposal**: adopt the files of the icons of `aicon-studio.json` only, and say which icons the set lacks before copying.
- **First Release**:
  - **Context**: the package is unpublished and runs from a clone, linked by a `file:` dev dependency where another repository uses it. The steps are in [`impl/releasing.md`](releasing.md).
  - **Proposal**: run `/ai-publish-release`, document `npx`, the dev dependency by version and the global install in [`user/getting-started.md`](../user/getting-started.md), then switch the consumers from `file:` to the version.
- **Prove The Folder Picker On Windows And Linux**:
  - **Context**: `POST /api/pick-folder` runs a PowerShell `FolderBrowserDialog` on Windows and `zenity` on Linux, written from their documentation and never run, see **HTTP API** in [`tech/pipeline.md`](../tech/pipeline.md#http-api).
  - **Proposal**: run **Browse…** on each platform, fix what differs, and record the proof.
- **Keyboard Grid In Sets**:
  - **Context**: the Sets table is reached cell by cell with `Tab`, one stop per icon and column.
  - **Proposal**: a grid with arrow-key navigation and one tab stop, `@angular/aria` Grid, see [`impl/angular.md`](angular.md).
- **Push The Job State**:
  - **Context**: the page reads `GET /api/state` every two seconds while a job runs, see **HTTP API** in [`tech/pipeline.md`](../tech/pipeline.md#http-api).
  - **Proposal**: server-sent events for the job, so a drawing shows the moment it is written.
- **Start From Reference Images**:
  - **Context**: a reference comes from a drawing of a set or of the current icons, so a project without drawings starts from subjects alone, see [`user/workflow.md`](../user/workflow.md).
  - **Proposal**: decide whether an image from elsewhere, such as one found on the internet, can be added as the reference of an icon before any run, and build it if so.
- **Node Range Not Enforced**:
  - **Context**: `engines` asks for Node 24 or later, but npm only warns, and the packed studio ran on Node 22.6.
  - **Proposal**: decide which Node the studio needs; either lower `engines` to what is proven, or make the command refuse an older Node with a message.

## Security Findings

None, kept per [`impl/security-review.md`](security-review.md).
