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
| `LICENSE` | PolyForm Noncommercial 1.0.0 terms and ImageGenCli required copyright notice. |
| `package.json` | Root npm workspace definition and top-level scripts. |
| `README.md` | Developer onboarding, scripts, and architecture summary. |
| `tsconfig.json` | Root TypeScript project references for editor and build graph alignment. |
| `VISION.md` | High-level product vision, MVP scope, architecture direction, and success criteria. |

## GitHub Configuration

| File | Description |
|------|-------------|
| `.github/copilot-instructions.md` | Copilot-specific project instructions kept aligned with `AGENTS.md`. |

## CLI App

| File | Description |
|------|-------------|
| `apps/cli/package.json` | CLI workspace package metadata, binary entry, dependencies, and scripts. |
| `apps/cli/tsconfig.json` | TypeScript project settings for the CLI app. |
| `apps/cli/src/index.ts` | CLI entry point placeholder; emits scaffold status as JSON. |

## Core Package

| File | Description |
|------|-------------|
| `packages/core/package.json` | Workspace package metadata for provider-neutral contracts and shared types. |
| `packages/core/tsconfig.json` | TypeScript project settings for the core package. |
| `packages/core/src/index.ts` | Core package entry placeholder for provider-neutral contracts. |
| `packages/core/src/index.test.ts` | Scaffold regression test for the core package entry. |
