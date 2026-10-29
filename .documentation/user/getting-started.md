# Getting Started

Install the studio, enter your endpoint once, and draw the example project. What a project folder holds is in [Project Folder](project-folder.md); what to do once a run is drawn is in [Workflow](workflow.md).

## Install

The studio is not published yet, so it runs from a clone. It needs Node, the version in `.nvmrc`, and Playwright's Chromium, which rasterizes every fill:

```bash
git clone https://github.com/Cynthion/aicon-studio.git
cd aicon-studio
npm ci
npx playwright install chromium
npm run build
```

`npm run build` writes `dist/`, which holds the command. Run it from anywhere:

```bash
node <clone>/dist/cli.js <project> [--port 54400]
```

| Argument  | Meaning                                                                                                                                       |
| :-------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| `project` | The folder that holds `aicon-studio.json`; the working directory when left out. **Project** in the top bar opens or creates another one later |
| `--port`  | The loopback port the studio listens on, so a second project runs beside the first                                                            |

The command fails with `no aicon-studio.json in <folder>` when the folder is not a project, and with `port 54400 is in use, pass --port` when another studio holds the port.

- **From Another Repository**: a repository that uses the studio adds the clone as a `file:` dev dependency, `"@cynthion/aicon-studio": "file:../aicon-studio"`, and a script such as `"icons:studio": "aicon-studio path/to/project"`. `npm install` links the clone, so the script runs the clone's `dist/`, and `npm ci` passes even where the clone is absent, such as in CI.
- **After The First Release**: `npx @cynthion/aicon-studio`, a dev dependency by version, or a global install replace the clone. See **First Release** in the backlog.

---

## Settings

The endpoint is yours and is entered once, under **Settings** in the studio's top bar.

| Field                      | Holds                                                                                                          |
| :------------------------- | :------------------------------------------------------------------------------------------------------------- |
| Base URL                   | The `/v1` base URL of an OpenAI-compatible API, such as OpenAI's or an Azure AI Foundry project's              |
| API key                    | The key of that API; shown never again, leave the field empty to keep it                                       |
| Image model                | The image model or deployment that draws, through `images/generations` and `images/edits`                      |
| Describe model             | A chat model or deployment with image input, which writes a subject from a drawing, through `chat/completions` |
| Price per plain image      | Optional, drives the cost estimates                                                                            |
| Price per referenced image | Optional; an icon drawn with a reference goes through `images/edits`, which costs more                         |

The settings are stored per user, outside any project, in `$XDG_CONFIG_HOME/aicon-studio/settings.json`, under `~/.config` when the variable is unset. The file is readable by its owner only, and the key never reaches the page. Cost estimates show only while both prices are set.

---

## The First Run

The clone holds an example project, `example/`, with six icons and six styles.

1. Run `node dist/cli.js example` in the clone and open `http://127.0.0.1:54400`.
2. Choose **Settings** and enter the endpoint, the key and the models.
3. Choose **New run**, tick a style, and start it.

Every icon is drawn once in that style, into a set under `example/runs/`, which `.gitignore` leaves out. The page shows each icon as soon as it is drawn, as an outline beside its fill. **Adopt** in the set's column menu copies the files into `example/icons/`, the target the example names.

The studio listens on the loopback interface only and refuses requests from any other origin or host name, so a page open in another tab cannot start a run or adopt a set.

---

## Related

| To Do This                                   | Read                                |
| :------------------------------------------- | :---------------------------------- |
| Set up a project of your own, write a style  | [Project Folder](project-folder.md) |
| Compare sets, redraw, flip, reference, adopt | [Workflow](workflow.md)             |
