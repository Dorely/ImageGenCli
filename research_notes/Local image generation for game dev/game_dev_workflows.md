# Local image generation for game asset production vs cloud (as of 2026-11-06)

Evidence labels: [primary] = vendor docs, model card, license or official body. [vendor] = a company selling a related product. [secondary] = blog or SEO guide. [anecdote] = individual dev report. Most game-specific evidence is vendor, secondary or anecdote. I found no controlled local-versus-cloud benchmark for game assets.

## Objective: per-asset fitness, local on 12 GB vs cloud

### Takeaway
On 12 GB, local is usable for card and background illustration, style-locked batches, and pixel art after post-processing. It stays weak for animation, autotile tilesets, and in-image text. Cloud's main edges are consistency without training, layout-heavy single sheets, and SVG/GIF output. License limits, not VRAM, decide many local choices: the strongest local transparency model (Qwen-Image 2.1) is non-commercial.

### Cited Findings
- The model name in the brief is out of date. OpenAI's guide lists `gpt-image-2` among earlier models, alongside GPT Image 2.5 and 2.6, each with Flare and Sunburst variants — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation) [primary]. A third party dates GPT Image 2.5 to September 8, 2026 — [OrcaRouter](https://www.orcarouter.ai/blog/gpt-image-2-5-vs-gpt-image-2) [secondary]. A separate search found no third-party coverage of 2.6, so its date is unknown.
- OpenAI's own listed limits: recurring characters or brand elements may not stay consistent, precise text placement and clarity can still be difficult, and layout-sensitive placement can be difficult — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation) [primary].
- `gpt-image-2` output at 1024x1024 costs $0.006 (low), $0.053 (medium) or $0.211 (high) per image — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation) [primary].
- Cloud model continuity is a real risk: OpenAI says `gpt-image-1` was shut down on October 23, 2026 — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation) [primary].
- Cloud requests can fail with `moderation_blocked`; the `moderation` parameter accepts `auto` or `low` — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation) [primary].

### Inferences
Verdicts are my judgment from the sections below, not benchmark results. "Commercial-safe" means the license allows it on the terms found here, for a solo dev under the revenue thresholds.

| Asset | Best commercial-safe local route on 12 GB | Expected cleanup | Where cloud still wins | Verdict |
|---|---|---|---|---|
| Card illustrations | FLUX.2 Klein 4B base + own style LoRA; FLUX.3 Image Klein; Z-Image; Illustrious for anime after a license check | Reject many, paint over hands and details, set text in engine | One-off complex scenes without training | Local good |
| Recurring characters | Own LoRA, then multi-reference edit for poses | Moderate; drift on costume details | Instant start from references | Local better at volume, cloud better for few |
| Cutout sprites and props | Generate on a plain background, BiRefNet (MIT), checkerboard QA | Hair and soft edges need hand fixes | Direct alpha on supported routes, capped near 1.5K | Roughly even for hard edges |
| Smoke, fire, glass | No strong commercial-safe option found; Qwen-Image 2.1 is non-commercial | High | Possibly cloud alpha, also warned as "dirty" | Both weak |
| Pixel art stills | Klein 4B base + pixel LoRA, k-centroid downscale, Pixel Snapper with fixed palette | Stray pixels and outlines by hand | Art direction, not grid | Local good; both need the same cleanup |
| Walk cycles and animation | Spritesheet LoRA as key poses | High; redraw frames | Single-pass sheets; GIF output is unevaluated | Both poor |
| Turnarounds | Qwen-Image-Edit-2511 or Klein multi-reference | Moderate to high | Faster start | Usable as draft |
| Icons and UI | Style LoRA, single icon per generation, quantize and vector-trace if needed | Moderate; alignment by hand | One-call icon batches, SVG output (unevaluated) | Cloud slightly ahead |
| In-image text, logos | Avoid; use the engine or a font. Z-Image and Qwen-Image-2512 for short titles only | High if text must be exact | Stronger starting point, still imperfect by OpenAI's own admission | Neither reliable |
| Seamless textures | Tiling nodes on SD-class models or an albedo-to-PBR node chain | Check 2x2 proof; roughness is an estimate | Little evidence either way | Local usable |
| Autotile tilesets | No proven route found | High; hand-assemble | No proven route found | Both poor |
| Backgrounds | Any current model; Qwen-Image-Layered for parallax separation | Low to moderate | Complex object layouts | Local good |

### Gaps
- No head-to-head test of local versus GPT Image 2.x on any game-asset type was found.
- OpenAI's output-ownership terms were not checked in this research.

## Character consistency

### Takeaway
At volume, a LoRA remains the dependable way to lock a style or character, and multi-reference edit models handle variations without training. On 12 GB, FLUX.2 Klein 4B is the one current family with official training support plus an Apache license. Reference images into GPT Image give the fastest start, but OpenAI itself warns they may not hold consistency.

### Cited Findings
**LoRA training on 12 GB, by family**

