# Workflow

From the first run to an adopted set. The studio has three views, in the order of the work and switched by the tabs in the top bar, each with its count.

- **Icons**: every icon with its current file, stem, subject and reference. Icons are added, renamed, ordered and removed in this view, and the subject is edited in it, because it applies to the icon in every style. The stem names the files, so a rename renames them too.
- **Styles**: the drawing prompts.
- **Sets**: every icon as a row, the current icons of the target and every set as columns. Each cell shows the outline beside its fill, or the fill on hover. While no icon panel is open, a line above the table names what a cell and the ⋯ of a column do. Size, the fill and the visible columns are switches above the table; **Filter icons** filters the rows of the **Icons** and **Sets** view and counts the matches.

Until the setup is done, a dot marks where its next step is: **Settings** first, then the **Icons**, **Styles** and **Sets** tab, until the first run is drawn. An empty view holds the button for its step, such as **Add icon**.

## Controls

Every view uses the same controls, so an action is found where the others of its kind are.

- **Add**: the button that adds, such as **New style** or **New run**, sits at the top of what it adds to.
- **Edit In Place**: a subject or a prompt is edited where it is shown. **Save** and **Revert** appear once it differs from the saved one, and `⌘Enter` or `Ctrl+Enter` saves a subject. A rule it breaks shows beside the field.
- **Menu**: the ⋯ button of an icon row or a set column holds every action on it. A menu opens with `Enter` or a click, moves with the arrow keys and closes with `Escape`.
- **Move**: an icon moves by its handle ⠿ or by **Move up**, **Move down**, **Move to top** and **Move to bottom** in its menu, a set column by its handle or by **Move left** and **Move right**. The current icons stay first. Icons do not move while **Filter icons** hides some of them or a job runs.
- **Confirm**: an action that deletes or overwrites files asks first, in a dialog that names it and its effect, such as **Delete set 2026-10-28-1000/soft**. Leaving a view with an unsaved subject or style asks **Discard unsaved changes?**, with **Discard** and **Keep editing**.
- **Messages**: a done action shows a message for three seconds; a failure stays until it is dismissed with ✕.

---

## Icons

**Add icon** in the **Icons** view opens a dialog that adds an icon at the end of the list.

| Field                | Holds                                                                                    |
| :------------------- | :--------------------------------------------------------------------------------------- |
| **Kind**             | **Drawn from a subject**, **Rotation of a drawn icon**, or **Several, pasted as a list** |
| **Stem**             | The file name without `.svg`, such as `gear` or `chevron-up`                             |
| **Subject**          | The symbol to draw, such as `a gear`, not the concept it stands for; for a drawn icon    |
| **Rotation of**      | The drawn icon to rotate; for a rotation                                                 |
| **Angle, clockwise** | **90°**, **180°** or **270°**; for a rotation                                            |
| **Icons**            | One `stem: subject` per line, such as `gear: a gear`; for several                        |

A drawn icon is drawn by the next run, or into a set by **Complete set**. A rotation is written at once into every set that holds its icon. A pasted list adds every line as a drawn icon, or none: a line without exactly one colon, with a stem that exists or with an empty subject is named by its number. **Remove icon…** in the row menu removes the icon and its reference, after asking; the drawings in the sets and the target stay. An icon that rotations come from is removed after them. The order of the icons is the order of the rows, in every view and in `aicon-studio.json`.

**Rename icon…** in the row menu renames the stem in `aicon-studio.json` and in the `from` of its rotations, its reference, and its outline and fill in every set and the target, so its drawings, flips and failures stay with it. The dialog names what it renames, and warns when files of the new stem, left by a removed icon, are overwritten. An app that uses the files of the target needs the new name too.

---

## Project

**Project** in the top bar shows the folder the studio runs against and opens another one.

| Control    | Does                                                                                            |
| :--------- | :---------------------------------------------------------------------------------------------- |
| **Recent** | The folders opened before in this browser; a click opens one, ✕ forgets it                      |
| **Folder** | A path, typed or chosen with **Browse…**, which opens the folder picker of the operating system |
| **Open**   | Switches every view to the icons, styles, references and sets of the folder                     |
| **Create** | Writes the example project into the folder, creating the folder when missing, and opens it      |

The settings stay, because they belong to the user and not to the project. **Open** refuses a folder without `aicon-studio.json`, and nothing switches while a drawing job runs. The example project holds six icons and six styles to start from, with `./icons` as target until the file is edited, see [Project Folder](project-folder.md); a style the folder already holds stays.

