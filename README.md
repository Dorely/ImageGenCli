# ImageGenCli

ImageGenCli is free to use. If it saves you time, you can [buy Dorely a coffee](https://buymeacoffee.com/dorely).

ImageGenCli is a provider-agnostic command-line tool for programmatic image generation. It exposes a single stable CLI surface for creating images while keeping provider and auth details behind narrow contracts.

## Current Status

- Codex provider implemented: OAuth PKCE login via temporary localhost callback, vault/file token storage with auto-refresh, and `generate` / `edit` through the Codex Responses API (default `gpt-image-2.5-flare`, with Sunburst and `gpt-image-2` selectable).
- Named API profiles implemented: OpenRouter and OpenAI Images-compatible endpoints, stored-key auth, explicit model discovery, and upstream quota diagnostics.
- Gemini provider implemented: stored API key, stateless Interactions API generation, references, independent edits, native-size normalization, and PNG/JPEG/WebP delivery.

## Install

Published releases ship the `imagegen` npm package plus a matching GitHub Release tarball:

```sh
npm install -g @dorely13/ai-imagegen-cli
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
imagegen auth codex login
imagegen auth codex status
imagegen providers
imagegen generate --prompt "a lighthouse at dawn" --out ./lighthouse.png
imagegen generate --prompt "same lighthouse, dusk" --reference ./lighthouse.png --out ./dusk.png
imagegen generate --prompt "same lighthouse, dusk" --provider codex --out ./dusk.png
imagegen edit --prompt "add seagulls" --source ./lighthouse.png --out ./gulls.png
imagegen skill
imagegen help [command]
```

Each provider has its own auth namespace (`auth codex ...`, `auth gemini ...`); several can stay configured at once. `generate` and `edit` take a repeatable `--provider` flag: omit it when only one provider is configured, pass one or more names otherwise. Multi-provider runs write `<provider>-`-prefixed files and print one JSON result per provider.

Codex login starts a temporary server on `localhost:1455`, opens the browser for OAuth, and stores tokens in the OS credential vault (restricted file fallback; see `auth codex status --show-path`). `auth codex logout` removes them.

## Agent skill

`imagegen skill` prints a reusable `SKILL.md` from the installed npm package. The skill covers generation, edits, provider setup, JSON results, Flare/Sunburst selection, and native alpha transparency with verification. It works as plain instructions in any agent harness that can run a shell command.

For Claude Code across all projects, add this to `~/.claude/CLAUDE.md` (on Windows, `%USERPROFILE%\.claude\CLAUDE.md`):

```md
When I ask you to create or edit an image, run `imagegen skill` and follow its instructions. Use the installed `imagegen` CLI unless I explicitly choose another tool.
```

For native skill discovery, install the skill into one or more harnesses:

```sh
imagegen skill install --target claude --target codex
imagegen skill install --target ./my-agent/skills
```

`claude` installs to `~/.claude/skills/imagegen-cli/SKILL.md`; `codex` installs to `~/.agents/skills/imagegen-cli/SKILL.md`. A path target is the parent skills directory. The command prints JSON with the installed paths. Run it again after updating the npm package; if the existing skill differs, pass `--force` to replace it. The short global instruction above is enough if you prefer not to install a native skill.

## Image models

Both `generate` and `edit` accept `--model <id>`. Run `imagegen help`, `imagegen help generate`, or `imagegen help edit` for the model list and examples (also available with `--help`).

| Supported Codex model | Purpose | Quality |
|---|---|---|
| `gpt-image-2.5-flare` | Default; fast generation and editing | auto, low, medium, high, xhigh, max |
| `gpt-image-2.5-sunburst` | Higher-precision generation and editing | auto, low, medium, high, xhigh, max |
| `gpt-image-2` | Previous model; retained for compatibility | auto, low, medium, high |

Use full model IDs. Other provider-supported IDs remain accepted; actual account availability is determined by Codex. Unsupported models fail without automatic fallback. Selection precedence is request/CLI model, constructor `imageModel` override for library callers, `IMAGEGEN_CODEX_IMAGE_MODEL`, then Flare. The orchestration model is configured separately.

Quality defaults to `auto`. See the [official image tool documentation](https://developers.openai.com/api/docs/guides/tools-image-generation#tool-options).

For native transparent assets, use a 2.5 model, PNG or WebP, and explicitly request real alpha transparency in the prompt. The Codex CLI keeps the tool background on `auto`; it does not expose `--background`. Check the decoded alpha channel before accepting a cutout, and repeat the transparency requirement during later edits. See the [packaged skill](apps/cli/skill/SKILL.md) for examples and model guidance.

```sh
imagegen edit --format webp --source ./product.png --prompt "make the product blue" --out ./blue.webp
imagegen generate --model gpt-image-2 --prompt "a lighthouse" --out ./classic.png
imagegen generate --model gpt-image-2.5-sunburst --quality max --prompt "a product photo" --out ./product.png
```

## Configuration

- `IMAGEGEN_CODEX_MODEL` — optional override for the Codex orchestration model (default `gpt-6-luna`). This model executes the image toolcall and is part of the provider's request shape; it never rewrites the caller's prompt.
- `IMAGEGEN_CODEX_IMAGE_MODEL` — optional override for the image model (default `gpt-image-2.5-flare`); `--model` takes precedence.
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
- Never log or print secrets; persist credentials only inside the provider credential store.
- Update `FILEMAP.md` whenever source files are added, removed, renamed, or significantly repurposed.
- Read `VISION.md` and `FILEMAP.md` before making substantive changes.
- Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a public contribution.
- Codex auth and Responses image-calling patterns follow the Lorekeeper repo (`CodexAuthService`, `CodexProvider`, `CodexProjectImageProvider`).

## License

ImageGenCli is open source under the [MIT License](LICENSE).

## Gemini setup and image generation

Create an API key in [Google AI Studio](https://aistudio.google.com/apikey), then run:

```sh
imagegen auth gemini login
imagegen auth gemini status --show-path
imagegen generate --provider gemini --size 16:9 --prompt "A lighthouse at dawn, warm light, wide coastal composition" --out ./gemini.png
imagegen edit --provider gemini --source ./gemini.png --prompt "Change only the sky to dusk; preserve the lighthouse and composition" --out ./dusk.png
imagegen auth gemini logout
```

Login accepts hidden terminal input or explicit `--key-stdin` for scripts using a secure input source. Do not put keys in command arguments. Credentials use the existing OS vault and file fallback; status indicates local configuration without validating access or making a paid request. Gemini credentials remain separate from Codex tokens.

The default is `gemini-nano-banana-2.1`; override with `--model` or `IMAGEGEN_GEMINI_IMAGE_MODEL` (CLI takes precedence). Precision work can select `gemini-3-pro-image`. Existing `gemini-3.1-flash-image` and `gemini-2.5-flash-image` workflows are supported. Other model IDs are forwarded without fallback; unknown models use the default native-size policy and may reject incompatible options.

Gemini accepts `--quality auto` only and rejects masks. Sizes normalize to the nearest model-native aspect ratio and then resolution by pixel distance, with smaller output winning resolution ties. Presets and aspect-only sizes use 1K; `auto` leaves aspect and resolution to the model. Files retain actual output dimensions, reported in JSON. Format conversion uses sharp without resizing; native alpha transparency is not promised. Four reference images are allowed, plus an edit source; the legacy 2.5 model is limited to three inputs total by this tool.

Each count item is a separate request returning its last final image. Calls use `store: false`, have a 180-second request timeout, and do not retry automatically. Errors distinguish authentication (exit 3), usage (exit 2), and provider failures (exit 4). No conversation continuation, search grounding, or batch jobs are enabled. For prompting and verified transparency workflows, see the packaged skill. Research and API decisions are recorded in [Gemini integration notes](docs/gemini-research.md).

## Named image API endpoints

Save a profile for OpenRouter or a gateway using the OpenAI Images API format:

```sh
imagegen providers add openrouter --api openrouter --model <image-model-id>
imagegen auth openrouter login
imagegen models --provider openrouter
imagegen generate --provider openrouter --prompt "A lighthouse at dawn" --out ./router.png

imagegen providers add my-gateway --api openai-images --base-url https://example.com/v1 --model <image-model-id>
imagegen auth my-gateway login
imagegen generate --provider my-gateway --prompt "A lighthouse at dawn" --out ./gateway.png
```

`providers show <name>` prints non-secret configuration; `providers update <name>` accepts the same settings as add; `providers remove <name>` deletes the profile and its saved key. Names use lowercase letters, digits, and hyphens; `codex` and `gemini` are reserved. OpenRouter supplies `https://openrouter.ai/api/v1`; other profiles require a base URL including the API prefix. The adapters append `/images` (OpenRouter) or `/images/generations` and `/images/edits` (OpenAI Images).

Profiles live in a version-1 `providers.json` next to the existing credential file. Keys remain in the OS vault with file fallback. `auth <name> login` accepts hidden entry or explicit `--key-stdin`; `status --show-path` reports the credential backend without a key; logout preserves profile settings. Changing the endpoint origin clears its saved key. Profiles default to `--auth bearer`; use `--auth none` for an endpoint without authentication. URLs require HTTPS except loopback HTTP; embedded credentials, queries, and fragments are rejected in base URLs. Signed output-image download URLs may contain queries and are never printed by the adapter or sent API authentication headers.

The model is `--model` when supplied, otherwise the profile default; one is required. `models --provider <name>` is an explicit network request: OpenRouter returns image model IDs and reported supported parameters, while a generic `/models` listing reports capabilities as unknown. Generation makes no hidden model-discovery calls.

Portable flags retain their existing meaning, with model-specific limits. OpenRouter supports aspect ratios and pixel dimensions; generic OpenAI Images endpoints accept pixels or presets (square 1024x1024, portrait 1024x1536, landscape 1536x1024, wide 1536x864), and arbitrary aspect-only sizes are rejected. Automatic/default fields are omitted. Quality and output format are sent only when explicitly requested; unsupported model options produce endpoint errors. PNG/JPEG/WebP are verified deliverables, with format conversion but no local resizing. The JSON dimensions describe actual returned pixels.

References go through OpenRouter `input_references` or OpenAI multipart edits. Editing keeps source first, followed by references. Masks are available only for OpenAI Images-compatible endpoints that implement them. Four references, an additional edit source, and counts from one to four are supported by the CLI; a particular model may accept less. Count invokes separate single-image requests; there are no automatic paid retries, model substitutions, conversational sessions, or arbitrary request templates. Requests and image downloads share a 180-second timeout per count item. See [API compatibility research](docs/configurable-api-research.md) and the packaged skill for provider/model selection.

### Diagnosing gateway errors

An HTTP 429 from a gateway can originate at the upstream model service even when your gateway has credit. Error JSON includes `statusCode`, and includes a validated `upstreamProvider` and numeric `retryAfterSeconds` when supplied. Upstream quota errors identify the upstream and distinguish its quota from gateway balance. No automatic retry or model substitution occurs; explicitly select another model with `--model` or change your profile default with `providers update <name> --model <id>` after verifying it works. Provider error bodies and credentials are never echoed.
