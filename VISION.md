# ImageGenCli Vision Document

## Product Vision

ImageGenCli is a provider-agnostic command-line tool for programmatic image generation. It abstracts away image-gen models and providers behind a single stable CLI surface that exposes only what a calling agent needs: a prompt in, image files out.

The core philosophy is:

> The agent focuses on the prompting. ImageGenCli owns the providers, the auth, and the plumbing.

A calling agent should never need to know which model rendered an image, which credentials were used, or how the provider's API differs from any other. It picks a capability (generate, edit), supplies a prompt and a few portable options, and receives deterministic, machine-readable results with images written to disk.

---

# Core Product Principles

## 1. Provider-Agnostic Interface

The CLI surface stays stable while providers come and go. Commands, flags, and output schemas describe image work in provider-neutral terms (prompt, size, quality, format, count). Provider selection is configuration, not a different command dialect.

## 2. Auth-Agnostic Operation

Each provider brings its own credential shape: Codex OAuth tokens, Google API keys, and whatever follows. Auth lives behind the provider boundary and is never a calling agent's problem. A generation request either works with stored credentials or fails with a clear, actionable auth error.

## 3. Agent-First Output

The primary consumer is a script or agent, not a human at a terminal. Default output is machine-readable (JSON), exit codes are meaningful, and file paths are explicit. Human-friendly rendering must never break scripted consumption.

## 4. Deterministic Local Behavior

Given the same inputs and provider state, the CLI behaves predictably: stable flag semantics, explicit output locations, no surprise prompts, no hidden network calls beyond the provider request itself.

## 5. Thin CLI, Owned Providers

The CLI layer stays thin: argument parsing, validation, and result reporting. All provider knowledge — endpoints, auth flows, request shaping, error classification, retries — lives in the owning provider package behind the core contracts.

---

# MVP Scope

## Phase 1: Codex (OpenAI GPT Image)

- Authenticate with Codex OAuth (PKCE flow), following the auth and calling patterns established in the Lorekeeper repo.
- Generate and edit images through the Codex image endpoints, defaulting to `gpt-image-2.5-flare`, with optional model selection for `gpt-image-2.5-sunburst`, `gpt-image-2`, or other provider-supported models.
- Support the portable core options: prompt, size, quality, output format, and count.
- Write image files to explicit output paths and report machine-readable results.

## Phase 2: Google (API Key)

- Add a Google image-gen provider authenticated with a plain API key.
- Reuse the same CLI surface and output schema; only provider configuration differs.

## Beyond

- Additional providers follow the same pattern: one package per provider behind the core contracts.
- The CLI surface remains auth- and provider-agnostic as the provider roster grows.

---

# Non-Goals

- No interactive image editing UI, galleries, or asset management. ImageGenCli produces files; other tools curate them.
- No prompt engineering assistance. Prompt quality is the calling agent's job.
- No hosted service or multi-user server. This is a local CLI invoked per request.

---

# Architecture Direction

Detailed architecture will be defined separately before MVP planning. The expected shape is:

```txt
imagegencli/
├── apps/
│   └── cli/                     # command surface: parse, validate, report
├── packages/
│   ├── core/                    # provider-neutral contracts and shared types
│   ├── providers-codex/         # Codex OAuth + image endpoint transport
│   └── providers-google/        # Google API-key provider (phase 2)
```

Expected boundaries:

- Provider-specific transport details stay behind provider-neutral contracts.
- Credentials stay inside provider and OAuth-token persistence boundaries; they never appear in CLI output or logs.
- The CLI depends on contracts, never on provider internals.

---

# Product North Star

> ImageGenCli should become the simplest trustworthy way for an agent to turn a prompt into an image file, regardless of which provider renders it.
