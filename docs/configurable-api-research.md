# Configurable image API research

Checked 2026-10-14, with ComfyUI added 2026-11-06. Three explicit API formats are supported; endpoint URLs alone do not establish compatibility.

## OpenRouter

The [current image guide](https://openrouter.ai/docs/guides/overview/multimodal/image-generation) documents the dedicated `POST /api/v1/images` API, not chat completions, for image generation. Authentication uses Bearer API keys. Requests specify `model`, `prompt`, and optional `input_references` containing data URLs. Responses contain `data[].b64_json` and, when identifiable, `media_type`. The tool supports raster deliverables only and rejects SVG or other non-raster output.

The [official tutorial](https://openrouter.ai/blog/tutorials/image-generation/) confirms the dedicated route and reference shape. `GET /api/v1/images/models` provides image IDs, architecture modalities, and supported parameters. Discovery is explicit: generation performs no additional catalog calls and does not cache or infer capabilities. Reported metadata is guidance, not a promise that every upstream endpoint accepts every model-level option.

OpenRouter supports `size` for pixels and `aspect_ratio` for aspect-only requests. These are never sent together by this tool; automatic values are omitted. Quality and output format are forwarded only when explicitly supplied. The API has no documented mask field, so masks are rejected before transport. Count is separate `n: 1` requests to avoid relying on models supporting multiple outputs. The adapter never substitutes model IDs; OpenRouter's own upstream routing follows its service defaults.

## OpenAI Images compatibility

The [official image guide](https://developers.openai.com/api/docs/guides/image-generation) documents JSON `/v1/images/generations` and multipart `/v1/images/edits` for independent calls. The profile's base URL already includes `/v1` or another API prefix. No orchestration model or Responses tool is required. Edits attach the source first and references afterward; generation with references also uses the edits endpoint. Single inputs use `image`, multiple inputs use `image[]`, and optional masks use `mask`. Request encoding and model support are separate: a partially compatible gateway can still reject edits or individual options.

Generic OpenAI-format profiles forward pixel sizes and explicit quality/output settings without imposing Codex's raster rules. Presets resolve to concrete sizes; arbitrary aspect-only sizes require explicit pixels. Omitted or auto settings use endpoint defaults. Common `data[].b64_json` or `data[].url` outputs are accepted; downloads carry no API auth headers. Returned data is decoded, measured, checked as PNG/JPEG/WebP, and converted only when a different deliverable format is needed. Output bytes are never resized.

## ComfyUI (local models)

ComfyUI has no image API of its own, only a workflow queue, so the adapter queues either its built-in FLUX 3 Klein graph or a workflow file named in the profile. Workflow files are parsed as JSON, and tokens are substituted only in top-level string input values, so a prompt can't alter the graph. Node types and listed files are checked through `GET /object_info/{node}` before queueing. Request and response shapes were checked against a running v0.44.0 server: `POST /upload/image` with `type=temp` (referenced in `LoadImage` as `name [temp]`), `POST /prompt`, `GET /history/{id}`, and `GET /view`. Text from `PreviewAny` appears in history as `outputs.<id>.text`, including when the node was cached. A failed validation returns HTTP 400 with `node_errors`; loader files are read from `GET /object_info/{node}` first so missing weights produce a specific message.

The graph follows Comfy's [distilled Klein templates](https://github.com/Comfy-Org/workflow_templates) and [Black Forest Labs' model card](https://huggingface.co/black-forest-labs/flux-3-image-klein-comfy): 16 steps, CFG 1, euler with the simple scheduler, and int8 weights. It uses `TextGenerateV2` directly because the templates' `TextGenerate` is deprecated and replaced by this node on the server. Upsampler instructions come unchanged from Black Forest Labs' Apache-2.0 `system_prompts.json`, since the template's edit copy contains escaped line breaks. Their generate instructions accept a leading `TARGET CANVAS: W:H` line, which the adapter adds for non-square text-to-image.

Only the distilled checkpoint is exposed. The base checkpoint (50 steps, CFG 3.5) is built for fine-tuning and would double the render time without a current use here.

Measured 2026-11-06 through the CLI on an RTX 4070 (12 GB) against ComfyUI v0.44.0, including Node startup. All times are 1024x1024 at 16 steps with the upsampler unless noted.

| Scenario | Time |
|---|---|
| First image after server start | 17.4 s |
| New prompt, models loaded | 15.4 s |
| Same prompt, upsampler output cached | 6.4 s |
| Same prompt, cached, 8 steps | 3.8 s |
| Same prompt, cached, 4 steps | 2.3 s |
| New prompt, 1536x864 | 17.8 s |
| Edit, source only | 22.3 s |
| Edit, source plus one reference | 32 s |
| `flux3-klein-raw`, no upsampler | 7.9 s |
| New prompt, 2048x2048 | 42 s |

ComfyUI held 9.2 GB of VRAM after these runs. None of the output PNGs contained the workflow metadata ComfyUI normally embeds. The same `generate` path also succeeded from an installed `npm pack` tarball.

Workflow files were tested live only with Klein's own weights, using static copies of its graph without the upsampler: text-to-image at 768x512 and an edit that kept the source's aspect (1248x832). No other model has been run through them yet.

### FLUX 3 Klein transparency and guidance (checked 2026-11-06)

Klein has no native alpha, and Black Forest Labs doesn't claim it. No mention appears in the model cards, the [Klein documentation](https://docs.bfl.ai/flux_3/flux3_image_klein), its API reference (no background or alpha field, and `output_format` is JPEG or PNG), or its launch blog and model page. The published `flux2-vae.safetensors` has `decoder.conv_out.weight` of shape `[3,128,3,3]`, so it decodes three channels, and `policy_reference` in the reference code (`src/flux3/pup.py`) flattens RGBA references onto white.

Asked through this CLI for "real alpha transparency", both `flux3-klein` and `flux3-klein-raw` returned three-channel PNGs with a faint checkerboard painted onto near-white. A "plain flat solid pure green background" came back flat but darker: about RGB 44, 153, 75, varying by 13 or less per channel across the top 40 rows. Community work on alpha exists only for the earlier FLUX.2 Klein ([`trmz/flux2-klein-alpha`](https://huggingface.co/trmz/flux2-klein-alpha)) and is not from Black Forest Labs.

Klein-specific prompting guidance is limited to the [model card](https://huggingface.co/black-forest-labs/flux-3-image-klein)'s Prompting section and the Klein documentation. The general [prompting guide](https://docs.bfl.ai/guides/prompting_summary.md) is written for FLUX 3 Image and doesn't say it covers Klein. [Their agent skills](https://github.com/black-forest-labs/skills) cover FLUX.2 Klein and FLUX 3 Image, and the files checked don't mention FLUX 3 Klein. A raw caption with [bounding boxes](https://docs.bfl.ai/flux_3/flux3_image_bounding_boxes) placed a circle and a square within a few pixels of their boxes on one test.

The license pages disagree: the blog describes free commercial use below a revenue threshold, while the model page FAQ says running Klein in a product needs a commercial license. The skill and README therefore point to the license text.

## Configuration, credentials, and errors

Named non-secret profiles live in a versioned file next to existing credentials. API-key records stay within the vault/file persistence boundary. Protocol-specific adapters, transport, and discovery live in one configurable-provider package. No raw HTTP templates, arbitrary headers, or provider-specific passthrough fields are supported in this version, and only the ComfyUI adapter polls for job completion.

HTTPS is required except for loopback HTTP. Base URLs reject userinfo, query, and fragments; API requests reject redirects rather than risk credential forwarding. Result downloads allow signed queries and redirects but never receive API authentication headers. Raw error responses and transport exception messages are not echoed; validated upstream names, HTTP status, and numeric Retry-After seconds are surfaced as structured diagnostics; HTTP classifications provide auth, rate-limit, usage, server, download, timeout, or malformed-image guidance. The timeout spans response and image-download consumption. There are no automatic retries.

Other services such as [fal](https://fal.ai/docs/documentation/model-apis/inference/queue), [Replicate](https://replicate.com/docs/reference/http/), [Black Forest Labs](https://api.bfl.ai/docs), and [Ideogram](https://developer.ideogram.ai/v1/api-reference/generate-images/generate-v3) expose their own protocols. They require dedicated adapters or a compatible gateway rather than a base-URL substitution.

Verification uses isolated profile/credential files, mocked transport, real generated raster fixtures, CLI integration tests, and a packaged-install smoke test. No live paid generation or global installation is part of this change.

## Live upstream-quota investigation (2026-10-15)

The configured `google/gemini-nano-banana-2.1` request returned HTTP 429 with an upstream Google AI Studio quota-exhaustion message, despite successful OpenRouter key authentication and available gateway credit. Its image endpoint catalog listed only Google AI Studio as an upstream. An explicit request for `black-forest-labs/flux-3-image` through the same CLI and saved key succeeded and produced a verified 1360x768 raster. This diagnoses the observed failure as upstream-specific; it does not promise future availability or change the tool's no-automatic-fallback behavior. The user's local profile was explicitly updated to the verified model during troubleshooting.
