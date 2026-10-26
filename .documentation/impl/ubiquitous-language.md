# Ubiquitous Language

One name per concept, in code, on the page and in the documentation. Check a new name against the table before introducing it; a synonym is a defect. What each concept does is in [`user/project-folder.md`](../user/project-folder.md) and [`user/workflow.md`](../user/workflow.md), how it is produced in [`tech/pipeline.md`](../tech/pipeline.md).

| Concept                                                                                    | Term                                | Never                                             |
| :----------------------------------------------------------------------------------------- | :---------------------------------- | :------------------------------------------------ |
| The folder the studio runs against: `aicon-studio.json`, `styles/`, `references/`, `runs/` | **project**                         | "workspace", "repository" for the folder          |
| The dialog of the operating system that chooses a folder                                   | **folder picker**                   | "file dialog", "file chooser"                     |
| `aicon-studio.json`, parsed                                                                | **config**                          | "settings", "manifest"                            |
| The per-user file that holds the endpoint, outside any project                             | **settings**                        | "config", "preferences"                           |
| The OpenAI-compatible API the studio draws through                                         | **endpoint**                        | "provider", "backend", "service"                  |
| The model that draws, and the model that writes a subject from a drawing                   | **image model**, **describe model** | "generator", "vision model"                       |
| One entry of `icons`, drawn or rotated                                                     | **icon**                            | "glyph", "symbol" for the entry                   |
| The file name of an icon without `.svg`                                                    | **stem**                            | "name", "id", "key"                               |
| What the model is asked to draw for an icon, such as `a gear`                              | **subject**                         | "description", "prompt" for the subject           |
| An icon whose entry names a subject                                                        | **drawn icon**                      | "base icon", "source icon"                        |
| An icon derived from another by `from` and `rotate`                                        | **rotation**                        | "variant", "derived icon"                         |
| One prompt file under `styles/`                                                            | **style**                           | "theme", "preset"                                 |
| The style file with `{subject}` replaced, as sent to the model                             | **prompt**                          | "instruction", "template"                         |
| `low`, `medium` or `high`                                                                  | **quality**                         | "resolution", "size", "level"                     |
| One drawing of every icon in every chosen style                                            | **run**                             | "batch", "generation"                             |
| The folder a run writes per style, `runs/<run>/<style>/`                                   | **set**                             | "result", "candidate", "column" for the set       |
| A column of the Sets view: the current icons, or one set                                   | **column**                          | "set" for the column of the current icons         |
| The PNG the model answers for one request                                                  | **image**                           | "picture", "render"                               |
| An icon as it sits in a set or in the target: its outline with its fill                    | **drawing**                         | "image" for a drawing                             |
| The traced path, `<stem>.svg`                                                              | **outline**                         | "line icon", "stroke"                             |
| The path derived from the outline, `<stem>-filled.svg`                                     | **fill**                            | "solid", "filled icon", "silhouette" for the fill |
| A point whose region switches between filled and white                                     | **flip**                            | "toggle", "invert"                                |
| The drawing kept in `references/<stem>.svg` and sent with every later drawing of the icon  | **reference**                       | "anchor", "seed", "example"                       |
| Drawing an icon again into its set                                                         | **redraw**                          | "regenerate", "retry"                             |
| Deriving a fill again from its outline                                                     | **refill**                          | "recompute", "rederive"                           |
| Writing a subject from a drawing with the describe model                                   | **describe**                        | "caption", "analyze"                              |
| A run or redraw in the background, one at a time                                           | **job**                             | "task", "process"                                 |
| The folder adopted icons are copied into, named by `target` in the config                  | **target**                          | "destination", "output folder"                    |
| The icons the target holds now                                                             | **current icons**                   | "existing icons", "live icons"                    |
| Copying every SVG file of a set into the target                                            | **adopt**                           | "apply", "export", "publish"                      |

- **Order**: where a run, a style and a stem name one file together, they follow the folder hierarchy: run, style, stem, as `runs/<run>/<style>/<stem>.svg`, `DELETE /api/sets/<run>/<style>` and the `run` and `style` fields of `_run.json` do.
