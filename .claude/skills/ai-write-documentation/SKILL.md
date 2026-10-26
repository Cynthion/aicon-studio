---
name: ai-write-documentation
description: Write or update repository documentation following the documentation guidelines. Use when a change needs its documentation updated, when a new document must be placed in the right bucket, or when documentation drifts from the code.
---

# Write Documentation

Apply [`impl/documentation.md`](../../../.documentation/impl/documentation.md). Read it first: it is the single source for style and bucket placement, and this skill does not restate it.

## Placement

The buckets, what each holds, and which content is documented at all are defined in [`impl/documentation.md`](../../../.documentation/impl/documentation.md).

The buckets are flat. A directory is introduced only when necessary, see [`README.md`](../../../.documentation/README.md), so a new document sits beside the existing files of its bucket.

## Workflow

1. Decide whether a document is needed at all. Self-documenting code and an existing document that already covers it both beat a new file.
2. Find the authoritative home. Search for the fact before writing it: if it already exists, link to it and stop.
3. Write or extend. Extending an existing section beats adding a parallel one.
4. Update [`.documentation/README.md`](../../../.documentation/README.md) when a file is added, removed, or moved.
5. Verify: `npm run docs:lint`, for style, relative links and heading anchors.

## Rules

- **Read The Guide First**: [`impl/documentation.md`](../../../.documentation/impl/documentation.md) is the single source for style and placement. This skill does not restate it: apply it.
- **No Noisy Reformatting**: Do not rewrap or reformat Markdown you did not change.
- **Cross-Link Both Ways**: A new document references related documents and is referenced by them, so it is reachable.
