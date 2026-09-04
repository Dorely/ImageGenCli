# ImageGenCli

ImageGenCli is free to use. If it saves you time, you can [buy Dorely a coffee](https://buymeacoffee.com/dorely).

ImageGenCli is a provider-agnostic command-line tool for programmatic image generation. It exposes a single stable CLI surface for creating images while keeping provider and auth details behind narrow contracts.

## Current Status

- Codex provider implemented: OAuth PKCE login via temporary localhost callback, vault/file token storage with auto-refresh, and `generate` / `edit` through the Codex Responses API (`gpt-image-2`).
- Next: Google API-key provider, then additional providers behind the same contracts.

## Install

Published releases ship the `imagegen` npm package plus a matching GitHub Release tarball:

```sh
npm install -g imagegen
```

See [Releasing ImageGenCli](docs/releasing.md) for the version, tag, and publish workflow.

## Development prerequisites

- Node.js 20 or newer.
- npm 10 or newer.

## Development quick start

```sh
npm install
npm run build
```

## Scripts

```sh
npm run dev        # Build the CLI and run it
npm run typecheck  # Run TypeScript checks
npm run build      # Build the CLI
npm test           # Run core and provider package tests
```

## Usage

```sh
imagegen auth login
imagegen auth status
imagegen generate --prompt "a lighthouse at dawn" --out ./lighthouse.png
imagegen generate --prompt "same lighthouse, dusk" --reference ./lighthouse.png --out ./dusk.png
imagegen edit --prompt "add seagulls" --source ./lighthouse.png --out ./gulls.png
imagegen help [command]
```

Login starts a temporary server on `localhost:1455`, opens the browser for Codex OAuth, and stores tokens in the OS credential vault (restricted file fallback; see `auth status --show-path`). `auth logout` removes them.

## Configuration

- `IMAGEGEN_CODEX_MODEL` — optional override for the Codex orchestration model (default `gpt-5.6-luna`). This model executes the image toolcall and is part of the provider's request shape; it never rewrites the caller's prompt.
- `IMAGEGEN_CODEX_IMAGE_MODEL` — optional override for the image model (default `gpt-image-2`).
- `IMAGEGEN_CODEX_REDIRECT_URI` — optional OAuth redirect override (default `http://localhost:1455/auth/callback`).

The tool is a passthrough: prompts and reference images come from the caller verbatim; the CLI adds no prompt content of its own.

## Architecture

ImageGenCli follows the architecture direction in `VISION.md`:

- Thin CLI command surface in `apps/cli`.
- Provider-neutral contracts and shared types in `packages/core`.
- One package per image provider (`packages/providers-*`), each owning its auth and transport details.
- Machine-readable CLI output by default.

## Development Notes

- Keep provider-specific transport details behind provider-neutral contracts.
- Never log, print, or persist secrets (API keys, authorization codes, tokens).
- Update `FILEMAP.md` whenever source files are added, removed, renamed, or significantly repurposed.
- Read `VISION.md` and `FILEMAP.md` before making substantive changes.
- Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a public contribution.
- Codex auth and Responses image-calling patterns follow the Lorekeeper repo (`CodexAuthService`, `CodexProvider`, `CodexProjectImageProvider`).

## License

ImageGenCli is source-available under the [PolyForm Noncommercial License 1.0.0](LICENSE). Commercial use requires separate permission from the licensor.
