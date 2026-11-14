---
name: imagegen-cli
description: Create or edit bitmap images with the installed `imagegen` CLI (`@dorely13/ai-imagegen-cli`). Use for image requests when the user has not chosen another tool.
---

# ImageGenCli

Use the installed `imagegen` command to turn the user's prompt into image files. The CLI handles provider selection and credentials. Follow an explicit user choice of another image tool.

1. Check that `imagegen` is available. If it is missing, tell the user to install it with `npm install -g @dorely13/ai-imagegen-cli`.
2. Run `imagegen providers` to see which provider is configured. If none is configured, have the user run `imagegen auth codex login` for browser OAuth or `imagegen auth gemini login` for hidden API-key entry. Named API profiles use `imagegen auth <name> login`; see the endpoint guidance below. A local model uses a `local-comfy` profile and a server you start; see "Local image models through ComfyUI". Credentials use the OS vault with a file fallback. Do not ask the user to paste keys into chat or put them in shell arguments; scripted setup can use explicit `--key-stdin` from an existing secure input source.
3. For a new image, run `imagegen generate --prompt "<user's image brief>" --out <output-path>`. For an edit, run `imagegen edit --source <existing-image> --prompt "<requested change>" --out <output-path>`. Use repeatable `--reference <file>` for visual references or continuity. Preserve the user's requested format, size, count, and output location using the corresponding CLI options.
4. Read `imagegen help generate` or `imagegen help edit` for current option details when needed. Follow the model and transparency guidance below. If several providers are configured, select one with `--provider`.
5. Parse the JSON result and use each `images[].path` as the generated file location. Check that the file exists and inspect the result against the brief before showing or referencing it. `requestedModel` is only what was asked for; `images[].servedModel` is the model the provider named, or null when it named none. Successful JSON does not certify image quality or transparency. If the command fails, report the CLI error and the action needed to resolve it.

The CLI emits JSON by default. Keep its output machine-readable when calling it from scripts.

## Model and quality selection

Respect an explicit model choice. Otherwise use the configured model for ordinary work; Codex requests `gpt-image-2.6-flare` by default, but the backend does not honor model requests (see below). When a specific model really matters, use a route that honors it, such as an OpenRouter profile with `openai/gpt-image-2.6-flare`, and tell the user that route is pay-as-you-go. Do not tell the user a Codex image came from a 2.6 model.

This guidance applies on routes that honor the model ID:

| Image model | Use |
|---|---|
| `gpt-image-2.6-flare` | Start here when response time matters: generation, iteration, and edits, including posters and product imagery. |
| `gpt-image-2.6-sunburst` | Demanding detail, layout, or edit accuracy, such as dense compositions or consistency across repeated edits, when Flare falls short. |
| `gpt-image-2.5-flare`, `gpt-image-2.5-sunburst` | Existing workflows or an explicit user choice. |
| `gpt-image-2` | Existing workflows or an explicit user choice; quality supports up to `high`. |

OpenAI's guidance is to test Flare first when moving from `gpt-image-2` or 2.5 Flare, and Sunburst first when moving from 2.5 Sunburst. If Sunburst meets the need, also try Flare with the same prompt and compare. On Codex, this choice has no known effect; see below.

The Flare and Sunburst models accept `--quality auto`, `low`, `medium`, `high`, `xhigh`, or `max`. Keep `auto` unless the task calls for a specific setting. Availability depends on the connected account; do not silently substitute a model after a provider error. Do not invent additional flags from API examples.

## Codex usage and what the backend honors

Codex requests go directly to the Codex image endpoints. No text model runs, your prompt reaches the image model verbatim (a `--mask` edit appends a fixed mask instruction), and each image draws on the ChatGPT plan's separate daily image allowance, not the Codex 5-hour or weekly limits. Each `--count` image is a separate request.

The backend decides what it renders. As observed on a Plus account in November 2026:

- **Quality:** it ignored the request. One prompt served `medium` whether `low`, `max`, or nothing was requested. A very simple prompt served `low`, and transparent output served `medium`.
- **Size:** it returned about 1.57 MP at an aspect of its choosing (for example 1536x1024 or 2172x724), even when `--size` asked for 1024x1024 or 1024x1536.
- **Model:** it accepted every value, including a made-up ID, and the response never names the model used, so `servedModel` is null. The Codex Responses route rewrote 2.6 requests to `gpt-image-2-codex` on the same login, which is the best available evidence of what runs here. Do not promise Flare or Sunburst differences to the user on this route.

Treat `--quality`, `--size`, and `--model` as requests, not guarantees, and do not burn allowance retrying just to change them. Read `width`, `height`, and `served` (the quality, size, and background Codex reports) from the JSON result; crop or resize locally when exact dimensions matter. `imagegen config set usage-log <file>` also records tokens and the allowance used percent.

- **Mask:** `--mask` takes a PNG the same size as the source, with the area to edit transparent and everything else opaque. The endpoint has no mask field, so Codex sends the mask as the last edit image and appends a fixed instruction to the prompt telling the model to change only the transparent area. The mask is targeting guidance, not a whitelist of pixels the model may change: the model can and will adjust areas outside it when the edit calls for it, such as lighting, shadows, or reflections. Never composite the output back onto the source to restore pixels outside the mask; that breaks those coherent changes and leaves seams. Use the returned image as is. The mask uses one of the four edit-image slots, leaving room for two `--reference` images. Keep the prompt focused on the change itself.
- **Format:** the endpoint returns PNG. JPEG and WebP are converted locally. OpenAI announced SVG and GIF output for 2.6, but they are not available through this CLI: Codex returned a PNG for an SVG request and rejected a GIF request as not enabled, and the CLI rejects `--format gif` and `--format svg` before sending a request. If the user needs vector or animated output, say so rather than renaming a raster. The public API's `complexity`, `frame_count`, and similar parameters are not CLI flags.
- **Cost:** an opaque image costs roughly 340 image tokens at low quality and 600 at medium. Each input image adds roughly 1,500 input tokens. Transparent output renders at medium quality and costs about 1,370, two to four times as much, so request transparency only when the asset needs it.

## Native transparency with Codex

When the brief calls for a reusable cutout, sticker, sprite, icon, logo, or overlay with an empty background, request native transparency first. Do not default to a chroma background, color keying, or a separate background-removal pass. Preserve a requested scene or solid background.

The Codex provider sends `background: auto` and the CLI has **no `--background` flag**. Request transparency in `--prompt`; the automatic setting lets the model follow the brief and produce real alpha. Public API examples using `background="transparent"` are not CLI syntax.

- Use `--format png` (preferred) or `--format webp`; JPEG cannot retain alpha. If the user also requires JPEG, explain the conflict before changing their requested deliverable.
- Specify real alpha transparency, isolated subject, empty surrounding pixels, and clean edges. Exclude a painted checkerboard or solid replacement backdrop. Keep intentional empty space; omit scenery, floors, horizons, and cast shadows unless requested. Preserve meaningful translucency in glass, hair, and soft edges.
- For extraction, use `edit --source` and describe the subject details to retain. For later edits of a transparent asset, repeat the alpha requirement and preserve unrelated geometry, colors, and framing.
- Verify decoded alpha values as well as appearance. An RGBA file can still be fully opaque. Check that background pixels are transparent and the subject remains visible. Solid subjects can decode slightly below full opacity (about 250-254 was observed), so do not require exactly 255. Viewers that drop alpha can show a false glow from colors stored under low-alpha pixels, and some outputs do carry a real faint haze; composite a preview over light and dark colors to inspect fringe, halos, lost detail, and unwanted opaque regions. The CLI saves returned bytes but does not validate alpha. If inspection is unavailable, state that transparency is unverified.
- If an output is opaque, make a focused native edit to remove the unwanted backdrop and recheck. Report a persistent failure; use another removal method only when the task calls for it or native attempts fail, and disclose it. Preserve alpha during resizing, cropping, and export.