| Family | Works on 12 GB? | Evidence |
|---|---|---|
| SDXL, Illustrious, NoobAI | Yes | 12 GB BF16, 4 GB NF4 — [LoRAlab](https://github.com/AcademiaSD/AcademiaSD_LoRAlab-TrainerStudio) [secondary]; kohya_ss with sd-scripts is the usual route — [Airmore](https://airmore.ai/lora-training-guide.html) [secondary] |
| Anima | Yes | 4 GB NF4, 6 GB BF16 — [LoRAlab](https://github.com/AcademiaSD/AcademiaSD_LoRAlab-TrainerStudio) |
| FLUX.2 Klein 4B | Yes, officially, but disputed in practice | 12 GB VRAM (RTX 3060 example) with 32 GB RAM — [BFL help](https://help.bfl.ai/articles/7108141705-can-i-run-or-fine-tune-flux-2-klein-locally) [primary]. An August 2026 guide called small-card training unproven — [LocalAIMaster](https://localaimaster.com/blog/ai-toolkit-lora-training-guide) [secondary] |
| FLUX.2 Klein 9B | Officially no | About 22 GB VRAM and 64 GB RAM — [BFL help](https://help.bfl.ai/articles/7108141705-can-i-run-or-fine-tune-flux-2-klein-locally) [primary]. Community NF4 route claims 12 GB — [LoRAlab](https://github.com/AcademiaSD/AcademiaSD_LoRAlab-TrainerStudio) |
| FLUX.2 Dev | Not practically | No reference config; 24 GB is an estimated floor with aggressive quantization and offload, 32 GB+ comfortable — [LocalAIMaster](https://localaimaster.com/blog/ai-toolkit-lora-training-guide) [secondary] |
| FLUX.3 Image Klein | Community route | 8 GB with NF4 — [LoRAlab](https://github.com/AcademiaSD/AcademiaSD_LoRAlab-TrainerStudio); AI Toolkit support from release, no official training VRAM found — [BFL](https://bfl.ai/blog/flux-3-image-klein) [primary] |
| Z-Image | Community route | 8 GB NF4 — [LoRAlab](https://github.com/AcademiaSD/AcademiaSD_LoRAlab-TrainerStudio). No AI Toolkit reference config; plausible on 16 GB but unverified — [LocalAIMaster](https://localaimaster.com/blog/ai-toolkit-lora-training-guide). Train on the Base model — [Airmore](https://airmore.ai/lora-training-guide.html) |
| Qwen-Image 2512, Edit 2511 | Community route | NF4 with block swap: about 4 GB at 512², 8 GB for edit at 1024² — [LoRAlab](https://github.com/AcademiaSD/AcademiaSD_LoRAlab-TrainerStudio). AI Toolkit's Qwen-Image reference is 24 GB with 3-bit quantization, and its Edit target is 32 GB — [LocalAIMaster](https://localaimaster.com/blog/ai-toolkit-lora-training-guide) |
| Qwen-Image 2.1 | Community route, non-commercial | 8 GB — [LoRAlab](https://github.com/AcademiaSD/AcademiaSD_LoRAlab-TrainerStudio) |
| Krea 2 | Community route | 8 GB from NF4 weights — [LoRAlab](https://github.com/AcademiaSD/AcademiaSD_LoRAlab-TrainerStudio); the 1024px BF16 example does not fit a 24 GB 3090 — [Airmore](https://airmore.ai/lora-training-guide.html) |
| Ideogram 4 | Community route | 12 GB, 16 GB for CFG previews — [LoRAlab](https://github.com/AcademiaSD/AcademiaSD_LoRAlab-TrainerStudio) |

**Training time**
- Klein LoRA: roughly 1 to 3 hours on a consumer GPU — [BFL help](https://help.bfl.ai/articles/7108141705-can-i-run-or-fine-tune-flux-2-klein-locally) [primary]. About one hour on an RTX 4090 for a 4B run — [Hugging Face/BFL](https://huggingface.co/blog/black-forest-labs/flux-2-klein-lora) [primary].
- RTX 5080 measurements in NF4: FLUX.1 Dev 800 steps at 512² in about 16 minutes; Qwen-Image 2.1 500 steps in about 9 min 20 s; Qwen-Image 2512 at 5.7 s/step at 1024² — [LoRAlab](https://github.com/AcademiaSD/AcademiaSD_LoRAlab-TrainerStudio) [secondary].
- Dataset guide: 20–50 distinct images for one character, with an example totalling about 1,000 steps. Styles need a broader mix of subjects — [Airmore](https://airmore.ai/lora-training-guide.html) [secondary].
- Musubi's general guidance is at least 12 GB for image training plus 64 GB system RAM — [Airmore](https://airmore.ai/lora-training-guide.html) [secondary].
- Conflict on 12 GB: BFL says Klein 4B trains on 12 GB, and its guide calls AI Toolkit optimized for 12 GB+ consumer GPUs — [BFL docs](https://docs.bfl.ml/flux_2/flux2_klein_training) [primary]. As of August 16, 2026, one guide reported nothing in AI Toolkit's examples folder below 24 GB, no Klein training reference, and advised 8–12 GB owners to "train in the cloud, generate at home" — [LocalAIMaster](https://localaimaster.com/blog/ai-toolkit-lora-training-guide) [secondary].

**Multi-reference edit models**
- Reference limits: Qwen-Image 2.1 up to 10 — [Qwen card](https://huggingface.co/Qwen/Qwen-Image-2.1) [primary]. FLUX.3 Image Klein up to 10 — [BFL](https://bfl.ai/blog/flux-3-image-klein) [primary]. FLUX.2 Klein up to 4 — [MyAIForce](https://myaiforce.com/qwen-image-2-1/) [secondary].
- In one side-by-side test, Qwen-Image 2.1 preserved face, dress detail and pose better. Klein was better at lighting, shadows and scene integration, but its identity drifted more. The test used a photoreal woman, not stylized game art — [MyAIForce](https://myaiforce.com/qwen-image-2-1/) [secondary].
- The same author found BF16 clearly better than FP8 for Qwen editing — [MyAIForce](https://myaiforce.com/qwen-image-2-1/) [secondary].
- Qwen-Image-Edit-2511 claims significantly improved character consistency and bundles new-viewpoint LoRA effects. It is Apache 2.0 with 20B parameters and no stated VRAM — [Qwen card](https://huggingface.co/Qwen/Qwen-Image-Edit-2511) [primary, no benchmark]. Its BF16 weights are reported at over 40 GB — [Diffusion Doodles](https://diffusiondoodles.substack.com/p/qwen-image-edit-vs-flux1-kontext) [secondary].
- A user report shows Qwen-Image 2.1 int8 on an RTX 4070 Ti with 64 GB RAM: 1 MP edit in 57 s and 4 MP text-to-image in 121 s — [ComfyUI Models](https://comfyuimodels.com/qwen-image-2-1/low-vram) [anecdote]. Another review says about 28 GB fully loaded and that 8–12 GB cards need rented compute — [MindStudio](https://www.mindstudio.ai/blog/qwen-image-2-1-hands-on-review) [secondary]. The difference appears to be quantization and offload.
- FLUX.3 Image Klein runs from 8 GB in INT8. BFL's RTX 4070 figures with 16 steps are 8.9 s to generate and 18.9 s to edit at 1K — [VentureBeat](https://venturebeat.com/technology/black-forest-labs-opens-flux-3-image-klein-weights-with-free-commercial-use-limited-to-smaller-businesses). BFL's quality charts lack published method details, per the same article.

**Cloud comparison**
- `gpt-image-2` processes all image inputs at high fidelity, which can raise input-token use on reference edits — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation) [primary].
- An approved sprite passed as a reference improves pose consistency over re-prompting, but it is "not frame-perfect" — [AgentBrush](https://agentbrush.dev/blog/2d-game-asset-generation) [vendor].
- A real failure: Vapor World: Over The Mind swapped in AI cutscenes where the character model shifted shot to shot. It drew mostly negative reviews and the cutscenes were removed — [IndieForGames](https://indieforgames.com/steam-ai-art-backlash/) [secondary].

### Inferences
- For a 12 GB card, start with a style LoRA on FLUX.2 Klein 4B base. Then use multi-reference edits for variations and judge drift against a character sheet.
- FLUX.3 Image Klein may become the better 12 GB option, since it has more references and less VRAM pressure. It is only three weeks old and its license needs reading first.
- Expect about 1–3+ hours per Klein 4B LoRA on 12 GB, and about an hour or less on 16–24 GB. This extrapolates from the figures above and is not a measured 12 GB result.
- A practical hedge is to try one 12 GB Klein 4B run first. If it is too slow or unstable, rent a 24 GB GPU for training only and keep generation at home. The resulting LoRA should run locally either way.
- Cloud is more convenient for a handful of assets. A LoRA pays off once a project needs dozens or hundreds of assets in one style.

### Gaps
- No user timing was found for a current-model LoRA on a real 12 GB card.
- All sub-12 GB claims for Qwen, Krea, Z-Image and FLUX.3 come from one community project. The quality effect of 4-bit training is unmeasured.
- I found no 2026 evaluation of IP-Adapter or PuLID on current models. PuLID was not covered by any source I read. IP-Adapter appeared only as a dependency of an SDXL sprite project — [pixel-sprite-lab](https://github.com/steven2711/pixel-sprite-lab).
- No test of reference workflows on stylized game characters was found.

## Transparent assets

### Takeaway
Generating on a plain background and running BiRefNet (MIT) is the safest commercial local route. Native RGBA from Qwen-Image 2.1 looks best in reviews but is non-commercial. Cloud alpha now exists but varies by route, caps near 1.5K, and also leaves dirty soft edges.

### Cited Findings
- **BiRefNet:** MIT license, foreground extraction, with an inference example at 1024×1024 that writes the mask to alpha — [BiRefNet card](https://huggingface.co/ZhengPeng7/BiRefNet) [primary].
- **RMBG-2.0:** built on BiRefNet, CC BY-NC 4.0; commercial use needs a BRIA agreement — [RMBG-2.0 card](https://huggingface.co/briaai/RMBG-2.0/blob/refs%2Fpr%2F6/README.md) [primary]. It is a common ComfyUI default and a shipping trap.
- **LayerDiffuse:** a ComfyUI port exists and its transparent-generation mode is described as robust, but the guides found target SDXL-era setups. Output arrives as a separate image and mask — [mybyways](https://www.mybyways.com/blog/generate-transparent-images-with-layer-diffusion) and [RunComfy](https://www.runcomfy.com/sv/comfyui-workflows/generating-transparent-images-with-layerdiffuse-in-comfyui) [older, secondary].
- **Qwen-Image-Layered:** Apache 2.0, 20B parameters, decomposes an image into a variable number of RGBA layers, recommends resolution 640 with a 1024 bucket, and gives no VRAM figure — [Qwen card](https://huggingface.co/Qwen/Qwen-Image-Layered) [primary]. Complex items can split across layers, and hair, smoke and glass are harder — [qwen-image.net](https://qwen-image.net/blog/qwen-image-layered) [unofficial].
- **Qwen-Image 2.1:** native transparency in the official card — [Qwen card](https://huggingface.co/Qwen/Qwen-Image-2.1) [primary]. A fire phoenix came out clean on the first attempt — [MindStudio](https://www.mindstudio.ai/blog/qwen-image-2-1-hands-on-review) [secondary]. The same side-by-side found true alpha from Qwen and only a visual removal from Klein — [MyAIForce](https://myaiforce.com/qwen-image-2-1/) [secondary].
- **Qwen-Image 2.1 license:** "You shall not use the Materials for any commercial purpose without obtaining a separate commercial license" — [Qwen license](https://huggingface.co/Qwen/Qwen-Image-2.1/blob/main/LICENSE) [primary].
- **Dev experience with local alpha:** prompted transparency was unstable, and BiRefNet_toonout was the high-quality route for anime. Hair kept background color and a faint haze, and early hand fixes took minutes per image, which could be slower than drawing. The fix was to preview every candidate on a checkerboard — [TK on note.com](https://note.com/dn0288/n/n3bcb659b677a?hl=en), June 2026 [anecdote].
- Background removal works well on pixel art because edges are sharp, and generating first then removing is recommended over relying on generator alpha — [AgentBrush](https://agentbrush.dev/blog/2d-game-asset-generation) [vendor].
- **Cloud status:** OpenAI's guide lists transparent, opaque or automatic backgrounds, using `background: "transparent"` with PNG or WebP. The portion I read did not name which models qualify — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation) [primary].
- `gpt-image-2` lacked transparency at launch, and Cloudflare's page pointed to `gpt-image-1.5` — [Cloudflare docs](https://developers.cloudflare.com/ai/models/openai/gpt-image-2/). A preview was reportedly announced on August 20, 2026 — [ChatImg](https://chatimg.ai/en/blog/gpt-image-2-transparent-background) [vendor]. GPT Image 2.5 reportedly made it a first-class parameter from launch — [OrcaRouter](https://www.orcarouter.ai/blog/gpt-image-2-5-vs-gpt-image-2) [secondary, single source].
- ChatImg's probe: fal.ai returned RGB with no alpha despite the flag. Another route returned real RGBA at 1225×1284. Transparent output caps near 1.5K, and fine hair or frosted glass can leave "dirty alpha" — [ChatImg](https://chatimg.ai/en/blog/gpt-image-2-transparent-background) [vendor; official endpoint not measured].

### Inferences
- Default local pipeline: plain background, BiRefNet, checkerboard contact sheet, then hand-fix only the selected assets.
- Cloud's alpha advantage is smaller than expected. It removes a pipeline step, but alpha must be verified per route, and 4K is not available with it.
- Audit every workflow for RMBG-2.0 before shipping.
- Qwen-Image-Layered is better suited to splitting a composed scene, such as parallax backgrounds, than to cutting out sprites.

### Gaps
- No controlled edge-quality comparison of BiRefNet, Qwen RGBA and OpenAI alpha was found.
- Qwen-Image 2.1 RGBA mode was not specifically reported on a 12 GB card.
- No current evidence covers LayerDiffuse on Illustrious or FLUX, or the licenses of BEN2 and BiRefNet_toonout.
- One search summary mentioned the Responses API tool returning white fill rather than alpha. I could not tie that to a page I read.

## Pixel art and sprites

### Takeaway
No model, local or cloud, reliably gives a true pixel grid. Real sprites come from generate, downscale, snap, quantize, then hand-fix. Single sprites work; animation remains the hard limit everywhere.

### Cited Findings
- **Cloud measurement:** a `gpt-image-2` 32×32 request returned 44,725 unique colors, with about 2% of color changes on the true grid. After conversion it reached 12 colors and 100% alignment. Recommended cleanup is nearest-neighbor downsampling, median-cut quantizing without dither, then hand-fixing strays — [Rangy](https://rangy.ai/blog/ai-pixel-art/), August 14, 2026 [vendor, one image].
- **Pixel Snapper:** MIT license, built to fix AI pixel art. It has a CLI with directory batch mode, color count, `--pixel-size` override and fixed `--palette` — [GitHub](https://github.com/Hugo-Dz/spritefusion-pixel-snapper) [primary]. ComfyUI wrappers exist — [comfy.icu](https://comfy.icu/node/SpriteFusionPixelSnapper).
- **ComfyUI-PixelArt-Detector** handles downscaling and palette changes for SDXL output — [GitHub](https://github.com/dimtoneff/ComfyUI-PixelArt-Detector).
- **svntax-dev spritesheet LoRA:** FLUX.2 Klein base 4B, Apache 2.0 tag, trained on sheets edited from a CC BY 4.0 template. It generates a 4×4 grid at 512² with 12 walk frames and 4 special poses, then downscales 4x to 128² with k-centroid. The author warns against the distilled model, which "ruins the quality of the pixels and the consistency." Known faults are cut-off hair or headwear, poor non-human anatomy and an inconsistent back-view row — [Hugging Face](https://huggingface.co/svntax-dev/pixel_spritesheet_4walk_small_lora_v1) [primary for the LoRA; author calls it "a first attempt"].
- **Other LoRAs:** [Mystic07 spritesheet](https://huggingface.co/Mystic07/flux-lora-spritesheet) targets 9B per search results, which carries the non-commercial issue. [Limbicnation pixel-art](https://huggingface.co/Limbicnation/pixel-art-lora) targets distilled 4B for single sprites. Civitai options include [MOSS Pixel Art](https://civitai.com/models/3024672/moss-pixel-art) and [Pixel Art Assets](https://civitai.com/models/2732245/pixel-art-assets-general), and I did not test or license-check them.
- **SDXL route:** pixel-sprite-lab uses a pixel-art LoRA with OpenPose and IP-Adapter, then downscales to 24×32 and quantizes to 16 colors — [GitHub](https://github.com/steven2711/pixel-sprite-lab). Out-of-the-box ComfyUI pixel output lacks a cohesive game look — [Kokutech](https://www.kokutech.com/blog/gamedev/tips/art/pixel-art-generation-with-comfyui) [anecdote].
- **Small sizes:** 16×16 and 32×32 sprites often need human cleanup — [Apatero](https://apatero.com/blog/generate-clean-spritesheets-comfyui-guide-2025) [secondary]. Below about 16×16 output tends to look like downscaled illustration, and exact hex palettes are unreliable without a quantize pass — [AgentBrush](https://agentbrush.dev/blog/2d-game-asset-generation) [vendor].
- **Animation:** sequential animation is "the current hard limit," and multi-frame output is best treated as key poses — [AgentBrush](https://agentbrush.dev/blog/2d-game-asset-generation) [vendor]. GPT Image 2.5 holds design and palette across sheet cells, but stride and costume drift in walk cycles and hands are unreliable — [VidCella](https://vidcella.ai/posts/gpt-image-2-5-sprite-sheets) [vendor, informal evidence].
- GPT Image 2.6 supports animated GIF output through the Image API — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation) [primary]. I found no independent evaluation.
- **Hosted specialists:** Retro Diffusion offers walk, run and idle animation — [Ludo](https://ludo.ai/compare/best-ai-pixel-art-generators) [vendor comparison]. One dev used local SD 1.5 concepts, then PixelLab's API for 8-direction 64×64 sprites, with hard spend caps — [Skaldborn](https://www.skaldborn.com/devlog/05-comfyui-setup/), May 2026 [anecdote].

### Inferences
- Pixel post-processing is the same local or cloud, so local loses little here. Pin one project palette and run the snapper in batch.
- Plan on human animation. Use AI for the base character and key poses, and redraw frames in Aseprite or a similar editor.
- If a project needs many directional or animated sprites, a hosted specialist may beat both local and general cloud models. It is not a local option and no independent test confirms this.
- Turnarounds should be treated as drafts. New-viewpoint edits exist, but no pixel-specific evidence backs them.

### Gaps
- No independent test measured frame-to-frame consistency for any local spritesheet LoRA.
- The kellerbier local pipeline PR surfaced in search but returned 404 when fetched, so it is not used here.
- Licenses and training data of the Civitai pixel LoRAs were not verified.

## Card art, UI, icons and text

### Takeaway
Card illustrations are the best local fit: a single image, no alpha, and a style LoRA holds the set together. Exact text and logos are unreliable in every model, so game text belongs in the engine. Icon sets are workable but less proven, and the best evidence for them is cloud-side and vendor-reported.

### Cited Findings
- **Text claims:** Z-Image-Turbo claims accurate Chinese and English text — [Z-Image card](https://huggingface.co/Tongyi-MAI/Z-Image-Turbo) [primary, no benchmark]. Qwen-Image-2512 claims better text accuracy and layout — [Qwen card](https://huggingface.co/Qwen/Qwen-Image-2512) [primary, no benchmark].
- Ideogram 4.0 claims frontier-grade text and native bounding-box placement for logos and headlines — [Ideogram](https://ideogram.ai/news/ideogram-4.0/) [vendor]. Its license is disputed; see the legal section.
- FLUX.3 Image Klein's launch post makes no specific text-rendering claim — [BFL](https://bfl.ai/blog/flux-3-image-klein) [primary].
- **Cloud text:** OpenAI says text has improved but precise placement and clarity can still be difficult — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation) [primary].
- **Icons and UI:** a batch of inventory icons came from one call, and button states as a strip could be sliced like a sheet, using `gpt-image-2` — [AgentBrush](https://agentbrush.dev/blog/2d-game-asset-generation) [vendor].
- GPT Image 2.6 supports SVG output through the Image API, and markup-guided edits — [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation) [primary]. I found no local equivalent and no independent evaluation.
- **Card games in the market:** Hardest, a card roguelike with largely AI card and character art, had mixed-to-negative reviews and its developer announced delisting in January 2026 — [PC Gamer](https://www.pcgamer.com/games/indie-dev-is-delisting-his-ai-game-from-steam-because-his-new-girlfriend-convinced-him-its-evil-the-game-existing-in-its-current-form-is-a-disgrace-to-all-game-makers-and-players/).
- Deck Beasts discloses AI use for placeholder card art — [Steam](https://store.steampowered.com/app/5004310/Deck_Beasts/). Beyond Words replaced its early AI art after criticism — [Wikipedia](https://en.wikipedia.org/wiki/Beyond_Words_(video_game)).

### Inferences
- For a card game: generate frameless art at a fixed aspect ratio with one style LoRA, and keep frames, costs, names and rules text as engine or template layers. This also adds human-authored arrangement for copyright purposes.
- Make icons one per generation on a fixed template, with a shared palette pass. Batch-on-one-sheet is the cloud route, and it may lose consistency across separate calls.
- Logos should be human-finished regardless. Treat any model output as a concept, because a final mark needs clean vectors and clear rights.
- Card art is what players look at most, which is where the review and backlash risk concentrates.

### Gaps
- I found no independent text-accuracy benchmark across Qwen, Z-Image, Ideogram, FLUX.3 Klein and GPT Image 2.x.
- I found no test of consistent local icon-set production, and no technical post-mortem of AI card art.

## Tilesets, seamless textures, PBR and backgrounds

### Takeaway
Seamless albedo plus estimated PBR maps is usable locally through ComfyUI node packs, though the strongest end-to-end option (CHORD) is research-only. Autotile tilesets have no proven route. Backgrounds are the easiest category, and I found little to separate local from cloud.

### Cited Findings
- **Tiling at generation:** ComfyUI-seamless-tiling applies circular padding to UNet and VAE Conv2d layers — [RunComfy](https://www.runcomfy.com/comfyui-nodes/ComfyUI-seamless-tiling). A latent-space node claims Flux support, on a marketing-style page — [ComfyAI](https://comfyai.run/custom_node/ComfyUI-seamless_latent_tiling) [unverified].
- **Tiling after generation:** ComfyUI-Texture-Simple has a Make Texture Tileable node with a 2×2 proof, seam report and WebGL preview — [GitHub](https://github.com/gokayfem/ComfyUI-Texture-Simple).
- **PBR from an image:** ComfyUI-TextureAlchemy builds PBR sets with Marigold or Lotus, plus a tiling maker and tiler test — [GitHub](https://github.com/amtarr/ComfyUI-TextureAlchemy). ComfyUI-QFX-PBRGenerator uses Marigold appearance and lighting models to remove baked lighting, with seamless, mirror and replicate modes — [GitHub](https://github.com/qornflex/ComfyUI-QFX-PBRGenerator).
- **CHORD:** Ubisoft's text-to-tileable-PBR workflow outputs base color, normal, roughness, metalness and height — [RunComfy](https://www.runcomfy.com/comfyui-workflows/chord-model-workflow-in-comfyui-pbr-material-generation). Weights and code are research-only — [Comfy blog](https://blog.comfy.org/p/ubisoft-open-sources-the-chord-model) [primary].
- **Flux chain:** a FLUX, tileable LoRA, seamless tile, normal, roughness, ORM chain is described by one blog; no specific LoRA was confirmed — [StraySpark](https://www.strayspark.studio/blog/comfyui-game-asset-pipeline-indie-2026) [vendor, single source].
- **Tilesets:** isometric ground tiles have "imprecise" seam alignment, and autotile is not covered — [AgentBrush](https://agentbrush.dev/blog/2d-game-asset-generation) [vendor, cloud-based].
- **Layered backgrounds:** Qwen-Image-Layered can separate images into editable RGBA layers — [Qwen card](https://huggingface.co/Qwen/Qwen-Image-Layered) [primary].

### Inferences
- Circular padding reaches little inside transformer models such as Flux and Z-Image, so tiling is more dependable on SD-class models or as a post-process. This is my reasoning and I found no direct test.
- Treat CHORD as evaluation only, unless Ubisoft grants other terms.
- Estimated roughness and metalness are plausible rather than physically measured, so they need checks in the engine.
- For 2D tilesets, generate reference terrain, then hand-build the autotile template. This is likely the realistic path until a tested tool appears.
- Separating backgrounds into layers could give cheap parallax. No game test of this was found.

### Gaps
- Marigold's weight licenses were not confirmed, nor were TextureAlchemy's and QFX's dependencies.
- No test compared tiling methods on current DiT models.
- No credible local autotile or Wang-tile workflow was found, and no cloud-versus-local background test.

## Tooling

### Takeaway
For scriptable batch generation from code, ComfyUI run headless over its HTTP API is the best fit, with local `comfy-mcp` for agents. Use Krita AI Diffusion for hand-fixing and inpainting on the same backend. Pin versions, because new-model support in ComfyUI still breaks.

### Cited Findings
- **ComfyUI API:** `POST /prompt` queues a workflow and returns a `prompt_id`. Also available: `GET /history/{prompt_id}`, `POST /upload/image`, `/ws` for progress, and `GET /object_info` — [ComfyUI docs](https://docs.comfy.org/development/comfyui-server/comms_routes) [primary].
- **Comfy MCP:** announced June 2026 — [ComfyUI Wiki](https://comfyui-wiki.com/en/news/2026-06-30-comfy-mcp-agent-integration). Local `comfy-mcp` wraps `comfy-cli`, runs free except partner models, and has `run_workflow`, `job_status`, `fetch_outputs`, `validate_workflow` and live node and model search. ComfyUI must already be running — [Comfy docs](https://docs.comfy.org/agent-tools/mcp) [primary].
- Batch tools (`submit_batch`, up to 50 jobs per call) are documented only for the cloud connection — [Comfy docs](https://docs.comfy.org/agent-tools/mcp) and [Comfy blog](https://blog.comfy.org/p/batch-generation-in-comfy-mcp-use) [primary].
- Community options include [artokun/comfyui-mcp](https://github.com/artokun/comfyui-mcp), which advertises 178 tools and parameter sweeps, and [comfyui-mcp on PyPI](https://pypi.org/project/comfyui-mcp/). Neither was tested.
- **Fragility:** the stock ComfyUI-GGUF loader cannot load Qwen-Image 2.1 GGUFs, so a fork or Comfy-Org int8 files are needed. Edits ignored prompts on v0.42.0 on one 8 GB laptop, with a fix not yet released as of v0.42.5 — [ComfyUI Models](https://comfyuimodels.com/qwen-image-2-1/low-vram) [anecdote].
- A real local pipeline hit VAE-decode out-of-memory errors, a wrong CPU-only PyTorch wheel, a token failure that silently returned an HTML login page, and background processes being reaped — [Skaldborn](https://www.skaldborn.com/devlog/05-comfyui-setup/) [anecdote].
- **SwarmUI:** JSON API via `GetNewSession` and `GenerateText2Image` with an `images` count, WebSocket variants, `/ComfyBackendDirect/` passthrough, and separate Grid Generator and Image Batch Tool extensions — [SwarmUI API docs](https://github.com/mcmonkeyprojects/SwarmUI/blob/master/docs/API.md) [primary]. MIT license, listed as supporting FLUX.2, Qwen Image 2.1 and Krea 2. The last tagged release was 0.9.8-Beta in February 2026, with fixes shipped on master — [AwesomeOSAI](https://awesomeosai.com/self-hosted/image-generation), September 2026 [secondary].
- **Krita AI Diffusion:** ComfyUI backend, Flux 2, Z-Image, SDXL, Illustrious and edit models, with inpainting, regions and live painting. It recommends at least 6 GB — [GitHub](https://github.com/Acly/krita-ai-diffusion) [primary].
- **InvokeAI:** commercial product shut after key staff joined Adobe in October 2025, while the open-source project continues — [Softuts mirror](https://hn.jakechampion.name/reader/https://softuts.com/invokeai-commercial-platform-shuts-down-open-source-project-continues) [secondary]. Version 6.14.x supports FLUX.2 — [Tech Insider](https://tech-insider.org/run-flux-2-klein-invokeai-local-setup-2026/) [secondary].
- **Forge Neo:** the maintained Forge continuation on Haoming02's fork, AGPL-3.0, release 2.29.1 on September 21, 2026. It supports Klein 4B and 9B, Z-Image, Qwen-Image, Qwen-Image-Edit and Krea 2, but not FLUX.2 Dev. The original lllyasviel Forge has had no commits since June 2025 — [AwesomeOSAI](https://awesomeosai.com/self-hosted/image-generation) [secondary].
- **Upscalers:** 4x-UltraSharp is listed as CC-BY-NC-SA-4.0 — [community compilation](https://huggingface.co/easygoing0114/AI_upscalers) [secondary]. Skaldborn used 4xFoolhardyRemacri, with no license discussion — [Skaldborn](https://www.skaldborn.com/devlog/05-comfyui-setup/).

### Inferences
- Suggested stack: export API-format workflows into version control, drive `/prompt` from a Python job runner with a manifest (seed, model hash, LoRA, prompt), and run Pixel Snapper or BiRefNet as later steps.
- SwarmUI is the easier alternative if a simple parameters API is enough. It is less flexible for multi-step pipelines.
- Pin ComfyUI, custom-node commits and model hashes per game, and test a smoke workflow before each batch. Upgrade between projects, not during them.
- InvokeAI and Krita suit hands-on canvas work rather than scripted pipelines.

### Gaps
- reForge's status: no source found in this research.
- SeedVR2 and other current upscalers' licenses and game-texture fitness were not established. No permissive upscaler was validated, so check any choice on [OpenModelDB](https://openmodeldb.info/).
- Current InvokeAI maintainers and Krita's latest version were not confirmed from primary pages.

## Legal, commercial and platform issues

### Takeaway
Steam allows AI art but requires disclosure of pre-generated content that players consume, and the label correlates with weaker reviews. In the US, assume raw outputs carry no copyright; protection comes from human work and arrangement. The biggest game-specific trap is model licensing, as several popular local models bar or limit commercial use.

### Cited Findings
**Steam**
- Pre-generated content is content "created with the help of AI tools during development" that ships and is consumed by players. Valve evaluates it like other content. Live-generated content must also describe guardrails against illegal output — [Steamworks](https://partner.steamgames.com/doc/gettingstarted/contentsurvey) [primary].
- "Efficiency gains through the use of these tools is not the focus of this section." Developers also promise no illegal or infringing content, and consistency with marketing materials — [Steamworks](https://partner.steamgames.com/doc/gettingstarted/contentsurvey) [primary].
- The wording was narrowed in January 2026 — [PC Gamer](https://www.pcgamer.com/software/ai/steam-updates-ai-disclosure-form-to-specify-that-its-focused-on-ai-generated-content-that-is-consumed-by-players-not-efficiency-tools-used-behind-the-scenes/).
- Market data covering 65,287 Steam games: 51% of October 2026 releases disclosed AI, and 76% of disclosing Next Fest demos mentioned art. Positive reviews average 76.4% for AI games vs 81.5% for others. AI games were 42% of launches but about 12% of sales last quarter. 105 games removed their disclosure, more often among successful ones — [Sulka Haro](https://fragwyz.substack.com/p/half-of-new-steam-games-now-disclose), November 4, 2026 [independent analysis; revenue is a Boxleiter estimate]. The data is correlational.

**Other stores**
- itch.io has a searchable "AI Generated" tag without required disclosure on game pages. Epic, mobile and console stores lacked clear AI disclosure as of February 2026 — [The Conversation via Stuff](https://stuff.co.za/2026/02/12/are-video-game-developers-using-ai-players-want-to-know-but-the-rules-are-patchy/) [academic authors; nine months old].
- Google Play AI labeling reportedly became enforceable on April 15, 2026, and Apple's guideline 5.1.2(i) requires consent before sending personal data to third-party AI — [Promise Legal](https://blog.promise.legal/ai-game-assets-copyright-steam-disclosure-2026/) [law-firm blog]. Another source suggested a narrower Google scope, so verify directly.
- Epic: CEO Tim Sweeney opposes store AI labels — [VGC](https://videogameschronicle.com/news/epic-games-ceo-says-its-really-irresponsible-of-steam-to-make-studios-disclose-ai-use). No published Epic or GOG policy was found.

**US copyright**
- The Copyright Office's Part 2 report (January 29, 2025) covers copyrightability. Part 3 on training is still a pre-publication version from May 9, 2025 — [Copyright Office](https://www.copyright.gov/ai/) [primary].
- The report concludes "prompts alone do not provide sufficient control," and practical advice is to assume purely AI-generated assets are unprotected. *Zarya of the Dawn* kept protection for human text and arrangement but not the images — [Promise Legal](https://blog.promise.legal/ai-game-assets-copyright-steam-disclosure-2026/) [law-firm blog].
- The Supreme Court denied review in *Thaler v. Perlmutter* on March 2, 2026 — [Mayer Brown](https://www.mayerbrown.com/en/insights/publications/2026/03/supreme-court-denies-review-in-ai-authorship-case). That case involved an AI listed as sole author.
- *Allen v. Perlmutter* (600+ prompts) had no identified merits ruling as of August 12, 2026 — [RottenWiFi](https://rottenwifi.com/artist-appeals-copyright-denial-for-prize-winning-ai-generated-work-what-allen-v-perlmutter-could-decide/) [weak source]. A later ruling may exist.

**Model licenses (for shipping a sold game)**

| Model or tool | License found | Practical reading |
|---|---|---|
| FLUX.2 Klein 4B | [Apache 2.0](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B) | Safe |
| FLUX.2 Klein 9B | [FLUX Non-Commercial](https://huggingface.co/black-forest-labs/FLUX.2-klein-9B); BFL says local commercial use [needs a license](https://help.bfl.ai/articles/7108141705-can-i-run-or-fine-tune-flux-2-klein-locally) | Avoid. The [output clause is contested](https://huggingface.co/black-forest-labs/FLUX.2-klein-9B/discussions/24) |
| FLUX.3 Image Klein | [Kommunity: free under $5M revenue](https://bfl.ai/blog/flux-3-image-klein) | Likely fine for solo devs. The model card reportedly says this is ["not blanket permission for commercial fine-tuning or distribution"](https://eugfa.org/briefing/flux-klein-licence), and output review duties apply. Read before training LoRAs |
| Qwen-Image 2.1 | [Research License, non-commercial](https://huggingface.co/Qwen/Qwen-Image-2.1/blob/main/LICENSE) | Do not ship without a separate license |
| Qwen-Image-2512, Edit-2511, Layered | Apache 2.0: [2512](https://huggingface.co/Qwen/Qwen-Image-2512), [Edit](https://huggingface.co/Qwen/Qwen-Image-Edit-2511), [Layered](https://huggingface.co/Qwen/Qwen-Image-Layered) | Safe |
| Z-Image-Turbo | [Apache 2.0](https://huggingface.co/Tongyi-MAI/Z-Image-Turbo) | Safe |
| Krea 2 | [Community: free under $1M, derivatives named "Krea…" plus notice](https://canirun.ai/license/krea-2-community/) | Fine if small. Some third-party summaries also mention a 50-seat limit; check the [official license](https://krea.ai/krea-2-licensing) |
| Ideogram 4 | [Vendor says commercial license with tiers](https://ideogram.ai/news/ideogram-4.0/); third-party reviews (search-level, such as [VidCella](https://vidcella.ai/posts/ideogram-4-0-review)) say weights are non-commercial without one | Assume a paid license is needed |
| Illustrious XL | [FAIPL 1.0-SD](https://freedevproject.org/faipl-1.0-sd/) says output is not covered. Search-level secondary sources conflict, alleging monetization limits or a different license on later versions; the [official card](https://huggingface.co/OnomaAIResearch/Illustrious-xl-early-release-v0) was not opened | Check the exact version's license, and treat derived Civitai checkpoints separately |
| NoobAI XL | [Card bans commercialization including model-generated products](https://huggingface.co/Laxhar/noobai-XL-1.0) | Avoid, including derived checkpoints |
| RMBG-2.0 | [CC BY-NC 4.0](https://huggingface.co/briaai/RMBG-2.0/blob/refs%2Fpr%2F6/README.md) | Avoid; use BiRefNet (MIT) |
| CHORD | [Research-only](https://blog.comfy.org/p/ubisoft-open-sources-the-chord-model) | Do not ship |
| 4x-UltraSharp | [CC-BY-NC-SA per a compilation](https://huggingface.co/easygoing0114/AI_upscalers) | Verify, or avoid |

**LoRAs on third-party art**
- Under the FLUX 3 Klein license, users must reportedly review outputs for infringing content before distribution — [EuGFA](https://eugfa.org/briefing/flux-klein-licence) [summary of license].
- The svntax-dev LoRA is an example of a disclosed dataset, with CC BY 4.0 sources — [Hugging Face](https://huggingface.co/svntax-dev/pixel_spritesheet_4walk_small_lora_v1).

### Inferences
- Disclose any shipped AI art on Steam, including art that was later painted over, since Valve's wording covers content "created with the help of AI tools." Placeholders removed before release should not need it, based on the "ships" language, but this is my reading.
- A license gate in the pipeline helps: a manifest of model, LoRA and node hashes per asset. One mid-workflow non-commercial node can taint a batch, at least contractually.
- Train LoRAs only on your own, commissioned, CC0 or properly licensed art, and keep the dataset manifest. Avoid named-artist and franchise LoRAs. Steam's infringing-content promise applies regardless of the training method. CC BY training data may carry attribution duties, so credit it.
- Keep layered files and edit history to support claims on modified assets. Assume a competitor could reuse unmodified raw art.
- None of this is legal advice. A short lawyer review of the final model list is reasonable before launch.

### Gaps
- Whether any ruling in *Allen v. Perlmutter* came after August 2026.
- Current primary wording of Google Play, Epic and GOG policies.
- No primary or case source addressed LoRAs trained on third-party art for game assets. Promise Legal does not cover it. The legal analysis there is my own inference.
- The primary text of the FLUX Kommunity License and Ideogram licensing page was not read.

## Real-world evidence

### Takeaway
Credible, quantified post-mortems are rare: I found none reporting hours of cleanup for a shipped game. The available evidence is store-level data, a few named failures and replacements, and individual devlogs. Together they suggest AI art is common and viable to ship but carries a review penalty in visible assets.

### Cited Findings
- **Hardest:** released July 2025 with AI art and music, then developer Eero Laine announced delisting in January 2026 and may re-release with original assets. Mixed reviews — [PC Gamer](https://www.pcgamer.com/games/indie-dev-is-delisting-his-ai-game-from-steam-because-his-new-girlfriend-convinced-him-its-evil-the-game-existing-in-its-current-form-is-a-disgrace-to-all-game-makers-and-players/). The stated reason was ethical, so this is not a technical post-mortem.
- **Vapor World: Over The Mind:** about five people and about 100,000 wishlists. Launched August 19, 2026 with AI cutscenes whose character shifted between shots, took 64 mostly negative reviews, then removed them — [IndieForGames](https://indieforgames.com/steam-ai-art-backlash/) [secondary].
- **Skaldborn devlog:** SD 1.5 on a 4 GB laptop at 30–90 s per concept, with an estimate of 10–20 s on 12 GB+. FaceDetailer was needed for faces. Hosted PixelLab handled the 8-direction step — [Skaldborn](https://www.skaldborn.com/devlog/05-comfyui-setup/), May 2026 [anecdote; pipeline, not a shipped post-mortem].
- **Note.com devlog:** manual cutouts took minutes each, and generate-and-fix cycles could be slower than hand drawing until alpha QA was built in — [TK](https://note.com/dn0288/n/n3bcb659b677a?hl=en), June 2026 [anecdote].
- **StreamerVS devlog:** a solo dev describes slow, repeated sprite-edge cleanup — [mirlygames](https://mirlygames.itch.io/streamervs/devlog/1746309/sprite-cleanup-in-process) [anecdote; search-level].
- **Review effect:** the Bazzaz and Cooper study of 508,192 reviews found AI-disclosing games recommended 68.4% of the time vs 86.3% for procedurally generated games — [Sulka Haro](https://fragwyz.substack.com/p/half-of-new-steam-games-now-disclose) [secondary citation]. An analysis of 500+ games found a 25% higher negative-to-positive ratio — [IndieForGames](https://indieforgames.com/steam-ai-art-backlash/) [secondary].
- **Revenue:** excluding top titles, estimated revenue per AI game fell from about $13,700 to $7,200 as AI launches rose. The two biggest AI titles account for 83–92% of AI revenue in mature quarters — [Sulka Haro](https://fragwyz.substack.com/p/half-of-new-steam-games-now-disclose) [rough estimate].
- **Sentiment:** a GameDiscoverCo survey of about 3,800 players found 43% had no problem, 31% were negative and 8% would never buy — [Sulka Haro](https://fragwyz.substack.com/p/half-of-new-steam-games-now-disclose). In GDC's 2026 survey, 52% of professionals saw negative impact (64% in visual and technical art), and 36% used generative AI at work — [Hitmarker](https://hitmarker.net/news/over-50-of-game-developers-say-generative-ai-is-harming-the-industry-report-reveals-1635057) and [GDC](https://gdconf.com/article/gdc-2026-state-of-the-game-industry-reveals-impact-of-layoffs-generative-ai-and-more/).
- **What players object to:** visible creative work, unreviewed "slop" and undisclosed use, with little reaction to backend use — [IndieForGames](https://indieforgames.com/steam-ai-art-backlash/) [secondary opinion].

### Inferences
- Plan for an art director's workload rather than free art: selection, hand fixes and QA are the real labor, and they are where the time savings can vanish. I cannot put a reliable number on this.
- For a card game, card art is the primary visible asset, so budget for consistency QA and paint-overs. Alternatively, use AI for prototypes and replace hero art later, as Deck Beasts and Beyond Words suggest in different ways.
- The review gap may partly reflect low-effort games rather than the label itself, since the data is observational.

### Gaps
- No GDC talk, formal post-mortem or r/gamedev thread with measured cleanup hours was found. Reddit content was barely reachable through these tools.
- No named indie success attributing its art to local generation was found. IndieForGames names none, and absence here may reflect non-disclosure and search limits, not proof that none exist.
- The local-versus-cloud choice was not separately reported in any shipped-game case.
