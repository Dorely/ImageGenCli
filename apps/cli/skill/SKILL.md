---
name: imagegen-cli
description: Create or edit bitmap images with the installed `imagegen` CLI (`@dorely13/ai-imagegen-cli`). Use for image requests when the user has not chosen another tool.
---

# ImageGenCli

Use the installed `imagegen` command to turn the user's prompt into image files. The CLI handles provider selection and credentials. Follow an explicit user choice of another image tool.

1. Check that `imagegen` is available. If it is missing, tell the user to install it with `npm install -g @dorely13/ai-imagegen-cli`.
2. Run `imagegen providers` to see which provider is configured. If none is configured, have the user run `imagegen auth codex login` for browser OAuth or `imagegen auth gemini login` for hidden API-key entry. Named API profiles use `imagegen auth <name> login`; see the endpoint guidance below. Credentials use the OS vault with a file fallback. Do not ask the user to paste keys into chat or put them in shell arguments; scripted setup can use explicit `--key-stdin` from an existing secure input source.
3. For a new image, run `imagegen generate --prompt "<user's image brief>" --out <output-path>`. For an edit, run `imagegen edit --source <existing-image> --prompt "<requested change>" --out <output-path>`. Use repeatable `--reference <file>` for visual references or continuity. Preserve the user's requested format, size, count, and output location using the corresponding CLI options.
4. Read `imagegen help generate` or `imagegen help edit` for current option details when needed. Follow the model and transparency guidance below. If several providers are configured, select one with `--provider`.
5. Parse the JSON result and use each `images[].path` as the generated file location. Check that the file exists and inspect the result against the brief before showing or referencing it. `imageModel` reports the selected model; successful JSON does not certify image quality or transparency. If the command fails, report the CLI error and the action needed to resolve it.

The CLI emits JSON by default. Keep its output machine-readable when calling it from scripts.

## Model and quality selection

Respect an explicit model choice. Otherwise use the configured model for ordinary work; the Codex default is `gpt-image-2.5-flare`. For native transparent assets using Codex, select `--provider codex` and Flare or Sunburst explicitly so a configuration override cannot silently select an older model.

| Image model | Use |
|---|---|
| `gpt-image-2.5-flare` | Fast generation, iteration, and edits; supports native alpha transparency. |
| `gpt-image-2.5-sunburst` | Demanding detail, text, or subject-preservation work when Flare falls short; also supports native alpha transparency. |
| `gpt-image-2` | Existing workflows or an explicit user choice; quality supports up to `high`. |

Both 2.5 models accept `--quality auto`, `low`, `medium`, `high`, `xhigh`, or `max`. Keep `auto` unless the task calls for a specific setting. Availability depends on the connected account; do not silently substitute a model after a provider error. Do not invent additional flags from API examples.

## Codex usage and what the backend honors

Codex requests go directly to the Codex image endpoints. No text model runs, your prompt reaches the image model verbatim, and each image draws on the ChatGPT plan's separate daily image allowance, not the Codex 5-hour or weekly limits. Each `--count` image is a separate request.

The backend decides what it renders. As observed on a Plus account in October 2026:

- **Quality:** it served `low` whatever was requested.
- **Size:** it returned about 1.57 MP at a varying aspect (for example 1374x1145) rather than the requested `--size`.
- **Model:** it accepted any model value without error.

Treat `--quality`, `--size`, and `--model` as requests, not guarantees, and do not burn allowance retrying just to change them. Read `width` and `height` from the JSON result; crop or resize locally when exact dimensions matter. `IMAGEGEN_USAGE_LOG=<file>` records what was actually served and the allowance used percent.

- **Mask:** Codex ignores `--mask`, which is accepted for compatibility with the shared CLI surface. Name the region to change and what to preserve in the prompt instead.
- **Format:** the endpoint returns PNG. JPEG and WebP are converted locally.
- **Cost:** a low-quality opaque image costs roughly 450 image tokens. Each input image adds roughly 1,500 input tokens. Transparent output renders at medium quality and costs about two to four times as much, so request transparency only when the asset needs it.

## Native transparency with Codex

When the brief calls for a reusable cutout, sticker, sprite, icon, logo, or overlay with an empty background, request native transparency from a 2.5 model first. Do not default to a chroma background, color keying, or a separate background-removal pass. Preserve a requested scene or solid background.

The Codex provider sends `background: auto` and the CLI has **no `--background` flag**. Request transparency in `--prompt`; the automatic setting lets the model follow the brief and produce real alpha. Public API examples using `background="transparent"` are not CLI syntax.