```sh
imagegen generate --provider codex --format png --prompt "A single game inventory icon of a copper key, centered with padding. Real alpha transparency outside the key, clean edges. No scenery, floor, shadow, solid backdrop, or painted checkerboard." --out ./key.png
imagegen edit --provider codex --format png --source ./product.png --prompt "Isolate the bottle on an empty alpha background with real transparency. Preserve its shape, colors, and exact label. Remove the backdrop and cast shadow; keep clean edges and transparent padding." --out ./bottle-cutout.png
imagegen edit --provider codex --format png --source ./key.png --prompt "Change only the copper key to silver. Preserve geometry, framing, padding, and the transparent alpha background. Add no backdrop or shadow." --out ./silver-key.png
```

## Briefs, references, and sizing

Describe the intended use, composition, style, and essential constraints. Quote exact lettering and specify its placement. For edits, name both the change and the details that must remain. Each CLI call is independent: pass the previous output as `--source` for a follow-up; do not rely on conversation history reaching the provider.

Identify reference roles in the prompt. In generation, images follow `--reference` order; in editing, the source is image 1 and references follow it. The current Codex request uses at most four input images total, including the edit source. Keep important identity and style references consistent across iterations.

Use `--size` for dimensions or aspect ratio. The CLI normalizes sizes to a legal raster for these models (16-pixel multiples, edges at most 3840, aspect at most 3:1) and also accepts `auto`, aspect ratios, and presets, but Codex may still return a different size (see above). Check the result's `width` and `height` and read help for current behavior.

