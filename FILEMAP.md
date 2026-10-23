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
| `apps/cli/src/index.ts` | CLI entry point: parsing, auth, profile management, discovery, image commands, and JSON reporting. |
| `apps/cli/src/help.ts` | Image options, profile management/discovery commands, supported provider guidance, and help examples. |
| `apps/cli/src/usage-log.ts` | Opt-in `IMAGEGEN_USAGE_LOG` JSONL entries: request shape, dimensions, provider usage; no prompts or secrets. |
| `apps/cli/src/skill.ts` | Loads and installs the packaged agent skill for the `imagegen skill` command. |
| `apps/cli/skill/SKILL.md` | Packaged agent instructions for CLI use, model selection, native alpha transparency, and image verification. |

## Core Package

| File | Description |
|------|-------------|
| `packages/core/package.json` | Workspace package metadata for provider-neutral contracts and shared types. |
| `packages/core/tsconfig.json` | TypeScript project settings for the core package. |
| `packages/core/src/index.ts` | Core package barrel exports for contracts and shared helpers. |
| `packages/core/src/types.ts` | Provider-neutral request/result/error types, usage metadata, upstream retry metadata, and limits. |
| `packages/core/src/image-provider.ts` | `IImageProvider` contract and size policies with model-deferred or concrete raster resolution. |
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
| `packages/providers-codex/package.json` | Workspace metadata for the Codex OAuth and image endpoint provider. |
| `packages/providers-codex/tsconfig.json` | TypeScript project settings for the Codex provider package. |
| `packages/providers-codex/src/index.ts` | Codex provider barrel exports. |
| `packages/providers-codex/src/codex-constants.ts` | Codex OAuth and image endpoints, OAuth client, defaults, timeouts, and refresh-lock timing. |
| `packages/providers-codex/src/pkce.ts` | PKCE pair generation and authorize-URL builder. |
| `packages/providers-codex/src/pkce.test.ts` | Regression tests for PKCE helpers. |
| `packages/providers-codex/src/loopback-server.ts` | Temporary localhost callback server for OAuth login. |
| `packages/providers-codex/src/codex-auth.ts` | PKCE flow state, token exchange, refresh outcomes with OpenAI error codes, and early-refresh check. |
| `packages/providers-codex/src/codex-auth.test.ts` | Regression tests for refresh timing and token-endpoint error classification. |
| `packages/providers-codex/src/codex-token-manager.ts` | Token lifecycle: exchange, early refresh, cross-process locked refresh with reload, 401 recovery. |
| `packages/providers-codex/src/codex-token-manager.test.ts` | Concurrent-process refresh, adoption, dead-credential, and status tests. |
| `packages/providers-codex/src/refresh-lock.ts` | Exclusive lock file serializing single-use refresh-token redemption across processes. |
| `packages/providers-codex/src/refresh-lock.test.ts` | Lock exclusivity, release, stale reclaim, and timeout tests. |
| `packages/providers-codex/src/token-store.ts` | Codex validation adapter over shared vault/file credential persistence. |
| `packages/providers-codex/src/account-id.ts` | ChatGPT account-id extraction from the access JWT. |
| `packages/providers-codex/src/account-id.test.ts` | Regression tests for account-id extraction. |
| `packages/providers-codex/src/codex-client.ts` | Direct Codex images generations/edits provider (verbatim prompt, mask ignored, one refreshed retry on 401, local format conversion, served settings and usage). |
| `packages/providers-codex/src/codex-client.test.ts` | Mock transport tests for model selection, quality, and edit inputs. |
| `packages/providers-codex/src/cli-integration.test.ts` | CLI help, validation, request forwarding, and image file saving with mocked provider transport. |
| `packages/providers-codex/src/codex-entry.ts` | Registry entry wiring the Codex provider and auth status. |
| `packages/providers-codex/src/errors.ts` | Codex image-error classification and backend error-message extraction. |
| `packages/providers-codex/src/errors.test.ts` | Regression tests for error kinds and message extraction. |

## Shared Credentials and Gemini Provider

| File | Description |
|------|-------------|
| `apps/cli/src/key-input.ts` | Provider-labelled hidden terminal key input and explicit bounded stdin input. |
| `docs/gemini-research.md` | Dated official-source research, API mappings, limits, and prompting decisions. |
| `packages/credentials/package.json` | Shared credential persistence workspace metadata and tests. |
| `packages/credentials/tsconfig.json` | Shared persistence TypeScript build settings. |
| `packages/credentials/src/index.ts` | Generic provider records in the existing vault and restricted-file location. |
| `packages/credentials/src/index.test.ts` | Storage compatibility, fallback, and provider-isolation tests. |
| `packages/providers-google/package.json` | Gemini workspace metadata, sharp dependency, and test scripts. |
| `packages/providers-google/tsconfig.json` | Gemini provider TypeScript project references. |
| `packages/providers-google/src/index.ts` | Gemini registry entry and provider exports. |
| `packages/providers-google/src/auth.ts` | Gemini API-key record, validation, and stored credential access. |
| `packages/providers-google/src/image-size.ts` | Model-specific native-raster tables and size normalization. |
| `packages/providers-google/src/gemini-client.ts` | Stateless Interactions transport, response validation, and format conversion. |
| `packages/providers-google/src/gemini-client.test.ts` | Mock transport, error, timeout, format, and native-size tests. |
| `packages/providers-google/src/cli-integration.test.ts` | Isolated CLI auth, routing, multi-provider output, and hidden-input tests. |

## Configurable API Providers

| File | Description |
|------|-------------|
| `docs/configurable-api-research.md` | Official-source protocol research, compatibility boundaries, and validation approach. |
| `packages/providers-configurable/package.json` | Configurable-provider workspace dependencies, exports, and scripts. |
| `packages/providers-configurable/tsconfig.json` | Provider TypeScript settings and core/credential references. |
| `packages/providers-configurable/src/index.ts` | Profile management and configurable-provider exports. |
| `packages/providers-configurable/src/profiles.ts` | Validated versioned endpoint profiles, isolated keys, and profile lifecycle persistence. |
| `packages/providers-configurable/src/profiles.test.ts` | Profile persistence, validation, key cleanup, and account-isolation tests. |
| `packages/providers-configurable/src/image-size.ts` | Protocol-specific pixel, aspect, preset, and automatic size mapping. |
| `packages/providers-configurable/src/http.ts` | Bounded HTTP operations, sanitized upstream quota/retry diagnostics, and credential-free image downloads. |
| `packages/providers-configurable/src/openrouter.ts` | Dedicated OpenRouter image request encoding with inline references. |
| `packages/providers-configurable/src/openai-images.ts` | OpenAI Images JSON generation and multipart edit request encoding. |
| `packages/providers-configurable/src/provider.ts` | Provider registration, model discovery, image validation, and output conversion. |
| `packages/providers-configurable/src/provider.test.ts` | Mocked protocol, size, count, discovery, error, download, and timeout coverage. |
| `packages/providers-configurable/src/cli-integration.test.ts` | Isolated profile commands, auth, discovery, generation/edit output, and exit-code tests. |
