# Workflow

From the first run to an adopted set. The studio has three views, in the order of the work and switched by the tabs in the top bar, each with its count.

- **Icons**: every icon with its current file, name, subject and reference. Icons are added, ordered and removed here, and the subject is edited here, because it applies to the icon in every style. The name is the file stem and is not renamed in the studio.
- **Styles**: the drawing prompts.
- **Sets**: every icon as a row, the current icons of the target and every set as columns. Each cell shows the outline beside its fill, or the fill on hover. Size, the fill and the visible columns are switches above the table; a search field filters the rows and counts the matches.

Until the setup is done, a dot marks where its next step is: **Settings** first, then the **Icons**, **Styles** and **Sets** tab, until the first run is drawn. An empty view holds the button for its step, such as **Add icon**.

## Controls

Every view uses the same controls, so an action is found where the others of its kind are.

- **Add**: the button that adds, such as **New style** or **New run**, sits at the top of what it adds to.
- **Edit In Place**: a subject or a prompt is edited where it is shown. **Save** and **Revert** appear once it differs from the saved one, and `⌘Enter` saves a subject. A rule it breaks shows beside the field.
- **Menu**: the ⋯ button of an icon row or a set column holds every action on it. A menu opens with `Enter` or a click, moves with the arrow keys and closes with `Escape`.
- **Move**: an icon moves by its handle ⠿ or by **Move up**, **Move down**, **Move to top** and **Move to bottom** in its menu, a set column by its handle or by **Move left** and **Move right**. The current icons stay first. Icons do not move while the filter hides some of them or a job runs.
- **Confirm**: an action that deletes or overwrites files asks first, in a dialog that names it and its effect, such as **Delete set 2026-10-28-1000/soft**. Leaving a view with an unsaved subject or style asks too.
- **Messages**: a done action shows a message for three seconds; a failure stays until it is dismissed with ✕.

---

## Icons

**Add icon** in the Icons view adds an icon at the end of the list: drawn from a subject, or a rotation of a drawn icon by 90, 180 or 270 degrees. A drawn icon is drawn by the next run, or into a set by **Complete set**. A rotation is written at once into every set that holds its icon. **Remove icon…** in the row menu removes the icon and its reference, after asking; the drawings in the sets and the target stay. An icon that rotations come from is removed after them. The order of the icons is the order of the rows, in every view and in `aicon-studio.json`.

---

## Project

**Project** in the top bar shows the folder the studio runs against and opens another one. The dialog lists the folders opened before in this browser, takes a path, and **Browse…** opens the folder picker of the operating system. Opening a folder switches every view to its icons, styles, references and sets; the settings stay, because they are yours and not the project's. A folder without `aicon-studio.json` is refused, and nothing switches while a drawing job runs. **Create** writes an empty `aicon-studio.json` into the folder instead, creating the folder when missing, and opens it; its `target` is `./icons` until the file is edited, see [Project Folder](project-folder.md).

---

## Runs And Sets

**New run** draws every icon once per chosen style, after showing the image count and, with prices entered under **Settings**, the cost. Each style gets its own set, a column headed by the style and the run. One drawing job runs at a time; the page follows its progress and shows each icon as soon as it is drawn. A cell whose icon is not drawn yet shows **pending**, a failed one **failed**, and one the set has no drawing of **not drawn**.

- **Test Run**: **New test run** beside **New run**, or **Test run: chosen icons** in the dialog, draws only the icons ticked there, and the rotations of those. A new style is judged on a few icons before every icon is paid for. The choice is kept for the next test run.
- **Complete Set**: **Complete set** in the column menu draws every icon the set has no drawing of, with the set's own prompt, model and quality: the rest of a test run, the icons a stop left, the failed ones, and icons added since.
- **Stop**: **Stop** beside the job status starts no further drawing. The drawings already requested finish and are kept, since they are paid for either way; the rest stay **not drawn** until **Complete set**.

A request is tried five times on network errors, rate limits, server errors and safety-filter blocks. A rate limit waits as long as the endpoint asks. An icon that is never drawn is listed as failed; **Complete set** in the column menu draws it again.

---

## Comparing

