# ImageGenCli - Project Guidelines

## First Read
- Read `VISION.md` immediately before doing any substantive work in this repo.
- Read `FILEMAP.md` at the start of every session to understand the full codebase layout.
- Treat `VISION.md` as the high-level direction for the project.
- Do not assume everything in `VISION.md` is implemented or currently part of the implementation plan. Use the codebase to confirm current behavior.
- Keep this file (`.github/copilot-instructions.md` / `AGENTS.md`) stable and high level. Do not add notes here that are likely to become stale during normal development.

## File Map Maintenance
- After adding, deleting, or renaming any source file, update `FILEMAP.md` to reflect the change.
- When refactoring moves code between files or changes a file's responsibility, update the description in `FILEMAP.md`.
- Keep `FILEMAP.md` entries concise: one to two lines per file maximum.

## Git Workflow
- Work directly on `main` unless the user explicitly requests a different branch or worktree.
- Before substantive work, run `git status --short --branch` and start from a clean, committed working tree.
- If existing changes are present, inspect and preserve them. Commit them as a clearly named checkpoint when their intent is understood; otherwise ask the user before proceeding. Never discard or overwrite unrelated work.
- Keep commits focused on the completed task and do not rewrite existing history unless the user explicitly asks.
- After completing and verifying a task, commit all task-related changes and leave the working tree clean. Push only when the user asks to publish or synchronize the work.

## Tech Stack
- Package manager: npm workspaces.
- Runtime: Node.js 20 or newer, strict TypeScript throughout.
- CLI: thin command surface in `apps/cli` over provider-neutral contracts in `packages/core`.
- Tests: Vitest, scoped to `packages/core` until the repository policy is deliberately expanded.

## Architectural Overview
- ImageGenCli is provider-agnostic and auth-agnostic. The CLI exposes only what a calling agent needs to programmatically create images; provider and credential details stay behind narrow contracts.
- Keep provider-specific transport details behind provider-neutral contracts. Put configuration in environment variables and local config files, never in code.
- Keep credentials inside the existing provider and OAuth-token persistence boundaries. Do not copy secrets onto unrelated entities, expose them in CLI output payloads, or log API keys, authorization codes, or tokens.
- Follow the Codex OAuth PKCE flow and Codex Responses image-calling patterns established in the Lorekeeper repo (`CodexAuthService`, `CodexProvider`, `CodexProjectImageProvider`) when implementing the Codex provider.

## Project Structure
- `apps/cli/` contains the CLI entry point and command wiring.
- `packages/core/` contains provider-neutral contracts, shared types, and pure domain logic.
- `packages/providers-*/` will contain one package per image provider (Codex first, Google next), each owning its auth and transport details.

## Code Style
- Use strict TypeScript and keep types close to the code that owns them until a cross-package boundary exists.
- Prefer small focused modules and explicit control flow over clever abstractions.
- Keep CLI output machine-readable by default. Human-friendly formatting must never break scripted consumption.
- Remove superseded code and concepts when replacing them. Do not leave deprecated commands, flags, handlers, or compatibility shims in place; clean out obsolete implementations unless the user explicitly asks for a transition path.

## Build & Run
- Install dependencies with `npm install` from the repo root.
- Type-check with `npm run typecheck`.
- Build with `npm run build`.
- Run `npm test`, `npm run typecheck`, and `npm run build` for domain-logic changes.
- Never leave a CLI process, server, or watcher running after verifying a change.

## Conventions
- When you need to understand the current wiring, start with `VISION.md`, then the CLI entry point, then the relevant provider package.
- Trace each requested change through its full impact area before considering the work complete. Changes to contracts or core concepts should include all affected layers such as providers, CLI commands, output schemas, and docs.
- Never log, print, or persist secrets. Treat prompts and image bytes as user data, not credentials.