Without a project, such as when the command names a folder without `aicon-studio.json`, the page opens **Project** with that folder filled in. Closed, it leaves **No project is open** with a **Project** button that opens it again.

---

## Runs And Sets

**New run** in the top bar opens the run dialog. Every chosen icon is drawn once per chosen style, each style into its own set, a column headed by the style and the run.

| Field            | Holds                                                                              |
| :--------------- | :--------------------------------------------------------------------------------- |
| **Styles**       | The styles to draw, one set each                                                   |
| **Icons**        | **All icons**, or **Test run: chosen icons**                                       |
| **Chosen icons** | The icons of a test run; their rotations follow. **Clear the choice** unticks them |
| **Quality**      | **low**, **medium** or **high**, preset from `aicon-studio.json`                   |

The bottom of the dialog stays in view and shows the image count. With both prices entered under **Settings**, it also shows **Estimated cost** and how it adds up, see **Cost Estimates** in [Getting Started](getting-started.md); without them, it offers **Open Settings**. **Start run** or **Start test run** starts the job.

While a run lacks something, the dialog names it and leads there instead, in the order of the setup: **Open Settings** for the endpoint, **Open Icons** for a first icon, **Open Styles** for a first style.

One drawing job runs at a time. Its progress shows in the top bar, such as **Drawing 3/12**, and a click on it opens the **Job log**, see **Failed Drawings**. The page shows each icon as soon as it is drawn. A cell whose icon is being drawn shows **drawing**, one not drawn yet in this job **pending**, a failed one its cause, and one the set has no drawing of **not drawn**.

- **Test Run**: **New test run** beside **New run**, or **Test run: chosen icons** in the dialog, draws only the icons ticked under **Chosen icons**, and the rotations of those. A new style is judged on a few icons before every icon is paid for. The choice is kept for the next test run.
- **Complete Set**: **Complete set** in the column menu, labelled with the icon count and cost, draws every icon the set has no drawing of, with the set's own prompt, model and quality: the rest of a test run, the icons a stop left, the failed ones, and icons added since.
- **Stop**: **Stop** beside the job status starts no further drawing. The drawings already requested finish and are kept, since they are paid for either way; the rest stay **not drawn** until **Complete set**.

---

## Failed Drawings

The studio treats a refused request by what it says about the endpoint, whatever the endpoint is:

| Answer               | Treatment                                                                                                       |
| :------------------- | :-------------------------------------------------------------------------------------------------------------- |
| Rate limit           | Every drawing of the job waits as long as the endpoint asks, as often as it asks; the job status shows the wait |
| No quota or credit   | The job stops at once                                                                                           |
| Settings refused     | The key, the model or the deployment is refused: the job stops at once                                          |
| Endpoint unavailable | No answer or a server error is tried five times, then the job stops                                             |
| Safety filter        | The drawing is tried once more, then its icon fails                                                             |
| Any other refusal    | The icon fails at once                                                                                          |

A stopped job names its cause, its advice and the message of the endpoint at the top of the **Job log**, with **Open Settings** where the settings can help. A failed icon keeps its cause and the message of the endpoint in its set, so both outlast the job and a restart of the studio. A cell without a drawing shows **blocked** for the safety filter and **failed** otherwise; a failed redraw keeps the last drawing, and the icon panel names the cause.

The **Job log**, opened from the job status in the top bar, lists the drawings in flight and what every set lacks, from the sets on disk, so it is the same after a restart or a switch to another project and back:

| Group                            | Holds                                                                                                                       |
| :------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| **Blocked by the safety filter** | Icons the safety filter refused twice                                                                                       |
| **Other failures**               | Icons the endpoint refused for another reason                                                                               |
| **Not drawn**                    | Icons a set was drawn for but holds no drawing of: a stop, a closed studio, or an older failure without a message left them |

While no job runs, the job status counts them, such as **3 failed, 12 not drawn**. An entry leaves the log once its icon is drawn, its set is deleted or the icon is removed.

| Control                     | Does                                                                               |
| :-------------------------- | :--------------------------------------------------------------------------------- |
| Stem                        | Opens the icon panel of the drawing                                                |
| **Redraw**                  | Draws this icon again                                                              |
| **Redraw all**              | Draws every icon of the group again, across sets; labelled with the count and cost |
| **Rephrase subject…**       | Opens **Rephrase the subject**, see **Rephrasing**; for a failed icon              |
| **Message of the endpoint** | Shows what the endpoint said                                                       |

The icon panel of a failed drawing shows the same cause, advice and message, and **Complete set** in the column menu draws every icon a set lacks.

