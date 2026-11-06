# Codex Image Model Research

Researched and tested 2026-11-06 on one Plus account, after the GPT Image 2.6 release on 2026-11-04. Backend behavior is undocumented and may change.

## Model IDs and selection

OpenAI's [Flare](https://developers.openai.com/api/docs/models/gpt-image-2.6-flare) and [Sunburst](https://developers.openai.com/api/docs/models/gpt-image-2.6-sunburst) pages confirm `gpt-image-2.6-flare` and `gpt-image-2.6-sunburst`, with no dated snapshot or latest alias. The [prompting guide](https://developers.openai.com/api/docs/guides/image-prompting) recommends Flare when response time matters and Sunburst for demanding detail, layout, or edit accuracy. The [deprecations page](https://developers.openai.com/api/docs/deprecations) lists no shutdown for 2.5 or `gpt-image-2`.

The docs lag the release: many parameter limits still name 2.5 only. The 2.6 maximum size and mask support are not stated explicitly.

## Why the default is pinned

There is nothing to discover the latest image model from:

- `GET /backend-api/codex/models?client_version=...` and `GET /backend-api/models` return only text models.
- Likely image listing paths under `/backend-api/codex` and `/backend-api` return 404.
- [`GET /v1/models`](https://developers.openai.com/api/reference/resources/models/methods/list) needs an API key and reports no capabilities.
- The [Codex source](https://github.com/openai/codex/blob/main/codex-rs/ext/image-generation/src/tool.rs) hard-codes `gpt-image-2`.

Leaving `model` out of the request also returns an image, so the backend does choose a model itself. The CLI still sends a pinned ID, because that choice cannot be confirmed to be the latest or the lower tier.

## What the Codex endpoint did

| Request | Result |
|---|---|
| `model` omitted, 2.6 Flare, 2.6 Sunburst, or `gpt-image-2`, with a transparency prompt | 200, real alpha, `medium`, 1536x1024, 1,372 output tokens for all four |
| Made-up model ID | 200, normal image |
| Same photo prompt with `quality` `low`, `max`, or omitted | `medium`, 1536x1024, 601 output tokens for all three |
| `size` 1024x1536 | 1536x1024 |
| `output_format: "svg"` on Flare and Sunburst | 200, PNG reported as `output_format: "png"` |
| `output_format` set to an invalid value | 200, PNG, so the value is not validated |
| `output_format: "gif"` | 400, "GIF output is not enabled for this request." |

The response has no model field, and its C2PA manifest records only `gpt-image`. So these tests show that the endpoint produces real alpha, but not that a 2.6 model rendered it. Token counts point the same way, weakly: named 2.6 models on OpenRouter used 824 tokens for a low-quality 1024x1024 transparent image (see below), while a larger low-quality Codex output used 343.

## What Codex serves

Tested 2026-11-06 on the same login, through `POST /backend-api/codex/responses` with the hosted `image_generation` tool, a `gpt-6-luna` carrier, and one request per row. This route needs no sentinel token, but it runs a text model too (about 2,400 tokens here), and it is not the route the CLI uses.

| Tool settings | Result |
|---|---|
| `gpt-image-2.6-flare`, GIF, 4 frames | 400: "GIF output is not enabled for the model 'gpt-image-2-codex'." |
| `gpt-image-2.6-sunburst`, PNG, `low`, 1024x1024 | 200, tool settings returned as `gpt-image-2-codex`, `quality: auto`, `size: auto`, 515 image tokens |

The `/images` route names no model, so this is strong evidence for it rather than proof. The name also does not establish the underlying weights. [openai/codex#59890](https://github.com/openai/codex/issues/59890), [#59180](https://github.com/openai/codex/issues/59180), and [#28723](https://github.com/openai/codex/issues/28723) report the same rewrite on other accounts.

The CLI therefore reports `requestedModel`, and `servedModel` only if the response names one, so it will pick up a model field if OpenAI adds it. The default stays a 2.6 request so that it can take effect if the route starts honoring it. Check this route again when those issues change.

The ChatGPT conversation route described in #59890 was not tried or adopted. It requires sentinel chat-requirements tokens, an anti-bot gate that a CLI should not bypass, and per that teardown the client cannot select the model or request GIF there anyway.

## 2.6 claims

| Claim | Status on the Codex route |
|---|---|
| Native transparency | Real alpha observed, model unconfirmed. Through the CLI, the default, explicit Sunburst, a Flare edit, and WebP output all kept it, and local WebP conversion left the alpha histogram unchanged. Subject alpha peaked around 250-254. One of those four, the WebP, had a faint haze visible over dark backgrounds. |
| SVG export | Documented for the public API, not delivered here. |
| GIF output | Documented for the public API, rejected here. |
| Faster generation | Not testable without a confirmed model. Requests took 11-29 seconds. |

## OpenRouter comparison

Tested 2026-11-06 with raw `POST /api/v1/images` requests at `quality: low`, one request per case, because the CLI has no GIF or `background` option. OpenRouter charged $30 per million image tokens for both models.

| Request | Flare | Sunburst | Result |
|---|---|---|---|
| `output_format: "svg"` | 400 | 400 | "OpenAI: output_format: not supported. Accepted: png, jpeg, webp, gif". OpenRouter's routing filter rejected it in about 0.2 seconds, with no usage reported. |
| `output_format: "gif"`, 4 frames at 200 ms, 1:1 | 13 s | 22 s | Animated, looping 960x960 GIF with real motion. 1,260 image tokens, $0.038. |
| `background: "transparent"`, PNG, 1:1 | 7 s | 18 s | 1024x1024, 25-37% fully clear, clean cutout. 824 image tokens, $0.025. |
| `background: "transparent"`, GIF, 4 frames | 16 s | Not run | About 93% clear in every frame, with on/off alpha only. $0.038. |

The rejected SVG request does not settle what OpenAI's own API does, because it never reached OpenAI and no OpenAI API key was available to test directly. The CLI on OpenRouter also produced real alpha from the prompt alone at 1024x1024 (32% fully clear, subject alpha 250-254), but rejected `--format gif` before sending a request. Timings are single samples. Both models reported identical tokens and prices, so they differ in speed and output rather than cost.

## Known conflict

OpenAI's prompting guide suggests compositing an approved edit into the original when regions must stay pixel-identical. The packaged skill forbids compositing Codex mask edits back because it breaks coherent lighting changes. The skill's rule stands for this CLI.
