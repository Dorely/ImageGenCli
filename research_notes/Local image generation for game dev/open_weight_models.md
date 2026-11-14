# Open-weight (locally runnable) image generation models, as of 2026-11-06

Reading notes for the report writer:
- All pages were retrieved 2026-11-06. Arena pages are stamped Nov 2, 2026. Artificial Analysis (AA) and GenAI Showdown pages show no snapshot date, so treat them as "as retrieved 2026-11-06".
- File sizes come from the Hugging Face (HF) API file listings pulled 2026-11-06 (`https://huggingface.co/api/models/<repo>?blobs=true`), cited through the repo page. They are decimal GB.
- Licence terms are paraphrased from the licence text, with section numbers where available. Read the linked text for exact wording. None of this is legal advice.
- "Gap" means points below gpt-image-2 on the same board. I calculated the gaps from the published scores.

## Which open-weight image generation and editing models are at the top right now?

### Takeaway
The open-weight top tier turned over in the last 8 weeks: Qwen-Image-2.1 (Sep 2026), FLUX 3 Image Klein (Oct 2026) and Fibo 2.0 (Oct 2026) sit within 6 points of each other at the top of AA, and Qwen-Image-2.1, the only one of the three on Arena, leads open weights there. Of those three, only FLUX 3 Klein can ship in a commercial indie game without a paid licence, and only while revenue stays under $5M; Qwen-Image-2.1 and Fibo 2.0 need a separate deal, as does the older Ideogram 4.0.

### Cited Findings

