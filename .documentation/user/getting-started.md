# Getting Started

Install the studio, enter the endpoint once, and draw the example project. What a project folder holds is in [Project Folder](project-folder.md); what to do once a run is drawn is in [Workflow](workflow.md).

## Install

The studio is not published yet, so it runs from a clone. It needs Node, the version in `.nvmrc`, and Playwright's Chromium, see [Playwright browsers](https://playwright.dev/docs/browsers):

```bash
git clone https://github.com/Cynthion/aicon-studio.git
cd aicon-studio
npm ci
npx playwright install chromium
npm run build
```

`npm run build` writes `dist/`, which holds the command. It runs from anywhere:

```bash
node <clone>/dist/cli.js <project> [--port 54400]
```

| Argument  | Meaning                                                                                                                                 |
| :-------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| `project` | The folder that holds `aicon-studio.json`; the working directory when left out. **Project** in the top bar opens or creates another one |
| `--port`  | The port the studio listens on, so a second project runs beside the first                                                               |

The command fails with `no aicon-studio.json in <folder>` when the folder is not a project, and with `port 54400 is in use, pass --port` when another studio holds the port.

- **From Another Repository**: a repository that uses the studio adds the clone as a `file:` dev dependency, `"@cynthion/aicon-studio": "file:../aicon-studio"`, and a script such as `"icons:studio": "aicon-studio path/to/project"`. `npm install` links the clone, so the script runs the clone's `dist/`, and `npm ci` passes even where the clone is absent, such as in CI.

> **Note:** The studio is reachable from the same computer only. A page open in another tab cannot start a run or adopt a set.

---

## Settings

The endpoint is entered once, under **Settings** in the top bar. It is stored per user, outside any project, so it stays when another project is opened.

| Field                                    | Holds                                                                                            |
| :--------------------------------------- | :----------------------------------------------------------------------------------------------- |
| **Base URL of an OpenAI-compatible API** | The `/v1` base URL, such as OpenAI's or an Azure AI Foundry project's                            |
| **API key**                              | The key of that API; shown never again, left empty to keep the stored one                        |
| **Image model**                          | The image model or deployment that draws; a referenced icon is drawn as an edit of its reference |
| **Describe model**                       | A chat model or deployment with image input, which writes a subject from a drawing               |
| **Price per plain image, in $**          | The price of one image drawn from its subject alone, optional                                    |
| **Price per referenced image, in $**     | The price of one image drawn with a reference, optional                                          |

> **Note:** The settings file is `$XDG_CONFIG_HOME/aicon-studio/settings.json`, under `~/.config` when the variable is unset. It is readable by its owner only.

### Cost Estimates

The two prices show what a run costs before it starts. They set no limit, and the endpoint bills the real amount.

- **Values**: a number in dollars, such as `0.04`, without a currency sign. Both prices are entered, or neither: **Settings** refuses one alone, and without prices the studio shows no estimates.
- **Source**: the pricing of the endpoint, for one 1024 × 1024 image at the quality used most. One price applies to every **Quality**, so an estimate at another quality is off where the endpoint bills by quality.
- **Calculation**: every drawn icon counts one image per chosen style, at the referenced price when it has a reference and the plain price otherwise. Rotations cost nothing. A describe is not counted.
- **Where It Shows**: while the prices are typed, **Settings** shows the cost of a run in one style. The estimate of a run shows in its dialog with how it adds up, and **Complete set** and **Redraw** carry their cost in their label.

---

## The First Run

The clone holds an example project, `example/`, with icons and styles.

1. Run `node dist/cli.js example` in the clone.
2. Open `http://127.0.0.1:54400`.
3. Choose **Settings**.
4. Enter the base URL, the API key and both models.
5. Choose **Save**.
6. Choose **New run**.
7. Tick a style under **Styles**.
8. Choose **Start run**.

Every icon is drawn once in that style, into a set under `example/runs/`, which `.gitignore` leaves out. The **Sets** view shows each icon as soon as it is drawn, as an outline beside its fill. **Adopt into ./icons…** in the set's column menu copies the files into `example/icons/`, the target the example names.

---

## Related

| To Do This                                   | Read                                |
| :------------------------------------------- | :---------------------------------- |
| Set up a project, write a style              | [Project Folder](project-folder.md) |
| Compare sets, redraw, flip, reference, adopt | [Workflow](workflow.md)             |
