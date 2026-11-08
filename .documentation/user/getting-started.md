# Getting Started

Install the studio, enter the endpoint once, and draw the example project. What a project folder holds is in [Project Folder](project-folder.md); what to do once a run is drawn is in [Workflow](workflow.md).

## Install

The studio needs Node, the version `engines` in its `package.json` names, and Playwright's Chromium, which rasterizes the fills, see [Playwright browsers](https://playwright.dev/docs/browsers). Chromium is installed once per computer, then `npx` runs the studio:

```bash
npx -p @cynthion/aicon-studio playwright install chromium
npx @cynthion/aicon-studio <project> [--port 54400]
```

> **Note:** `-p @cynthion/aicon-studio` installs the Chromium of the Playwright version the studio uses. A bare `npx playwright` may fetch another version, whose Chromium the studio does not find. Its warning about the dependencies of the current folder does not apply.

| Argument  | Meaning                                                                                                                                 |
| :-------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| `project` | The folder that holds `aicon-studio.json`; the working directory when left out. **Project** in the top bar opens or creates another one |
| `--port`  | The port the studio listens on; when left out, `54400` or the next free port after it, so a second studio starts beside the first       |

A folder without `aicon-studio.json` starts the studio without a project: the page opens **Project** with that folder filled in, see [Workflow](workflow.md). A port given with `--port` that another program holds fails the command with `port <port> is in use, pass another --port`.

> **Note:** **Recent** and the switches of the page are kept per port, so a studio on another port starts without them.

- **From Another Repository**: a repository that uses the studio adds it as a dev dependency, `npm install --save-dev @cynthion/aicon-studio`, and a script such as `"icons:studio": "aicon-studio path/to/project"`. The version in its `package.json` decides which studio the script runs.

> **Note:** The studio is reachable from the same computer only. A page open in another tab cannot start a run or adopt a set.

---

## Settings

The endpoint is entered once, under **Settings** in the top bar. It is stored per user, outside any project, so it stays when another project is opened.

| Field                                    | Holds                                                                                                    |
| :--------------------------------------- | :------------------------------------------------------------------------------------------------------- |
| **Base URL of an OpenAI-compatible API** | The `/v1` base URL, such as OpenAI's or an Azure AI Foundry project's                                    |
| **API key**                              | The key of that API; shown never again, left empty to keep the stored one                                |
| **Image model**                          | The image model or deployment that draws; a referenced icon is drawn as an edit of its reference         |
| **Describe model**                       | A chat model or deployment with image input, which writes a subject from a drawing and rephrases a style |
| **Price per plain image, in $**          | The price of one image drawn from its subject alone, optional                                            |
| **Price per referenced image, in $**     | The price of one image drawn with a reference, optional                                                  |

> **Note:** The settings file is `$XDG_CONFIG_HOME/aicon-studio/settings.json`, under `~/.config` when the variable is unset. It is readable by its owner only.

### Cost Estimates

The two prices show what a run costs before it starts. They set no limit, and the endpoint bills the real amount.

- **Values**: a number in dollars, such as `0.04`, without a currency sign. Both prices are entered, or neither: **Settings** refuses one alone, and without prices the studio shows no estimates.
- **Source**: the pricing of the endpoint, for one 1024 × 1024 image at the quality used most. One price applies to every **Quality**, so an estimate at another quality is off where the endpoint bills by quality.
- **Calculation**: every drawn icon counts one image per chosen style, at the referenced price when it has a reference and the plain price otherwise. Rotations cost nothing. A describe is not counted.
- **Where It Shows**: while the prices are typed, **Settings** shows the cost of a run in one style. The estimate of a run shows in its dialog with how it adds up, and **Complete set** and **Redraw** carry their cost in their label.

---

## The First Run

**Create** writes the example project, with icons and styles, into a new folder.

1. Run `npx @cynthion/aicon-studio my-icons`.
2. Open the URL the command prints, `http://127.0.0.1:54400` unless that port is taken.
3. Choose **Create** in **Project**, which opens with `my-icons` filled in.
4. Choose **Settings**.
5. Enter the base URL, the API key and both models.
6. Choose **Save**.
7. Choose **New run**.
8. Tick a style under **Styles**.
9. Choose **Start run**.

Every icon is drawn once in that style, into a set under `my-icons/runs/`. The **Sets** view shows each icon as soon as it is drawn, as an outline beside its fill. **Adopt into ./icons…** in the set's column menu copies the files into `my-icons/icons/`, the target the example names.

---

## Related

| To Do This                                   | Read                                |
| :------------------------------------------- | :---------------------------------- |
| Set up a project, write a style              | [Project Folder](project-folder.md) |
| Compare sets, redraw, flip, reference, adopt | [Workflow](workflow.md)             |
