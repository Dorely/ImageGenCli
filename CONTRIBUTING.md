# Contributing to ImageGenCli

Thanks for helping make programmatic image generation provider-agnostic.

## Before starting

- Search existing issues before opening a bug report or feature request.
- Keep proposals aligned with the provider-agnostic, auth-agnostic direction in `VISION.md`.
- Keep provider-specific auth and transport details inside the owning provider package.

## Local setup

ImageGenCli requires Node.js 20 or newer and npm 10 or newer.

```sh
npm install
npm run typecheck
npm test
npm run build
```

## Pull requests

- Keep each pull request focused and explain the CLI-visible behavior it changes.
- Add or update core regression tests when changing contracts or shared domain logic.
- Update `README.md` and `FILEMAP.md` when responsibilities or behavior change.
- Do not include real credentials, tokens, API keys, generated images, or build output.
