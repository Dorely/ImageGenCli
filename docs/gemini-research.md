# Gemini integration research

Verified 2026-10-14 against Google's official documentation. These notes record implementation decisions rather than copying a prompt manual.

## API and model selection

[Interactions overview](https://ai.google.dev/gemini-api/docs/interactions-overview) recommends Interactions for new projects; requests otherwise store conversation state by default. We use `POST /v1beta/interactions` with `store: false`, `stream: false`, and no continuation ID. The beta route matches the current image guide; a v1 reference also exists.

[Image generation](https://ai.google.dev/gemini-api/docs/image-generation) recommends `gemini-nano-banana-2.1` for new work. It supports 1K, 2K, and 4K, with fourteen documented ratios. The guide's current Pro table is titled "3.1 Pro Image" while its selection section names `gemini-3-pro-image`; use the documented Pro table's ten ratios. Existing `gemini-3.1-flash-image` adds a 512 tier. Legacy 2.5 has its own fixed raster table; the guide recommends up to three inputs for best results, enforced conservatively here. The CLI otherwise permits four references plus an edit source, below the modern models' documented reference capabilities.

[Flash Lite model](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image) supports 1K only. Its page describes fourteen ratios but enumerates ten; the implementation uses the modern fourteen-ratio table and only the 1K tier. Unknown model IDs remain forwarded using the default policy; provider access or incompatibility errors are surfaced without substitution.

## Wire shape and deliverables

The [Interactions reference](https://ai.google.dev/api/interactions-api) specifies `x-goog-api-key`, text and base64 image input blocks, `response_format` with `type: image`, `aspect_ratio`, and `image_size`. Although the reference lists `delivery: inline`, a live request on 2026-10-14 returned HTTP 400, "Image delivery mode is not supported." The implementation therefore omits `delivery` and consumes default inline base64 image output. It provides no image quality or mask field. CLI quality other than auto and edit masks are rejected.

The guide includes PNG output MIME examples, but the reference currently enumerates only JPEG as a selectable output MIME. To avoid undocumented fields, request JPEG explicitly for JPEG deliverables and omit MIME selection for PNG/WebP. Validate returned MIME against image metadata and transcode only when necessary, without resizing. Matching formats retain original bytes. Dimensions come from actual image metadata.

Read final `model_output` steps from completed interactions, ignoring thought steps and thought-marked image parts. Select the last final image, consistent with Google's `output_image` convenience property. Count is implemented as independent sequential requests, since prompting for a number does not reliably enforce output count. No automatic retries or model fallback. Timeout spans fetch and response-body consumption; no provider error bodies or transport messages are echoed, preventing accidental key or payload disclosure.

[Image input guidance](https://ai.google.dev/gemini-api/docs/image-understanding) places a 20 MB bound on inline requests. The provider validates serialized body size and accepts the CLI's PNG/JPEG/WebP inputs; no Files API upload lifecycle is introduced.

## Prompting and transparency

The image guide recommends descriptive scenes, specificity, context and intent, photographic composition, positive descriptions of desired omissions, and focused iterative edits. It recommends deciding text before asking for an image containing it. Each CLI call preserves the prompt verbatim; guidance lives in the skill. Iteration uses the previous output as source, preserving important reference images and explicitly stating what must stay.

[Legacy image guide](https://ai.google.dev/gemini-api/docs/generate-content/image-generation?hl=en) explicitly states that transparent backgrounds are unsupported. The newer Interactions guide omits this statement, and the [Nano Banana 2.1 model page](https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1) does not establish native alpha. Therefore the skill makes no Gemini alpha promise and keeps verified native cutout guidance specific to Codex. Format conversion does not create transparency. Generated images include SynthID; no watermark removal is performed.

## Credentials and verification

[API key documentation](https://ai.google.dev/gemini-api/docs/api-key) describes key creation in AI Studio and header authentication. This app uses its established login/status/logout and OS vault/file persistence conventions rather than environment-variable credentials. Key entry is hidden or explicitly read from stdin; status checks local configuration only. Credential shapes stay in provider boundaries.

Validation uses isolated stores, mocked transports, and generated image fixtures. No paid request or real user credential access is required by tests. A live request after key configuration reproduced the unsupported delivery-field error on 2026-10-14; subsequent verification uses the corrected payload.