**Top open-weight models by board**
- AA text-to-image (T2I), open-weights filter: Qwen-Image-2.1 1045, FLUX 3 Image Klein 1043, Fibo 2.0 1039, Ideogram 4.0 (Quality) 1027, Ideogram 4.0 1003, Ming-Image-0.1-Design 1000, FLUX.2 [dev] 1000 (anchor). Rank 1 carries a ±12 interval — [AA open-weights board](https://artificialanalysis.ai/image/leaderboard/text-to-image/open-weights)
- Arena T2I (Nov 2): Qwen-Image-2.1 1227, Ideogram 4.0 (Quality) 1199, Cosmos3-Super-Text2Image (Agentic) 1165, HunyuanImage 3.0 1151, FLUX.2 [dev] 1145, Qwen-Image 2512 1125, HiDream-O1-Image 1115, Krea 2 Turbo 1115 — [Arena T2I](https://arena.ai/leaderboard/text-to-image)
- AA image edit: Fibo 2.0 1085, Qwen-Image-2.1 1080, FLUX 3 Image Klein 1069, HunyuanImage 3.0 Instruct 1065 — [AA editing board](https://artificialanalysis.ai/image/leaderboard/editing)
- Arena image edit (Nov 2): Qwen-Image-2.1 1364, HunyuanImage 3.0 Instruct 1302, Qwen-Image-Edit 1241, Qwen-Image-Edit-2511 1233 — [Arena edit](https://arena.ai/leaderboard/image-edit)
- GenAI Showdown, hand-graded prompt adherence: Ideogram 4 and Fibo 2.0 8/15; MOSS-Image, Qwen-Image 2.1 and Boogu Image 0.1 7/15; Ming Image 0.1 and Krea 2 6/15; FLUX.2 [dev], Z-Image Turbo and Qwen-Image 4/15. FLUX 3 Klein is not listed — [GenAI Showdown](https://genai-showdown.specr.net/)

**New names found beyond the brief's list (all confirmed to exist on HF)**
- FLUX 3 Image Klein (Oct 15, 2026; distilled plus Base) — [BFL release notes](https://docs.bfl.ml/release-notes)
- Qwen-Image-2.1 (Sep 20, 2026) and Qwen-Image-2.1-Turbo (repo created Oct 9, 2026) — [Qwen-Image-2.1 card](https://huggingface.co/Qwen/Qwen-Image-2.1); [Comfy blog](https://blog.comfy.org/p/qwen-image-21-in-comfyui-open-weight); [Turbo repo](https://huggingface.co/Qwen/Qwen-Image-2.1-Turbo)
- Ideogram 4.0 (first open-weight Ideogram, Jun 3, 2026) — [ideogram4 repo](https://github.com/ideogram-oss/ideogram4)
- MOSS-Image from OpenMOSS (Oct 2026, Base and SFT) — [MOSS-Image-Base card](https://huggingface.co/OpenMOSS-Team/MOSS-Image-Base); [Airmore review](https://airmore.ai/ai-review/moss-image-review)
- Fibo 2.0 from Bria (dev and edit-turbo, repos created Oct 18-19, 2026) — [Fibo-2.0-dev card](https://huggingface.co/briaai/Fibo-2.0-dev)
- Krea 2 Raw and Turbo (Jun 22, 2026) — [Krea-2-Turbo card](https://huggingface.co/krea/Krea-2-Turbo)
- HiDream-O1-Image (May 8, 2026), a successor to I1/E1 with no VAE — [HiDream-O1 card](https://huggingface.co/HiDream-ai/HiDream-O1-Image)
- Ming-Image-0.1-Design from InclusionAI (repo created Sep 17, 2026) — [Ming card](https://huggingface.co/inclusionAI/Ming-Image-0.1-Design)
- NVIDIA Cosmos3-Super-Text2Image (May 31, 2026) — [Cosmos3 card](https://huggingface.co/nvidia/Cosmos3-Super-Text2Image)
- ERNIE-Image and ERNIE-Image-Turbo from Baidu (Apr 2026) — [ERNIE card](https://huggingface.co/baidu/ERNIE-Image); [AA](https://artificialanalysis.ai/image/leaderboard/text-to-image/open-weights)
- Boogu-Image-0.1 Base, Turbo and Edit (Jun 16, 2026) — [ComfyUI Wiki](https://comfyui-wiki.com/en/news/2026-06-16-boogu-image-edit)
- Microsoft Mage-Flow (Jul 22, 2026), official HF repo since deleted — [ComfyUI Wiki](https://comfyui-wiki.com/en/news/2026-07-22-mage-flow-microsoft); [wiki note on deletion](https://wikiwiki.jp/sd_toshiaki/Mage-Flow)
- JoyAI-Image-Edit (ComfyUI repack Jul 20, 2026) — [Comfy-Org repo](https://huggingface.co/Comfy-Org/JoyAI-Image-Edit)
- Anima from CircleStone Labs and Comfy Org (repo created Jan 29, 2026), a 2B anime and illustration model that has become an alternative to SDXL anime checkpoints — [Anima card](https://huggingface.co/circlestone-labs/Anima)
- P-H3-Image from Pruna (repo created Oct 27, 2026) and chroma-h3 from Lodestones (repo created Oct 31, 2026), both stills fine-tunes of the MiniMax-H3 video model — [P-H3-Image card](https://huggingface.co/PrunaAI/P-H3-Image); [chroma-h3 card](https://huggingface.co/lodestones/chroma-h3)

**Status of names in the brief**
- FLUX.2 family: [dev] released Nov 25, 2025 ([Comfy blog](https://blog.comfy.org/p/flux2-state-of-the-art-visual-intelligence)); [klein] 4B and 9B released Jan 15, 2026 ([BFL release notes](https://docs.bfl.ml/release-notes)). FLUX.2 pro, max and flex plus FLUX 3 Image (full) are closed ([AA](https://artificialanalysis.ai/image/leaderboard/text-to-image?open-weights=true)).
- Qwen-Image: 1.0, Edit, Edit-2509, Edit-2511, Layered and 2512 are open under Apache 2.0, and the 2.1 family is open but research-licensed ([HF listing for Qwen](https://huggingface.co/Qwen)). Qwen-Image 2.0, 3.0, 3.0-Pro and 2.1-Pro are closed ([AA](https://artificialanalysis.ai/image/leaderboard/text-to-image?open-weights=true)).
- Z-Image: Turbo (Nov 2025) and base Z-Image (repo created Jan 23, 2026) are the only image releases in the Tongyi-MAI org. The Turbo card still marks Z-Image-Edit and Z-Image-Omni-Base as not yet released — [Z-Image-Turbo card](https://huggingface.co/Tongyi-MAI/Z-Image-Turbo); [Z-Image repo](https://huggingface.co/Tongyi-MAI/Z-Image)
- HunyuanImage: 3.0 (Sep 28, 2025) and 3.0-Instruct (Jan 26, 2026) are open — [Instruct card](https://huggingface.co/tencent/HunyuanImage-3.0-Instruct). HunyuanImage 3.5 (Preview, Sep 2026) is listed as closed by [AA](https://artificialanalysis.ai/image/leaderboard/text-to-image?open-weights=true), and the `tencent/HunyuanImage-3.5` HF path returned 401 when queried.
- HiDream: I1 and E1.1 are 2025 models; O1-Image is the 2026 successor. HiDream-O1-Image-1.5 (Jun 2026) is listed as closed — [AA](https://artificialanalysis.ai/image/leaderboard/text-to-image?open-weights=true)
- GLM-Image: real and MIT-licensed, repo created Jan 8, 2026 — [GLM-Image card](https://huggingface.co/zai-org/GLM-Image)
- Seedream: I found no open release. Every Seedream entry is proprietary on [Arena](https://arena.ai/leaderboard/text-to-image), and an HF search returned only third-party repos. ByteDance's open image model in the boards is BAGEL, which ranks last on Arena T2I (897) — [Arena](https://arena.ai/leaderboard/text-to-image)
- Wan: Wan 2.2 is the open option, under Apache 2.0 ([Wan2.2-T2V-A14B](https://huggingface.co/Wan-AI/Wan2.2-T2V-A14B)). Wan 2.5, 2.6 and 2.7 image models are proprietary ([Arena](https://arena.ai/leaderboard/text-to-image)).
- Lumina: Lumina-Image-2.0 is on HF under Apache 2.0, created Jan 2025 ([Lumina repo](https://huggingface.co/Alpha-VLLM/Lumina-Image-2.0)). It is not on the Arena or AA boards retrieved.
- SD 3.5: still downloadable, but ranks near the bottom of Arena T2I at #83 (938) — [Arena](https://arena.ai/leaderboard/text-to-image)
- Pony V7 shipped on AuraFlow; the card lists text generation as unsupported and a V7.1 as in progress — [Pony V7 card](https://huggingface.co/purplesmartai/pony-v7-base)
- Stability AI's newest repos checked (Oct 2026) are AMD NPU ports of SDXL and SD 3.5 Medium, not new image models — [Stability on HF](https://huggingface.co/stabilityai)

**Ecosystem traction, as HF download counts (the HF API's rolling figure, usually described as last 30 days)**
- Comfy-Org repacks: Qwen-Image-2.1 10.5M, z_image_turbo 9.6M, MOSS-Image 5.3M, Krea-2 4.3M, Qwen-Image_ComfyUI 2.7M, flux2-dev 1.1M, Fibo-2.0 0.34M, Ideogram-4 0.16M. Also circlestone-labs/Anima 2.0M and black-forest-labs/flux-3-image-klein-comfy 1.1M — [Comfy-Org on HF](https://huggingface.co/Comfy-Org); [Anima](https://huggingface.co/circlestone-labs/Anima); [Klein-comfy](https://huggingface.co/black-forest-labs/flux-3-image-klein-comfy)

### Inferences
- Treat the top of AA as a tie: 1045, 1043 and 1039 are closer together than the ±12 interval shown for rank 1, so ordering among those three should not drive a decision.
- Download counts are a rough adoption proxy only, since they count per-file pulls and CI traffic. Still, they show Qwen-Image-2.1 and Z-Image-Turbo as the most-pulled local image models despite Qwen-2.1's restrictive licence.
- For a commercial indie game the practical top tier is FLUX 3 Klein, then the Apache and MIT set (Qwen-Image-2512 and Edit-2511, HiDream-O1, MOSS-Image, Z-Image-Turbo) plus Krea 2 Turbo if revenue is under $1M.

### Gaps
- I could not retrieve r/StableDiffusion threads directly. Practitioner evidence below comes from blogs and a Hacker News thread.
- A web-search summary described Lumina-Image-2.0 as a compact research tool with a hard-coded 384px output. I could not trace that claim, because the one guide I checked from those results does not mention Lumina, so I am not relying on it.
- `Qwen-Image-2512` appeared as "Qwen Image Max 2512" at 999 in [Pinggy's Oct 7 snapshot](https://pinggy.io/blog/best_free_open_source_ai_image_generators_to_self_host/) but is absent from the AA open-weights table I retrieved on Nov 6. I cannot explain the difference.

## For each serious candidate: release, size, VRAM, resolution, text, editing, ecosystem and licence

### Takeaway
Most 2026 open models need about 16-24 GB of VRAM at full precision, or 6-12 GB with int8, FP8, NVFP4 or GGUF and a CPU-offloaded text encoder, and text encoders are often larger than the image model. Licensing now splits the field more than quality does: several of the best models require a paid licence for a commercial game, and the MiniMax-H3 derivatives exclude US, EU, UK and Korean users unless they obtain a separate licence.

### Cited Findings

**Top tier: consumer-runnable, native ComfyUI support**

| Model | Released | Weights (diffusion model; text encoder; other) | VRAM evidence | Native res | Edit and references | Sources |
|---|---|---|---|---|---|---|
| FLUX 3 Image Klein (distilled, Base), 5.6B | Oct 15, 2026 | 11.1 GB bf16; 6.27 FP8; 5.83 int8; 5.28 NVFP4. Text encoder Qwen3-VL-4B 8.88 bf16, 4.86 int8. Upsampler 18.82 bf16, 9.75 int8, 6.72 w4a8. VAE 0.34 | Card, on B200 at 1024²: 31 GB bf16, 26 FP8, 25 NVFP4, plus about 28 GB for the upsampler. BFL: int8 runs on as little as 8 GB. Measured: 7.2 GiB T2I and 7.8 GiB edit on RTX 3080 FP8 (phases run separately); about 4.6 GB gen and 5.7 GB edit with GGUF on an 8 GB laptop with text encoder on CPU | Up to 4K per BFL; about 16 MP in BFL's pipeline; 1 MP in Comfy templates | Instruction edit, up to 10 references, bounding-box layout. Comfy's distilled edit template uses 1 reference | [Card](https://huggingface.co/black-forest-labs/flux-3-image-klein); [Comfy files](https://huggingface.co/black-forest-labs/flux-3-image-klein-comfy); [BFL blog](https://bfl.ai/blog/flux-3-image-klein); [Comfy docs](https://docs.comfy.org/tutorials/flux/flux-3-klein); [Hausmer](https://hausmer.com/posts/flux-3-klein-vs-qwen-image/); [AILocalabs](https://ailocalabs.com/en/recipes/qwen-image-vs-flux-3-klein/) |
| Qwen-Image-2.1 and 2.1-Turbo, 7B | Sep 20, 2026; Turbo repo Oct 9 | 14.23 GB bf16; 7.26 int8. Text encoder Qwen3-VL-8B 17.53 bf16, 9.35 int8, 6.31 w4a8. Prompt extenders 9.47 int8, 6.72 w4a8. VAE 0.68 | No vendor figure. HN users report about 15.6 GB at Q8 and 17 GB on a 50-step run. Measured: 6.4 GiB T2I and 7.7 GiB edit (Turbo NF4, RTX 3080); about 5.4 GB gen and 6.8 GB edit (Q4_K_M GGUF, 8 GB laptop, text encoder on CPU) | 2048², 2400×1792, 2528×1696, 2752×1536 and portrait equivalents | Up to 10 references; local edits by circle, painted mark or mask; native RGBA output and transparent-layer edit | [Card](https://huggingface.co/Qwen/Qwen-Image-2.1); [Comfy files](https://huggingface.co/Comfy-Org/Qwen-Image-2.1); [Comfy blog](https://blog.comfy.org/p/qwen-image-21-in-comfyui-open-weight); [HN thread](https://news.ycombinator.com/item?id=49775499); [Hausmer](https://hausmer.com/posts/flux-3-klein-vs-qwen-image/); [AILocalabs](https://ailocalabs.com/en/recipes/qwen-image-vs-flux-3-klein/) |
| Ideogram 4.0, 9.3B | Jun 3, 2026 | Needs both cond and uncond transformers. Official FP8 9.29 + 9.29, text encoder 8.78; official NF4 5.22 + 5.22, text encoder 5.48. Comfy NVFP4 5.49 each; GGUF Q4_0 5.64 each | No vendor figure. One secondary claim: NF4 fits a 24 GB GPU | Multiples of 16 from 256 to 2048 per side; aspect up to 6:1 | No edit documented; bounding-box layout and colour palette controls | [Repo](https://github.com/ideogram-oss/ideogram4); [FP8](https://huggingface.co/ideogram-ai/ideogram-4-fp8); [NF4](https://huggingface.co/ideogram-ai/ideogram-4-nf4); [Comfy](https://huggingface.co/Comfy-Org/Ideogram-4); [GGUF](https://huggingface.co/leejet/ideogram-4-GGUF); [Pinggy](https://pinggy.io/blog/best_free_open_source_ai_image_generators_to_self_host/) |
| Fibo 2.0 (dev, edit-turbo), 8B | Oct 2026 | 16.45 GB bf16; 8.41 int8. Text encoder 8.88 bf16, 4.86 int8. VAE 0.34 | Not stated | About 1 MP, multiples of 16 | Instruction, masked and multi-reference edits up to 4 images; JSON captions; pipeline accepts font files for text | [Card](https://huggingface.co/briaai/Fibo-2.0-dev); [Comfy](https://huggingface.co/Comfy-Org/Fibo-2.0) |
| MOSS-Image (Base, SFT), 5B | Oct 16, 2026 | 10.16 GB bf16; 5.41 int8. Text encoder Qwen3.5-9B 19.31 bf16, 9.75 int8, 7.34 w4a8. Small VAE 0.25 | Reported about 9.7 GB peak on RTX 3060 12 GB (unverified user report) | Examples at 1024²; multiples of 16 | T2I only per review; backbone has no native image conditioning. Comfy's repo carries an edit LoRA and a colour-depth control LoRA. JSON layout input | [Card](https://huggingface.co/OpenMOSS-Team/MOSS-Image-Base); [Comfy files](https://huggingface.co/Comfy-Org/MOSS-Image); [Airmore](https://airmore.ai/ai-review/moss-image-review) |
| Krea 2 Raw and Turbo, 12.9B | Jun 22, 2026 | 26.28 GB bf16; 13.14 FP8 scaled; 13.49 int8; 7.67 NVFP4 (Turbo). Text encoder Qwen3-VL-4B 8.88 bf16, 4.86 int8 | Krea publishes no minimum. One blog's arithmetic estimate, not measured: FP8 floor about 16 GB; bf16 plan for 32 GB+ or offload | Examples at 2048² and 1024² | No edit; BFL excludes it from edit charts for that reason. Style-reference LoRA in Comfy repo | [Card](https://huggingface.co/krea/Krea-2-Turbo); [Comfy files](https://huggingface.co/Comfy-Org/Krea-2); [LocalAIMaster](https://localaimaster.com/blog/krea-2-local-guide); [BFL blog](https://bfl.ai/blog/flux-3-image-klein) |
| Z-Image-Turbo (6B) and Z-Image base | Nov 2025; base repo Jan 23, 2026 | 12.31 GB bf16; 6.20 int8; 4.51 NVFP4. Text encoder Qwen3-4B 8.04, 5.63 FP8 mixed, 3.48 FP4 mixed | Card: fits comfortably in 16 GB | Quick-start 1024² | Generation only; edit variant not released | [Card](https://huggingface.co/Tongyi-MAI/Z-Image-Turbo); [Comfy](https://huggingface.co/Comfy-Org/z_image_turbo) |
| Qwen-Image-2512, 20B | Dec 31, 2025 | 40.86 GB bf16; 20.43 FP8; 19.77 NVFP4. Text encoder 16.58, 9.38 FP8, 6.11 NVFP4. VAE 0.25 | No vendor figure. About 12-13 GB at Q4 GGUF (blog citing community quants) | 1328² default; 1664×928 at 16:9 | T2I; use Edit-2511 and Layered for edits | [Card](https://huggingface.co/Qwen/Qwen-Image-2512); [Comfy](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI); [LocalAIMaster](https://localaimaster.com/blog/best-local-image-models-compared) |
| Qwen-Image-Edit-2511, 20B | Dec 2025 | Same 57.7 GB pack size | Not stated | Not stated | Multi-image fusion; improved identity consistency; built-in popular community LoRA effects | [Card](https://huggingface.co/Qwen/Qwen-Image-Edit-2511) |
| Qwen-Image-Layered, 20B | Dec 17, 2025 | Same 57.7 GB pack size | Not stated | Buckets 640 or 1024; 640 recommended | Decomposes an image into RGBA layers, recursively; examples at 3, 4 and 8 layers | [Card](https://huggingface.co/Qwen/Qwen-Image-Layered) |
| HiDream-O1-Image, 8B plus Dev | May 8, 2026 | HF F32 pack 35.2 GB. Comfy bf16 16.37; FP8 8.07; MXFP8 8.92. Single file, no separate VAE or text encoder | Not stated | Up to 2048² | Instruction edit with single reference; multi-reference personalisation; skeleton and layout conditioning | [Card](https://huggingface.co/HiDream-ai/HiDream-O1-Image); [Comfy](https://huggingface.co/Comfy-Org/HiDream-O1-Image) |
| FLUX.2 [klein] 4B | Jan 15, 2026 | 7.75 GB; text encoder 8.04; VAE 0.17 | Card: as little as 13 GB | 1024² example | Edit and multi-reference | [Card](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B) |
| FLUX.2 [klein] 9B | Jan 15, 2026 | 18.16 GB; text encoder 16.38. FP8 repo exists | Not retrieved | Not retrieved | Edit and multi-reference | [Repo](https://huggingface.co/black-forest-labs/FLUX.2-klein-9B); [FP8](https://huggingface.co/black-forest-labs/FLUX.2-klein-9b-fp8) |
| FLUX.2 [dev], 32B | Nov 25, 2025 | 64.45 GB bf16; 35.46 FP8 mixed. Text encoder 35.58 bf16, 18.03 FP8, 12.28 FP4 mixed | Comfy recommends 24 GB+ for high-res; FP8 cuts VRAM 40%; a blog says it needs an RTX 4090 with quant | Up to 4 MP | Up to 10 references | [Comfy blog](https://blog.comfy.org/p/flux2-state-of-the-art-visual-intelligence); [Comfy files](https://huggingface.co/Comfy-Org/flux2-dev); [Repo](https://huggingface.co/black-forest-labs/FLUX.2-dev); [LocalAIMaster](https://localaimaster.com/blog/best-local-image-models-compared) |

**Second tier and specialist models**

| Model | Released | Weights | VRAM evidence | Native res | Edit, text, notes | Sources |
|---|---|---|---|---|---|---|
| Anima, 2B (anime and illustration) | Repo Jan 29, 2026; v1.x since | 4.18 GB; text encoder 1.19; VAE 0.25 | Not stated | 512² to 1536² | Native ComfyUI; Base, Aesthetic and Turbo; 157 adapters and 115 fine-tunes in model tree | [Card](https://huggingface.co/circlestone-labs/Anima) |
| Illustrious XL v2.0 (SDXL) | Repo Apr 2025 | 6.94 GB | SDXL about 6-8 GB (blog, source not stated) | Not stated on card | 120 adapters, 102 fine-tunes, 209 merges in model tree; later tiers are on a separate site | [Card](https://huggingface.co/OnomaAIResearch/Illustrious-XL-v2.0); [LocalAIMaster](https://localaimaster.com/blog/best-local-image-models-compared) |
| NoobAI-XL 1.1 (SDXL) | Repo Nov 2024 | 7.11 GB | As SDXL | Not stated on card | SDXL pipeline | [Card](https://huggingface.co/Laxhar/noobai-XL-1.1) |
| Pony V7 (AuraFlow) | Repo Oct 2025 | 13.72 GB single-file; 11.3 GB GGUF folder | Not specified; GGUF offered | 768 to 1536 px | No text generation; known face and small-detail weakness; ComfyUI and LoRA workflows provided | [Card](https://huggingface.co/purplesmartai/pony-v7-base) |
| Chroma1-HD, 8.9B (FLUX.1-schnell base) | 2025 | 17.80 GB; T5 text encoder 9.52 | Not stated | Not stated | Released with no safety filter; ComfyUI workflow | [Card](https://huggingface.co/lodestones/Chroma1-HD) |
| GLM-Image, 9B AR + 7B decoder | Jan 2026 | 35.8 GB pack, including 20.23 GB vision-language encoder | About 23 GB with CPU offload | 1K to 2K; divisible by 32 | Multi-image I2I; vendor CVTG-2K word accuracy 0.9116; ComfyUI not mentioned on card | [Card](https://huggingface.co/zai-org/GLM-Image) |
| ERNIE-Image and Turbo, 8B | Apr 2026 | 31.6 GB pack: 16.07 transformer; 7.70 text encoder; 7.66 prompt enhancer | Card: 24 GB consumer GPU | Up to 1376×768 listed | Vendor-claimed dense and long text strength; edit not documented | [Card](https://huggingface.co/baidu/ERNIE-Image); [AA](https://artificialanalysis.ai/image/leaderboard/text-to-image/open-weights) |
| Boogu-Image-0.1 | Jun 16, 2026 | 20.59 GB bf16; 10.31 FP8; 5.83 NVFP4 | Not stated | Edit at 1K | Base, 4-step Turbo and Edit. Edit is single-reference, with multi-reference planned; ComfyUI repack | [ComfyUI Wiki](https://comfyui-wiki.com/en/news/2026-06-16-boogu-image-edit); [Comfy](https://huggingface.co/Comfy-Org/Boogu-Image) |
| Mage-Flow, 4B (Microsoft) | Jul 22, 2026 | 8.23 GB bf16; 4.16 int8; text encoder 8.88 | Not stated | 512² to 2048², aspect up to 4:1 | T2I and edit variants, with 4-step Turbo; MIT per ComfyUI Wiki. Official HF repos returned 404 from about Jul 29 with no reason given; the takedown reports trace to a Reddit post and a community wiki, not a Microsoft statement | [Comfy](https://huggingface.co/Comfy-Org/Mage-Flow); [Blog on removal](https://0dev.duckdns.org/en/posts/microsoft-removes-mage-flow-models-from-hugging-face); [Community wiki](https://wikiwiki.jp/sd_toshiaki/Mage-Flow); [ComfyUI Wiki](https://comfyui-wiki.com/en/models/mage-flow) |
| JoyAI-Image-Edit, 16B | Jul 2026 | 32.53 GB bf16; 16.43 int8; text encoder 17.53 | Not stated | Not stated | Edit only. The only scores I found are in the Mage-Flow authors' own benchmark table (GEdit-EN 8.276, GEdit-CN 8.125), so none are independent | [Comfy](https://huggingface.co/Comfy-Org/JoyAI-Image-Edit); [Mage-Fans repo carrying the Mage-Flow card](https://huggingface.co/Mage-Fans/Mage-Flow) |
| Ming-Image-0.1-Design, 6B | Sep 2026 | 12.31 GB bf16; 6.18 int8. Text encoder 36.68 bf16, 19.51 int8, 12.81 w4a8. Layer variant exists | Only validated on one 80 GiB GPU | 1024 or 2048 buckets | Text-rich design focus; no edit documented | [Card](https://huggingface.co/inclusionAI/Ming-Image-0.1-Design); [Comfy](https://huggingface.co/Comfy-Org/Ming-Image) |
| HunyuanImage 3.0 and Instruct, 80B MoE (13B active) | Sep 28, 2025; Jan 26, 2026 | 168.5 GB official; community W4A8 43.6 GiB | Official: 8×80 GB. Community port: 24 GB GPU with weights streamed from system RAM, about 50 GB RAM held; test machine had 188 GB RAM; about 5 min 08 s per 1024² at 50 steps on RTX 4090, or about 1 min 30 s with the Spectrum node. Instruct-Distil about 26 s at 8 steps, and its W4A8 file reportedly runs within 12-16 GB, 15-20% slower | Up to 1280×768 shown; no max listed | Edit and up to 3-image fusion; ComfyUI by community nodes only | [Card](https://huggingface.co/tencent/HunyuanImage-3.0-Instruct); [Community port](https://huggingface.co/PedroMarinhoDev/HunyuanImage-3.0-Instruct-ComfyUI) |
| Cosmos3-Super-Text2Image, 64B | May 31, 2026 | 132.5 GB, 128 GB transformer | Recommends an 8×H100 node | 256p, 480p, 720p | Not consumer-class | [Card](https://huggingface.co/nvidia/Cosmos3-Super-Text2Image) |
| P-H3-Image, 33.1B on MiniMax-H3 | Oct 2026 | Comfy: 40.47 GB bf16; 21.21 int8; 13.36 w4a8. Plus text encoder 9.14 and upsampler 19.31. VAE 5.56 | 101 GB at 8 MP with upsampler, 83 without; Comfy int8 and 4-bit files run in 21 GB | Best at 8 MP; default 2912² | 1-8 input images. Short quoted text works; dense text becomes pseudo-text | [Card](https://huggingface.co/PrunaAI/P-H3-Image); [Comfy files](https://huggingface.co/PrunaAI/P-H3-Image-Comfy) |
| chroma-h3, 33B on MiniMax-H3 | Oct 2026 | Large pack: text encoder in 14 shards; LoRA form 2.86 GB | Not stated | About 1 MP | Stills fine-tune; few-step distilled variants | [Card](https://huggingface.co/lodestones/chroma-h3) |
| Wan 2.2 single-frame | 2025 | 57.15 GB × 2 high and low noise, plus 11.36 GB T5 | Not retrieved | Not verified | Video model. Still-image use not verified; see Gaps | [Repo](https://huggingface.co/Wan-AI/Wan2.2-T2V-A14B) |
| SD 3.5 Large and Medium | Oct 2024 | Large 16.46 GB; Medium 5.11 GB | About 12 GB for Large in FP8 (blog, source not stated) | Not stated on card | Ranks #83 on Arena T2I | [Large](https://huggingface.co/stabilityai/stable-diffusion-3.5-large); [Medium](https://huggingface.co/stabilityai/stable-diffusion-3.5-medium); [LocalAIMaster](https://localaimaster.com/blog/best-local-image-models-compared) |
| Lumina-Image-2.0 | Jan 2025 | 10.44 GB; text encoder 10.46 | Not stated | Not stated | Community anime fine-tunes such as NetaYume exist | [Repo](https://huggingface.co/Alpha-VLLM/Lumina-Image-2.0); [NetaYume](https://huggingface.co/duongve/NetaYume-Lumina-Image-2.0-Diffusers-v40) |

**Licences, as they affect a commercial indie game (from licence text where possible)**

| Group | Model | Terms | Source |
|---|---|---|---|
| Free for commercial use | Qwen-Image 1.0, Edit, Edit-2511, Layered, 2512 | Apache 2.0 | [Qwen-Image-2512](https://huggingface.co/Qwen/Qwen-Image-2512); [Edit-2511](https://huggingface.co/Qwen/Qwen-Image-Edit-2511); [Layered](https://huggingface.co/Qwen/Qwen-Image-Layered) |
| Free for commercial use | Z-Image and Turbo; FLUX.2 [klein] 4B; MOSS-Image; ERNIE-Image; LongCat-Image; Chroma1-HD; Lumina-Image-2.0; Wan 2.2 | Apache 2.0 | [Z-Image-Turbo](https://huggingface.co/Tongyi-MAI/Z-Image-Turbo); [klein 4B](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B); [MOSS](https://huggingface.co/OpenMOSS-Team/MOSS-Image-Base); [ERNIE](https://huggingface.co/baidu/ERNIE-Image); [LongCat](https://huggingface.co/meituan-longcat/LongCat-Image); [Chroma](https://huggingface.co/lodestones/Chroma1-HD); [Lumina](https://huggingface.co/Alpha-VLLM/Lumina-Image-2.0); [Wan](https://huggingface.co/Wan-AI/Wan2.2-T2V-A14B) |
| Free for commercial use | HiDream-O1-Image; GLM-Image; Ming-Image | MIT. HiDream's optional prompt agent uses Gemma, which has its own licence | [HiDream](https://huggingface.co/HiDream-ai/HiDream-O1-Image); [GLM](https://huggingface.co/zai-org/GLM-Image); [Ming](https://huggingface.co/inclusionAI/Ming-Image-0.1-Design) |
| Free for commercial use | Cosmos3-Super-Text2Image | OpenMDW 1.1; card states ready for commercial and non-commercial use | [Card](https://huggingface.co/nvidia/Cosmos3-Super-Text2Image) |
| Free for commercial use | Boogu-Image; JoyAI-Image-Edit | Apache 2.0 per repo tag and secondary sources; I did not read the LICENSE file | [Boogu Comfy](https://huggingface.co/Comfy-Org/Boogu-Image); [ComfyUI Wiki](https://comfyui-wiki.com/en/news/2026-06-16-boogu-image-edit); [JoyAI Comfy](https://huggingface.co/Comfy-Org/JoyAI-Image-Edit) |
| Free below a cap | FLUX 3 Image Klein | FLUX Kommunity License v1.0. Qualifying User means under US$5M gross annualized revenue including affiliates (§1.e). Qualifying Users may use outputs commercially, including outputs from derivatives, and may run the model in production solely to generate them (§2.a). They must filter content or review outputs before distribution and add legally required disclosures (§2.e). Outputs may not be used to improve similar models (§4.b). Commercial distribution of the model is not granted | [LICENSE.md](https://huggingface.co/black-forest-labs/flux-3-image-klein/blob/main/LICENSE.md) |
| Free below a cap | Krea 2 | Community License v.1. Commercial use of model, derivatives or outputs only under $1M company-wide revenue including affiliates (§2.3). You own outputs (§5.3). Must implement content filter measures (§4.2). Official text has no seat limit, though [LocalAIMaster](https://localaimaster.com/blog/krea-2-local-guide) reports a 50-seat cap | [Licence](https://krea.ai/krea-2-licensing) |
| Free below a cap | SD 3.5 | Stability Community License: free under $1M annual revenue | [Card](https://huggingface.co/stabilityai/stable-diffusion-3.5-large) |
| Free below a cap | Pony V7 | Commercial use of model and outputs allowed, except inference services, companies over $1M revenue, and professional video production | [Card](https://huggingface.co/purplesmartai/pony-v7-base) |
| Outputs free, model restricted | Anima | CircleStone Labs Non-Commercial License. The restriction applies to the model, not outputs. The card's examples allow selling images and using them as assets in a paid product. Hosting the model or embedding weights needs a separate licence | [Card](https://huggingface.co/circlestone-labs/Anima) |
| Outputs free, model restricted | NoobAI-XL | FAIPL-1.0-SD. Output is not covered by the licence and contributors claim no rights to it. Licence has a Prohibited Uses section | [Card](https://huggingface.co/Laxhar/noobai-XL-1.1); [Licence](https://freedevproject.org/faipl-1.0-sd/) |
| Outputs free, model restricted | Illustrious XL v2.0 | Tagged CreativeML OpenRAIL-M; I did not read the text | [Card](https://huggingface.co/OnomaAIResearch/Illustrious-XL-v2.0) |
| Territory-limited | HunyuanImage 3.0 and Instruct | Tencent Hunyuan Community: does not apply in the EU, UK or South Korea. Over 100M MAU needs a separate licence. Tencent claims no rights in outputs. Outputs may not be used to improve other AI models | [LICENSE](https://raw.githubusercontent.com/Tencent-Hunyuan/HunyuanImage-3.0/main/LICENSE) |
| Territory-limited | P-H3-Image; chroma-h3 | MiniMax H3 Community: excludes the US, EU, UK and Republic of Korea. Over $20M product revenue needs authorisation. Commercial products must prominently display MiniMax H3 in their UI. No rights claimed in outputs | [License](https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/LICENSE); [P-H3 card](https://huggingface.co/PrunaAI/P-H3-Image) |
| Paid licence needed | Qwen-Image-2.1 and Turbo | Qwen Research License: non-commercial means research or evaluation only (§1.i). Commercial use of the Materials needs a separate licence by email (§2.b). The text does not directly address commercial use of outputs. No published price | [LICENSE](https://huggingface.co/Qwen/Qwen-Image-2.1/raw/main/LICENSE) |
| Paid licence needed | Ideogram 4.0 | Non-Commercial licence excludes generating output to include in, or promote, revenue-generating products. Self-Serve commercial is $300 per month (10,000 images per month, quantized weights only). Fine-tunes allowed non-commercially; commercial fine-tune rights described as following final self-serve terms. Ideogram claims no ownership of outputs | [Licence](https://raw.githubusercontent.com/ideogram-oss/ideogram4/main/model_licenses/LICENSE-IDEOGRAM-4-NON-COMMERCIAL); [Pricing](https://ideogram.ai/licensing/) |
| Paid licence needed | Fibo 2.0 | CC BY-NC 4.0; commercial use by agreement with Bria; no price on the card. Trained exclusively on licensed data, which is unusual in this field | [Card](https://huggingface.co/briaai/Fibo-2.0-dev) |
| Paid licence needed | FLUX.2 [dev], [klein] 9B, Kontext [dev] | FLUX [dev] Non-Commercial v2.0. §2(d) lets you use output for any purpose including commercial, but the model itself may not be used for revenue-generating or production purposes (§1(c), §4(a)(i)). BFL's own help page says these models need a commercial licence | [Licence](https://bfl.ai/legal/non-commercial-license-terms); [BFL help](https://help.bfl.ai/articles/9272590838-self-serve-dev-license-overview-pricing) |
| Paid tiers, reference | BFL commercial weights | Builder 10K images per month (self-serve); Platform and Professional 100K; Enterprise custom; 10 licensed users; fine-tuning and LoRA rights included. Prices not public | [BFL open weights](https://bfl.ai/open-weights); [BFL help](https://help.bfl.ai/articles/9272590838-self-serve-dev-license-overview-pricing) |

**ComfyUI and LoRA tooling**
- FLUX 3 Klein: needs ComfyUI 0.41.0 or later, templates default to int8, and the prompt upsampler is on by default. BFL names Ostris AI Toolkit and NVIDIA NeMo AutoModel for LoRA training, with Klein Base as the training checkpoint — [Comfy docs](https://docs.comfy.org/tutorials/flux/flux-3-klein); [BFL blog](https://bfl.ai/blog/flux-3-image-klein)
- FLUX 3 Klein's card says a short prompt sent as typed gives generic output, so the upsampler is effectively part of the memory budget — [Card](https://huggingface.co/black-forest-labs/flux-3-image-klein)
- Qwen-Image-2.1: day-one ComfyUI template. Comfy's repo also carries a union ControlNet (7.55 GB bf16, 3.78 int8) and several step-reduction LoRAs — [Comfy blog](https://blog.comfy.org/p/qwen-image-21-in-comfyui-open-weight); [Comfy files](https://huggingface.co/Comfy-Org/Qwen-Image-2.1)
- MOSS-Image: native ComfyUI support merged Oct 16, 2026 — [Airmore](https://airmore.ai/ai-review/moss-image-review)
- Krea 2: native ComfyUI support since v0.26.0, with style LoRAs in the official repack — [LocalAIMaster](https://localaimaster.com/blog/krea-2-local-guide); [Comfy files](https://huggingface.co/Comfy-Org/Krea-2)
- Ideogram 4: community LoRAs by Ostris exist — [Ostris turbo LoRA](https://huggingface.co/ostris/ideogram_4_turbotime_lora)
- A local-models blog labels the LoRA ecosystems qualitatively: SDXL largest, FLUX.1 [dev] large, SD 3.5 moderate, FLUX.2 [dev] growing, and klein 4B, Qwen-Image and Z-Image Turbo small. It admits it did no benchmarking — [LocalAIMaster](https://localaimaster.com/blog/best-local-image-models-compared)

**Text rendering evidence (vendor-reported unless marked)**
- Independent, hand-graded: GenAI Showdown's chalkboard-equation prompt was passed at gold by gpt-image-2 (1 attempt), Qwen-Image 2.1 (4), MOSS-Image (5) and Boogu (7), at silver by Z-Image Turbo (20) and at bronze by Ming (20). Ideogram 4 failed after 15 attempts despite its text focus. No model passed the overcrowded flat-earth prompt, which combines a long exact headline with crowds, and that includes gpt-image-2 — [GenAI Showdown](https://genai-showdown.specr.net/)
- Independent, anecdotal: on 118 prompts run locally, Latin-script OCR accuracy was about 0.98-0.99 for both FLUX 3 Klein and Qwen-Image-2.1 Turbo. Cyrillic dropped to 0.75-0.86 — [Hausmer, Oct 23](https://hausmer.com/posts/flux-3-klein-vs-qwen-image/)
- Independent, anecdotal: in long Japanese text tests on RTX 5090, Qwen-Image-2.1 was most accurate; FLUX 3 Klein made errors mainly on kanji numerals; MOSS garbled several kanji; Krea 2 Turbo was weakest — [note.com, Oct 20](https://note.com/hikoza2045/n/n1252511b1bc9?hl=en)
- Vendor: Ideogram 4 claims the best text rendering of any open-weight release it benchmarked, and won 47.9% of first places in a ContraLabs typography test against Nano Banana 2, FLUX.2 [max] and Grok Imagine 1.0 — [ideogram4 README](https://raw.githubusercontent.com/ideogram-oss/ideogram4/main/README.md)
- Vendor: MOSS-Image reports 96.3 on LongLongTextBench; the review warns this does not guarantee correct spelling — [Airmore](https://airmore.ai/ai-review/moss-image-review)
- Vendor: HiDream-O1 reports CVTG-2K 0.9128 and LongText-Bench 0.979 EN, 0.978 ZH — [Card](https://huggingface.co/HiDream-ai/HiDream-O1-Image)
- Vendor: FLUX.2 klein 4B and FLUX 3 Klein cards both warn rendered text may be inaccurate or distorted — [klein 4B](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B); [FLUX 3 Klein](https://huggingface.co/black-forest-labs/flux-3-image-klein)

### Inferences
- File size understates memory need. BFL's card warns of this directly: FLUX 3 Klein's bf16 file is 11.1 GB but peaked at 31 GB on B200. Consumer figures of 5-8 GB depend on int8 or GGUF, with the text encoder offloaded or running in a separate phase, so the "8 GB" claims come with slower speed and some quality loss. Comfy's docs say bf16 follows long prompts more closely.
- For a game asset pipeline, native alpha and reference count matter as much as raw score. Qwen-Image-2.1 is the only top model with native RGBA and 10 references, but its licence blocks shipping without a separate deal. Qwen-Image-Layered is the Apache 2.0 route to layers, at lower resolution.
- FLUX 3 Klein's LoRA position is ambiguous. §2.a allows commercial outputs from Derivatives for Qualifying Users, yet §1.c places fine-tuning models for commercial use outside the non-commercial grant, and the card says the exception is not blanket permission for commercial fine-tuning. Using a self-trained style LoRA to make commercial game assets seems permitted by §2.a but should be checked with BFL or counsel. BFL's paid tiers explicitly include LoRA rights.
- FLUX.2 [dev] has a similar tension: outputs are commercially usable, but using the model to make them for a paid product looks like the revenue-generating use the licence excludes. Treat it as needing a paid licence, as BFL's help page does.
- The MiniMax-H3 derivatives are effectively unavailable to a US, EU, UK or Korean developer without a separate licence, whatever their quality.

### Gaps
- No vendor full-precision VRAM figures found for Qwen-Image-2.1, Krea 2, HiDream-O1, Ideogram 4, Fibo 2.0 or MOSS-Image.
- FLUX.2 klein 9B memory figures were not retrieved.
- I found no working GGUF of HunyuanImage 3.0 Instruct. This is absence from my search, not a statement by Tencent or the port's author.
- Wan 2.2 as a stills model is unverified. Search snippets describe single-frame use and "better than FLUX" claims, but the two pages I tried returned HTTP 403, so I report no settings, resolutions or quality claims.
- The Mage-Fans repo carries the Mage-Flow card under an MIT tag but does not say whether it is a mirror or how it relates to Microsoft.
- Prices are unpublished for BFL Builder, Bria commercial and Qwen commercial licences.
- BFL's help page on licensing does not yet mention FLUX 3 Klein, although the bfl.ai open-weights page does. A secondary article ([mer.vin](https://mer.vin/news/flux-3-klein-open-weights-image-model/)) says commercial product use requires a paid tier, which conflicts with §2.a of the licence for Qualifying Users. I treat the licence as authoritative.
- Illustrious's licence text and any post-v2.0 tiers were not verified. CreativeML OpenRAIL-M terms were not read for this note.
- I did not retrieve Civitai LoRA counts by base model, so ecosystem size is only qualitative plus HF model-tree numbers.
- Whether a LoRA counts as a "Derivative" under FLUX Kommunity is not stated explicitly; the licence covers any customised or fine-tuned version but does not name LoRAs.
- Mage-Flow's removal reason is unknown. The Comfy-Org repack remains up, but the original MIT grant is no longer verifiable on the official repo.

## How does each rank on independent leaderboards, and how close is the best open-weight model to gpt-image-2?

### Takeaway
Qwen-Image-2.1 leads open weights on T2I on both Arena and AA, 155 and 143 points behind gpt-image-2, and on edit the best open model is 96 behind on Arena (Qwen-Image-2.1) and 51 behind on AA (Fibo 2.0). Hand-graded GenAI Showdown points the same way, 12/15 for gpt-image-2 against 8/15 for the best open models, and OpenAI's own newer 2.5 and 2.6 models already rank above gpt-image-2 on Arena.

### Cited Findings

**gpt-image-2 reference points**
- Arena T2I (Nov 2): GPT-Image-2 (Medium) 1382, #5 — [Arena T2I](https://arena.ai/leaderboard/text-to-image)
- Arena edit (Nov 2): GPT-Image-2 (Medium) 1460±3, #6 — [Arena edit](https://arena.ai/leaderboard/image-edit)
- AA T2I: GPT Image 2 (high) 1188, #3 (13,114 comparisons; $211 per 1k images) — [AA T2I](https://artificialanalysis.ai/image/leaderboard/text-to-image?open-weights=true)
- AA edit: GPT Image 2 (high) 1136, rank range 7-11 — [AA edit](https://artificialanalysis.ai/image/leaderboard/editing)
- Current frontier: GPT-Image-2.5 Sunburst leads Arena T2I at 1427 and edit at 1517; on AA it leads T2I at 1227 and edit at 1199 — [Arena T2I](https://arena.ai/leaderboard/text-to-image); [Arena edit](https://arena.ai/leaderboard/image-edit); [AA T2I](https://artificialanalysis.ai/image/leaderboard/text-to-image?open-weights=true); [AA edit](https://artificialanalysis.ai/image/leaderboard/editing)

**Arena T2I category scores, Nov 2, 2026 (scores, with gap to gpt-image-2 Medium in brackets). Sources: [Overall](https://arena.ai/leaderboard/text-to-image), [Text Rendering](https://arena.ai/leaderboard/text-to-image/text-rendering), [Cartoon, Anime & Fantasy](https://arena.ai/leaderboard/text-to-image/cartoon), [Art](https://arena.ai/leaderboard/text-to-image/art), [3D](https://arena.ai/leaderboard/text-to-image/3d-modeling)**

| Model | Overall | Text Rendering | Cartoon, Anime & Fantasy | Art | 3D |
|---|---|---|---|---|---|
| GPT-Image-2 (Medium) | 1382 | 1424 | 1403 | 1371 | 1365 |
| Qwen-Image-2.1 | 1227 (-155) | 1250 (-174) | 1234 (-169) | 1235 (-136) | 1214 (-151) |
| Ideogram 4.0 (Quality) | 1199 (-183) | 1231 (-193) | 1193 (-210) | 1198 (-173) | 1172 (-193) |
| Cosmos3 (Agentic) | 1165 (-217) | 1145 (-279) | 1185 (-218) | 1192 (-179) | 1173 (-192) |
| HunyuanImage 3.0 | 1151 (-231) | 1150 (-274) | 1163 (-240) | 1154 (-217) | 1167 (-198) |
| FLUX.2 [dev] | 1145 (-237) | 1158 (-266) | 1143 (-260) | 1150 (-221) | 1149 (-216) |
| Qwen-Image 2512 | 1125 (-257) | 1123 (-301) | 1125 (-278) | 1131 (-240) | 1135 (-230) |
| HiDream-O1-Image | 1115 (-267) | 1134 (-290) | 1118 (-285) | 1117 (-254) | 1121 (-244) |
| Krea 2 Turbo | 1115 (-267) | 1101 (-323) | 1128 (-275) | 1138 (-233) | 1143 (-222) |
| Z-Image-Turbo | 1082 (-300) | 1059 (-365) | 1067 (-336) | 1073 (-298) | 1066 (-299) |
| FLUX.2 [klein] 9B | 1070 (-312) | 1058 (-366) | 1064 (-339) | 1079 (-292) | 1079 (-286) |
| Qwen-Image | 1057 (-325) | 1048 (-376) | 1053 (-350) | 1057 (-314) | 1065 (-300) |
| FLUX.2 [klein] 4B | 1030 (-352) | 1015 (-409) | 1023 (-380) | 1028 (-343) | 1031 (-334) |
| GLM-Image | 1012 (-370) | 1033 (-391) | 1003 (-400) | 1017 (-354) | 1020 (-345) |
| SD 3.5 Large | 938 (-444) | 921 (-503) | 945 (-458) | 997 (-374) | 963 (-402) |
| BAGEL | 897 (-485) | 874 (-550) | 884 (-519) | 908 (-463) | 862 (-503) |

Qwen-Image-2.1's Arena score is flagged Preliminary (19,378 votes on Overall) — [Arena T2I](https://arena.ai/leaderboard/text-to-image). GLM-Image has only 4,856 votes — [Arena T2I](https://arena.ai/leaderboard/text-to-image).

**Arena image edit, Nov 2, 2026 (gap to gpt-image-2 Medium 1460): Source [Arena edit](https://arena.ai/leaderboard/image-edit)**
- Qwen-Image-2.1 1364 (-96, Preliminary)
- HunyuanImage 3.0 Instruct 1302 (-158)
- Qwen-Image-Edit 1241 (-219)
- Qwen-Image-Edit-2511 1233 (-227)
- FLUX.2 [klein] 9B 1224 (-236) and FLUX.2 [dev] 1224 (-236)
- FLUX.2 [klein] 4B 1187 (-273)
- FLUX.1 Kontext [dev] 1150 (-310)
- BAGEL 1026 (-434)
- Step1X-Edit 996 (-464)

**AA T2I, open weights, retrieved Nov 6 (gap to GPT Image 2 high 1188): Sources [AA open board](https://artificialanalysis.ai/image/leaderboard/text-to-image/open-weights), [AA full board](https://artificialanalysis.ai/image/leaderboard/text-to-image?open-weights=true)**
- Qwen-Image-2.1 1045 (-143)
- FLUX 3 Image Klein 1043 (-145)
- Fibo 2.0 1039 (-149)
- Ideogram 4.0 (Quality) 1027 (-161); Ideogram 4.0 1003 (-185)
- Ming-Image-0.1-Design 1000 (-188); FLUX.2 [dev] 1000 (-188, anchor)
- Cosmos3 agentic 995 (-193); HunyuanImage 3.0 Instruct 988 (-200); HiDream-O1-Image 978 (-210)
- Z-Image Turbo 936 (-252); HunyuanImage 3.0 933 (-255); FLUX.2 [klein] 9B 932 (-256)
- ERNIE Image Turbo 915 (-273); ERNIE Image 909 (-279); Qwen Image 1.0 904 (-284); Z-Image Base 893 (-295); GLM-Image 891 (-297)
- LongCat Image 858 (-330); FIBO 853 (-335); FLUX.2 [klein] 4B 840 (-348); FLUX.1 [dev] 819 (-369)

**AA image edit, retrieved Nov 6 (gap to GPT Image 2 high 1136): Source [AA edit](https://artificialanalysis.ai/image/leaderboard/editing)**
- Fibo 2.0 1085 (-51); Qwen-Image-2.1 1080 (-56); FLUX 3 Image Klein 1069 (-67); HunyuanImage 3.0 Instruct 1065 (-71)
- FLUX.2 [dev] Turbo 1017 (-119); FLUX.2 [klein] 9B 1013 (-123); FLUX.2 [dev] 1000 (-136)
- Qwen Image Edit Plus 2511 992 (-144); Qwen Image Edit Plus 2509 967 (-169)
- HiDream-O1-Image 953 (-183); FLUX.2 [klein] 4B 940 (-196)
- FIBO Edit 912; LongCat Image 896; Qwen Image Edit 887; FLUX.1 Kontext [dev] 880; GLM-Image 824; HiDream-E1.1 767; Step1X-Edit 599

**GenAI Showdown, retrieved Nov 6 (one grader, hand-scored pass or fail on adversarial prompts)**
- T2I, passes out of 15 with the site's compliance score: gpt-image-2 12 (98%); Ideogram 4 8 (57%); Fibo 2.0 8 (31%); MOSS-Image 7 (57%); Qwen-Image 2.1 7 (67%); Boogu Image 0.1 7 (56%); Ming Image 0.1 6 (50%); Krea 2 6 (72%); FLUX.2 [dev] 4 (58%); Z-Image Turbo 4 (38%); Qwen-Image 4 (68%); FLUX.1 [dev] 4 (43%); FLUX.1 Krea [dev] 2 (75%); HiDream-I1 1 (80%); SDXL Juggernaut 0 (0%) — [T2I board](https://genai-showdown.specr.net/)
- Image edit, passes out of 12: gpt-image-2 10 (92%); FLUX.2 Klein 7 (49%, variant not stated); Qwen-Image-Edit 6 (50%); FLUX.1 Kontext [dev] 5 (32%); FLUX.2 [dev] 4 (45%); OmniGen2 0 (0%) — [Edit board](https://genai-showdown.specr.net/image-editing)
- Method: a pass means the model produced at least one image meeting the prompt's criteria. Prompts are reworded per model, attempt counts vary with model speed and apparent promise, and the author concedes grading is partly subjective, sometimes passing a close attempt — [FAQ](https://genai-showdown.specr.net/)
- The author's HN comment gave Boogu 6/15 and Krea 2 7/15, the reverse of the site's current 7/15 and 6/15. I use the site — [HN thread](https://news.ycombinator.com/item?id=49775499); [T2I board](https://genai-showdown.specr.net/)

**Not on a board**
- On neither Arena nor AA as retrieved: MOSS-Image, Boogu-Image, Mage-Flow, JoyAI-Image-Edit, Anima, Chroma1-HD, Illustrious, NoobAI, Pony V7, Lumina-Image-2.0, Wan 2.2 stills, P-H3-Image, chroma-h3. MOSS's own review also names no public leaderboard. MOSS-Image and Boogu do appear on GenAI Showdown — [Arena T2I](https://arena.ai/leaderboard/text-to-image); [AA](https://artificialanalysis.ai/image/leaderboard/text-to-image?open-weights=true); [Airmore](https://airmore.ai/ai-review/moss-image-review); [GenAI Showdown](https://genai-showdown.specr.net/)
- On AA but not Arena: FLUX 3 Image Klein, Fibo 2.0, Ming-Image, ERNIE-Image, LongCat Image — [Arena T2I](https://arena.ai/leaderboard/text-to-image); [AA](https://artificialanalysis.ai/image/leaderboard/text-to-image/open-weights)
- On Arena but not on AA's open-weights board: Krea 2 Turbo and SD 3.5 Large. AA lists "Krea 2 Medium Turbo" at 1020 with no open-weights link, and I could not confirm whether that is the same checkpoint — [AA](https://artificialanalysis.ai/image/leaderboard/text-to-image?open-weights=true)

**Comparability and vendor claims**
- Earlier AA snapshots: Oct 7 showed Qwen-Image-2.1 at 1035 and noted that AA re-anchored in early September, so pre-September scores are not comparable — [Pinggy](https://pinggy.io/blog/best_free_open_source_ai_image_generators_to_self_host/). Oct 15 showed GPT Image 2 (high) at 1186 — [Kingy](https://kingy.ai/blog/flux-3-image-klein-tested-benchmarks-costs/)
- Fibo 2.0's card claims #1 in editing and #2 in T2I among open weights on AA as of Oct 20 — [Card](https://huggingface.co/briaai/Fibo-2.0-dev). The Nov 6 retrieval confirms #1 in edit and shows #3 in T2I.
- BFL's internal evaluation ranks Klein first among open weights on T2I, multi-reference and edit — [BFL blog](https://bfl.ai/blog/flux-3-image-klein). AA shows Klein tied with Qwen-2.1 on T2I and behind Fibo and Qwen-2.1 on edit, within narrow margins.
- Vendor benchmark Qwen-Image-Bench, judged by Qwen's own Q-Judger: GPT Image 2 64.69, Nano Banana 2.0 59.82, GPT Image 1.5 59.65 — [Bench repo](https://github.com/QwenLM/Qwen-Image-Bench). Qwen's launch chart adds Qwen-Image-2.1 60.28 and Qwen-Image 1.0 49.23 — [Cellcog](https://cellcog.ai/blog/qwen-image-2-1/). That article also marks FLUX.2 Max as open at 32B, which contradicts [Arena](https://arena.ai/leaderboard/text-to-image) and [AA](https://artificialanalysis.ai/image/leaderboard/text-to-image?open-weights=true), both of which list [max] as closed.
- Arena's licence label "Ideogram Open Model" obscures the actual non-commercial licence — [Arena T2I](https://arena.ai/leaderboard/text-to-image); [Ideogram licence](https://raw.githubusercontent.com/ideogram-oss/ideogram4/main/model_licenses/LICENSE-IDEOGRAM-4-NON-COMMERCIAL)

### Inferences
- Under a standard Elo logistic with a 400-point scale, a 143-155 point gap means raters prefer gpt-image-2 in about 70% of pairings, and a 51-96 point edit gap means about 57-64%. This assumes the boards follow that scale, so treat it as approximate.
- Best open models free to ship without any paid licence, on a commercial indie budget: on AA, FLUX 3 Klein gives up only 2 points to Qwen-2.1 (with Klein's revenue cap and filter or review duty). On Arena, Qwen-Image-2512 (-257), HiDream-O1 and Krea 2 Turbo (-267) are the best free-to-ship entries, because Klein has no Arena entry yet. For edits on Arena, Qwen-Image-Edit (-219) is the best Apache model.
- Open models trail gpt-image-2 most on text rendering (-174 for the best open model) and least on Art (-136). That supports using open weights for art production and keeping text out of generated images where possible.
- Boogu Image 0.1 and MOSS-Image are the strongest Apache-licensed results on GenAI Showdown at 7/15, level with Qwen-Image-2.1, and neither has an Arena or AA score to check that against. The sample is 15 prompts from one grader, so this is a reason to test them, not proof of parity.
- Scores cannot be merged across boards. HunyuanImage 3.0, for example, sits close to FLUX.2 [dev] on Arena but about 67 points below it on AA.
- HunyuanImage 3.0 and Cosmos3 score well but are not realistic consumer candidates at the memory levels listed above.

### Gaps
- AA and GenAI Showdown pages carry no explicit snapshot date; I report retrieval date. Showdown's browser storage held a release-notes date of 2026-10-27, which suggests a recent update but is not a stated snapshot.
- GenAI Showdown has not scored FLUX 3 Klein, and its edit board omits Qwen-Image-2.1, Fibo 2.0, Ideogram 4 and MOSS-Image. I could not read the site's definition of compliance beyond the FAQ saying attempt count feeds into it.
- Arena per-category scores for FLUX 3 Klein and Fibo 2.0 do not exist yet. Their Arena placement is unknown.
- Neither board has a category for sprites, tiles or game assets. Arena's closest are Cartoon, Anime & Fantasy, and 3D Imaging & Modeling.
- Arena's Product, Branding & Commercial Design, Agentic, Photorealistic and Portraits categories exist, but I did not retrieve them — [Arena Text Rendering page](https://arena.ai/leaderboard/text-to-image/text-rendering)

## Where do the best open models beat, match and lose to gpt-image-2?

### Takeaway
Open models win on cost, control, customisation and moderation, match on short-text accuracy, reference count and raw resolution, and lose on prompt adherence in complex scenes, data diagrams, long-text accuracy and edit containment. Two direct tests exist, GenAI Showdown (12/15 against 8/15 at best) and Kingy (30/32 against 24/32 for FLUX 3 Klein), but neither covers game assets or LoRA-tuned models, so much of this comparison still rests on leaderboard gaps.

### Cited Findings

**Direct comparisons that include gpt-image-2**
- GenAI Showdown T2I: gpt-image-2 passed 12 of 15, each pass taking 1 or 2 attempts. Passing open models sometimes needed far more, for example Qwen-Image 2.1 18 attempts (octopus puppets) and Fibo 2.0 18 (mermaid) — [GenAI Showdown](https://genai-showdown.specr.net/)
- Same board, where gpt-image-2 leads: none of the 14 locally hostable models passed the hand-anatomy prompt or the maze, and gpt-image-2 passed both. Only Fibo 2.0 (9 attempts) and FLUX.1 [dev] (8) passed the nine-pointed star, against gold in 1 attempt for gpt-image-2. Only Ideogram 4 and Fibo 2.0 passed the four-panel comic, both at bronze, against silver for gpt-image-2 — [GenAI Showdown](https://genai-showdown.specr.net/)
- Same board, where open models match or lead: Krea 2 took gold in 1 attempt against silver in 2 on the octopus puppets, and FLUX.2 [dev] took gold in 2 against bronze in 1 on the angelic blacksmith. Three prompts beat gpt-image-2 and all 14 local models: the colour-banded snake, the prime-numbered D20 and the overcrowded flat earth — [GenAI Showdown](https://genai-showdown.specr.net/)
- GenAI Showdown edit: gpt-image-2 10 of 12, against FLUX.2 Klein 7 and Qwen-Image-Edit 6. Successive corrective prompts and manual masks are not allowed on that board, so local inpainting workflows are not measured — [Edit board](https://genai-showdown.specr.net/image-editing)
- Kingy's test on Fal endpoints, Oct 15, 2026: all-four-check generation passes out of 32 were GPT Image 2 30/32, FLUX 3 Klein distilled 24/32, FLUX 3 Klein Base 23/32. Batch cost was $9.385 vs $0.396 and $1.188. Everyone passed all 12 edit outputs. Caveats: the publisher ran it; an AI evaluator from the same vendor as the OpenAI configs judged it; Klein's prompt upsampler was off; bootstrap interval for Klein distilled is about 53-94% — [Kingy](https://kingy.ai/blog/flux-3-image-klein-tested-benchmarks-costs/)
- Same test by category: counting 4/6 for Klein vs 6/6 for GPT Image 2; diagrams 2/6 for Klein vs 5/6 for GPT Image 2. Klein gave wrong bar-chart values and wrong arrow directions in water-cycle diagrams — [Kingy](https://kingy.ai/blog/flux-3-image-klein-tested-benchmarks-costs/)
- Same test on edit containment: Klein changed 5.66-6.23% of outside-region pixels by more than 8 RGB levels, vs 1.44% for Nano Banana 2.1 and 0.26% for Ideogram 4.5. The article's summary did not give GPT Image 2's figure in this retrieval — [Kingy](https://kingy.ai/blog/flux-3-image-klein-tested-benchmarks-costs/)
- Same test on short English text: both Klein configurations passed all six text-task outputs, on only three short tasks — [Kingy](https://kingy.ai/blog/flux-3-image-klein-tested-benchmarks-costs/)
- Vendor benchmark, Qwen-Image-Bench: GPT Image 2 64.69 vs Qwen-Image-2.1 60.28. Qwen's own judge and chart, not independently reproduced — [Cellcog](https://cellcog.ai/blog/qwen-image-2-1/)
- Bench repo sub-scores for GPT Image 2: Quality 58.65, Aesthetics 67.53, Alignment 65.85, Real-world Fidelity 57.38, Creative Generation 75.23. The README shows sub-scores for the top five only, and Qwen-2.1 is not among them — [Bench repo](https://github.com/QwenLM/Qwen-Image-Bench)
- Anecdotal, HN thread on Qwen-2.1: one user who runs a design tool rated its text well ahead of other open models, while another said the text in those same screenshots was garbled. The Showdown author reported heavy yellow tint and a need for higher CFG on complex prompts. Another user found it weak at following directions. For game work, one user said it still fails at smoothly animated sprites but liked the native RGBA output — [HN thread](https://news.ycombinator.com/item?id=49775499)

**Where open models beat gpt-image-2**
- Cost: AA lists GPT Image 2 (high) at $211 per 1k images, vs $9 for FLUX 3 Klein on BFL's API. Local marginal cost is electricity plus hardware — [AA T2I](https://artificialanalysis.ai/image/leaderboard/text-to-image?open-weights=true); [OrcaRouter](https://www.orcarouter.ai/blog/qwen-image-2-1-vs-gpt-image-2)
- Seeds and reproducibility: local runs can fix seeds, as in the [AILocalabs test](https://ailocalabs.com/en/recipes/qwen-image-vs-flux-3-klein/) using identical prompts and seeds across models. OpenAI's image guide page does not mention a seed parameter in the first 100,000 of 126,103 characters I read; it covers later GPT Image 2.5 and 2.6 usage, so another researcher should confirm for gpt-image-2 — [OpenAI guide](https://developers.openai.com/api/docs/guides/image-generation)
- Style LoRAs and fine-tuning: FLUX 3 Klein Base and Krea 2 Raw are specifically released as training checkpoints; Anima lists 157 adapters; Illustrious 120 adapters and 209 merges — [BFL release notes](https://docs.bfl.ml/release-notes); [Krea card](https://huggingface.co/krea/Krea-2-Turbo); [Anima](https://huggingface.co/circlestone-labs/Anima); [Illustrious](https://huggingface.co/OnomaAIResearch/Illustrious-XL-v2.0)
- Moderation: Chroma1-HD ships with no safety filter, and local MOSS-Image users report adult content generation. Community uncensored LoRAs and quantizations exist for Qwen-2.1 and MOSS — [Chroma](https://huggingface.co/lodestones/Chroma1-HD); [Airmore](https://airmore.ai/ai-review/moss-image-review); [Qwen-2.1 uncensored LoRA](https://huggingface.co/chatrlabs/Qwen-Image-2.1-Uncensored-Omni-LoRA-v0.1); [MOSS uncensored LoRA](https://huggingface.co/axiomofmind/Moss-image-nsfw-uncensored-lora)
- Licence caveat on moderation: FLUX Kommunity §2.e and Krea 2 §4.2 require content filtering or review, so "no moderation" is partly a licence question for commercial users — [FLUX Kommunity](https://huggingface.co/black-forest-labs/flux-3-image-klein/blob/main/LICENSE.md); [Krea licence](https://krea.ai/krea-2-licensing)
- Control surfaces: bounding-box placement (FLUX 3 Klein, MOSS JSON, Ideogram 4), ControlNet for Qwen-2.1, structured JSON captions (Fibo 2.0), RGBA layer decomposition (Qwen-Image-Layered). Boxes guide placement rather than guarantee it — [FLUX 3 Klein card](https://huggingface.co/black-forest-labs/flux-3-image-klein); [MOSS review](https://airmore.ai/ai-review/moss-image-review); [Ideogram repo](https://github.com/ideogram-oss/ideogram4); [Comfy Qwen files](https://huggingface.co/Comfy-Org/Qwen-Image-2.1); [Fibo card](https://huggingface.co/briaai/Fibo-2.0-dev); [Layered card](https://huggingface.co/Qwen/Qwen-Image-Layered)
- Native alpha with verification: Qwen-2.1 has a 64-channel RGBA VAE, and SGLang's functional test kept alpha across 0-255 at RGBA PSNR 60.69 dB on one sample. This was a correctness check, not a quality guarantee — [OrcaRouter](https://www.orcarouter.ai/blog/qwen-image-2-1-vs-gpt-image-2)
- Data provenance: Fibo 2.0 says it trained exclusively on licensed data — [Fibo card](https://huggingface.co/briaai/Fibo-2.0-dev)
- Local speed, for fixed-seed iteration: FLUX 3 Klein int8 median 3.3 s per 1 MP on RTX 5090 (anecdotal), and BFL reports about 4 s on RTX 5090 and under 9 s on RTX 4070 — [note.com](https://note.com/hikoza2045/n/n1252511b1bc9?hl=en); [BFL blog](https://bfl.ai/blog/flux-3-image-klein). Qwen-2.1 about 5 s per 1 MP on RTX 4090 (HN user) — [HN thread](https://news.ycombinator.com/item?id=49775499). Full 8 GB laptop run: 36 s Klein vs 130 s Qwen-2.1 at 20 steps with CFG — [AILocalabs](https://ailocalabs.com/en/recipes/qwen-image-vs-flux-3-klein/)

**Where they roughly match**
- Short Latin text: FLUX 3 Klein passed its short text tasks in the only direct test and scored 0.98-0.99 OCR locally against Qwen-2.1 Turbo — [Kingy](https://kingy.ai/blog/flux-3-image-klein-tested-benchmarks-costs/); [Hausmer](https://hausmer.com/posts/flux-3-klein-vs-qwen-image/)
- Multi-reference input: Qwen-2.1 and FLUX 3 Klein accept up to 10 references. OpenAI's guide states no maximum in the portion read and shows a four-image example — [Qwen card](https://huggingface.co/Qwen/Qwen-Image-2.1); [FLUX 3 Klein card](https://huggingface.co/black-forest-labs/flux-3-image-klein); [OpenAI guide](https://developers.openai.com/api/docs/guides/image-generation)
- Transparency exists on both sides: OpenAI's guide offers background transparent, opaque or auto; Qwen-2.1 outputs native RGBA — [OpenAI guide](https://developers.openai.com/api/docs/guides/image-generation); [Comfy blog](https://blog.comfy.org/p/qwen-image-21-in-comfyui-open-weight)
- Resolution: Qwen-2.1 generates up to 2752×1536 natively, and FLUX 3 Klein claims native 4K, with 2K local renders timed at 15 s on RTX 5090 (int8, 16 steps) — [Qwen card](https://huggingface.co/Qwen/Qwen-Image-2.1); [VentureBeat](https://venturebeat.com/technology/black-forest-labs-opens-flux-3-image-klein-weights-with-free-commercial-use-limited-to-smaller-businesses). The other researcher should confirm gpt-image-2's limits.

**Where they lose**
- Overall preference: 143-155 Elo behind on T2I, and 51-96 behind on edit — [Arena T2I](https://arena.ai/leaderboard/text-to-image); [Arena edit](https://arena.ai/leaderboard/image-edit); [AA T2I](https://artificialanalysis.ai/image/leaderboard/text-to-image?open-weights=true); [AA edit](https://artificialanalysis.ai/image/leaderboard/editing)
- Text rendering overall: gpt-image-2 scores 1424 vs best open 1250 on Arena Text Rendering — [Arena](https://arena.ai/leaderboard/text-to-image/text-rendering)
- Counting and data visuals: Klein's failures in Kingy's test are noted above, and BFL's own card warns about text distortion — [Kingy](https://kingy.ai/blog/flux-3-image-klein-tested-benchmarks-costs/); [Card](https://huggingface.co/black-forest-labs/flux-3-image-klein)
- Prompt adherence needs an upsampler: FLUX 3 Klein and Qwen-2.1 ship prompt rewriters as separate models that add memory or time, about 17 s on an RTX 3080 for Klein by Hausmer's totals — [Hausmer](https://hausmer.com/posts/flux-3-klein-vs-qwen-image/); [FLUX 3 Klein card](https://huggingface.co/black-forest-labs/flux-3-image-klein); [OrcaRouter](https://www.orcarouter.ai/blog/qwen-image-2-1-vs-gpt-image-2)
- A comparison article dated Jun 29, 2026 says open models have not shipped a reasoning layer comparable to GPT Image 2. It reports no test and predates Qwen-Image-2.1 and FLUX 3 Klein — [Tech Insider](https://tech-insider.org/best-ai-image-generator-2026/)
- Long non-Latin text: Klein and Krea 2 make errors in long Japanese text and kanji prices, and P-H3-Image's own card warns of pseudo-text in small or dense text — [note.com](https://note.com/hikoza2045/n/n1252511b1bc9?hl=en); [P-H3 card](https://huggingface.co/PrunaAI/P-H3-Image)
- Setup and maintenance: memory budgets, quant choices, licensing homework and frequent model turnover. Example: the official Mage-Flow repo disappeared a week after launch — [Blog on removal](https://0dev.duckdns.org/en/posts/microsoft-removes-mage-flow-models-from-hugging-face)
- Licence-based loss for the single strongest open model: Qwen-2.1 is research-only without a separate deal, while gpt-image-2 is a hosted API — [Qwen licence](https://huggingface.co/Qwen/Qwen-Image-2.1/raw/main/LICENSE); [OrcaRouter](https://www.orcarouter.ai/blog/qwen-image-2-1-vs-gpt-image-2)

**Open-versus-open tests that help choose among local candidates (anecdotal, labelled as such)**
- Hausmer, Oct 23: FLUX 3 Klein vs Qwen-2.1 Turbo on an RTX 3080 over 118 prompts. Enhanced mode 26 Klein wins, 12 Qwen wins, 80 ties; raw mode 22, 18, 78. Klein was stronger on counting, style, hands and niche objects; Qwen on QR codes, tables and fine patterns; Qwen more reliable without enhancer on Cyrillic. Scoring used OCR and a Qwen3-VL-4B VQA judge — [Hausmer](https://hausmer.com/posts/flux-3-klein-vs-qwen-image/)
- AILocalabs, Oct 23-24: 8 GB laptop, five prompts, one seed each. Klein about 3.6× faster and used less VRAM. Qwen-2.1 missed two of five prompts on composition or lighting, but typeset Chinese more tidily. Small sample — [AILocalabs](https://ailocalabs.com/en/recipes/qwen-image-vs-flux-3-klein/)
- note.com, Oct 20: RTX 5090, Klein int8, Qwen-2.1 int8, MOSS SFT, Krea 2 Turbo FP8, Japanese text focus. Qwen-2.1 best for long text; Klein fastest; MOSS recommended by the author for long English or Chinese and layout specs; Krea 2 Turbo weakest for Japanese — [note.com](https://note.com/hikoza2045/n/n1252511b1bc9?hl=en)
- A buyer's guide (Oct 19) and a weekly roundup (Oct 18) both present MOSS-Image as the layout-control option. Neither measures anything, and the guide says outright that it cannot establish which model is faster or better — [Futurpulse](https://futurpulse.com/moss-qwen-and-flux-open-image-model-buyers-guide/); [Kombitz](https://www.kombitz.com/2026/10/18/flux-3-image-klein-moss-image-more-weekly-roundup/)

### Inferences
- For a game pipeline, the sensible split is local open models for style-consistent art, batch iteration, iconography without text, and anything needing a custom LoRA or fixed seeds, with text-heavy or complex-composition work done either on gpt-image-2 or composited in post.
- GenAI Showdown's attempt counts matter for a local workflow. A local run makes retries cheap, so 18 attempts costs time rather than money, but it also means reviewing every batch by hand. gpt-image-2's 1-2 attempts are a labour saving that the pass count alone understates.
- The 70% vs 30% preference implied by the leaderboards does not measure style-locked workflows. A LoRA-tuned local model could outperform an untuned gpt-image-2 on consistency for a specific art direction, but I found no test showing this.
- The Klein-versus-GPT Image 2 result of 24/32 vs 30/32 fits the leaderboard gap but comes from a small sample with no upsampler. The likely true gap for a properly upsampled Klein is smaller than Kingy's raw rate suggests, though that is untested.

### Gaps
- I found no controlled independent test of gpt-image-2 against any open model on game assets (sprites, tilesets, icons, character sheets), and none with LoRA-trained open models.
- No controlled independent text-accuracy test across gpt-image-2 and Qwen-2.1, Ideogram 4 or MOSS-Image. The closest are Arena's Text Rendering category and two text-bearing prompts on GenAI Showdown.
- No data on identity or character consistency across references between gpt-image-2 and top open models.
- gpt-image-2's own moderation, seed, resolution and reference limits are left to the researcher covering it. OpenAI's guide retrieved here focuses on 2.5 and 2.6.
- Long-term stability risk of permissive open checkpoints (repo removals, licence changes between versions) cannot be quantified. The move from Apache 2.0 at Qwen 2512 to a research licence at Qwen 2.1 is one data point — [Cellcog](https://cellcog.ai/blog/qwen-image-2-1/)
