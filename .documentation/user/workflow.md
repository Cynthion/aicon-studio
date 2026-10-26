# Workflow

From the first run to an adopted set. The studio has three views, switched in the top bar.

- **Sets**: every icon as a row, the current icons of the target and every set as columns. Each cell shows the outline beside its fill, or the fill on hover. Size, theme and the visible columns are switches at the top; a search field filters the rows.
- **Icons**: every icon with its current file, name, subject and reference. The subject is edited here, because it applies to the icon in every style. The name is the file stem and is not edited in the studio.
- **Styles**: the drawing prompts.

## Runs And Sets

**New run** draws every icon once per chosen style, after showing the image count and, with prices entered under **Settings**, the cost. Each style gets its own set, a column headed by the style and the run. One drawing job runs at a time; the page follows its progress and shows each icon as soon as it is drawn. A cell whose icon is not drawn yet shows **pending**, a failed one **failed**.

A request is tried five times on network errors, rate limits, server errors and safety-filter blocks. A rate limit waits as long as the endpoint asks. An icon that is never drawn is listed as failed; **Redraw N failed** in the column menu draws them again.

---

## Comparing

A click on a cell opens the icon panel: the outline and the fill large, both at every size the app might use, the subject the drawing was made from, and the prompt of the set. The size switch and the theme switch apply to every cell, so a set is judged at 16 pixels in dark mode as easily as at 64 in light. Columns that lost are hidden under **Columns** or deleted with **Delete set**.

---

## Redrawing

**Redraw** in the icon panel draws that icon again into the same set, with the set's own prompt, model and quality, and the current reference. A failed redraw keeps the last drawing. A redraw clears the flips of the icon, because they point at regions of the old drawing.

---

## References

**Use as reference** in the icon panel keeps that drawing's composition: every later drawing of the icon, in any style, sends it as an image and is asked to redraw it in the style. The stem shows the reference in the Sets view, and the cell holding the referenced drawing carries a **reference** badge. **Remove reference** drops it, so the icon is drawn from its subject alone again. A reference can come from a set or from the current icons.

---

## Flips

The fill is computed from the outline, not drawn: the silhouette with every hole filled, minus the interior lines. Whether an enclosed area is body or background is a matter of meaning, so a click on a region of the large fill in the icon panel switches it between filled and white and derives the fill again. **Undo last flip**, also `⌘Z` or `Ctrl+Z`, and **Reset flips** take it back. The contour never flips.

An outline whose contour is open fills only partly and needs a redraw rather than a flip.

---

## Describing

**Write subject from this drawing** sends the drawing to the describe model, which writes a subject naming what the icon stands for and what the drawing shows: its objects, their parts and their arrangement. The Icons view shows it unsaved, beside the saved subject, for review. Saved, it makes every style draw that composition in the next run.

---

## Adopting

**Adopt** in the column menu copies every SVG file of the set into the target folder, overwriting the files there, and nothing else. The outline `<stem>.svg` and the fill `<stem>-filled.svg` each hold one path with `fill-rule="evenodd"` in a square `viewBox`, without `fill`, `stroke`, `width` or `height`, so they take whatever colour and size your app gives them.

---

## Styles

**Styles** lists every prompt. **Save** writes the file, **Duplicate** copies it under a new name, **Delete** removes it; its sets stay. **New style from this prompt** in a column menu starts a style from the prompt of that set. A prompt needs `{subject}` and starts with a `#` heading.

---

## Actions

| Action                          | Where                         | Effect                                                                                      |
| :------------------------------ | :---------------------------- | :------------------------------------------------------------------------------------------ |
| New run                         | Top bar                       | Draws every icon in each chosen style, after showing the image count and the cost           |
| Settings                        | Top bar                       | The endpoint, key, models and prices                                                        |
| Use as reference                | Icon panel                    | Keeps this drawing as the reference, so later drawings keep its composition                 |
| Remove reference                | Icon panel, or Icons view     | Drops the reference                                                                         |
| Write subject from this drawing | Icon panel                    | The describe model writes a subject; the Icons view shows it unsaved, beside the saved one  |
| Save subject                    | Icons view, or `⌘Enter`       | Writes the subject to `aicon-studio.json`; the next run or redraw of the icon draws from it |
| Flip                            | Icon panel, filled view       | A click switches the region under it between filled and white, and derives the fill         |
| Undo last flip                  | Icon panel, or `⌘Z`, `Ctrl+Z` | Drops the newest flip of the icon and derives the fill                                      |
| Reset flips                     | Icon panel                    | Clears the flips of the icon and derives the fill                                           |
| Redraw                          | Icon panel                    | Draws the icon again into the set, with the set's prompt and the current reference          |
| Redraw N failed                 | Column menu                   | Draws every failed icon of the set again                                                    |
| Adopt                           | Column menu                   | Copies the SVG files of the set into the target                                             |
| New style from this prompt      | Column menu                   | Opens a new style with the prompt of the set                                                |
| Delete set                      | Column menu                   | Deletes the set folder                                                                      |
| Save, Duplicate, Delete         | Styles view                   | Edits the files in `styles/`, with a preview of the prompt for one icon                     |

---

## Related

| To Do This                               | Read                                  |
| :--------------------------------------- | :------------------------------------ |
| Install and enter the endpoint           | [Getting Started](getting-started.md) |
| Write `aicon-studio.json` and the styles | [Project Folder](project-folder.md)   |