- Use `--format png` (preferred) or `--format webp`; JPEG cannot retain alpha. If the user also requires JPEG, explain the conflict before changing their requested deliverable.
- Specify real alpha transparency, isolated subject, empty surrounding pixels, and clean edges. Exclude a painted checkerboard or solid replacement backdrop. Keep intentional empty space; omit scenery, floors, horizons, and cast shadows unless requested. Preserve meaningful translucency in glass, hair, and soft edges.
- For extraction, use `edit --source` and describe the subject details to retain. For later edits of a transparent asset, repeat the alpha requirement and preserve unrelated geometry, colors, and framing.
- Verify decoded alpha values as well as appearance. An RGBA file can still be fully opaque. Check that background pixels are transparent and the subject remains visible; composite a preview over light and dark colors to inspect fringe, halos, lost detail, and unwanted opaque regions. The CLI saves returned bytes but does not validate alpha. If inspection is unavailable, state that transparency is unverified.
- If an output is opaque, make a focused native edit to remove the unwanted backdrop and recheck. Report a persistent failure; use another removal method only when the task calls for it or native attempts fail, and disclose it. Preserve alpha during resizing, cropping, and export.

```sh
imagegen generate --provider codex --model gpt-image-2.5-flare --format png --size 1024x1024 --prompt "A single game inventory icon of a copper key, centered with padding. Real alpha transparency outside the key, clean edges. No scenery, floor, shadow, solid backdrop, or painted checkerboard." --out ./key.png
imagegen edit --provider codex --model gpt-image-2.5-sunburst --format png --source ./product.png --prompt "Isolate the bottle on an empty alpha background with real transparency. Preserve its shape, colors, and exact label. Remove the backdrop and cast shadow; keep clean edges and transparent padding." --out ./bottle-cutout.png
imagegen edit --provider codex --model gpt-image-2.5-flare --format png --source ./key.png --prompt "Change only the copper key to silver. Preserve geometry, framing, padding, and the transparent alpha background. Add no backdrop or shadow." --out ./silver-key.png
```

## Briefs, references, and sizing

Describe the intended use, composition, style, and essential constraints. Quote exact lettering and specify its placement. For edits, name both the change and the details that must remain. Each CLI call is independent: pass the previous output as `--source` for a follow-up; do not rely on conversation history reaching the provider.

Identify reference roles in the prompt. In generation, images follow `--reference` order; in editing, the source is image 1 and references follow it. The current Codex request uses at most four input images total, including the edit source. Keep important identity and style references consistent across iterations.

Use `--size` for dimensions or aspect ratio. The CLI normalizes sizes to a legal 2.5 raster (16-pixel multiples, edges at most 3840, aspect at most 3:1) and also accepts `auto`, aspect ratios, and presets, but Codex may still return a different size (see above). Check the result's `width` and `height` and read help for current behavior.

