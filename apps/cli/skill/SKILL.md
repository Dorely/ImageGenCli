---
name: imagegen-cli
description: Create or edit bitmap images with the installed `imagegen` CLI (`@dorely13/ai-imagegen-cli`). Use for image requests when the user has not chosen another tool.
---

# ImageGenCli

Use the installed `imagegen` command to turn the user's prompt into image files. The CLI handles provider selection and credentials. Follow an explicit user choice of another image tool.

1. Check that `imagegen` is available. If it is missing, tell the user to install it with `npm install -g @dorely13/ai-imagegen-cli`.
2. Run `imagegen providers` to see which provider is configured. If none is configured, have the user run `imagegen auth codex login` for browser OAuth or `imagegen auth gemini login` for hidden API-key entry. Credentials use the OS vault with a file fallback. Do not ask the user to paste keys into chat or put them in shell arguments; scripted setup can use explicit `--key-stdin` from an existing secure input source.
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

Both 2.5 models accept `--quality auto`, `low`, `medium`, `high`, `xhigh`, or `max`. Keep `auto` unless the task calls for a specific setting; try `low` for drafts. Compare models with the same brief, references, dimensions, and quality. Increase quality for an observed defect; use `xhigh` or `max` when the extra fidelity helps, rather than for every final image. Availability depends on the connected account; do not silently substitute a model after a provider error.

Use `--model` for image selection; `IMAGEGEN_CODEX_MODEL` configures orchestration separately. Do not invent additional flags from API examples.

## Native transparency with Codex

When the brief calls for a reusable cutout, sticker, sprite, icon, logo, or overlay with an empty background, request native transparency from a 2.5 model first. Do not default to a chroma background, color keying, or a separate background-removal pass. Preserve a requested scene or solid background.

The current Codex CLI sends `background: auto` and has **no `--background` flag**. Request transparency in `--prompt`; the automatic setting lets the model follow the brief. Public API examples using `background="transparent"` are not CLI syntax.

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

Use `--size` for dimensions or aspect ratio. For 2.5 custom rasters, edges must be multiples of 16, at most 3840 pixels, with aspect ratio at most 3:1 and total pixels from 655360 to 8294400. Above 3686400 pixels is experimental; inspect carefully. The CLI normalizes sizes to a legal raster and also accepts `auto`, aspect ratios, and presets; check the result's `width` and `height` and read help for current behavior.

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
