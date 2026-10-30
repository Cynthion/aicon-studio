# Angular

Conventions for the Angular studio page: where a component lives, what it is called, how it declares its API and how it notifies its view. The page lives in `studio/`, one Angular application in the repository's own `package.json` and `angular.json`; `ng build` writes it to `dist/studio/browser`, which `src/server.ts` serves.

## Workspace

| Path                     | Holds                                                                                 |
| :----------------------- | :------------------------------------------------------------------------------------ |
| `studio/src/app/api/`    | The HTTP API: its types, the service that calls it, the page's state and pure helpers |
| `studio/src/app/ui/`     | Reusable components: dialog, confirm, toast, item menu, pair                          |
| `studio/src/app/<view>/` | One folder per view, `icons`, `styles`, `sets`, with the components only it uses      |
| `studio/src/app/<name>/` | The shell's own components and dialogs: job status, settings, project, run            |

- **Forms**: ngx-formidable fields on Signal Forms. A rule the server also checks lives in `studio.helpers.ts`, so the form and its spec share it.
- **Menus**: `@angular/aria` Menu, through `studio-ui-item-menu`. Dialogs are the native `<dialog>`, through `studio-ui-dialog`.
- **Routing**: hash routes, `#/icons`, `#/styles`, `#/sets`, so the server serves `/` alone.
- **Development**: `npm start` serves the studio over `example` on `54400` and the page with hot reload on `http://localhost:54410`, which `studio/proxy.conf.json` forwards `/api` and `/files` to the studio. `Ctrl+C` stops both. The script needs a POSIX shell; on Windows, `node src/cli.ts example` and `ng serve` run in two terminals.

---

## Placement And Selectors

- **Reusable Components**: used by more than one view, under `ui/<name>/`, selector `studio-ui-<name>`.
- **Single-Use Components**: used once, or by one view, colocated as a sibling of their consumer, the highest shared parent, never under `ui/`. Selector `studio-<name>`.
- **Own Folder**: every component sits in a folder named after its file, `<name>/<name>.component.ts`, with `.component.html` and `.component.scss` beside it.
- **Directives**: attribute selector `[studio<Name>]`.
- **Compositions Vs Leaves**: a composition wires children together, a page or a form orchestrator, and stays style-free apart from the layout rules that arrange its children. A leaf renders concrete presentation and owns its full styles. Reusability is orthogonal: a single-use component can be a styled leaf.
- **API Access**: the service that calls the HTTP API of [`tech/pipeline.md`](../tech/pipeline.md#http-api) is injected by the composition that owns a view. A leaf takes inputs and emits outputs only.
- **Symmetry**: propagate any new capability to all siblings in the same shape. Components sharing a role mirror each other in naming, input and output order, blank-line grouping, template attribute order and selector wiring.

---

## Signal API

Components and directives declare their API with signal functions. The decorator forms are lint errors, from these `angular-eslint` rules in the workspace's ESLint configuration:

- `prefer-signals`
- `prefer-signal-model`
- `prefer-output-emitter-ref`
- `prefer-output-readonly`
- `no-uncalled-signals`
- `reactive-context-must-read-signal`

| Concern                | Convention                                                                           |
| :--------------------- | :----------------------------------------------------------------------------------- |
| Input                  | `input()`, `input.required()`; coercion through `input(x, { transform })`            |
| Two-Way                | `model()`, never an `input()` plus an `xChange` `output()`                           |
| Output                 | `output()`; `outputFromObservable()` to expose an existing `Observable`              |
| Queries                | `viewChild()`, `viewChildren()`, `contentChild()`, `contentChildren()`               |
| Derived Value          | `computed()`                                                                         |
| Resettable Local State | `linkedSignal()` seeded by an input                                                  |
| Reaction               | `effect()`, or `afterRenderEffect()` when the reaction reads or writes the DOM       |
| Template Narrowing     | `@if (item(); as item)`: a signal call is not narrowed, so the block reads the alias |
| Programmatic Input     | `ComponentRef.setInput()`: an input signal is read-only                              |
| Host Binding           | `host` metadata, never `@HostBinding` or `@HostListener`                             |

---

## Change Detection

- **Zoneless**: `NgZone` is a no-op and is never injected. A plain field assigned from a timer, observer or subscription stays stale, because a view re-renders only after Angular is notified by:
  - A template or host event
  - A signal the template reads
  - The `async` pipe
  - `setInput()`
  - `markForCheck()`
- **Strategy**: never set `changeDetection`. `OnPush` is the Angular default, so every component already has it.
- **Check**: development builds re-check every view after each change detection run, `provideCheckNoChangesConfig({ exhaustive: true })` in the application config. An `NG0100 ExpressionChangedAfterItHasBeenCheckedError` in the console means a binding changed without notifying Angular and the view shows stale state. Fix the missing notification, with a signal or `markForCheck()`, and never silence the error.

---

## Templates

Templates use self-closing tags for elements without content and `[class]` or `[style]` bindings instead of `ngClass` or `ngStyle`. The lint rules are:

- `prefer-host-metadata-property`
- `prefer-self-closing-tags`
- `prefer-class-binding`
- `prefer-style-binding`

An `@for` tracks a stable key of the item, such as `track icon.stem` or `track set.name`, and `$index` when the position is the identity. `track item` is reserved for primitives and for items whose instances outlive the array. An array rebuilt with equal objects otherwise re-creates every row, and development builds log `NG0956`.

---

## TypeScript

- **File Kinds**: a file's suffix names the one kind of code it holds: `*.component.ts`, `*.directive.ts`, `*.service.ts`, `*.model.ts`, `*.helpers.ts`, `*.routes.ts`. A component declares the types of its own inputs and outputs in its own file, and other files import them from there.
- **Immutability**: prefer immutable transformations and never mutate an input or shared state. Prefer `map`, `filter`, `reduce` and spread, omit a property by destructuring instead of `delete`, and never use `map` for a side effect. Local mutation that does not escape its function is acceptable. Use `readonly` where practical; spread is shallow.
- **Observable Naming**: append `$` to anything whose type is an `Observable`: properties, variables, methods, functions and parameters. The lint rule `rxjs-x/finnish` enforces it. A signal, input, model or output is not an `Observable` and carries no `$`.
- **Constant Naming**: an exported module-level `const` is `CONSTANT_CASE`, as `RUN_FILE` in `src/pipeline.ts` is. Functions stay `camelCase`, and so do the application config and the routes, as Angular names them.
- **Comments**: minimize inline comments and prefer self-explanatory names. A brief doc comment goes only on an exported member whose intent is not obvious from its signature.