A click on a cell opens the icon panel: the outline and the fill large, both at every size the app might use, the subject the drawing was made from, and the prompt of the set. `Escape` closes it. The size switch and the theme switch apply to every cell, so a set is judged at 16 pixels in dark mode as easily as at 64 in light. Columns that lost are hidden with **Hide column** or under **Columns**, or deleted with **Delete set**.

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

**Write subject from this drawing** sends the drawing to the describe model, which writes a subject naming what the icon stands for and what the drawing shows: its objects, their parts and their arrangement. The Icons view opens with it unsaved, beside the saved subject, for review. **Save** keeps it, **Revert** drops it. Saved, it makes every style draw that composition in the next run.

---

## Adopting

**Adopt** in the column menu copies every SVG file of the set into the target folder, overwriting the files there, and nothing else. The outline `<stem>.svg` and the fill `<stem>-filled.svg` each hold one path with `fill-rule="evenodd"` in a square `viewBox`, without `fill`, `stroke`, `width` or `height`, so they take whatever colour and size your app gives them.

---

## Styles

**Styles** lists every prompt. **Save** writes the file, **Duplicate** copies it under a new name, **Delete** removes it; its sets stay. **New style from this prompt** in a column menu starts a style from the prompt of that set. A prompt needs `{subject}` and starts with a `#` heading.

---

## Actions

| Action                          | Where                         | Effect                                                                                        |
| :------------------------------ | :---------------------------- | :-------------------------------------------------------------------------------------------- |
| New run                         | Top bar                       | Draws every icon, or a test run of chosen icons, in each chosen style, after showing the cost |
| New test run                    | Top bar                       | New run, preset to chosen icons                                                               |
| Stop                            | Top bar, beside the job       | Starts no further drawing; the drawings in flight finish and are kept                         |
| Settings                        | Top bar                       | The endpoint, key, models and prices                                                          |
| Project                         | Top bar                       | Opens another project folder: one opened before, a typed path, or one chosen with **Browse…** |
| Use as reference                | Icon panel                    | Keeps this drawing as the reference, so later drawings keep its composition                   |
| Remove reference                | Icon panel, or Icons view     | Drops the reference                                                                           |
| Write subject from this drawing | Icon panel                    | The describe model writes a subject; the Icons view shows it unsaved, beside the saved one    |
| Save subject                    | Icons view, or `⌘Enter`       | Writes the subject to `aicon-studio.json`; the next run or redraw of the icon draws from it   |
| Add icon                        | Icons view                    | Adds a drawn icon or a rotation to `aicon-studio.json`                                        |
| Move up, down, to top, bottom   | Row menu, or the handle ⠿     | Orders the icons in `aicon-studio.json`                                                       |
| Remove icon                     | Row menu                      | Removes the icon and its reference, after asking                                              |
| Flip                            | Icon panel, filled view       | A click switches the region under it between filled and white, and derives the fill           |
| Undo last flip                  | Icon panel, or `⌘Z`, `Ctrl+Z` | Drops the newest flip of the icon and derives the fill                                        |
| Reset flips                     | Icon panel                    | Clears the flips of the icon and derives the fill                                             |
| Redraw                          | Icon panel                    | Draws the icon again into the set, with the set's prompt and the current reference            |
| Complete set                    | Column menu                   | Draws every icon the set has no drawing of                                                    |
| Adopt                           | Column menu                   | Copies the SVG files of the set into the target, after asking                                 |
| New style from this prompt      | Column menu                   | Opens a new style with the prompt of the set                                                  |
| Move left, Move right           | Column menu, or the handle ⠿  | Moves the set column; the order is kept in this browser                                       |
| Hide column                     | Column menu, or **Columns**   | Hides the column; **Columns** shows it again                                                  |
| Delete set                      | Column menu                   | Deletes the set folder, after asking                                                          |
| Save, Revert, Duplicate, Delete | Styles view                   | Edits the files in `styles/`, with a preview of the prompt for one icon; Delete asks first    |

---

## Related

| To Do This                               | Read                                  |
| :--------------------------------------- | :------------------------------------ |
| Install and enter the endpoint           | [Getting Started](getting-started.md) |
| Write `aicon-studio.json` and the styles | [Project Folder](project-folder.md)   |