Model guidance: [OpenAI image prompting](https://developers.openai.com/api/docs/guides/image-prompting) and [output settings](https://developers.openai.com/api/docs/guides/image-generation#customize-image-output). These describe public APIs; use the CLI's actual help for supported flags.

## Gemini generation and editing

Use `--provider gemini` when both providers are configured. The default image model is `gemini-nano-banana-2.1`; `IMAGEGEN_GEMINI_IMAGE_MODEL` configures it and `--model` overrides it. Use `gemini-3-pro-image` for demanding precision or brand consistency when the default falls short. Respect explicit model choices and report access errors without substituting models.

- Describe a coherent scene, its purpose, subject, composition, lighting, camera angle, materials, and visual style rather than listing disconnected keywords. Express the desired scene positively. Break complex compositions into clear ordered instructions when useful.
- For lettering, decide the exact copy first, quote it, and describe font style, placement, and hierarchy. Inspect spelling and legibility in the result.
- Assign each reference a role: identity, object, pose, layout, or style. The source is image 1 for edits; references follow in CLI order. Keep identity references consistent. At most four references are accepted; legacy `gemini-2.5-flash-image` accepts up to three inputs total in this tool.
- Iterate with `edit --source <previous-output>`, describing the focused change and the details to preserve. Each call is independent; no conversation state or thought signatures are carried forward.
- Use only `--quality auto` (or omit it). Gemini has no Codex quality tiers and does not accept `--mask`; describe the region to change in the prompt.
- `--size` maps to the nearest supported native ratio and resolution, without local resizing. Aspect ratios and presets use 1K; explicit pixel dimensions can select higher native tiers. `auto` keeps model defaults. Read JSON dimensions rather than assuming exact requested pixels.
- PNG, JPEG, and WebP are deliverable formats; the CLI converts returned bytes locally when necessary. Conversion does not create transparency. Native alpha is not established for Gemini; use Codex for verified native cutouts when provider choice permits. Do not mistake a painted checkerboard or white background for transparency.
- Count uses separate requests, one delivered final image per request. There are no automatic paid retries, search grounding, or batch jobs. Generated images retain Google's SynthID marking.

```sh
imagegen generate --provider gemini --size 16:9 --prompt "A studio product photograph of a matte ceramic mug for a minimalist shop banner. Soft side lighting, warm off-white background, mug at right with generous empty space at left." --out ./mug.png
imagegen edit --provider gemini --source ./mug.png --prompt "Change only the mug glaze to cobalt blue. Preserve its shape, composition, lighting, background, and empty space." --out ./blue-mug.png
```

Sources: [Google image generation and prompting](https://ai.google.dev/gemini-api/docs/image-generation), [Interactions API](https://ai.google.dev/gemini-api/docs/interactions-overview), and [API reference](https://ai.google.dev/api/interactions-api). Public API examples are not CLI flags; consult installed help.

## Named endpoints: OpenRouter and compatible image APIs

Run `imagegen providers` to find saved profiles as well as Codex/Gemini. Select profiles by their saved name with `--provider`; keep an explicit user choice of provider and model. This tool supports the OpenRouter dedicated Images API and OpenAI Images JSON/multipart protocols. A generic URL does not make fal, Replicate, or another service's job API compatible.

For setup, use `imagegen providers add <name> --api openrouter --model <model-id>`, or `--api openai-images --base-url <url-with-api-prefix> --model <model-id>`. These are non-secret configuration commands. Have the user run `imagegen auth <name> login` for hidden key entry; do not put keys in command arguments or chat. An explicitly unauthenticated local gateway can use `--auth none`. Update settings with `providers update`, inspect them with `providers show`, and remove profiles and credentials with `providers remove`. Logout removes credentials while retaining configuration. Changing the URL's origin clears credentials.

Use `imagegen models --provider <name>` when model IDs or supported features need discovery. OpenRouter supplies image models and capability metadata. Generic endpoint `/models` catalogs do not prove image support: their capabilities are marked unknown. Do not assume that a catalog model supports edits, masks, transparency, references, quality tiers, or a particular size. Generation itself performs no discovery. `--model` overrides a profile's default; if neither exists, ask for or discover an appropriate model ID.

- Keep prompts coherent and specific, identify each reference's role, and quote exact lettering. Model-specific guidance applies only when that model's documentation supports it; Codex's native-alpha advice does not establish transparency for every gateway or image model.
- OpenRouter accepts pixel sizes or aspect ratios; OpenAI Images-compatible profiles accept pixels and presets, with arbitrary aspect-only sizes rejected. Presets are square 1024x1024, portrait 1024x1536, landscape 1536x1024, and wide 1536x864; models may reject particular dimensions. Omit size/quality for endpoint defaults rather than assuming Codex's normalization rules.
- References on OpenAI-compatible generation use its edit endpoint. For edits, image 1 is the source and following images are references. OpenRouter supports reference-guided edits but no mask field; use masks only with an endpoint/model that implements OpenAI Images edits. Keep within the tool's four-reference limit and any lower model limit.
- Each CLI call is independent. Use the previous result as `--source` for follow-up changes. Count makes separate requests; report errors without automatic retries or model substitution.
- The CLI verifies PNG/JPEG/WebP bytes, measures dimensions, and converts formats without resizing. Inspect output before delivery. Format conversion does not create alpha, and a successful API call does not prove fidelity, transparency, or correct text.

```sh
imagegen models --provider openrouter
imagegen generate --provider openrouter --model <discovered-model-id> --size 16:9 --prompt "A cinematic coastal lighthouse at dawn, soft mist, warm light and generous sky" --out ./lighthouse.png
imagegen edit --provider my-gateway --source ./lighthouse.png --prompt "Change only the sky to dusk. Preserve the lighthouse, coastline, composition, and lighting on the building." --out ./dusk.png
```

Protocol references: [OpenRouter Images](https://openrouter.ai/docs/guides/overview/multimodal/image-generation) and [OpenAI Images](https://developers.openai.com/api/docs/guides/image-generation). Use the installed CLI help for actual options.
