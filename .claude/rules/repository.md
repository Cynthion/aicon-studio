# Repository Invariants

Always in effect. Area conventions load automatically for the files they apply to.

## Safety

- Never commit an API key or any other credential. The user settings file lives outside the repository, see [`user/getting-started.md`](../../.documentation/user/getting-started.md).
- Never hand-edit build output under `dist/`, or a set under `example/runs/`.
- Never change a file under `test/fixtures/` by hand. A fixture is what the pipeline wrote, byte for byte, see [`impl/testing.md`](../../.documentation/impl/testing.md).

## Running Servers

- Reuse a studio that is already listening. The default port is 54400; `--port` serves a second one.
- Never kill or restart a server you did not start. If nothing is listening, ask rather than starting one.
- Clean up only your own headless browser instance.

## Change Shape

- Prefer the smallest change that matches nearby code.
- Prefer extending an existing helper over adding a new one.
- Do not reformat files unrelated to the task.

## Where Things Live

- **Index**: repository knowledge is indexed by [`.documentation/README.md`](../../.documentation/README.md).
- **Definition Of Done**: [`.documentation/impl/definition-of-done.md`](../../.documentation/impl/definition-of-done.md).
- **AI Setup**: [`.documentation/impl/ai-harness.md`](../../.documentation/impl/ai-harness.md).
