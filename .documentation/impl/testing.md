# Testing

A spec pins a rule the studio's user or the API's consumer depends on: what a route answers, what a run writes, what a fill looks like. It does not pin how the code gets there, so a refactor that keeps the rule keeps every spec green, and a change that breaks the rule fails one. See [`impl/definition-of-done.md`](definition-of-done.md) for the Definition of Done.

---

## Test First

Expected values come from the requirement, not from the code. A spec written after its code asserts what the code does, so a defect passes as the rule.

1. **Cases**: before any spec or code, the cases are listed as one table per spec file.
2. **Approval**: the developer approves the table. An AI agent writes the tables in its message, then asks with a short `AskUserQuestion`; the developer collapses the question to read them. A table in an option's `preview` is too narrow to read. A correction changes the table.
3. **Red**: the specs are written and run. Code that does not exist yet gets its final signature and a body that throws, so each case fails on its assertion. A compile error is not red.
4. **Green**: the code is written until the specs pass.
5. **Fixed Expectations**: an approved expected value never changes to make the code pass. When one proves wrong, the table goes back for approval. Renaming a case or reshaping a fixture needs none.

| Column     | Holds                                     |
| :--------- | :---------------------------------------- |
| `#`        | Number, so a correction can name the case |
| `Case`     | The rule, worded as its `it`              |
| `Given`    | The input                                 |
| `Expected` | The result                                |
| `Source`   | Where the expected value comes from       |

| Source    | Expected Value Comes From                                   |
| :-------- | :---------------------------------------------------------- |
| `backlog` | The item in [`impl/backlog.md`](backlog.md)                 |
| `docs`    | A document under `.documentation/`                          |
| `current` | Behavior that exists and must survive the change            |
| `assumed` | The proposer's own reading, which the approval checks first |

- **Exempt**: styling, documentation, configuration, and a refactoring that changes no behavior, which the existing specs prove.

---

## Test Stack

| Tool          | Role                                                                       |
| :------------ | :------------------------------------------------------------------------- |
| Vitest        | Runner and assertions, in Node, with its globals on                        |
| `ng test`     | The page's specs, Vitest through the Angular CLI, in jsdom                 |
| Playwright    | The Chromium the pipeline rasterizes with; the specs launch the real thing |
| Stub endpoint | `test/stub.ts`, a fake OpenAI-compatible API, see below                    |

`vitest.config.ts` sets the long timeouts the pipeline specs need: they launch Chromium and wait out real retry delays. The browser is installed once per machine with `npx playwright install chromium`.

---

## Writing A Spec

- **Location**: `test/<module>.spec.ts` for `src/<module>.ts`, and `test/fill.spec.ts` for the raster fill, with one `describe` per exported function or route group. A spec of the page sits beside its file, `studio/src/app/**/<name>.spec.ts`.
- **Behavior, Not Mechanism**: an `it` names the rule it proves, such as `'keeps the stored key when none is sent'`, and asserts on the answer, the file or the request. It is not named after the bug that prompted it.
- **One Rule Per Test**: an `it` proves one rule, with one `expect` where practical; several values go into one array.
- **Own Project**: a spec builds its project in a temporary folder with `makeProject` of `test/helpers.ts`, from the fixture files, and never runs against `example/`.
- **Real Requests**: a route is proven through a real HTTP request to a server listening on a free port. `request` of `test/helpers.ts` sets every header, `Host` included, which `fetch` refuses.
- **Examples That Can Fail**: example data is chosen so the defect a spec guards against can show. A spec written test first fails before its code exists.
- **No Reaching In**: a spec calls a module's exports or the API only. A function is not exported for its spec.
- **Globals**: a spec does not import `describe`, `it`, `expect` or `vi` from `vitest`.

---

## The Stub Endpoint

`startStub` in `test/stub.ts` serves `images/generations`, `images/edits` and `chat/completions` on a free port and records every request: endpoint, headers, body fields, and the size of the `image[]` part of an edit. An image request is answered with the fixture PNG whose subject the prompt contains, `test/fixtures/png/`, so a run draws real outlines. `answers` queues one answer per coming request before the PNGs, `always` replaces them, and `delayMs` holds every answer, which is how rate limits, safety blocks, client errors and a running job are proven.

---

## Golden Fixtures

`test/fixtures/set/` is a drawn set: eight outlines, their fills and the three rotations of `chevron-right`, with its `_run.json`. `test/fill.spec.ts` derives the fills and rotations again and compares byte for byte. `test/fixtures/home-flipped.svg` is the fill of `home` with one flip at its centre, and `test/fixtures/png/` holds the three PNGs the stub answers.

- **Provenance**: every fixture is what the pipeline wrote, never edited by hand, see **Fixtures** in [`impl/definition-of-done.md`](definition-of-done.md).
- **Regeneration**: a deliberate change to the fill, or a Playwright bump whose Chromium rasterizes differently, changes the derived files. Regenerate the fixtures with the pipeline, look at the changed fills in the studio, and commit them in the same change as its proof.
- **Platforms**: the fixtures were written on macOS. Chromium's rasterization is expected to match on Linux; a difference in CI is a finding, not a flake.

---

## Running Tests

- **All Specs**: `npm test`, which runs every file once: the server's, then the page's.
- **The Page's Specs**: `npx ng test --no-watch`.
- **One File**: `npx vitest run test/settings.spec.ts`.
- **By Name**: `npx vitest run -t 'keeps the stored key'`.
- **Watch Mode**: `npx vitest` in a terminal.

When each run is a gate is in [`impl/definition-of-done.md`](definition-of-done.md).

---

## Visual Testing

The page's specs cover its rules, not its rendering. A change to the page is proven on the served studio, or on the page `npm start` serves with hot reload, by hand or through the `playwright` MCP server described in [`impl/ai-harness.md`](ai-harness.md), against the stub endpoint or a real one.

- **Own Studio**: a second studio, `node src/cli.ts <copy of example> --port 54401`, over a copy of `example/` in a temporary folder, so `example/aicon-studio.json` stays as it is. `npx ng serve --port 54411 --proxy-config <copy of studio/proxy.conf.json naming 54401>` serves the page over it with hot reload.
- **Own Settings**: `XDG_CONFIG_HOME` set to a temporary folder, so the proof writes no settings file of yours.
- **Stub**: `startStub` of `test/stub.ts` listens on a free port; its URL is the base URL entered under **Settings**.
