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

The response has no model field, and its C2PA manifest records only `gpt-image`. So these tests show that the endpoint produces real alpha, but not that a 2.6 model rendered it. Token counts point the same way, weakly: a third-party [pricing summary](https://www.eesel.ai/blog/chatgpt-images-2-6-pricing) reports 823 low-quality tokens for 2.6 at 1024x1024, while this larger low-quality output used 343.

## 2.6 claims

| Claim | Status on the Codex route |
|---|---|
| Native transparency | Real alpha observed, model unconfirmed. Through the CLI, the default, explicit Sunburst, a Flare edit, and WebP output all kept it, and local WebP conversion left the alpha histogram unchanged. Subject alpha peaked around 250-254. One of those four, the WebP, had a faint haze visible over dark backgrounds. |
| SVG export | Documented for the public API, not delivered here. |
| GIF output | Documented for the public API, rejected here. |
| Faster generation | Not testable without a confirmed model. Requests took 11-29 seconds. |

## Known conflict

OpenAI's prompting guide suggests compositing an approved edit into the original when regions must stay pixel-identical. The packaged skill forbids compositing Codex mask edits back because it breaks coherent lighting changes. The skill's rule stands for this CLI.
