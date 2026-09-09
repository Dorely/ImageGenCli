# ImageGenCli - File Map

> **Auto-maintained reference.** Agents and contributors should update this file whenever files are added, removed, or significantly refactored.
> Read this file at the start of every session to understand the codebase layout.

---

## Root

| File | Description |
|------|-------------|
| `.editorconfig` | Shared whitespace and line-ending defaults. |
| `.gitignore` | Ignore rules for Node, build output, local env files, and editor files. |
| `AGENTS.md` | Root agent guidance for working in the ImageGenCli repo. |
| `CONTRIBUTING.md` | Public development setup and contribution expectations. |
| `FILEMAP.md` | This file: concise map of every source and configuration file. |
| `LICENSE` | MIT license terms. |
| `package.json` | Root npm workspace definition and top-level scripts. |
| `README.md` | Developer onboarding, scripts, and architecture summary. |
| `tsconfig.json` | Root TypeScript project references for editor and build graph alignment. |
| `VISION.md` | High-level product vision, MVP scope, architecture direction, and success criteria. |

## Documentation

| File | Description |
|------|-------------|
| `docs/releasing.md` | Local Windows release, version/tag, and npm + GitHub publish workflow. |

## Release Scripts

| File | Description |
|------|-------------|
| `scripts/release.ps1` | Clean-tree, version, test, build, tarball, and SHA-256 gates for release candidates. |
| `scripts/publish-release.ps1` | Tag, push, GitHub Release upload, and npm publish handoff for releases. |

## GitHub Configuration

| File | Description |
|------|-------------|
| `.github/copilot-instructions.md` | Copilot-specific project instructions kept aligned with `AGENTS.md`. |
| `.github/FUNDING.yml` | GitHub Sponsor-button configuration for the Buy Me a Coffee page. |

## CLI App

| File | Description |
|------|-------------|
| `apps/cli/package.json` | CLI workspace package metadata, binary entry, dependencies, and scripts. |
| `apps/cli/tsconfig.json` | TypeScript project settings for the CLI app. |
| `apps/cli/scripts/bundle.mjs` | esbuild bundler producing the self-contained publishable CLI. |
| `apps/cli/src/index.ts` | CLI entry point: arg parsing, auth/generate/edit/help wiring, JSON reporting. |
| `apps/cli/src/help.ts` | Shared image options, supported Codex models, and examples for general and command help. |

## Core Package

| File | Description |
|------|-------------|
| `packages/core/package.json` | Workspace package metadata for provider-neutral contracts and shared types. |
| `packages/core/tsconfig.json` | TypeScript project settings for the core package. |
| `packages/core/src/index.ts` | Core package barrel exports for contracts and shared helpers. |
| `packages/core/src/types.ts` | Provider-neutral image request/result/error types and limits. |
| `packages/core/src/image-provider.ts` | `IImageProvider` contract with per-provider size policy. |
| `packages/core/src/provider-registry.ts` | Provider registry: routing, configured detection, multi-select. |
| `packages/core/src/provider-registry.test.ts` | Regression tests for provider resolution. |
| `packages/core/src/token-store.ts` | `TokenSet`/`ITokenStore` contract for credential persistence. |
| `packages/core/src/format.ts` | Output-format normalization and MIME helpers. |
| `packages/core/src/format.test.ts` | Regression tests for format helpers. |
| `packages/core/src/image-size.ts` | Size parsing, validation, and provider-limit raster normalization. |
| `packages/core/src/image-size.test.ts` | Regression tests for size helpers. |

## Codex Provider Package

| File | Description |
|------|-------------|
| `packages/providers-codex/package.json` | Workspace metadata for the Codex OAuth and Responses API provider. |
| `packages/providers-codex/tsconfig.json` | TypeScript project settings for the Codex provider package. |
| `packages/providers-codex/src/index.ts` | Codex provider barrel exports. |
| `packages/providers-codex/src/codex-constants.ts` | Codex endpoints, OAuth client, defaults, and timeouts. |
| `packages/providers-codex/src/pkce.ts` | PKCE pair generation and authorize-URL builder. |
| `packages/providers-codex/src/pkce.test.ts` | Regression tests for PKCE helpers. |
| `packages/providers-codex/src/loopback-server.ts` | Temporary localhost callback server for OAuth login. |
| `packages/providers-codex/src/codex-auth.ts` | PKCE flow state, token exchange, refresh, and expiry helpers. |
| `packages/providers-codex/src/codex-auth.test.ts` | Regression tests for token-expiry helpers. |
| `packages/providers-codex/src/codex-token-manager.ts` | Token lifecycle: exchange, cached access, serialized refresh. |
| `packages/providers-codex/src/token-store.ts` | Vault-first token store with restricted-file fallback. |
| `packages/providers-codex/src/account-id.ts` | ChatGPT account-id extraction from the access JWT. |
| `packages/providers-codex/src/account-id.test.ts` | Regression tests for account-id extraction. |
| `packages/providers-codex/src/codex-client.ts` | Responses API image provider (generate/edit, streaming). |
| `packages/providers-codex/src/codex-client.test.ts` | Mock transport tests for model selection, quality, and edit inputs. |
| `packages/providers-codex/src/cli-integration.test.ts` | CLI help, validation, request forwarding, and image file saving with mocked provider transport. |
| `packages/providers-codex/src/codex-entry.ts` | Registry entry wiring the Codex provider and auth status. |
| `packages/providers-codex/src/sse.ts` | SSE parsing and image-error classification. |
| `packages/providers-codex/src/sse.test.ts` | Regression tests for SSE parsing and error kinds. |
