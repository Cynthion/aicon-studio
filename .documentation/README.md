# Documentation Index

How to write documents: [`impl/documentation.md`](impl/documentation.md).

Three buckets, one per audience. The root [`README.md`](../README.md) is the entry point for whoever runs the studio and links in here; [`CONTRIBUTING.md`](../CONTRIBUTING.md) beside it is the entry point for contributors. Introduce directory hierarchy only if necessary.

## User

For whoever runs the studio against a project.

| File                                                 | Purpose                                                           |
| :--------------------------------------------------- | :---------------------------------------------------------------- |
| [`user/getting-started.md`](user/getting-started.md) | Install, Chromium, Settings, the first run on the example project |
| [`user/project-folder.md`](user/project-folder.md)   | The folder contract, `aicon-studio.json`, styles and references   |
| [`user/workflow.md`](user/workflow.md)               | Runs and sets, comparing, redrawing, flips, describing, Adopt     |

---

## Tech

For maintainers. Contains technical documentation of features, configurations, patterns and architecture.

| File                                   | Purpose                                                                |
| :------------------------------------- | :--------------------------------------------------------------------- |
| [`tech/pipeline.md`](tech/pipeline.md) | Prompt to PNG to path to fill, the set record, the HTTP API, the guard |

---

## Impl

For whoever works the repository. Contains technical documentation of the setup and conventions used in the repository, and the repository's own work items.

| File                                                       | Purpose                                            |
| :--------------------------------------------------------- | :------------------------------------------------- |
| [`impl/ai-harness.md`](impl/ai-harness.md)                 | AI setup of this repository                        |
| [`impl/definition-of-done.md`](impl/definition-of-done.md) | Definition of Done                                 |
| [`impl/documentation.md`](impl/documentation.md)           | Documentation style and authoring guide            |
| [`impl/testing.md`](impl/testing.md)                       | Test first, the stub endpoint, the golden fixtures |

Work items:

| File                                 | Purpose                                                                 |
| :----------------------------------- | :---------------------------------------------------------------------- |
| [`impl/backlog.md`](impl/backlog.md) | Project backlog, bugs and features, the single source of truth for work |
