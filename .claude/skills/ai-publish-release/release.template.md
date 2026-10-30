<!-- markdownlint-disable-file -->
<!-- Body of the GitHub release v<x.y.z>, written for whoever runs the studio. -->
<!-- Style follows .documentation/impl/documentation.md: Pascal Case headings, bold Pascal Case list labels, tables over prose. -->
<!-- A section is omitted when it has nothing. `## Breaking Changes` and `## New` decide the bump through the Version table in .documentation/impl/releasing.md. -->
<!-- Never add the markdownlint-disable-file to the release. It only serves for this template. -->
<!-- Never mention the co-authoring or generation by AI tooling in the release. -->

<One or two sentences: what the release means for whoever runs the studio, and whether a project or its scripts must change.>

## Breaking Changes

- **<Argument, Config Field, Style Placeholder, Adopted File Or Node Range>**: <what changed, and what a user changes>.

## <Layout Change>

<A change a user sees on the page without a contract change, under a heading that names what moved, for example `## Layout Change`: what is different.>

## New

- **<Feature, Argument Or Config Field>**: <what it does, and its default>. See the [<Guide>](https://github.com/Cynthion/aicon-studio/blob/v<x.y.z>/.documentation/user/<slug>.md).

## Fixes

| Where   | Before                              |
| :------ | :---------------------------------- |
| <Where> | <What went wrong, as a user saw it> |

## Documentation

- **[<Guide>](https://github.com/Cynthion/aicon-studio/blob/v<x.y.z>/.documentation/user/<slug>.md)**: <what it now covers>.

## Install

```bash
npx @cynthion/aicon-studio@<x.y.z> <project>
```

<`Same Node range as <last>.`, or the new range from `engines`.>

**Full Changelog**: [v<last>...v<x.y.z>](https://github.com/Cynthion/aicon-studio/compare/v<last>...v<x.y.z>)
