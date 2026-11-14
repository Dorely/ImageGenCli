# ImageGenCli

ImageGenCli is free to use. If it saves you time, you can [buy Dorely a coffee](https://buymeacoffee.com/dorely).

ImageGenCli is a provider-agnostic command-line tool for programmatic image generation. It exposes a single stable CLI surface for creating images while keeping provider and auth details behind narrow contracts. Results are JSON, so agents and scripts can drive it directly.

## Providers

| Provider | Auth | Notes |
|---|---|---|
| [Codex](#codex) | ChatGPT login (OAuth PKCE) | Draws on the plan's daily image allowance. Requests `gpt-image-2.6-flare` by default, though the backend chooses what runs. |
| [Gemini](#gemini) | Google AI Studio API key | Generation, references, and edits through the Interactions API. |
| [OpenRouter and OpenAI Images-compatible endpoints](#named-image-api-endpoints) | Stored API key, or none | Named profiles with explicit model discovery and upstream quota diagnostics. |
| [Local models through ComfyUI](#local-image-models-through-comfyui) | None | Runs on your own GPU. Built-in graph for FLUX 3 Image Klein; any other model through workflow files. |

Several providers can stay configured at once.

## Install

Requires Node.js 20 or newer.

```sh
npm install -g @dorely13/ai-imagegen-cli
```

This installs the `imagegen` command. Each version is also attached to its [GitHub Release](https://github.com/Dorely/ImageGenCli/releases) as a tarball with a SHA-256 checksum.

## Usage

```sh
imagegen auth codex login
imagegen auth codex status
imagegen providers
imagegen generate --prompt "a lighthouse at dawn" --out ./lighthouse.png
imagegen generate --prompt "same lighthouse, dusk" --reference ./lighthouse.png --out ./dusk.png
imagegen generate --prompt "same lighthouse, dusk" --provider codex --out ./dusk.png
imagegen edit --prompt "add seagulls" --source ./lighthouse.png --out ./gulls.png
imagegen providers add <name> --api <openrouter|openai-images|comfyui> [options]
imagegen models --provider <name>
imagegen skill
imagegen config
imagegen help [command]
imagegen --version
```

Each provider has its own auth namespace (`auth codex ...`, `auth gemini ...`, `auth <profile> ...`). `generate` and `edit` take a repeatable `--provider` flag: omit it when only one provider is configured, pass one or more names otherwise. Multi-provider runs write `<provider>-`-prefixed files and print one JSON result per provider.

Both `generate` and `edit` accept `--model <id>`. Run `imagegen help`, `imagegen help generate`, or `imagegen help edit` for every option, the model list, and examples (also available with `--help`).

The tool is a passthrough: prompts and reference images come from the caller verbatim; the CLI adds no prompt content of its own, except the fixed mask instruction for a Codex `--mask` edit.

## Agent skill

`imagegen skill` prints a reusable `SKILL.md` from the installed npm package. The skill covers generation, edits, provider setup, local model setup and server handling, JSON results, model selection, and native alpha transparency with verification. It works as plain instructions in any agent harness that can run a shell command.

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

## Codex

Codex login starts a temporary server on `localhost:1455`, opens the browser for OAuth, and stores tokens in the OS credential vault (restricted file fallback; see `auth codex status --show-path`). Tokens refresh automatically. `auth codex logout` removes them.

| Supported Codex model | Purpose | Quality |
|---|---|---|
| `gpt-image-2.6-flare` | Requested by default | auto, low, medium, high, xhigh, max |
| `gpt-image-2.6-sunburst` | Requested with `--model` | auto, low, medium, high, xhigh, max |
| `gpt-image-2.5-flare`, `gpt-image-2.5-sunburst` | Requested with `--model` | auto, low, medium, high, xhigh, max |
| `gpt-image-2` | Requested with `--model` | auto, low, medium, high |

These are requests, not selections: the backend currently accepts any ID and chooses what runs. Selection precedence is request/CLI model, constructor `imageModel` override for library callers, then Flare. The default is a pinned ID: Codex publishes no image-model listing to discover the latest one from. When a specific model matters, use a named profile such as OpenRouter.

Quality defaults to `auto`. Requests go straight to the Codex image endpoints (`/backend-api/codex/images/generations` and `/edits`, the ones the Codex app's own image tool uses): no orchestration model runs, the prompt reaches the image model verbatim, and usage draws on the plan's separate daily image allowance rather than the 5-hour/weekly Codex limits.

The backend decides what it actually renders. Observed on a Plus account (November 2026): it chose quality and size regardless of the request (about 1.57 MP at a varying aspect), and it accepted any `model` value, including a made-up ID, without naming the model it used. The Codex Responses route rewrote 2.6 requests to `gpt-image-2-codex` on the same login; see the [research notes](docs/codex-image-research.md). JSON results therefore report `requestedModel`, and per image `servedModel` (null unless the provider names one), `served` (the quality, size, and background Codex reports), and the actual `width`/`height`. The endpoint returns PNG, so JPEG and WebP are converted locally. The CLI rejects other formats, including SVG and GIF, before sending a request: Codex ignored an SVG request and rejected a GIF one.

The endpoint has no mask input, so a Codex `--mask` is sent as the last edit image and a fixed instruction is appended to the prompt: change only where the mask is transparent and keep the opaque area as in the source. This is the one case where the prompt is not sent verbatim; the JSON result still reports the caller's prompt. The mask must be a PNG matching the source dimensions, with the edit area transparent. The mask is targeting guidance, not a whitelist: the model may also change areas outside it (lighting, shadows, reflections), so do not composite the output back onto the source. It uses one of the four edit-image slots.

For native transparent assets, use PNG or WebP and explicitly request real alpha transparency in the prompt. The Codex provider keeps `background` on `auto`; the CLI does not expose `--background`. Transparent output renders at medium quality and costs roughly two to four times the image tokens of an opaque low-quality image. Check the decoded alpha channel before accepting a cutout, and repeat the transparency requirement during later edits. See the [packaged skill](apps/cli/skill/SKILL.md) for examples and model guidance.

```sh
imagegen edit --format webp --source ./product.png --prompt "make the product blue" --out ./blue.webp
imagegen generate --provider openrouter --model openai/gpt-image-2.6-sunburst --quality high --prompt "a product photo" --out ./product.png
```

## Gemini

Create an API key in [Google AI Studio](https://aistudio.google.com/apikey), then run:

```sh
imagegen auth gemini login
imagegen auth gemini status --show-path
imagegen generate --provider gemini --size 16:9 --prompt "A lighthouse at dawn, warm light, wide coastal composition" --out ./gemini.png
imagegen edit --provider gemini --source ./gemini.png --prompt "Change only the sky to dusk; preserve the lighthouse and composition" --out ./dusk.png
imagegen auth gemini logout
```

Login accepts hidden terminal input or explicit `--key-stdin` for scripts using a secure input source. Do not put keys in command arguments. Credentials use the existing OS vault and file fallback; status indicates local configuration without validating access or making a paid request. Gemini credentials remain separate from Codex tokens.

The default is `gemini-nano-banana-2.1`; override it per request with `--model`. Precision work can select `gemini-3-pro-image`. Existing `gemini-3.1-flash-image` and `gemini-2.5-flash-image` workflows are supported. Other model IDs are forwarded without fallback; unknown models use the default native-size policy and may reject incompatible options.

Gemini accepts `--quality auto` only and rejects masks. Sizes normalize to the nearest model-native aspect ratio and then resolution by pixel distance, with smaller output winning resolution ties. Presets and aspect-only sizes use 1K; `auto` leaves aspect and resolution to the model. Files retain actual output dimensions, reported in JSON. Format conversion uses sharp without resizing; native alpha transparency is not promised. Four reference images are allowed, plus an edit source; the legacy 2.5 model is limited to three inputs total by this tool.

Each count item is a separate request returning its last final image. Calls use `store: false`, have a 180-second request timeout, and do not retry automatically. Errors distinguish authentication (exit 3), usage (exit 2), and provider failures (exit 4). No conversation continuation, search grounding, or batch jobs are enabled. For prompting and verified transparency workflows, see the packaged skill. Research and API decisions are recorded in [Gemini integration notes](docs/gemini-research.md).

## Named image API endpoints

Save a profile for OpenRouter or a gateway using the OpenAI Images API format, or for [a model on your own GPU](#local-image-models-through-comfyui):

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

## Local image models through ComfyUI

`--api comfyui` runs an image model on your own GPU through a headless [ComfyUI](https://github.com/comfyanonymous/ComfyUI) server, with no key or per-image cost. A profile, by convention `local-comfy`, holds what is fixed at configuration time: the server URL, the model, the command that starts the server, and any workflow files.

### Setup

These steps fit any model that runs in ComfyUI.

1. Check your GPU memory and free disk against the model's requirements, and read its license. Many local models restrict commercial use.
2. Install ComfyUI from a [release tag](https://github.com/comfyanonymous/ComfyUI/releases), with PyTorch for your GPU from the [selector](https://pytorch.org/get-started/locally/) installed first. Check which ComfyUI version the model needs. On Linux and macOS, use `.venv/bin/python`.

   ```sh
   git clone --depth 1 --branch <release-tag> https://github.com/comfyanonymous/ComfyUI.git <comfy-dir>
   cd <comfy-dir>
   python -m venv .venv
   .venv/Scripts/python -m pip install torch torchvision --index-url <pytorch-index-for-your-gpu>
   .venv/Scripts/python -m pip install -r requirements.txt
   ```

3. Download the weights into the folders the model's documentation names under `<comfy-dir>/models/`, usually `checkpoints`, `diffusion_models`, `text_encoders`, or `vae`. For a gated repository, accept its license in your browser and run `hf auth login`.
4. Write a start script that keeps the server on loopback, because ComfyUI has no authentication:

   ```sh
   <comfy-dir>/.venv/Scripts/python <comfy-dir>/main.py --listen 127.0.0.1 --port 8188 --disable-auto-launch
   ```

5. Save the profile. `--model` is a [built-in graph's ID](#flux-3-image-klein), or your own name for a model driven by [workflow files](#workflow-files). Use full paths in the start command.

   ```sh
   imagegen providers add local-comfy --api comfyui --base-url http://127.0.0.1:8188 --model <id-or-name> --start-command "<command that runs the script>" [--workflow <text-to-image.json>] [--edit-workflow <edit.json>]
   ```

6. Start the server, then check the profile with one image:

   ```sh
   imagegen models --provider local-comfy
   imagegen generate --provider local-comfy --prompt "A lighthouse at dawn" --size wide --out ./lighthouse.png
   ```

### Daily use

The CLI never starts or stops the server, and generating needs it running. Run the profile's start command first (`imagegen providers show local-comfy` prints it), generate through `--provider local-comfy`, then stop the server, which keeps holding GPU memory until you do. If the server is down, the error quotes the saved command. The [packaged skill](apps/cli/skill/SKILL.md) tells agents to do this themselves: start the server when it isn't reachable, wait for it, and stop it when finished if they started it.

`models --provider local-comfy` doubles as a health check, listing a model only when the server has everything it needs. Masks are rejected. Sizes accept presets, pixels, or aspect ratios (about one megapixel), are rounded to multiples of 16, and need edges from 256 to 2048 pixels. `auto` means 1024x1024 for text-to-image, and the first input's aspect at about one megapixel for edits. Count runs separate jobs with new seeds, reported under `served`. Each job has a 600-second timeout. Files are re-encoded so ComfyUI's embedded workflow never reaches the output.

### Workflow files

For a model without a built-in graph, save its ComfyUI graph in API format and replace the values the CLI controls with tokens. `--workflow` handles requests with no input images, and `--edit-workflow` handles the rest. You can export API JSON from the model's template at the server's URL, or write it by hand from the node definitions at `<base-url>/object_info/<NodeClass>`.

```json
{
  "loader": { "class_type": "CheckpointLoaderSimple", "inputs": { "ckpt_name": "my-model.safetensors" } },
  "positive": { "class_type": "CLIPTextEncode", "inputs": { "text": "{{prompt}}", "clip": ["loader", 1] } },
  "negative": { "class_type": "CLIPTextEncode", "inputs": { "text": "", "clip": ["loader", 1] } },
  "latent": { "class_type": "EmptyLatentImage", "inputs": { "width": "{{width}}", "height": "{{height}}", "batch_size": 1 } },
  "sampler": { "class_type": "KSampler", "inputs": { "model": ["loader", 0], "positive": ["positive", 0], "negative": ["negative", 0], "latent_image": ["latent", 0], "seed": "{{seed}}", "steps": 20, "cfg": 7, "sampler_name": "euler", "scheduler": "normal", "denoise": 1 } },
  "decode": { "class_type": "VAEDecode", "inputs": { "samples": ["sampler", 0], "vae": ["loader", 2] } },
  "output": { "class_type": "PreviewImage", "inputs": { "images": ["decode", 0] } }
}
```

| Token | Required | Value |
|---|---|---|
| `{{prompt}}` | Yes | The `--prompt` text, used literally. |
| `{{seed}}` | Yes | A new random seed for each `--count` image. |
| `{{width}}`, `{{height}}` | Together, if at all | `--size` rounded to multiples of 16. Without them, `--size` is rejected. |
| `{{image1}}`, `{{image2}}`, ... | Edit workflows | Uploaded inputs for `LoadImage`, in order: the source, then references. The request must supply exactly this many. |

A value that is only a token keeps its type, so seeds and sizes stay numbers. Sampling lives in the file, so only `--quality auto` applies, and `--model` must match the profile. Before queueing, the CLI checks that each node type and listed file exists on the server and names any that are missing. It saves the first image of the first output node that returned one, keeping alpha if the graph outputs it. Moving a profile back to a built-in graph takes `providers remove` and a new `providers add`.

### FLUX 3 Image Klein

Black Forest Labs' FLUX 3 Image Klein has a built-in graph. It needs ComfyUI v0.44 or later, and its int8 weights are built for GPUs with 8 GB or more of VRAM. Accept the [FLUX Kommunity License](https://huggingface.co/black-forest-labs/flux-3-image-klein-comfy), which limits commercial output to qualifying users and sets its own conditions on distribution and on training other models, then download about 18 GB:

```sh
hf download black-forest-labs/flux-3-image-klein-comfy \
  diffusion_models/flux3-image-klein-int8-convrot.safetensors \
  text_encoders/qwen3vl_4b_int8_convrot.safetensors \
  text_encoders/qwen3.5_9b_flux3_prompt_upsampler_w4a8.safetensors \
  vae/flux2-vae.safetensors \
  --local-dir <comfy-dir>/models
imagegen providers add local-comfy --api comfyui --base-url http://127.0.0.1:8188 --model flux3-klein --start-command "<command that runs the script>"
```

- `flux3-klein` expands the prompt with Black Forest Labs' upsampler, as they recommend for every request. The JSON `prompt` field reports the caption that was rendered.
- `flux3-klein-raw` uses the prompt verbatim as the full scene caption and doesn't need the upsampler weights. Short prompts give generic results.

`--model` picks between them on a Klein profile, and `--quality` selects steps: `low` 4, `medium` 8, `high` or `auto` 16.

Klein has no native transparency: Black Forest Labs doesn't claim it, and its VAE decodes three channels. See the [packaged skill](apps/cli/skill/SKILL.md) for when to choose it and how to prompt it, and the [research notes](docs/configurable-api-research.md) for the evidence.

## Configuration

CLI settings live in `config.json` next to `providers.json` and the credential file, and are managed with `imagegen config`. ImageGenCli reads no settings from environment variables.

```sh
imagegen config                                      # every setting and the file location
imagegen config set usage-log ./logs/imagegen.jsonl
imagegen config get usage-log
imagegen config unset usage-log
```

- `usage-log` — a file path, stored as an absolute path. When set, each `generate`/`edit` result appends one JSON line with the timestamp, provider, image model, requested size/quality/format/count/reference count, and per-image actual dimensions, byte size, response ID, and provider-reported `usage`. Prompts, image bytes, and credentials are never written. For Codex, `usage` holds the image request ID, image tokens (`imageGeneration`), the size/quality/background actually served (`served`), and the ChatGPT plan window reported with the response (`planLimits`: plan type, active limit, and daily image allowance used percent). A log write failure prints a JSON warning on stderr and leaves the result unchanged.

Named profiles are saved in `providers.json` next to the credential file; see [Named image API endpoints](#named-image-api-endpoints).

## Development

Requires Node.js 20 or newer and npm 10 or newer.

```sh
npm install
npm run build
```

```sh
npm run dev        # Build the CLI and run it
npm run typecheck  # Run TypeScript checks
npm run build      # Build the CLI
npm test           # Run core and provider package tests
```

See [Releasing ImageGenCli](docs/releasing.md) for the version, tag, and publish workflow.

### Architecture

ImageGenCli follows the architecture direction in `VISION.md`:

- Thin CLI command surface in `apps/cli`.
- Provider-neutral contracts and shared types in `packages/core`.
- One package per image provider (`packages/providers-*`), each owning its auth and transport details.
- Machine-readable CLI output by default.

### Development notes

- Keep provider-specific transport details behind provider-neutral contracts.
- Never log or print secrets; persist credentials only inside the provider credential store.
- Update `FILEMAP.md` whenever source files are added, removed, renamed, or significantly repurposed.
- Read `VISION.md` and `FILEMAP.md` before making substantive changes.
- Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a public contribution.
- Codex auth follows the Lorekeeper repo's OAuth PKCE pattern (`CodexAuthService`); image calls use the Codex image endpoints called by the Codex app (codex-rs `codex-api/src/endpoint/images.rs`).

## License

ImageGenCli is open source under the [MIT License](LICENSE).
