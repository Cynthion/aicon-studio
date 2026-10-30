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

| File                                                         | Purpose                                                        |
| :----------------------------------------------------------- | :------------------------------------------------------------- |
| [`impl/a11y.md`](impl/a11y.md)                               | Accessible names, nesting, dialogs, target size                |
| [`impl/ai-harness.md`](impl/ai-harness.md)                   | AI setup of this repository                                    |
| [`impl/angular.md`](impl/angular.md)                         | Conventions of the Angular studio page                         |
| [`impl/definition-of-done.md`](impl/definition-of-done.md)   | Definition of Done                                             |
| [`impl/documentation.md`](impl/documentation.md)             | Documentation style and authoring guide                        |
| [`impl/releasing.md`](impl/releasing.md)                     | Releasing the studio: version, notes, npm, tag, GitHub release |
| [`impl/renovate.md`](impl/renovate.md)                       | Dependency updates, groups, the ceiling                        |
| [`impl/security-review.md`](impl/security-review.md)         | How a vulnerability is recorded and kept current               |
| [`impl/testing.md`](impl/testing.md)                         | Test first, the stub endpoint, the golden fixtures             |
| [`impl/ubiquitous-language.md`](impl/ubiquitous-language.md) | One name per concept                                           |
| [`impl/worktrees.md`](impl/worktrees.md)                     | Parallel work on several branches                              |

Work items:

| File                                 | Purpose                                                                 |
| :----------------------------------- | :---------------------------------------------------------------------- |
| [`impl/backlog.md`](impl/backlog.md) | Project backlog, bugs and features, the single source of truth for work |
