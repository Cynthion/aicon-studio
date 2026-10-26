# Contributing

Contributions are welcome. This repository holds the `aicon-studio` command line tool, the studio page it serves, and an example project to run it against.

## Making A Change

1. **Fork** the repository and branch off `main` as `feature/*`.
2. **Set up** Node per `.nvmrc`, then `npm ci` and `npx playwright install chromium`.
3. **Read the conventions** before writing code, listed under `General` in the Definition of Done, and follow the surrounding style rather than introducing your own.
4. **Meet the Definition of Done** in [`.documentation/impl/definition-of-done.md`](.documentation/impl/definition-of-done.md): tests first, documentation, and every check. CI runs the same checks on your pull request.
5. **Open a pull request** describing what changed and why.

## Documentation

Documentation lives in `.documentation/`, split by audience: `user/` for whoever runs the studio, `tech/` for maintainers, `impl/` for whoever works the repository. The index is [`.documentation/README.md`](.documentation/README.md) and the authoring rules are in [`.documentation/impl/documentation.md`](.documentation/impl/documentation.md). Read them before editing any Markdown. `npm run docs:lint` checks style and links.

## Reporting Bugs

Open an issue on [GitHub Issues](https://github.com/Cynthion/aicon-studio/issues) with the Node version, the endpoint kind, a description of the expected and actual behaviour, and the smallest project folder that shows it.