Model guidance: [OpenAI image prompting](https://developers.openai.com/api/docs/guides/image-prompting) and [output settings](https://developers.openai.com/api/docs/guides/image-generation#customize-image-output). These describe public APIs; use the CLI's actual help for supported flags.

## Gemini generation and editing

Use `--provider gemini` when both providers are configured. The default image model is `gemini-nano-banana-2.1`; `--model` overrides it. Use `gemini-3-pro-image` for demanding precision or brand consistency when the default falls short. Respect explicit model choices and report access errors without substituting models.

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

Run `imagegen providers` to find saved profiles as well as Codex/Gemini. Select profiles by their saved name with `--provider`; keep an explicit user choice of provider and model. This tool supports the OpenRouter dedicated Images API, OpenAI Images JSON/multipart protocols, and local models through ComfyUI (see the next section). A generic URL does not make fal, Replicate, or another service's job API compatible.

For setup, use `imagegen providers add <name> --api openrouter --model <model-id>`, or `--api openai-images --base-url <url-with-api-prefix> --model <model-id>`. These are non-secret configuration commands. Have the user run `imagegen auth <name> login` for hidden key entry; do not put keys in command arguments or chat. An explicitly unauthenticated local gateway can use `--auth none`. Update settings with `providers update`, inspect them with `providers show`, and remove profiles and credentials with `providers remove`. Logout removes credentials while retaining configuration. Changing the URL's origin clears credentials.

Use `imagegen models --provider <name>` when model IDs or supported features need discovery. OpenRouter supplies image models and capability metadata. Generic endpoint `/models` catalogs do not prove image support: their capabilities are marked unknown. Do not assume that a catalog model supports edits, masks, transparency, references, quality tiers, or a particular size. Generation itself performs no discovery. `--model` overrides a profile's default; if neither exists, ask for or discover an appropriate model ID.

- Keep prompts coherent and specific, identify each reference's role, and quote exact lettering. Model-specific guidance applies only when that model's documentation supports it; Codex's native-alpha advice does not establish transparency for every gateway or image model.
- OpenRouter accepts pixel sizes or aspect ratios; OpenAI Images-compatible profiles accept pixels and presets, with arbitrary aspect-only sizes rejected. Presets are square 1024x1024, portrait 1024x1536, landscape 1536x1024, and wide 1536x864; models may reject particular dimensions. Omit size/quality for endpoint defaults rather than assuming Codex's normalization rules.
- References on OpenAI-compatible generation use its edit endpoint. For edits, image 1 is the source and following images are references. OpenRouter supports reference-guided edits but no mask field; use masks only with an endpoint/model that implements OpenAI Images edits. Keep within the tool's four-reference limit and any lower model limit.
- Each CLI call is independent. Use the previous result as `--source` for follow-up changes. Count makes separate requests; report errors without automatic retries or model substitution.
- The CLI verifies PNG/JPEG/WebP bytes, measures dimensions, and converts formats without resizing. Inspect output before delivery. Format conversion does not create alpha, and a successful API call does not prove fidelity, transparency, or correct text.
- `openai/gpt-image-2.6-flare` and `openai/gpt-image-2.6-sunburst` on OpenRouter, as observed in November 2026: a low-quality 1:1 image returned 1024x1024 for about $0.025 on either model, and Flare responded faster. Asking for transparency in the prompt produced real alpha through the CLI; verify it as described above. OpenRouter rejects SVG for these models. Its API can return animated GIF, but the CLI cannot request it.

```sh
imagegen models --provider openrouter
imagegen generate --provider openrouter --model <discovered-model-id> --size 16:9 --prompt "A cinematic coastal lighthouse at dawn, soft mist, warm light and generous sky" --out ./lighthouse.png
imagegen edit --provider my-gateway --source ./lighthouse.png --prompt "Change only the sky to dusk. Preserve the lighthouse, coastline, composition, and lighting on the building." --out ./dusk.png
```

Protocol references: [OpenRouter Images](https://openrouter.ai/docs/guides/overview/multimodal/image-generation) and [OpenAI Images](https://developers.openai.com/api/docs/guides/image-generation). Use the installed CLI help for actual options.

## Local image models through ComfyUI

A local model runs on the user's GPU through a [ComfyUI](https://github.com/comfyanonymous/ComfyUI) server, with no key or per-image cost. The CLI reaches the server through a named profile, by convention `local-comfy`, that holds everything fixed at configuration time: the server URL, the model, the command that starts the server, and any workflow files.

Choose it when the user asks for local or offline generation, or when many drafts or edits make per-image cost matter and the model's limits suit the brief. Check the model's section below for what it can't do before committing to it.

### Using a configured profile

The CLI never starts or stops ComfyUI, so you run it around the work:

1. Run `imagegen providers show local-comfy` to read its `model` and `startCommand`. If the profile doesn't exist, offer the setup below.
2. Run `imagegen models --provider local-comfy`. A listed model means the server is up and has what it needs. An empty list or a `configuration` error means files are missing; report which, and don't start a download without asking. A `transport` error saying ComfyUI isn't reachable means the server is down.
3. If it's down, run the profile's `startCommand` yourself as a background process, then repeat `imagegen models --provider local-comfy` every few seconds for up to two minutes. If the profile has no `startCommand`, ask the user how to start the server and save the answer with `imagegen providers update local-comfy --start-command "<command>"`. If the server doesn't come up, report its output.
4. Run `imagegen generate --provider local-comfy` or `imagegen edit --provider local-comfy` and inspect the results as usual. The first image after a start is slower while weights load. Each job has a 600-second limit unless `--timeout` changes it.
5. When the batch is finished, stop the server if you started it, because it keeps holding GPU memory. Leave it running if it was already up when you arrived.

Each profile renders the model it was configured with. To switch models, update the profile or add another, such as `local-comfy-<model>`.

### Setting up a local model

Setup installs software and downloads many gigabytes, so confirm the model and install location with the user first. These steps fit any model that runs in ComfyUI.

1. **Check the machine.** Compare GPU memory (`nvidia-smi`) and free disk with the model's published requirements. Offer a smaller or quantized build if the card falls short. Read the model's license with the user, since many local models restrict commercial use.
2. **Install ComfyUI.** Pick a [release tag](https://github.com/comfyanonymous/ComfyUI/releases) and a drive with room, then install PyTorch for the user's GPU from the [selector](https://pytorch.org/get-started/locally/) before ComfyUI's requirements:

   ```sh
   git clone --depth 1 --branch <release-tag> https://github.com/comfyanonymous/ComfyUI.git <comfy-dir>
   cd <comfy-dir>
   python -m venv .venv
   .venv/Scripts/python -m pip install torch torchvision --index-url <pytorch-index-for-the-gpu>
   .venv/Scripts/python -m pip install -r requirements.txt
   ```

   On Linux and macOS the interpreter is `.venv/bin/python`. Some models need a newer ComfyUI than others, so check the model's documentation before picking the tag.
3. **Download the weights.** Place each file in the folder the model's documentation names under `<comfy-dir>/models/`, usually `checkpoints`, `diffusion_models`, `text_encoders`, or `vae`. If the repository is gated, the user accepts its license in their browser and runs `hf auth login` themselves. Never ask for a token in chat or put one in a command.
4. **Write a start script** in `<comfy-dir>` that keeps the server on loopback, because ComfyUI has no authentication:

   ```sh
   <comfy-dir>/.venv/Scripts/python <comfy-dir>/main.py --listen 127.0.0.1 --port 8188 --disable-auto-launch
   ```

5. **Decide how the CLI drives the model.** If the model has a section below, its built-in graph needs only `--model <id>`. Any other model needs workflow files, described next.
6. **Save the profile.** Paths must be reachable from any working directory, so use full paths in the start command:

   ```sh
   imagegen providers add local-comfy --api comfyui --base-url http://127.0.0.1:8188 --model <id-or-your-name-for-it> --start-command "<command that runs the script>" [--workflow <text-to-image.json>] [--edit-workflow <edit.json>]
   ```

7. **Verify.** Start the server, confirm `imagegen models --provider local-comfy` lists the model, generate one image, inspect it, and stop the server. Then tell the user the profile is ready and what the model can't do.

CLI versions without ComfyUI support reject `--api comfyui`, so update `imagegen` first if `providers add` refuses it.

### Workflow files for other models

A workflow file is a ComfyUI graph in API format, the object of `{"<node-id>": {"class_type": ..., "inputs": {...}}}`. Get one from the model's ComfyUI template by opening it at the server's URL and exporting API JSON, or write it by hand using the node definitions at `<base-url>/object_info/<NodeClass>`. UI-format exports with `nodes` and `links` are rejected.

Then replace the input values the CLI should control with tokens. A value that is only a token keeps its type, so `"seed": "{{seed}}"` sends a number. Tokens can also sit inside text, such as `"text": "pixel art, {{prompt}}"`.

| Token | Required | Value |
|---|---|---|
| `{{prompt}}` | Yes | The `--prompt` text, used literally. |
| `{{seed}}` | Yes | A new random seed for each `--count` image. |
| `{{width}}`, `{{height}}` | Together, if at all | `--size` rounded to multiples of 16. Without them, `--size` is rejected. |
| `{{image1}}`, `{{image2}}`, ... | Edit workflows | Uploaded inputs for `LoadImage`, in order: the source, then references. The request must supply exactly this many. |

`--workflow` handles requests with no input images and `--edit-workflow` handles the rest. Either may be omitted, and the CLI says so if a request needs the missing one. Without `--size`, text-to-image uses 1024x1024 and edits use the first input's aspect at about one megapixel.

Sampling lives in the file, so only `--quality auto` applies and `--model` must match the profile. The CLI saves the first image of the first output node that returned one, so end the graph with a single `PreviewImage` (`SaveImage` also keeps a copy in ComfyUI's output folder). Before queueing, it checks that each node type and listed file exists on the server, and names any that are missing. Alpha survives if the graph outputs it. Moving a profile back to a built-in graph takes `providers remove` and a new `providers add`.

### FLUX 3 Image Klein

Black Forest Labs' 5.6-billion-parameter model is built for image editing, and also does text-to-image, multiple references, bounding-box layouts, and text rendering. The int8 weights fit GPUs with 8 GB or more, and the CLI has a built-in graph for it, on ComfyUI v0.44 or later.

**Setup:** accept the license on [the weights page](https://huggingface.co/black-forest-labs/flux-3-image-klein-comfy), then download about 18 GB. Save the profile with `--model flux3-klein` and no workflow files.

```sh
hf download black-forest-labs/flux-3-image-klein-comfy diffusion_models/flux3-image-klein-int8-convrot.safetensors text_encoders/qwen3vl_4b_int8_convrot.safetensors text_encoders/qwen3.5_9b_flux3_prompt_upsampler_w4a8.safetensors vae/flux2-vae.safetensors --local-dir <comfy-dir>/models
```

**Choose it for** local drafts, concept iteration, and reference-guided edits where some drift is acceptable. On an RTX 4070 (12 GB), a new 1024x1024 prompt took about 15 seconds at 16 steps. Repeating a prompt at `--quality low` took about 2 seconds, which suits batches of variations.

**Choose something else for:**

- **Transparency.** It has no native alpha. Black Forest Labs doesn't claim any, its VAE decodes three channels, and its reference code flattens transparent inputs onto white. When asked for real transparency in November 2026, it returned opaque RGB with a faint checkerboard painted onto near-white, so don't ask it for transparency. Use the native route above when a cutout is needed. If the work must stay local, ask for a plain solid contrasting background and tell the user a separate background-removal step is still required. A "pure green" request came back flat but darker, about RGB 44, 153, 75, so sample the backdrop color from the output.
- **Exact text.** Black Forest Labs warns that text may be inaccurate or distorted, so check every character, or add the lettering afterward.
- **Exact preservation.** Edits can change content outside the requested region, and masks are rejected. Small requested elements may not appear.
- **Commercial work without checking the license.** Use falls under the [FLUX Kommunity License](https://huggingface.co/black-forest-labs/flux-3-image-klein-comfy), which sets its own limits on commercial output. Have the user read its text rather than relying on a summary.

**Models:** `flux3-klein` expands your request through Black Forest Labs' prompt upsampler, which they say to always run, and reports the caption it rendered in the JSON `prompt` field. Check that caption against the brief. `flux3-klein-raw` sends your text as the full caption, needs no upsampler weights, and gives generic results from short prompts. `--model` picks between them on any Klein profile.

**Prompting:**

- With `flux3-klein`, state the subject, purpose, and constraints plainly, and let the upsampler write the rest.
- With `flux3-klein-raw`, structure the caption as medium, subject, setting, light, and framing. Clear structure matters more than length, and quality tags add nothing.
- There is no negative prompt, so describe what should be there: "an empty promenade", not "no people".
- For style, describe attributes such as palette, stroke, and texture instead of naming an artwork.
- For text, quote it, say where it goes, and describe the type.
- In edits, say what must stay. In Black Forest Labs' words, "reference images anchor content, they do not lock structure". Refer to inputs by order ("the first image"). Klein itself takes up to 10 references, but this CLI sends four plus a source.
- For layout, use `flux3-klein-raw` and append a JSON list to the caption. Each box is `[top, left, bottom, right]` on a 0-1000 grid, tied to an element tagged `<id>` in the caption: `[{"id":"key_1","bbox":[150,150,850,850],"desc":"a copper key"}]`. Two simple shapes landed within a few pixels of their boxes in a test, but boxes aren't hard masks, so check the result.

**Options:** `--quality` runs `low` 4, `medium` 8, or `high` and `auto` 16 steps. Use `low` for drafts and 16 for finals. Sizes round to multiples of 16 with edges from 256 to 2048. `auto` means 1024x1024 for text-to-image and the first input's aspect at about one megapixel for edits.

Sources: [model card](https://huggingface.co/black-forest-labs/flux-3-image-klein) and [Klein documentation](https://docs.bfl.ai/flux_3/flux3_image_klein), the only Klein-specific guidance Black Forest Labs publishes; [bounding boxes](https://docs.bfl.ai/flux_3/flux3_image_bounding_boxes); and the general [prompting guide](https://docs.bfl.ai/guides/prompting_summary.md), written for FLUX 3 Image and not stated to cover Klein.
