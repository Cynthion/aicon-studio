# Releasing

How to release the studio: the version, the release notes, the npm package, the tag and the GitHub release. Branch and versioning rules are under **Release** in [`impl/definition-of-done.md`](definition-of-done.md). `/ai-publish-release` drives the steps below and hands over the ones that stay manual, see [`impl/ai-harness.md`](ai-harness.md).

A release is published from `main` only, never from a `feature/*` branch. A published version cannot be republished, so every step verifies its result before the next one starts.

## Version

The release notes decide the version, so they are drafted first. The registry names the last release, `<last>`, including one tagged off `main` that `git describe` does not see. Squash commits on `main` carry the pull request bodies, which list what changed since then:

```zsh
git fetch origin
npm view @cynthion/aicon-studio version --prefer-online
git log v<last>..origin/main --format='----- %h %s%n%b'
```

| The Notes Hold                  | Bump                                     |
| :------------------------------ | :--------------------------------------- |
| A `## Breaking Changes` section | Major, or Minor under **Early Adoption** |
| A `## New` section              | Minor                                    |
| Fixes only                      | Patch                                    |

- **Breaking**: A change a user's project or scripts must follow: a renamed or removed command line argument, a change to the project folder contract or to the files **Adopt** writes into the target, a moved or reshaped settings file, and a Node range that drops a version `engines` accepted. A pull request's own **Breaking Changes** entry is the input, not the verdict: a change of the page only, with no contract change, is not breaking.
- **Early Adoption**: In effect. The studio has few users, so a breaking change costs them less than a major per release would. It bumps the minor, and the notes still list it under `## Breaking Changes`. The policy ends by a decision recorded here, not by a release; from then on a breaking change is a major.
- **First Release**: The registry answers `E404` for the package, so there is no `<last>`. The log runs from the root, the notes describe the studio as it is, without `## Breaking Changes` and without the **Full Changelog** line, and the version is `1.0.0`.
- **Proposal**: The bump, the entries it rests on and the policy applied are stated and confirmed before `version` is set.

`version` in `package.json` is set on a feature branch and reaches `main` through a pull request. `npm version <x.y.z> --no-git-tag-version` sets it in `package.json` and `package-lock.json` together, without a commit or a tag. Nothing bumps it automatically.

## Release Notes

The body of the GitHub release, written for whoever runs the studio. The draft lives in `.release/v<x.y.z>.md`, untracked, until the release exists. Template and writing rules: [`.claude/skills/ai-publish-release/SKILL.md`](../../.claude/skills/ai-publish-release/SKILL.md).

## Steps

Every command runs from the repository root. **Publish**, **Tag** and **Release** change the registry or the remote. They are run by hand, and the step after each verifies the result.

1. **Check**: Switch to an up-to-date `main` with a clean tree. CI must be green at its head, and the version must be new:

   ```zsh
   git switch main && git pull
   git status --porcelain
   gh run list --branch main --limit 2 --json name,conclusion,headSha
   npm view @cynthion/aicon-studio@<x.y.z> version --prefer-online
   ```

   The last command fails with `E404` while the version is unpublished, which is the expected state. A version it prints is already published, so `version` was not bumped.

2. **Log In**: `npm whoami` names an owner of the `@cynthion` scope. Otherwise:

   ```zsh
   npm login
   ```

3. **Build**: `npm run build` writes `dist/`, the only directory the package ships. The pack list holds the command and the page it serves:

   ```zsh
   npm run build
   npm pack --dry-run
   ```

   The list names `dist/cli.js`, the `bin`, and `dist/studio/browser/index.html`, beside `package.json`, `README.md` and `LICENSE`.

4. **Publish**: By hand. `npm publish` publishes the root package with public access, set by `publishConfig`. It may log a `401` before the OTP prompt, then `PUT 202`: the registry processes the upload for a few minutes.

   ```zsh
   npm publish
   ```

5. **Verify The Registry**: The version shows with the shasum of the local tarball. Repeat until it does:

   ```zsh
   npm view @cynthion/aicon-studio@<x.y.z> dist.shasum --prefer-online
   npm pack --dry-run --json | jq -r '.[0].shasum'
   ```

6. **Tag**: By hand. Tag the head of `main` and push the tag:

   ```zsh
   git tag v<x.y.z> && git push origin v<x.y.z>
   ```

7. **Verify The Tag**: The remote lists it:

   ```zsh
   git ls-remote --tags origin v<x.y.z>
   ```

8. **Release**: By hand. Create the GitHub release from the tag, with the notes as its body:

   ```zsh
   gh release create v<x.y.z> --verify-tag --title v<x.y.z> --notes-file .release/v<x.y.z>.md
   ```

9. **Verify The Release**: The API returns it. Then remove `.release/v<x.y.z>.md`:

   ```zsh
   gh api repos/{owner}/{repo}/releases/tags/v<x.y.z> --jq .html_url
   ```
