---
name: ai-create-component
description: Create or modify an Angular component of the studio page with correct placement, selector, signal API and styles. Use when a component is added, moved, or has its inputs or outputs changed.
---

# Create A Component

The conventions live in `.documentation/impl/`. This skill covers the scaffolding mechanics and does not restate them.

## 1. Decide Placement First

Placement decides the selector and the folder. The placement and selector rules are in [`impl/angular.md`](../../../.documentation/impl/angular.md): read it first.

| Placement                      | Goes To                                                         | Selector           |
| :----------------------------- | :-------------------------------------------------------------- | :----------------- |
| Reusable across views          | `ui/<name>/`                                                    | `studio-ui-<name>` |
| Used once, or specific to view | Sibling of its consumer, the highest shared parent that uses it | `studio-<name>`    |

A single-use component never goes under `ui/`.

## 2. Files

Copy from `templates/`, rename: `<name>.component.ts`, `.component.html`, `.component.scss`. Every component sits in a folder named after it.

## 3. Conventions

Read what applies before writing.

| Concern                                                       | Document                                                     |
| :------------------------------------------------------------ | :----------------------------------------------------------- |
| Placement, selectors, signal API, change detection, templates | [`impl/angular.md`](../../../.documentation/impl/angular.md) |
| Accessible names, nesting, dialogs, target size               | [`impl/a11y.md`](../../../.documentation/impl/a11y.md)       |

## 4. Prove It

Run the `ai-review-change` skill. A user-visible change is proven on the served studio, see **Visual Proof** in [`impl/definition-of-done.md`](../../../.documentation/impl/definition-of-done.md#verification).
