# Project Folder

The studio runs against one folder. That folder is the whole contract: what to draw, how to draw it, and where adopted icons go. Nothing else in your repository is read or written.

```text
<project>/
├── aicon-studio.json      the icons, the quality, and where adopted icons go
├── styles/<style>.md      one prompt per style
├── references/<stem>.svg  optional reference drawings
└── runs/<run>/<style>/    written by the studio: the drawn sets
```

A repository keeps `aicon-studio.json`, `styles/` and `references/` under version control and ignores `runs/`.

## aicon-studio.json

```json
{
  "target": "../../src/assets/icons",
  "quality": "medium",
  "icons": [
    { "stem": "home", "subject": "a house" },
    { "stem": "chevron-right", "subject": "a chevron pointing right" },
    { "stem": "chevron-down", "from": "chevron-right", "rotate": 90 }
  ]
}
```

| Field     | Holds                                                                                                           |
| :-------- | :-------------------------------------------------------------------------------------------------------------- |
| `target`  | The folder **Adopt** copies the icons into, relative to `aicon-studio.json`; created when it does not exist yet |
| `quality` | `low`, `medium` or `high`, the default of the **New run** dialog; `medium` when left out                        |
| `icons`   | One entry per icon, drawn or rotated                                                                            |

| Entry                          | `<stem>.svg`                   | `<stem>-filled.svg`         |
| :----------------------------- | :----------------------------- | :-------------------------- |
| `{ "stem", "subject" }`        | The drawn outline              | Its fill                    |
| `{ "stem", "from", "rotate" }` | The outline of `from`, rotated | The fill of `from`, rotated |

- **Stem**: the file name without `.svg`, in kebab case: letters, digits, dashes and underscores.
- **Subject**: describes the symbol to draw, such as `a gear`, not the concept it stands for, so every style draws the same symbol. The studio edits subjects under **Icons**; **Write subject from this drawing** writes one that also describes the composition, see [Workflow](workflow.md).
- **Rotation**: the four chevrons are one drawing, so they match. A rotation is referenced, flipped and redrawn through its `from` icon.

---

## Styles

Every file `styles/<style>.md` is one drawing prompt, sent to the model whole. `{subject}` in it is replaced by the subject of each icon. The file starts with a `#` heading, which names the style in the prompt. The studio edits styles under **Styles**, with a preview of the prompt for one icon.

The styles of the example project share one structure, which the pipeline relies on:

- **Look**: the style itself, and that the icon is centred on a square canvas, filling about 80% of it.
- **Outlines**: outlines only, with every outer contour as one continuous closed line. The fill is derived from the outline, so an open contour fills only partly.
- **Colour And Limits**: solid black on a transparent background, nothing else.

---

## References

A referenced icon has its chosen drawing in `references/<stem>.svg`. Every later drawing of that icon sends the reference as an image, so the model keeps its composition and redraws it in the style. An icon without a reference is drawn from its subject alone.

A reference is chosen in the studio from any drawing, a set's or the target's, and removed there, see [Workflow](workflow.md).

---

## Runs

A run draws every icon of `aicon-studio.json` once per chosen style, each style into its own set, `runs/<yyyy-mm-dd-hhmm>/<style>/`. A set holds `_run.json`, the record of the run, and the outline and fill of every icon drawn so far. An icon that failed has no file. Delete a set in the studio, or delete `runs/` whenever you like: the target keeps what was adopted.

---

## Related

| To Do This                         | Read                                  |
| :--------------------------------- | :------------------------------------ |
| Install and enter the endpoint     | [Getting Started](getting-started.md) |
| Draw, compare, redraw, flip, adopt | [Workflow](workflow.md)               |
