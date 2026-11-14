# OpenAI gpt-image-2 as a baseline for scoring local image models (state as of 2026-11-06)

Evidence labels used below: **[PRIMARY]** = OpenAI docs or the leaderboard page itself, read directly on 2026-11-06. **[SECONDARY]** = press, vendor or reseller. **[ANECDOTE]** = forum or Reddit practitioner report. **[SNIPPET]** = seen only in a search result, page not opened. All pages were read through an automated fetch summariser, so re-check exact wording before quoting verbatim. The openai.com launch post returned HTTP 403, so no launch-post claim is verified first-hand.

## What are gpt-image-2's release date and current API capabilities, including transparency?

### Takeaway
gpt-image-2 launched 2026-04-21 and is a capable, flexible-resolution, multi-reference edit model, but it is no longer OpenAI's current image model. **Transparency verdict: treat gpt-image-2 as having no usable native alpha today.** It had none at launch, gained a preview on 2026-08-20, and developers report it has been rejected since about 2026-09-30. OpenAI's API reference still says "preview", so this conflict is unresolved at primary-source level.

### Cited Findings

**Release and identity**
- [PRIMARY] Released 2026-04-21 for generation and editing — [OpenAI changelog](https://developers.openai.com/api/docs/changelog).
- [PRIMARY] Model ID `gpt-image-2`; the only snapshot is `gpt-image-2-2026-04-21`. Input is text and image, output is image — [OpenAI model page](https://developers.openai.com/api/docs/models/gpt-image-2).
- [PRIMARY] Endpoints are `v1/images/generations`, `v1/images/edits` and `v1/batch`. Inpainting is the only listed feature. Chat Completions, Responses, Realtime and Embeddings are listed as unsupported as direct endpoints — [OpenAI model page](https://developers.openai.com/api/docs/models/gpt-image-2).
- [PRIMARY] Organization verification is required before using GPT Image models — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation).

**Resolutions**
- [PRIMARY] gpt-image-2 accepts any `WIDTHxHEIGHT` meeting these rules: both edges multiples of 16, aspect ratio between 1:3 and 3:1, maximum edge 3840 px, total pixels 655,360 to 8,294,400 — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation?model=gpt-image-2).
- [PRIMARY] Sizes listed as popular: 1024x1024, 1536x1024, 1024x1536, 2048x2048, 2048x1152, 3840x2160, 2160x3840, `auto`. Square images are typically fastest — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation?model=gpt-image-2).
- [PRIMARY] Sizes above 2560x1440 are experimental and 3840x2160 is the stated maximum — [OpenAI API reference: generate](https://developers.openai.com/api/reference/resources/images/methods/generate).

**Quality tiers and output**
- [PRIMARY] gpt-image-2 quality is `low`, `medium`, `high` (plus `auto`). `xhigh` and `max` belong to the 2.5 models — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation?model=gpt-image-2); [API reference](https://developers.openai.com/api/reference/resources/images/methods/generate).
- [PRIMARY] `n` is 1 to 10; `partial_images` is 0 to 3; compression applies to JPEG and WebP only — [API reference](https://developers.openai.com/api/reference/resources/images/methods/generate). Each partial image adds 100 output tokens — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation?model=gpt-image-2).
- [PRIMARY] The format enum lists png, webp, jpeg, gif and svg — [API reference](https://developers.openai.com/api/reference/resources/images/methods/generate). [SECONDARY] A reseller lists GIF generation and SVG export as capabilities announced with the November 2.6 update, so do not assume them for gpt-image-2 — [APIYI 2.6 launch](https://docs.apiyi.com/en/news/gpt-image-2-6-launch.md).

**Reference images, edit and inpainting**
- [PRIMARY] Edits accept up to 16 input images for GPT image models. This limit is not stated specifically for gpt-image-2 — [API reference: edit](https://developers.openai.com/api/reference/resources/images/methods/edit).
- [PRIMARY] `input_fidelity` must be omitted for gpt-image-2. It always processes inputs at high fidelity, which can raise image input token counts — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation?model=gpt-image-2).
- [PRIMARY] Masks must match the source format and size, be under 50 MB and include an alpha channel. Masking is prompt-guided, so the result may not follow the mask shape exactly — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation).
- [PRIMARY] Markup-guided edits exist only on 2.5 and 2.6, not gpt-image-2 — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation?model=gpt-image-2).
- [PRIMARY] The API reference lists no `seed` parameter on either generate or edit — [generate](https://developers.openai.com/api/reference/resources/images/methods/generate); [edit](https://developers.openai.com/api/reference/resources/images/methods/edit).

**Text rendering**
- [SECONDARY] About 99% text accuracy is a launch claim repeated in press coverage, not an independent measurement — [DataNorth](https://datanorth.ai/news/openai-launches-gpt-image-2-with-99-text-accuracy) [SNIPPET].
- [PRIMARY] OpenAI's own guide still warns of difficulty with precise text placement and clarity, and with layout-sensitive composition. Its limitations text does not name a specific model — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation).
- [PRIMARY] Arena Text Rendering board (2026-11-02): GPT-Image-2 (Medium) is #4 at 1424±6, against FLUX.2 [dev] at #33, 1158±6, the top model that fetch summary listed as open — [Arena Text Rendering](https://arena.ai/leaderboard/text-to-image/text-rendering).
- [SECONDARY] Everypixel (2026-05-18, 34 briefs at high quality, 4 reviewers, one generation per brief, one model, not blind): all text-bearing briefs passed except a crowd scene, Japanese was the only other script tested beyond the main briefs, and no game assets were tested. The article was substantially revised 2026-09-25 — [Everypixel](https://research.everypixel.com/gpt-image-2-0/).
- [SECONDARY] Small vendor tests: 6 of 6 correctly spelled generations — [Pixazo](https://www.pixazo.ai/blog/?p=2770821) [SNIPPET]; occasional letter swaps in blocks over 100 words — [Kittl](https://www.kittl.com/blogs/kittl-review-gpt-image-2-0/) [SNIPPET].

**Transparency timeline (the conflict you flagged)**
| Date | Event | Evidence |
|---|---|---|
| 2026-04-21 | Launch. No transparency implied by the later "now available" entry | [PRIMARY, by implication] [Changelog](https://developers.openai.com/api/docs/changelog); [ANECDOTE] one r/aigamedev commenter, who was also promoting a product, said the same in April: [Reddit snapshot](https://reddit.sentinel-team.org/posts/1ss9bjz/snapshots/2026-04-25T00%3A45%3A58.465245Z) |
| 2026-08-20 | Transparent backgrounds added in preview for `gpt-image-2` and its snapshot | [PRIMARY] [Changelog](https://developers.openai.com/api/docs/changelog). APIYI gives Aug 21: [APIYI](https://docs.apiyi.com/en/live/2026-10/gpt-image-2-transparent-shutdown.md) |
| 2026-09-30 | Preview reportedly ended | [SECONDARY] Reseller, no OpenAI link given: [APIYI](https://docs.apiyi.com/en/live/2026-10/gpt-image-2-transparent-shutdown.md) |
| 2026-10-01 | Developers report HTTP 400: "Transparent background is not supported for this model." A forum regular says the preview is discontinued and another mentions an email; no OpenAI staff post in the thread | [ANECDOTE] [OpenAI forum](https://community.openai.com/t/is-transparent-background-support-broken-in-gpt-image-2/1402707) |
| 2026-10-15 | APIYI test: all 14 generation and 7 edit transparent calls rejected and not billed; `opaque`, `auto` and omitted values worked | [SECONDARY] [APIYI](https://docs.apiyi.com/en/live/2026-10/gpt-image-2-transparent-shutdown.md) |
| 2026-11-06 | API reference still describes gpt-image-2 transparency as preview. The changelog entries I retrieved show no end-of-preview notice | [PRIMARY] [API reference](https://developers.openai.com/api/reference/resources/images/methods/generate); [Changelog](https://developers.openai.com/api/docs/changelog) |

- [PRIMARY] gpt-image-2.5 Sunburst and Flare do support transparency, with PNG or WebP output — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation?model=gpt-image-2).
- [SECONDARY] gpt-image-1.5 and gpt-image-1 are named as accepting the same parameter — [APIYI FAQ](https://docs.apiyi.com/en/faq/image-transparent-background.md) [SNIPPET]. [PRIMARY] However, gpt-image-1 was shut down 2026-10-23 — [API reference](https://developers.openai.com/api/reference/resources/images/methods/generate) — and gpt-image-1.5 and 1-mini shut down 2026-12-01 — [Deprecations](https://developers.openai.com/api/docs/deprecations).
- [ANECDOTE] During the preview, a developer's controlled A/B runs showed that adding `background=transparent` moved output from stylised 3D cartoon toward photorealism, with no staff confirmation — [OpenAI forum](https://community.openai.com/t/does-background-transparent-also-change-the-rendering-style-of-gpt-image-2/1392632).

### Inferences
- The conflicting reports are probably all true at different dates: "no alpha" (April to August), "preview" (Aug 20 to Sep 30), "rejected" (October onward). The stale wording in the API reference likely explains why the argument persists. Confidence is medium-high on current rejection, because two independent groups saw the same error, but no OpenAI statement confirms it.
- For scoring, gpt-image-2's alpha should be "none native; needs a matte plus background removal". A local model with a working native-alpha or layer pipeline can legitimately score "better" against gpt-image-2 on this axis, but only "same" at best against 2.5.
- The 655,360-pixel minimum means no native low-resolution sprite output. With edges in multiples of 16, the smallest valid square is 816x816, so small sprites always require downscaling.

### Gaps
- I could not run a live API call because no key was available. A single request with `background: "transparent"` would settle this, and APIYI reports rejected calls are not billed.
- I found no OpenAI-authored statement ending the preview. The email mentioned on the forum was not seen.
- No model-specific reference-image limit for gpt-image-2, and no independent character-level text accuracy study, was found.
- The API "thinking mode" claim is secondary only ([TechWyse](https://www.techwyse.com/news/ai-search/openai-gpt-image-2-api-codex-launch)); I did not confirm it in OpenAI's docs.

## What are the exact pricing, typical latency and rate limits?

### Takeaway
High quality costs about $0.17 to $0.21 per image at standard sizes, medium about $0.04 to $0.05, and low about $0.005, before input tokens. Batch halves token rates. Latency is slow: tens of seconds is typical and up to 2 minutes is documented. The entry API tier is capped at 20 images per minute.

### Cited Findings

**Per-image output cost, gpt-image-2** [PRIMARY] — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation)
| Quality | 1024x1024 | 1024x1536 | 1536x1024 |
|---|---|---|---|
| Low | $0.006 | $0.005 | $0.005 |
| Medium | $0.053 | $0.041 | $0.041 |
| High | $0.211 | $0.165 | $0.165 |

**Token rates per 1M, gpt-image-2** [PRIMARY] — [OpenAI pricing](https://developers.openai.com/api/docs/pricing)
| Mode | Image input | Image cached | Image output | Text input | Text cached |
|---|---|---|---|---|---|
| Standard | $8.00 | $2.00 | $30.00 | $5.00 | $1.25 |
| Batch | $4.00 | $1.00 | $15.00 | $2.50 | $0.625 |

- [PRIMARY] Cached rates for GPT Image 2 and 2.5 apply only through the Responses API image generation tool, not direct Images API calls — [OpenAI pricing](https://developers.openai.com/api/docs/pricing).
- [PRIMARY] OpenAI gives no static 2K or 4K per-image figure in the page text. It points to an interactive calculator — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation?model=gpt-image-2).
- [SECONDARY] fal.ai reseller pricing (April 2026, labelled older): 1024x1024 at $0.01 / $0.06 / $0.22 and 4K at $0.02 / $0.11 / $0.41 for low / medium / high — via [Everypixel](https://research.everypixel.com/gpt-image-2-0/). These are not OpenAI's list prices.
- [PRIMARY] Artificial Analysis lists GPT Image 2 (high) at $211.00 per 1,000 images, consistent with OpenAI's square rate — [AA text-to-image](https://artificialanalysis.ai/image/leaderboard/text-to-image).

**Rate limits** [PRIMARY] — [OpenAI model page](https://developers.openai.com/api/docs/models/gpt-image-2)
| Tier | TPM | IPM |
|---|---|---|
| Build | 250,000 | 20 |
| Launch | 3,000,000 | 150 |
| Grow | 8,000,000 | 250 |

**Latency**
- [PRIMARY] Complex prompts may take up to 2 minutes — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation).
- [SECONDARY] Best-structured benchmark found: median 49.0 s for GPT Image 2 via OpenRouter (60 images at 1536x1024, page updated 2026-06-30), against 3.8 s for Nano Banana 2 Lite, 11.1 s for Nano Banana 2 and 19.2 s for Nano Banana Pro. Quality tier was not captured — [K-Dense](https://k-dense.ai/blog/benchmarking-nano-banana-2-lite-scientific-image-model).
- [SECONDARY, low reliability] One blog reports an average of 112 s and a slowest render of 131.2 s, on what appears to be a mirror site — [mirror article](https://buzzfeed-3j3.pages.dev/articles/GPT-Image-2-vs-Gemini-3-Pro-Image-Generation-Benchmark) [SNIPPET].
- [PRIMARY] Artificial Analysis tracks median generation time, but values are chart-only and were not retrievable — [AA model page](https://artificialanalysis.ai/image/models/gpt-image-2).

### Inferences
- For a local-model cost comparison, use $0.053 (medium, because Arena tests medium) and $0.211 (high, because AA tests high) as the two reference points. Add input token costs for edit flows, since forced high fidelity makes reference-heavy workflows dearer.
- At Build tier, 20 IPM caps throughput at 1,200 images per hour. At a 49 s median, one sequential worker makes only about 73 images per hour, so parallel requests are needed to reach that cap. A local GPU comparison should use measured wall-clock time at equal resolution and name the concurrency used.

### Gaps
- OpenAI's official per-image cost at 2K and 4K: calculator output was not machine-readable.
- Input-token cost per reference image for gpt-image-2: the vision cost section was not captured.
- AA's measured median latency value for gpt-image-2.
- Whether moderation-blocked requests are billed: I found no primary statement.

## Where does gpt-image-2 rank on independent leaderboards, and which open-weight models are nearest?

### Takeaway
As of 2026-11-02, gpt-image-2 is #5 on Arena text-to-image, #6 on single-image edit and #3 on multi-image edit, with only OpenAI's own newer models above it on text-to-image. It is #3-4 on Artificial Analysis text-to-image and #7-11 on AA editing. The nearest open-weight model trails by about 155 Arena points on text-to-image and about 96 on edit, though the closest one carries a research license.

### Cited Findings

**gpt-image-2 positions** (Arena tests the Medium tier, AA tests High)
| Board | Rank | Score | Snapshot | Source |
|---|---|---|---|---|
| Arena Text-to-Image, Overall | 5 | 1382±4 | 2026-11-02 | [Arena](https://arena.ai/leaderboard/text-to-image) |
| Arena Single Image Edit | 6 | 1460±3 | 2026-11-02 | [Arena](https://arena.ai/leaderboard/image-edit) |
| Arena Multi Image Edit | 3 | 1454±4 | 2026-11-02 | [Arena](https://arena.ai/leaderboard/image-edit/multi-image-edit) |
| Arena Cartoon, Anime & Fantasy | 5 | 1403±6 | 2026-11-02 | [Arena](https://arena.ai/leaderboard/text-to-image/cartoon) |
| Arena Art | 5 | 1371±7 | 2026-11-02 | [Arena](https://arena.ai/leaderboard/text-to-image/art) |
| Arena 3D Imaging & Modeling | 4 | 1365±8 | 2026-11-02 | [Arena](https://arena.ai/leaderboard/text-to-image/3d-modeling) |
| Arena Text Rendering | 4 | 1424±6 | 2026-11-02 | [Arena](https://arena.ai/leaderboard/text-to-image/text-rendering) |
| AA-Image-T2I v2.1 | 3-4 | Elo 1188 | Undated page; latest models Oct 2026, read 2026-11-06 | [AA](https://artificialanalysis.ai/image/leaderboard/text-to-image) |
| AA-Image-Editing v2.1 | 7-11 | Elo 1136 | Undated page; read 2026-11-06 | [AA](https://artificialanalysis.ai/image/leaderboard/editing) |

- [SECONDARY, older, April 2026] At launch it scored 1,512 on Arena text-to-image, 242 points ahead of Nano Banana 2 at 1,271, and led all sub-categories — [TechWyse](https://www.techwyse.com/news/ai-search/openai-gpt-image-2-api-codex-launch).

**Nearest open-weight models** (gap = model score minus gpt-image-2 on that board)
| Board | Model | Rank | Score | Gap | Listed license |
|---|---|---|---|---|---|
| [Arena T2I](https://arena.ai/leaderboard/text-to-image) | Qwen-Image-2.1 | 21 | 1227±6 prelim | -155 | qwen-research |
| Arena T2I | Ideogram 4.0 (Quality) | 22 | 1199±4 | -183 | Ideogram Open Model |
| Arena T2I | Cosmos3-Super-Text2Image (Agentic) | 29 | 1165±7 | -217 | OpenMDW-1.1 |
| Arena T2I | HunyuanImage 3.0 | 36 | 1151±3 | -231 | tencent-hunyuan-community |
| Arena T2I | FLUX.2 [dev] | 40 | 1145±4 | -237 | flux-non-commercial |
| Arena T2I | Qwen-Image (2512) | 47 | 1125±3 | -257 | Apache 2.0 |
| Arena T2I | HiDream-O1-Image | 53 | 1115±4 | -267 | MIT |
| Arena T2I | Krea 2 Turbo | 54 | 1115±4 | -267 | krea-2-community |
| Arena T2I | Z-Image-Turbo | 61 | 1082±5 | -300 | Apache 2.0 |
| [Arena Edit](https://arena.ai/leaderboard/image-edit) | Qwen-Image-2.1 | 22 | 1364±6 prelim | -96 | qwen-research |
| Arena Edit | HunyuanImage 3.0 Instruct | 32 | 1302±3 | -158 | tencent-hunyuan-community |
| Arena Edit | Qwen-Image-Edit | 41 | 1241±3 | -219 | Apache 2.0 |
| Arena Edit | FLUX.2 [klein] 9B / [dev] | 46 / 47 | 1224 | -236 | flux-non-commercial |
| Arena Edit | FLUX.2 [klein] 4B | 53 | 1187±3 | -273 | Apache 2.0 |
| [Arena Multi Edit](https://arena.ai/leaderboard/image-edit/multi-image-edit) | FLUX.2 [klein] 9B | 31 | 1212 | -242 | flux-non-commercial |
| Arena Multi Edit | Qwen-Image-Edit (2511) | 35 | 1174 | -280 | Apache 2.0 |
| [Arena Cartoon/Fantasy](https://arena.ai/leaderboard/text-to-image/cartoon) | Ideogram 4.0 (Quality) | 23 | 1193±5 | -210 | Ideogram Open Model |
| Arena Cartoon/Fantasy | Cosmos3-Super-Text2Image (Agentic) | 26 | 1185±9 | -218 | OpenMDW-1.1 |
| Arena Cartoon/Fantasy | HunyuanImage 3.0 | 33 | 1163±5 | -240 | tencent-hunyuan-community |
| [AA T2I](https://artificialanalysis.ai/image/leaderboard/text-to-image) | Qwen-Image-2.1 | 21 | 1045 | -143 | Not captured |
| AA T2I | FLUX 3 Image Klein | 22 | 1043 | -145 | Not captured |
| AA T2I | Fibo 2.0 | 23 | 1039 | -149 | Not captured |
| AA T2I | Ideogram 4.0 (Quality) | 32 | 1027 | -161 | Not captured |
| AA T2I | FLUX.2 [dev] | 47 | 1000 (anchor) | -188 | Not captured |
| [AA Edit](https://artificialanalysis.ai/image/leaderboard/editing) | Fibo 2.0 | 19-24 | 1085 | -51 | Not captured |
| AA Edit | Qwen-Image-2.1 | 21-28 | 1080 | -56 | Not captured |
| AA Edit | FLUX 3 Image Klein | 29-33 | 1069 | -67 | Not captured |
| AA Edit | HunyuanImage 3.0 Instruct | 26-34 | 1065 | -71 | Not captured |

### Inferences
- No open-weight model is within the confidence intervals of gpt-image-2 on any board captured. On leaderboard evidence alone, the default local verdict is "worse". Any "same" or "better" must come from game-art-specific axes such as control, alpha, seeds, cost and moderation.
- Do not compare scores across dates or boards. The Arena score fell from 1,512 to 1,382 without the model changing, which suggests the rating pool or scale shifted. Arena and AA Elo scales also differ, and AA's gaps are noticeably narrower on editing.
- "Open" on Arena includes restrictive licenses. For commercial games, FLUX.2 [dev], FLUX.2 [klein] 9B and qwen-research need license review. The Apache 2.0 or MIT entries on these boards are Qwen-Image (2512), HiDream-O1-Image, Z-Image-Turbo and FLUX.2 [klein] 4B, which sit 257 to 352 points back on Arena text-to-image. Cosmos3's OpenMDW-1.1 and the community licenses were not reviewed here.
- Votes reward general appeal. They are not a test of sprite usability, palette control or tiling.

### Gaps
- AA labels open weights by Hugging Face link rather than an explicit column, as interpreted by the fetch summary, and licenses were not captured there. The FLUX 3 Image Klein and Fibo 2.0 licenses are unverified here.
- Fetch summaries for Text Rendering and Cartoon, Anime & Fantasy may have excluded qwen-research models from "top open" lists, so Qwen-Image-2.1's rank on those two boards was not captured. It is #18 at 1235 on [Art](https://arena.ai/leaderboard/text-to-image/art) and #20 at 1214 on [3D](https://arena.ai/leaderboard/text-to-image/3d-modeling).
- I found no other credible independent leaderboard with gpt-image-2 scores in the time available.

## What are its known weaknesses for game art?

### Takeaway
OpenAI itself documents weak consistency across generations and imprecise masks, and the API exposes no seed or style training. Practitioner reports consistently say single-shot sprite sheets look right but fail on alignment and animation logic, and that pixel art is imitation rather than grid-true. Moderation over-refusal is documented generally, but I found no solid evidence specific to fantasy violence.

### Cited Findings

**Moderation**
- [PRIMARY] `moderation` accepts `auto` or `low`, and all prompts and outputs are filtered — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation).
- [ANECDOTE, with staff reply] Thread opened 2026-08-04: the API refused prompts ChatGPT completed, even at `moderation: low`, with HTTP 400 `moderation_blocked` at the output stage in the sexual category. Examples included goth, vampire and witch themes and everyday scenes. One user got 1 of 8 images; another never hit the problem; claymation reportedly passed. OpenAI support replied 2026-10-12 that low is less restrictive but checks remain, and gave no fix — [OpenAI forum](https://community.openai.com/t/api-issue-moderation-over-refusals-on-gpt-image-2-with-moderation-low-where-chatgpt-always-succeeds/1388964).
- [ANECDOTE] 2026-11-05, ChatGPT Plus rather than API, model unclear: a manga-style mascot cleaning an antique rifle was repeatedly refused, citing an unrelated harassment category — [OpenAI forum](https://community.openai.com/t/moderation-false-positives-are-blocking-legitimate-business-use/1412932).
- [ANECDOTE] On Azure, identical retried requests sometimes pass, which the answer attributes to probabilistic behaviour — [Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/5884023/azure-ai-foundry-moderation-blocked-for-safe-child) [SNIPPET].
- [SECONDARY, promotional and asserted, April 2026] A reseller guide describes input and output filter stages and lists violence terms such as weapon, blood and kill as triggers. Its only game example is a prompt with a bloody sword and a severed enemy head, said to pass after adding video-game framing. It shows no test set or results — [APIYI blog](https://help.apiyi.com/en/gpt-image-2-moderation-blocked-error-prompt-optimization-en.html).

**Pixel art**
- [SECONDARY, tied to a paid endpoint] A game-art skill README says output resembles pixel art, but pixels do not sit on a true grid and the palette drifts. It prescribes generating at 1K, then pixelating to 32 px with 16 colours and hand touch-up — [GitHub skill](https://github.com/cyprianashford8/gpt-image-2-game-art-skill).
- [ANECDOTE] r/aigamedev (April 2026, older): one commenter praised pixel art and consistency between prompts, while another saw it as inspiration needing heavy manual cleanup — [Reddit snapshot](https://reddit.sentinel-team.org/posts/1ss9bjz/snapshots/2026-04-25T00%3A45%3A58.465245Z).
- [PRIMARY] OpenAI's prompting guide has no pixel-art section, only a style-transfer example from a pixel-art game screen. The part I read has nothing on sprite sheets, tilesets or palette locking — [OpenAI prompting guide](https://developers.openai.com/api/docs/guides/image-prompting?model=gpt-image-2).

**Sprite and character consistency**
- [PRIMARY] OpenAI says the model may occasionally struggle to keep recurring characters or brand elements consistent — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation).
- [ANECDOTE] r/aigamedev commenters reported misalignment, wrong frame order, changing details, overlapping sprites and illogical walk cycles, and also near-perfect static assets. None called sheets production-ready — [Reddit snapshot](https://reddit.sentinel-team.org/posts/1ss9bjz/snapshots/2026-04-25T00%3A45%3A58.465245Z).
- [SECONDARY] The same README says one-shot sheets drift, while frame-by-frame edits from an anchor stay on model — [GitHub skill](https://github.com/cyprianashford8/gpt-image-2-game-art-skill).
- [ANECDOTE] A three-week tester reported good identity but blurrier edge frames and shifting camera angles — [Dre Dyson](https://dredyson.com/i-tested-every-solution-for-developing-sprite-sheets-with-gpt-image-2-heres-what-actually-works-a-complete-comparative-analysis-of-7-approaches-prompting-strategies-and-workarounds-that-actuall/) [SNIPPET; page returned 404 on fetch, so unverified].

**Determinism and training**
- [PRIMARY] No seed parameter exists on generate or edit — [generate](https://developers.openai.com/api/reference/resources/images/methods/generate); [edit](https://developers.openai.com/api/reference/resources/images/methods/edit). The dated snapshot is the only version-pinning control — [OpenAI model page](https://developers.openai.com/api/docs/models/gpt-image-2).
- [PRIMARY] The model page lists inpainting as its only feature, and the listed endpoints are generation, edit and batch — [OpenAI model page](https://developers.openai.com/api/docs/models/gpt-image-2). OpenAI's guidance on consistency relies on reference images and repeated descriptions — [OpenAI prompting guide](https://developers.openai.com/api/docs/guides/image-prompting?model=gpt-image-2).

**Other technical limits**
- [PRIMARY] Masks are prompt-guided and not exact — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation).
- [ANECDOTE] Setting the transparency parameter changed rendering style during the preview — [OpenAI forum](https://community.openai.com/t/does-background-transparent-also-change-the-rendering-style-of-gpt-image-2/1392632).

### Inferences
- Local models can credibly score "better" on seeds and reproducibility, trained style via LoRA, moderation, alpha, and batch cost. These are structural API absences or policies, not quality gaps.
- gpt-image-2 likely remains hard to beat for static single-asset quality and in-image text. On Arena's Cartoon, Anime & Fantasy board, the top open-licensed model captured trails by 210 points, which supports this for stylised work, though Qwen-Image-2.1's position there was not captured.
- The absence of custom training is inferred from absence on the model page; I found no explicit OpenAI sentence stating it.
- Most practitioner evidence dates from launch week or comes from sellers. Treat it as hypotheses for your own test set rather than scored facts.

### Gaps
- **Fantasy violence false positives:** no reliable source quantifies these on gpt-image-2. Evidence is adjacent (sexual-category blocks, a rifle refusal in ChatGPT) or an unevidenced reseller example. A small in-house prompt battery would be needed.
- A vendor guide on batch drift was seen only in a search summary and one Seagames page returned 404, so it is not relied on: [Seagames](https://www.seagames.com/blog/gpt-image-2-game-assets-seagames). Consistency percentages seen in search summaries could not be traced to a test method and are excluded.
- **No controlled test** of batch style drift, palette error, pixel-grid alignment or tile seams was found.
- The [Converge game-dev guide](https://combos.converge.ai/page/en-US/blog/gpt-image-2-game-development) returned 404. Its 4-of-5 pixel-art rating was seen only in a search summary, so I do not rely on it.

## Has it been superseded, and how do closed competitors compare?

### Takeaway
Yes. OpenAI released GPT Image 2.5 on 2026-09-08 and GPT Image 2.6 on 2026-11-04, both at the same token rates. gpt-image-2 itself is not deprecated, but OpenAI's guide now treats it as an earlier model. Among non-OpenAI closed models, MAI-Image-2.6, Nano Banana 2.1 and Grok Imagine Image 2.0 are nearest, and Midjourney does not appear on either leaderboard.

### Cited Findings

**OpenAI succession**
- [PRIMARY] 2.5 Sunburst and Flare released 2026-09-08; 2.6 Sunburst and Flare released 2026-11-04 — [Changelog](https://developers.openai.com/api/docs/changelog).
- [PRIMARY] gpt-image-2 is not listed as deprecated. gpt-image-1 shut down 2026-10-23. gpt-image-1.5, gpt-image-1-mini and `chatgpt-image-latest` shut down 2026-12-01, and DALL-E 2 and 3 were removed 2026-05-12. The 2.5 and 2.6 models are the recommended replacements for the gpt-image-1 family — [Deprecations](https://developers.openai.com/api/docs/deprecations).
- [PRIMARY] 2.5 and 2.6 add markup edits; 2.5 adds `xhigh` and `max` quality; 2.6 adds a `complexity` setting (low, medium, high, default high) separate from quality with no extra fee — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation).
- [PRIMARY] Token rates match gpt-image-2 ($8 / $2 / $30 image), though OpenAI cautions equal rates do not mean equal per-image cost. No 2.6 Batch rates are listed — [OpenAI pricing](https://developers.openai.com/api/docs/pricing); [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation?model=gpt-image-2).
- [PRIMARY] OpenAI's prompting guide positions 2.5 Flare as matching gpt-image-2 quality and Sunburst as exceeding it — [OpenAI prompting guide](https://developers.openai.com/api/docs/guides/image-prompting?model=gpt-image-2). [SECONDARY] Flare's model page is reported to claim 50% lower latency than gpt-image-2, which is a vendor comparison — [Kanaries](https://docs.kanaries.net/articles/gpt-image-2-5).
- [SECONDARY] **Quality names do not map across generations.** Reading OpenAI's token estimator on 2026-09-20, Kanaries gives 2.5 output cost at 1024x1024 as low $0.006, medium $0.013, high $0.053, xhigh $0.094, max $0.211. So 2.5 `high` costs what gpt-image-2 `medium` costs, and 2.5 `max` costs what gpt-image-2 `high` costs — [Kanaries](https://docs.kanaries.net/articles/gpt-image-2-5). A forum regular also describes a same-cost remapping to the five new values — [OpenAI forum](https://community.openai.com/t/is-transparent-background-support-broken-in-gpt-image-2/1402707).
- [PRIMARY] Rate limits on 2.5 Sunburst match gpt-image-2 — [OpenAI model page](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst).

**OpenAI versus closed competitors** (Arena 2026-11-02; AA undated, read 2026-11-06)
| Model | Arena T2I | Arena Edit | AA T2I Elo (rank) | AA $/1k |
|---|---|---|---|---|
| GPT-Image-2.5 Sunburst | #1, 1427 prelim | #1, 1517 prelim | 1227 (1), max tier | $210.72 |
| GPT-Image-2.6 Sunburst (Medium) | #2, 1409 prelim | #3, 1476 prelim | Not captured | Not captured |
| GPT-Image-2.5 Flare | #3, 1399 prelim | #2, 1482 prelim | 1208 (2), max tier | $210.72 |
| **GPT-Image-2** | **#5, 1382** | **#6, 1460** | **1188 (3-4), high** | **$211.00** |
| MAI-Image-2.6 (Microsoft) | #6, 1331 | #9, 1426 | 1168 (5) | $38.91 |
| Nano Banana 2.1 (Google) | #7, 1325 prelim | #8, 1427 prelim | 1176 (4) | $33.60 |
| Grok Imagine Image 2.0 (SpaceXAI) | #8, 1317 prelim | #7, 1438 prelim | 1166 (6) | $60.00 |
| Muse Image (Meta) | #11, 1268 | #13, 1399 | 1128 (8) | $10.00 |
| Nano Banana 2 (Gemini 3.1 Flash Image) | #13, 1257 | #17, 1387 | 1142 (7) | $67.00 |
| Seedream 5.0 Pro (ByteDance) | #16, 1251 | #14, 1391 | 1101 (16) | $90.00 |
| Nano Banana Pro (Gemini 3 Pro Image) | #18, 1246 | #16, 1390 | 1119 (12) | $134.00 |
| Recraft V4.1 Utility Pro | #28, 1169 | Not listed | 1018 (38) | Not captured |
| FLUX.2 [max] (BFL) | #30, 1161 | #37, 1261 | 1021 (35) | Not captured |
| FLUX.2 [pro] (BFL) | #34, 1153 | #40, 1248 | 1003 (44) | Not captured |
| Imagen 4 Ultra (Google) | #39, 1146 | Not listed | Not on AA T2I | — |
| FLUX 3 Image (BFL) | Not listed | Not listed | 1117 (13) | $48.00 |

Sources for table: [Arena T2I](https://arena.ai/leaderboard/text-to-image); [Arena Edit](https://arena.ai/leaderboard/image-edit); [AA T2I](https://artificialanalysis.ai/image/leaderboard/text-to-image).

- [PRIMARY] On Arena's Cartoon, Anime & Fantasy board, 2.6 Sunburst (Medium) leads at 1466±21 prelim, the one category captured where it tops 2.5 Sunburst — [Arena](https://arena.ai/leaderboard/text-to-image/cartoon).
- [PRIMARY] MAI-Image-2.7-Preview is #4 on Arena edit at 1469 and ties for 1-2 on AA editing at 1195, with no API listed there — [Arena Edit](https://arena.ai/leaderboard/image-edit); [AA Edit](https://artificialanalysis.ai/image/leaderboard/editing).
- [PRIMARY] Midjourney did not appear on the Arena text-to-image or edit tables, or on AA text-to-image — [Arena T2I](https://arena.ai/leaderboard/text-to-image); [AA T2I](https://artificialanalysis.ai/image/leaderboard/text-to-image).
- [SECONDARY, seller of competing APIs] Midjourney V8.2 is reported as default since 2026-07-24, with no official API and terms restricting automation — [Unifically](https://unifically.com/blogs/midjourney-api) [SNIPPET]; an aggregator conflicts and still describes V8.1 as latest — [Atlas Cloud](https://www.atlascloud.ai/models/midjourney/v8.1/text-to-image) [SNIPPET].

### Inferences
- Use gpt-image-2 as the requested fixed baseline, because it has a pinned snapshot, a large vote count and non-preliminary scores. Also record 2.5 Sunburst as the "current closed ceiling", so that "same as gpt-image-2" is not misread as parity with the best available.
- The 2.6 Arena scores should not be read as a regression from 2.5. They are two days old with few votes and wide intervals, are Medium tier, and the tier tested for the 2.5 Arena entries is not stated on those rows.
- gpt-image-2 no longer gives the best value among closed models on AA's numbers. Nano Banana 2.1 is within 12 Elo at about one-sixth of the high-tier price, and Muse Image is at $10 per 1,000.
- State the tier in every comparison. "gpt-image-2 medium" and "2.5 high" are the same price point, and AA's top 2.5 scores use `max`, the same price point as gpt-image-2 `high`.

### Gaps
- OpenAI's launch posts for 2.5 and 2.6 were not read directly; changelog and docs were used instead.
- 2.6 per-image pricing, 2.6-specific transparency confirmation (the prompting guide covering 2.5 and 2.6 describes the workflow, but I did not see a 2.6-only statement, and the [APIYI 2.6 page](https://docs.apiyi.com/en/news/gpt-image-2-6-launch.md) does not mention it) and AA's 2.6 positions were not established. AA's listing showed no 2.6 entries in what I retrieved, two days after release.
- Midjourney has no comparable leaderboard score, so any comparison with it would be qualitative.
- FLUX 3 Image's Arena position was not found on the tables captured.
