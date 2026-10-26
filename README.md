# Aicon Studio

Draws candidate icon sets for your app with an image model, compares them side by side, and adopts the one you like as clean SVG files. Every icon comes out as an outline and a filled variant of the same shape, in one path each, ready for a theme colour.

- **Styles are prompts**: one Markdown file per style, `{subject}` replaced by each icon's subject. Six come with the example project; write your own.
- **Any OpenAI-compatible endpoint**: OpenAI, Azure AI Foundry or whatever serves `images/generations`.
- **Compare, then adopt**: every run draws all icons once per style into its own set. Flip fill regions, redraw single icons, keep a drawing as the reference for later runs, and copy the winning set into your project with one click.
- **Your project stays yours**: the studio reads one folder and writes only into the target that folder names.

## Quick Start

Needs Node, the repository cloned beside your project, and Playwright's Chromium, which rasterizes the fills:

```bash
git clone https://github.com/Cynthion/aicon-studio.git
cd aicon-studio && npm ci && npx playwright install chromium && npm run build
```

Then serve the example project and open `http://127.0.0.1:54400`:

```bash
node dist/cli.js example
```

Enter your endpoint, API key and models under **Settings**, choose **New run** and pick a style. The whole setup, the project folder contract and the workflow are in the documentation below.

## Documentation

| Guide                                                     | Covers                                                        |
| :-------------------------------------------------------- | :------------------------------------------------------------ |
| [Getting Started](.documentation/user/getting-started.md) | Install, Chromium, Settings, the first run                    |
| [Project Folder](.documentation/user/project-folder.md)   | The folder contract, `aicon-studio.json`, styles, references  |
| [Workflow](.documentation/user/workflow.md)               | Runs and sets, comparing, redrawing, flips, describing, Adopt |

Design notes for maintainers live in [`.documentation/tech/`](.documentation/README.md), and the repository's own conventions in [`.documentation/impl/`](.documentation/README.md).

## Contributing

Contributions are welcome, see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Everything in this repository is licensed under the [GNU General Public License, version 2](LICENSE), the license of the potrace library that traces every icon.

In plain English: use it, change it and share it, as long as what you share stays under the same license with its source. The icons it draws are yours: the license covers the tool, not its output. It comes with no warranty.

Copyright (c) 2026 - present Christian Lüthold
