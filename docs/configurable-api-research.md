# Configurable image API research

Checked 2026-10-14. Two explicit API formats are supported; endpoint URLs alone do not establish compatibility.

## OpenRouter

The [current image guide](https://openrouter.ai/docs/guides/overview/multimodal/image-generation) documents the dedicated `POST /api/v1/images` API, not chat completions, for image generation. Authentication uses Bearer API keys. Requests specify `model`, `prompt`, and optional `input_references` containing data URLs. Responses contain `data[].b64_json` and, when identifiable, `media_type`. The tool supports raster deliverables only and rejects SVG or other non-raster output.

The [official tutorial](https://openrouter.ai/blog/tutorials/image-generation/) confirms the dedicated route and reference shape. `GET /api/v1/images/models` provides image IDs, architecture modalities, and supported parameters. Discovery is explicit: generation performs no additional catalog calls and does not cache or infer capabilities. Reported metadata is guidance, not a promise that every upstream endpoint accepts every model-level option.

OpenRouter supports `size` for pixels and `aspect_ratio` for aspect-only requests. These are never sent together by this tool; automatic values are omitted. Quality and output format are forwarded only when explicitly supplied. The API has no documented mask field, so masks are rejected before transport. Count is separate `n: 1` requests to avoid relying on models supporting multiple outputs. The adapter never substitutes model IDs; OpenRouter's own upstream routing follows its service defaults.

## OpenAI Images compatibility

The [official image guide](https://developers.openai.com/api/docs/guides/image-generation) documents JSON `/v1/images/generations` and multipart `/v1/images/edits` for independent calls. The profile's base URL already includes `/v1` or another API prefix. No orchestration model or Responses tool is required. Edits attach the source first and references afterward; generation with references also uses the edits endpoint. Single inputs use `image`, multiple inputs use `image[]`, and optional masks use `mask`. Request encoding and model support are separate: a partially compatible gateway can still reject edits or individual options.

Generic OpenAI-format profiles forward pixel sizes and explicit quality/output settings without imposing Codex's raster rules. Presets resolve to concrete sizes; arbitrary aspect-only sizes require explicit pixels. Omitted or auto settings use endpoint defaults. Common `data[].b64_json` or `data[].url` outputs are accepted; downloads carry no API auth headers. Returned data is decoded, measured, checked as PNG/JPEG/WebP, and converted only when a different deliverable format is needed. Output bytes are never resized.

## Configuration, credentials, and errors

Named non-secret profiles live in a versioned file next to existing credentials. API-key records stay within the vault/file persistence boundary. Protocol-specific adapters, transport, and discovery live in one configurable-provider package. No raw templates, arbitrary headers, job polling, or provider-specific passthrough fields are supported in this version.

HTTPS is required except for loopback HTTP. Base URLs reject userinfo, query, and fragments; API requests reject redirects rather than risk credential forwarding. Result downloads allow signed queries and redirects but never receive API authentication headers. Error responses and transport exception messages are not echoed; HTTP classifications provide auth, rate-limit, usage, server, download, timeout, or malformed-image guidance. The timeout spans response and image-download consumption. There are no automatic retries.

Other services such as [fal](https://fal.ai/docs/documentation/model-apis/inference/queue), [Replicate](https://replicate.com/docs/reference/http/), [Black Forest Labs](https://api.bfl.ai/docs), and [Ideogram](https://developer.ideogram.ai/v1/api-reference/generate-images/generate-v3) expose their own protocols. They require dedicated adapters or a compatible gateway rather than a base-URL substitution.

Verification uses isolated profile/credential files, mocked transport, real generated raster fixtures, CLI integration tests, and a packaged-install smoke test. No live paid generation or global installation is part of this change.
