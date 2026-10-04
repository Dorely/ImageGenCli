---
name: imagegen-cli
description: Create or edit bitmap images with the installed `imagegen` CLI (`@dorely13/ai-imagegen-cli`). Use for image requests when the user has not chosen another tool.
---

# ImageGenCli

Use the installed `imagegen` command to turn the user's prompt into image files. The CLI handles provider selection and credentials. Follow an explicit user choice of another image tool.

1. Check that `imagegen` is available. If it is missing, tell the user to install it with `npm install -g @dorely13/ai-imagegen-cli`.
2. Run `imagegen providers` to see which provider is configured. If none is configured, use `imagegen auth codex login` for the current Codex provider; the user must complete browser authorization. Do not request or expose tokens.
3. For a new image, run `imagegen generate --prompt "<user's image brief>" --out <output-path>`. For an edit, run `imagegen edit --source <existing-image> --prompt "<requested change>" --out <output-path>`. Use repeatable `--reference <file>` for visual references or continuity. Preserve the user's requested format, size, count, and output location using the corresponding CLI options.
4. Read `imagegen help generate` or `imagegen help edit` for current option details when needed. Follow the model and transparency guidance below. If several providers are configured, select one with `--provider`.
5. Parse the JSON result and use each `images[].path` as the generated file location. Check that the file exists and inspect the result against the brief before showing or referencing it. `imageModel` reports the selected model; successful JSON does not certify image quality or transparency. If the command fails, report the CLI error and the action needed to resolve it.

The CLI emits JSON by default. Keep its output machine-readable when calling it from scripts.

## Model and quality selection

Respect an explicit model choice. Otherwise use the configured model for ordinary work; the Codex default is `gpt-image-2.5-flare`. For native transparent assets, select Flare or Sunburst explicitly so a configuration override cannot silently select an older model.

| Image model | Use |
|---|---|
| `gpt-image-2.5-flare` | Fast generation, iteration, and edits; supports native alpha transparency. |
| `gpt-image-2.5-sunburst` | Demanding detail, text, or subject-preservation work when Flare falls short; also supports native alpha transparency. |
| `gpt-image-2` | Existing workflows or an explicit user choice; quality supports up to `high`. |

Both 2.5 models accept `--quality auto`, `low`, `medium`, `high`, `xhigh`, or `max`. Keep `auto` unless the task calls for a specific setting; try `low` for drafts. Compare models with the same brief, references, dimensions, and quality. Increase quality for an observed defect; use `xhigh` or `max` when the extra fidelity helps, rather than for every final image. Availability depends on the connected account; do not silently substitute a model after a provider error.

Use `--model` for image selection; `IMAGEGEN_CODEX_MODEL` configures orchestration separately. Do not invent additional flags from API examples.

## Native transparency

When the brief calls for a reusable cutout, sticker, sprite, icon, logo, or overlay with an empty background, request native transparency from a 2.5 model first. Do not default to a chroma background, color keying, or a separate background-removal pass. Preserve a requested scene or solid background.

The current Codex CLI sends `background: auto` and has **no `--background` flag**. Request transparency in `--prompt`; the automatic setting lets the model follow the brief. Public API examples using `background="transparent"` are not CLI syntax.

- Use `--format png` (preferred) or `--format webp`; JPEG cannot retain alpha. If the user also requires JPEG, explain the conflict before changing their requested deliverable.
- Specify real alpha transparency, isolated subject, empty surrounding pixels, and clean edges. Exclude a painted checkerboard or solid replacement backdrop. Keep intentional empty space; omit scenery, floors, horizons, and cast shadows unless requested. Preserve meaningful translucency in glass, hair, and soft edges.
- For extraction, use `edit --source` and describe the subject details to retain. For later edits of a transparent asset, repeat the alpha requirement and preserve unrelated geometry, colors, and framing.
- Verify decoded alpha values as well as appearance. An RGBA file can still be fully opaque. Check that background pixels are transparent and the subject remains visible; composite a preview over light and dark colors to inspect fringe, halos, lost detail, and unwanted opaque regions. The CLI saves returned bytes but does not validate alpha. If inspection is unavailable, state that transparency is unverified.
- If an output is opaque, make a focused native edit to remove the unwanted backdrop and recheck. Report a persistent failure; use another removal method only when the task calls for it or native attempts fail, and disclose it. Preserve alpha during resizing, cropping, and export.

```sh
imagegen generate --model gpt-image-2.5-flare --format png --size 1024x1024 --prompt "A single game inventory icon of a copper key, centered with padding. Real alpha transparency outside the key, clean edges. No scenery, floor, shadow, solid backdrop, or painted checkerboard." --out ./key.png
imagegen edit --model gpt-image-2.5-sunburst --format png --source ./product.png --prompt "Isolate the bottle on an empty alpha background with real transparency. Preserve its shape, colors, and exact label. Remove the backdrop and cast shadow; keep clean edges and transparent padding." --out ./bottle-cutout.png
imagegen edit --model gpt-image-2.5-flare --format png --source ./key.png --prompt "Change only the copper key to silver. Preserve geometry, framing, padding, and the transparent alpha background. Add no backdrop or shadow." --out ./silver-key.png
```

## Briefs, references, and sizing

Describe the intended use, composition, style, and essential constraints. Quote exact lettering and specify its placement. For edits, name both the change and the details that must remain. Each CLI call is independent: pass the previous output as `--source` for a follow-up; do not rely on conversation history reaching the provider.

Identify reference roles in the prompt. In generation, images follow `--reference` order; in editing, the source is image 1 and references follow it. The current Codex request uses at most four input images total, including the edit source. Keep important identity and style references consistent across iterations.

Use `--size` for dimensions or aspect ratio. For 2.5 custom rasters, edges must be multiples of 16, at most 3840 pixels, with aspect ratio at most 3:1 and total pixels from 655360 to 8294400. Above 3686400 pixels is experimental; inspect carefully. The CLI normalizes sizes to a legal raster and also accepts `auto`, aspect ratios, and presets; check the result's `width` and `height` and read help for current behavior.

Model guidance: [OpenAI image prompting](https://developers.openai.com/api/docs/guides/image-prompting) and [output settings](https://developers.openai.com/api/docs/guides/image-generation#customize-image-output). These describe public APIs; use the CLI's actual help for supported flags.
