# Releasing ImageGenCli

ImageGenCli ships as an npm package (`imagegen`) plus a matching GitHub Release carrying the same tarball. Everything builds on this machine; no GitHub Actions are used.

## Release outputs

The release pipeline creates:

- `release/imagegen-VERSION.tgz`
- `release/imagegen-VERSION.tgz.sha256`

`release/` is ignored by Git. Do not commit tarballs or checksums. npm 10+ publishes from this Windows checkout with Node.js 20+.

## First-time npm setup

The package name `imagegen` is unclaimed on the public registry. Before the first publish, the npm account that owns it must exist and this machine must be logged in:

```powershell
npm login
npm whoami
```

`npm publish` needs a one-time out-of-band step: register the `imagegen` name on your account, then publish from the release checkout. Later publishes from the same account just work.

## Local release

From a clean checkout on Windows:

```powershell
npm ci
npm run release
```

The release script verifies that:

- the Git working tree is clean;
- the CLI, core, and providers-codex package versions match;
- core and provider regression tests pass;
- TypeScript builds across the project references;
- the expected `imagegen-VERSION.tgz` is produced by `npm pack`;
- a SHA-256 checksum is written next to the tarball.

Use `npm pack --workspace imagegen` directly when you only need a tarball for a quick local install test.

## Version and publish workflow

1. Bump the CLI, core, and providers-codex versions together and review the lockfile update.
2. Commit the version change and confirm the working tree is clean.
3. Run `npm run publish` from Windows.

The publish script reruns all local release checks, creates an annotated tag matching the CLI version, pushes `main` and the tag, then creates a public GitHub Release with the tarball, checksum, and generated notes. Pass `-Tag vX.Y.Z` only when an explicit tag is useful; it must still match the CLI package version.

After the GitHub Release exists, publish the same tarball to npm from this machine:

```powershell
npm publish --workspace imagegen
```

The GitHub Release stays the source of truth for what shipped; npm is the install channel (`npm install -g imagegen`). Publishing requires an authenticated GitHub CLI session with permission to push the repository and create releases, plus an authenticated npm session for the publishing account.

## keytar note

The CLI depends on `keytar` for OS-vault token storage. It ships a prebuilt Windows binary, so `npm ci` works cleanly here. Linux installs need `libsecret` present for the vault path; otherwise the encrypted-file fallback applies. If a future keytar release drops prebuilds, pin the last good version or revisit the vault dependency before releasing.
