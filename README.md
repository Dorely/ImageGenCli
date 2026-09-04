# ImageGenCli

ImageGenCli is a provider-agnostic command-line tool for programmatic image generation. It exposes a single stable CLI surface for creating images while keeping provider and auth details behind narrow contracts.

## Current Status

- Repository scaffold only. No provider or generation capability is implemented yet.
- Planned provider order: Codex OAuth (`gpt-image-2`) first, then Google API key.
- Architecture will be defined separately before MVP planning.

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
npm test           # Run core package tests
```

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