---

## Rephrasing

The describe model rephrases a subject or a style for a reason and keeps what it names. **Rephrase subject…** in the icon panel of a set or in the **Job log** opens **Rephrase the subject of `<stem>`**; **Rephrase…** in the **Styles** view opens **Rephrase the style `<name>`**.

1. Write the **Reason**. After a failed drawing it starts with the message of the endpoint.
2. Select **Rephrase**.
3. Review the result and change it if needed. **Rephrase again** asks once more.
4. Take the result, as below.

| Rephrased | Button                               | Effect                                                                                      |
| :-------- | :----------------------------------- | :------------------------------------------------------------------------------------------ |
| Subject   | **Save subject and redraw `<stem>`** | Saves the subject of the icon, for every style, and redraws it in every set where it failed |
| Style     | **Use this prompt**                  | Puts the result into the editor, unsaved; **Save** keeps it                                 |

A subject sent with a reason also carries the prompt of the set, so the describe model knows the style the safety filter judged together with it. A style that blocks many icons is rephrased in the **Styles** view instead.

---

## Comparing

A click on a cell opens the icon panel beside the table: **Outline** and **Filled** large, both at every size an app might use and on hover, the subject the drawing was made from under **Subject:**, and the prompt of the set under **Prompt of this set**. A subject saved since shows beside it, as the one the next redraw draws from. `Escape` or ✕ closes it.

| Switch          | Where       | Does                                                                      |
| :-------------- | :---------- | :------------------------------------------------------------------------ |
| **Size**        | Above table | Shows every cell at 16, 24, 32, 48 or 64 pixels                           |
| **Filled**      | Above table | **Beside** shows the fill next to the outline, **On hover** on hover only |
| **Dark theme**  | Top bar     | Switches the page between light and dark                                  |
| **Columns**     | Above table | Ticks the visible columns; a hidden column is shown again from it         |
| **Hide column** | Column menu | Hides the column                                                          |
| **Delete set…** | Column menu | Deletes the set folder and every drawing in it, after asking              |

Size, fill, theme, hidden columns and the column order are kept in this browser.

---

## Redrawing

**Redraw** in the icon panel, labelled with the cost when prices are set, draws that icon again into the same set, with the set's own prompt, model and quality, and the current reference. A failed redraw keeps the last drawing. A redraw clears the flips of the icon, because they point at regions of the old drawing.

---

## References

**Use as reference** in the icon panel keeps that drawing's composition: every later drawing of the icon, in any style, sends it as an image and is asked to redraw it in the style. With a reference in place, the button reads **Replace the reference with this drawing**. A reference can come from a set or from the current icons.

The row of a referenced icon in the **Sets** view shows the reference and **referenced**, and the cell holding the referenced drawing carries a **reference** badge. The **Reference** column of the **Icons** view names the columns that hold the reference. **Remove reference**, in the icon panel or in the **Icons** view, drops it, so the icon is drawn from its subject alone again.

> **Note:** A rotation has no reference, flips or redraw of its own. Its icon panel offers **Open `<from>`**, which opens the panel of the icon it is rotated from.

---

## Flips

The fill is computed from the outline, not drawn: the silhouette with every hole filled, minus the interior lines. Whether an enclosed area is body or background is a matter of meaning, so a click on a region of **Filled** in the icon panel of a set switches it between filled and white and derives the fill again. ↶ undoes the last flip and ↷ redoes it, also `⌘Z` or `Ctrl+Z` and `⇧⌘Z` or `Ctrl+Y`; **Reset flips**, labelled with the flip count, clears them. A dot marks every flip; **Show flips** hides the dots to show what is under them, kept in this browser. The contour never flips.

An outline whose contour is open fills only partly and needs a redraw rather than a flip.

---

## Describing

**Write subject from this drawing** in the icon panel sends the drawing to the describe model, which writes a subject naming what the icon stands for and what the drawing shows: its objects, their parts and their arrangement. The **Icons** view opens with it unsaved, beside the saved subject under **Saved:**, for review. **Save** keeps it, **Revert** drops it. Saved, it makes every style draw that composition in the next run.

---

## Adopting

**Adopt into `<target>`…** in the column menu copies every SVG file of the set into the target folder, after asking, and nothing else. The outline `<stem>.svg` and the fill `<stem>-filled.svg` each hold one path with `fill-rule="evenodd"` in a square `viewBox`, without `fill`, `stroke`, `width` or `height`, so they take whatever colour and size the app gives them.

> **Warning:** Adopting overwrites the files of the same name in the target.

---

