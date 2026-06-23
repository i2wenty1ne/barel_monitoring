# Windows release workflow

Barrel Monitor uses a manual GitHub Actions workflow for Windows releases.

## Run a release

Open:

1. GitHub repository
2. Actions
3. Build Windows Release
4. Run workflow

The workflow runs on `windows-latest`, installs dependencies with `npm ci`, runs checks, builds the Electron app, creates a GitHub Release, and uploads the Windows artifacts.

## Inputs

- `version`: release version without `v`. Leave empty to use `package.json`.
- `tag`: Git tag. Leave empty to use `v{version}`.
- `release_name`: release title. Leave empty to use `Barrel Monitor v{version}`.
- `prerelease`: marks the GitHub Release as prerelease.
- `draft`: creates the release as a draft.
- `overwrite_existing`: deletes an existing release/tag before publishing.
- `run_tests`: runs `npm test` only if the script exists.
- `release_notes`: optional release body. Leave empty to generate build notes.

If `version` is provided, the workflow temporarily updates `package.json` in the runner before packaging. It does not commit that change.

## Artifacts

Release files are created in `release/` by `npm run dist:win` and uploaded to:

- GitHub Releases
- GitHub Actions artifacts named `barrel-monitor-windows-{tag}`

The workflow uploads Windows files such as `.exe`, `.msi`, `.zip`, `.7z`, `.blockmap`, `.yml`, and `.yaml`.

## Existing releases

If a release or tag already exists, the workflow fails by default.

Use `overwrite_existing=true` only when you intentionally want to delete the existing release/tag and recreate it.

## Local checks

Useful local commands:

```bash
npm ci
npm run typecheck
npm run build
npm run rebuild:native
npm run dist:win
```

Windows packages should be built on Windows, especially because `serialport` includes native modules. Cross-compiling the Windows installer from macOS/Linux can fail during native module rebuild.

## Code signing

Code signing is not configured. Windows SmartScreen can show a warning for unsigned builds.

Future work:

- code signing certificate setup;
- auto-update;
- macOS/Linux release workflows, if needed.