## Styles

The **Styles** view lists every style on the left and edits the chosen one. **New style** starts one from a template prompt.

| Control         | Does                                                                                   |
| :-------------- | :------------------------------------------------------------------------------------- |
| **Name**        | The style name: lowercase letters, digits and dashes, because it names the set folders |
| **Prompt**      | The prompt; it starts with a `#` heading and holds `{subject}`                         |
| **Save**        | Writes the file                                                                        |
| **Revert**      | Drops the unsaved changes                                                              |
| **Rephrase…**   | Has the describe model rephrase the prompt for a reason, see **Rephrasing**            |
| **Duplicate**   | Copies the prompt into a new style named `<name>-2`                                    |
| **Delete…**     | Removes the style, after asking; its sets stay                                         |
| **Preview for** | The icon whose prompt the preview shows                                                |

**New style from this prompt** in a column menu starts a style from the prompt of that set.

---

## Actions

| Action                           | Where                        | Effect                                                                                        |
| :------------------------------- | :--------------------------- | :-------------------------------------------------------------------------------------------- |
| New run                          | Top bar                      | Draws every icon, or a test run of chosen icons, in each chosen style, after showing the cost |
| New test run                     | Top bar                      | New run, preset to chosen icons                                                               |
| Stop                             | Top bar, beside the job      | Starts no further drawing; the drawings in flight finish and are kept                         |
| Settings                         | Top bar                      | The endpoint, key, models and prices                                                          |
| Project                          | Top bar                      | Opens another project folder: one opened before, a typed path, or one chosen with **Browse…** |
| Dark theme                       | Top bar                      | Switches the page between light and dark                                                      |
| Use as reference                 | Icon panel                   | Keeps this drawing as the reference, so later drawings keep its composition                   |
| Remove reference                 | Icon panel, or Icons view    | Drops the reference                                                                           |
| Write subject from this drawing  | Icon panel                   | The describe model writes a subject; the Icons view shows it unsaved, beside the saved one    |
| Save subject                     | Icons view, or `⌘Enter`      | Writes the subject to `aicon-studio.json`; the next run or redraw of the icon draws from it   |
| Add icon                         | Icons view                   | Adds a drawn icon, a rotation, or a pasted list of drawn icons to `aicon-studio.json`         |
| Rename icon…                     | Row menu                     | Renames the stem, its reference and its files in every set and the target                     |
| Move up, down, to top, bottom    | Row menu, or the handle ⠿    | Orders the icons in `aicon-studio.json`                                                       |
| Remove icon…                     | Row menu                     | Removes the icon and its reference, after asking                                              |
| Flip                             | Icon panel, **Filled**       | A click switches the region under it between filled and white, and derives the fill           |
| ↶ Undo last flip, ↷ Redo flip    | Icon panel, or `⌘Z`, `⇧⌘Z`   | Drops the newest flip of the icon or brings it back, and derives the fill                     |
| Show flips                       | Icon panel                   | Shows or hides the dots that mark the flips                                                   |
| Reset flips                      | Icon panel                   | Clears the flips of the icon and derives the fill                                             |
| Redraw                           | Icon panel                   | Draws the icon again into the set, with the set's prompt and the current reference            |
| Rephrase subject…                | Icon panel, or Job log       | The describe model rephrases the subject for a reason; saved, it redraws the failed icon      |
| Rephrase…                        | Styles view                  | The describe model rephrases the prompt in the editor for a reason, unsaved                   |
| Redraw all                       | Job log                      | Draws every icon of a group again, across sets                                                |
| Complete set                     | Column menu                  | Draws every icon the set has no drawing of                                                    |
| Adopt into `<target>`…           | Column menu                  | Copies the SVG files of the set into the target, after asking                                 |
| New style from this prompt       | Column menu                  | Opens a new style with the prompt of the set                                                  |
| Move left, Move right            | Column menu, or the handle ⠿ | Moves the set column; the order is kept in this browser                                       |
| Hide column                      | Column menu, or **Columns**  | Hides the column; **Columns** shows it again                                                  |
| Delete set…                      | Column menu                  | Deletes the set folder, after asking                                                          |
| Save, Revert, Duplicate, Delete… | Styles view                  | Edits the files in `styles/`, with a preview of the prompt for one icon; Delete… asks first   |

---

## Related

| To Do This                               | Read                                  |
| :--------------------------------------- | :------------------------------------ |
| Install and enter the endpoint           | [Getting Started](getting-started.md) |
| Write `aicon-studio.json` and the styles | [Project Folder](project-folder.md)   |
