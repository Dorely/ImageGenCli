# Hardware and upgrades: can this RTX 4070 PC run current local image models? (snapshot 2026-11-06)

Evidence labels used below: **[Vendor-measured]** BFL/NVIDIA/Comfy numbers. **[Independent-measured]** a named tester with stated settings. **[Community]** anecdotal firsthand posts. **[Estimate]** a publisher's calculated or unattributed number. **[Extrapolated]** my own scaling, not measured by anyone. User-supplied hardware facts are not cited: RTX 4070 12 GB with ~9.2 GB free, 200 W limit, driver 621.01, 9700X, 32 GB DDR5 at 4800, B650 PCIe 4.0 x16, Windows 10 22H2.

## 1. Measured times and memory on 12 GB cards; does 32 GB RAM cause swapping or failures?

### Takeaway
The only vendor-measured RTX 4070 number I could find is for a model newer than the brief's list: FLUX 3 Image Klein (released Oct 15, 2026) at 8.9 s for 1024x1024. That class of model, plus Z-Image Turbo, FLUX.2 klein and SDXL/Illustrious, is interactive on this PC. FLUX.2 dev, full Qwen-Image-Edit and HunyuanImage 3 are batch-only on 12 GB, at minutes per image (extrapolated). I found no firsthand test of 12 GB VRAM + 32 GB RAM on FLUX.2 dev. System RAM, more than VRAM, is the likely limit for that model and for HunyuanImage 3.

### Cited Findings

**Direct or vendor data for 12 GB cards**
- [Vendor-measured, relayed second-hand] FLUX 3 Image Klein, distilled, INT8, 16 steps, ComfyUI, from a BFL chart dated Oct 15, 2026 (columns: 1024² text-to-image / 1024² edit / 2048² text-to-image): RTX 4070 8.9 s / 18.9 s / 50.4 s; RTX 5070 7.7 s / 17.3 s / 44.4 s; RTX 5090 4.1 s / 7.2 s / 15.0 s; RTX PRO 6000 3.9 s / 6.2 s / 12.1 s — [LocalAIMaster reproducing the chart](https://localaimaster.com/blog/best-gpu-for-image-generation); 8.9 s at 16 steps confirmed by [Digital Applied](https://www.digitalapplied.com/blog/flux-3-image-klein-open-weights-8gb-gpu). I could not open the BFL or NVIDIA original.
- FLUX 3 Image Klein memory: the generator is 11.2 GB BF16 / 5.6 GB FP8. The vendor says INT8 runs on as little as 8 GB, but reference code peaks at 26–31 GB and has no INT8 path — [Braindetox](https://braindetox.kr/en/posts/flux_3_image_klein_open_weights_2026.html); [Xenospectrum](https://xenospectrum.com/en/flux-klein-local-image-generation/). Text encoder memory is unpublished, and 8 GB is a stated minimum rather than a comfortable setup — [Digital Applied](https://www.digitalapplied.com/blog/flux-3-image-klein-open-weights-8gb-gpu).
- [Independent-measured] FLUX.1-dev fp8, 20 steps, 1024², ComfyUI v0.42.1, warm mean of 3, tested Oct 20, 2026: RTX 3060 12 GB 63.91 s (0.33 it/s, ~56 images/h, peak 11,857 MiB). SDXL base, euler, 30 steps: RTX 3060 20.75 s (1.53 it/s) — [ComputingForGeeks](https://computingforgeeks.com/best-gpu-for-stable-diffusion-comfyui/). This is the best-documented test in this research, but it has no 4070 row.
- [Independent, low credibility] A Japanese table claims "measured" RTX 4070 12 GB results: FLUX.1 dev (20 steps) 15.2 s, schnell 3.2 s, SDXL 2.1 s, on an i9-14900K with 64 GB — [Jisaku](https://jisaku.com/posts/ai-bench-flux-sdxl-image-speed-2026). The same table lists the RTX 5070 as 16 GB (it is 12 GB) and gives the 4090 5.2 s, faster than ComputingForGeeks' 5090 at 8.84 s. Treat as an optimistic outlier.

**FLUX.2 klein**
- [Vendor-measured, RTX 5090 only, format unspecified] 9B distilled 4 steps ~2 s, 19.6 GB; 9B base 50 steps ~35 s, 21.7 GB; 4B distilled 4 steps ~1.2 s, 8.4 GB; 4B base 50 steps ~17 s, 9.2 GB — [Comfy blog](https://blog.comfy.org/p/flux2-klein-4b-fast-local-image-editing).
- [Estimate, model-derived] 9B on RTX 4070 FP8 + offload ~6.3 s; 4070 Super ~4.9 s; peak ~8–10 GB; GGUF Q4 ~9–11 GB; official transformer sizes FP8 ~9.4 GB, NVFP4 ~5.8 GB; system RAM 16 GB minimum, 24 GB+ recommended — [WillItRunAI](https://willitrunai.com/blog/flux-2-klein-9b-vram-requirements).
- [Community, conflicts with the estimate] 9B distilled Q8 GGUF: ~60 s at 4 steps and under 2 min at 6–8 steps. Hardware not stated; the only card the author names is an RTX 4060 Ti 16 GB — [Diffusion Doodles](https://diffusiondoodles.substack.com/p/flux2-klein-shrinking-flux2-dev). InsiderLLM also says klein GGUF Q5 takes about 60 s, with no hardware given — [InsiderLLM](https://insiderllm.com/guides/flux-locally-complete-guide/).
- GGUF is slower than native quantized formats: on an RTX 5090 at 2048px, NVFP4 is reported as 87% (Z-Image Turbo), 100% (FLUX.2 dev) and 118% (FLUX.1 dev) faster than GGUF Q8. These come from video chapter titles and the metric is not defined — [SECourses on dev.to](https://dev.to/furkangozukara/bf16-vs-gguf-fp8-scaled-nvfp4-speed-quality-compared-comfyui-cuda-13-gains-flux-2-klein-9b-59k7).

**FLUX.2 dev**
- Files: `flux2_dev_fp8mixed` 35.5 GB — [Comfy-Org repo](https://huggingface.co/Comfy-Org/flux2-dev/tree/main/split_files/diffusion_models); Mistral text encoder fp8 ~18 GB — [Comfy-Org repo](https://huggingface.co/Comfy-Org/flux2-dev/blob/main/split_files/text_encoders/mistral_3_small_flux2_fp8.safetensors). GGUF per one community README: Q4_K_M ~20.1 GB, Q5_K_M ~24.1 GB; Mistral Q4_K_M ~14.3 GB, Q3_K_M ~11.5 GB — [workflow README](https://hface.pages.dev/GegenDenTag/comfyUI-Flux2D-t2i-workflow/raw/main/README.md).
- Full model needs 90 GB VRAM to load, or 64 GB in lowVRAM mode. FP8 cuts VRAM 40%. ComfyUI weight streaming to system RAM extends capacity "with some performance loss" — [NVIDIA](https://blogs.nvidia.com/blog/rtx-ai-garage-flux-2-comfyui).
- Diffusers group offloading works with as little as 8 GB free VRAM but needs 32 GB free RAM. `low_cpu_mem_usage=True` drops that to ~10 GB RAM at a speed cost. A remote text encoder option also exists — [Hugging Face](https://huggingface.co/blog/flux-2).
- [Estimate] ~56 s at 28 steps on a 4090-class card; Q4_K_S peak ~22–24.6 GB. Figures are formula-based, accurate "to roughly a factor of two" — [LocalAIMaster calculator](https://localaimaster.com/tools/image-model-vram-calculator).
- [Community] RTX 5070 Ti 16 GB + 96 GB RAM, full 60 GB file in ComfyUI: 2–4 min for 1280x720, VRAM and RAM "almost full"; the 30 GB FP8 version is faster and uses less RAM (Apr 2026) — [HF discussion](https://huggingface.co/black-forest-labs/FLUX.2-dev/discussions/31).
- [Unattributed, probably unreliable] "60–80 s on 12 GB quantized" — [Botmonster](https://botmonster.com/ai/how-to-set-up-flux-2-dev-locally-in-2026/). Its 24/16/12 GB ranges (12–30, 40–55, 60–80 s) are identical to a table that InsiderLLM explicitly labels FLUX.1 Dev — [InsiderLLM](https://insiderllm.com/guides/flux-locally-complete-guide/).

**Qwen-Image and Qwen-Image-Edit**
- [Measured, RTX 4090D for the native table; GGUF table's GPU not stated] fp8 (20.4 GB file) 86% VRAM: ≈94 s first, ≈71 s after; with 8-step LoRA ≈55 s then ≈34 s; distilled ≈69 s then ≈36 s; GGUF Q4_K_S 56% VRAM: ≈135 s then ≈77 s; with 8-step LoRA ≈100 s then ≈45 s. Resolution not given — [ComfyUI Wiki](https://comfyui-wiki.com/en/tutorial/advanced/image/qwen/qwen-image).
- [Unverified] RTX 4070 Q4_K_M (13.1 GB file): 30 steps ~45 s at 1024², ~70 s at 1328²; 4-step Lightning ~8 s and ~12 s. No test method given, and it lists ~14 GB VRAM for a tier it calls comfortable on 12 GB — [dev.to guide](https://dev.to/gary_yan_86eb77d35e0070f5/qwen-image-2512-gguf-complete-guide-to-running-ai-image-generation-on-consumer-hardware-1l6c). These are hard to square with the 4090D's 77 s above.
- [Estimate] Qwen-Image GGUF Q4_K_S ~15.0 GB peak, FP8 ~22.9 GB, 20 steps ~25 s on 4090 class; Qwen-Image-Edit-2509 ~100 s at 40 steps with true CFG 4.0 — [LocalAIMaster calculator](https://localaimaster.com/tools/image-model-vram-calculator).
- Qwen-Image 2.1 reportedly uses ~27–30 GB VRAM fully loaded — [MindStudio](https://www.mindstudio.ai/blog/qwen-image-2-1-local-install).

**Z-Image Turbo**
- Files: BF16 ~12 GB, FP8 ~6 GB, Qwen 3 4B text encoder ~7 GB. Minimum VRAM BF16 14–16 GB, FP8 8 GB, GGUF 5–6 GB; RTX 4090 ~2.3 s at 8 steps (third-party review figure) — [Thunder Compute](https://www.thundercompute.com/blog/z-image-turbo-comfyui).
- [Estimate] 15–30 s on a 12 GB card with 32 GB RAM recommended — [HF GGUF page](https://huggingface.co/felipedpm/z-image-turbo-GGUF-confyui). Q4_K_M ~6.9 GB peak, ~3 s on 4090 class — [LocalAIMaster calculator](https://localaimaster.com/tools/image-model-vram-calculator). Tongyi publishes no consumer-GPU timing — [LocalAIMaster](https://localaimaster.com/blog/z-image-turbo-comfyui).

**HunyuanImage 3**
- [Community port, measured on RTX 4090/3090 with 188 GB RAM] Full Instruct W4A8 (43.6 GiB file): ~5 min 08 s at 1024², 50 steps on a 4090, ~1 min 30 s with the Spectrum node; ComfyUI held ~50 GB system RAM. Instruct-Distil W4A8: 8 steps ~26 s, and "runs within 12 GB, about 15–20% slower" — [HF port](https://huggingface.co/PedroMarinhoDev/HunyuanImage-3.0-Instruct-ComfyUI).

**HiDream**
- HiDream-I1 GGUF: Q4 ~12 GB VRAM, Q2 ~8 GB — [ComfyUI Wiki](https://comfyui-wiki.com/en/tutorial/advanced/image/hidream/i1-t2i). Dev recommended 32 GB RAM, four text encoders — [Innovatopia](https://innovatopia.jp/ai/gen-ai-guide/61471/). HiDream-O1 estimate of 15–25 s on 12 GB is explicitly speculative — [SpecPicks](https://specpicks.com/reviews/hidream-o1-image-open-weights-text-to-image-news-2026).

**System RAM behavior**
- ComfyUI Dynamic VRAM is on by default for NVIDIA on Windows/Linux. Safetensors load as uncommitted file-backed memory that the OS can reclaim and re-read from disk. Cached weights are never written to the page file; high Task Manager RAM use is expected. Comfy tested 56 GB of Wan weights on a 32 GB RTX 5060 machine, but results are only in charts I could not extract — [Comfy blog, Mar 25, 2026](https://blog.comfy.org/p/dynamic-vram-in-comfyui-saving-local).
- Windows "forbids overcommit other than through the pagefile," with increased RAM use when no pagefile exists — [ComfyUI PR #11845](https://github.com/Comfy-Org/ComfyUI/pull/11845). Use a system-managed pagefile rather than disabling it — [Popular AI, Nov 1, 2026](https://www.popularai.org/p/how-much-ram-for-comfyui).
- [Independent-measured] RTX 3060 on 15 GB RAM vs ~150 GB: first FLUX.1 image 159.8 s vs 68.3 s; warm 65.15 s vs 63.91 s. The low-RAM host also had a slower PCIe slot, so causes are not separated. Author's advice: 32 GB floor, 64 GB comfortable. `--novram` cost 15% (3060) and 22% (5060 Ti); `--gpu-only` ran out of memory on 12 and 16 GB — [ComputingForGeeks](https://computingforgeeks.com/best-gpu-for-stable-diffusion-comfyui/).
- 32 GB is adequate for SDXL-class work; 64 GB suits FLUX workflows and frequent large-checkpoint swaps, but "a measured 64GB limit, not a model's name" should trigger 96 GB — [Popular AI](https://www.popularai.org/p/how-much-ram-for-comfyui). FLUX.2 dev guide: 32 GB, or 64 GB if offloading — [Botmonster](https://botmonster.com/ai/how-to-set-up-flux-2-dev-locally-in-2026/).
- [Estimate] A 4x streaming penalty when the model does not fit (Z-Image base ~21 s becomes ~88 s on 12 GB) — [LocalAIMaster calculator](https://localaimaster.com/tools/image-model-vram-calculator).

### Inferences
**[Extrapolated] What this PC should do, 1024² unless noted.** Scaling rule: 4090-class times x2–3 for a 4070, based on NVIDIA's 5090-to-4070 ratios of 2.2x, 2.6x and 3.4x. Not measured.

| Model / setup | 4070 time | Basis | 32 GB RAM | Practical verdict |
|---|---|---|---|---|
| FLUX 3 Image Klein INT8, 16 steps | 8.9 s; edit 18.9 s; 2048² 50.4 s | Vendor-measured | Likely fine, untested | Interactive |
| SDXL / Illustrious, 30 steps | ~8–11 s | Interpolated from 3060 / 5060 Ti / 3090 | Fine | Interactive |
| Z-Image Turbo FP8, 8–9 steps | ~5–15 s | Extrapolated; publisher estimate 15–30 s | Fine (~13 GB weights) | Interactive |
| FLUX.2 klein 4B distilled | ~3 s | 1.2 s x2.2–2.6 | Fine | Interactive |
| FLUX.2 klein 9B FP8, distilled | ~5–6 s estimated; ~60 s reported on GGUF | Conflicting | Fine | Test it; prefer FP8 to GGUF |
| Qwen-Image Q4 + 8-step LoRA | ~90–135 s | 45 s x2–3 | OK | Slow batch |
| Qwen-Image Q4, 20 steps | ~2.5–4 min | 77 s x2–3 | OK | Batch |
| Qwen-Image-Edit-2509, 40 steps | ~3.5–5 min or more | 100 s x2–3, plus streaming | Tight | Batch only |
| HiDream-I1 Q4 | Unknown | No timing found | Recommended minimum | Test only |
| HunyuanImage 3 Instruct-Distil W4A8, 8 steps | ~1–1.5 min if RAM holds | 26 s x2–3 x1.15–1.2 | Over budget (~50 GB seen) | Risky |
| HunyuanImage 3 full, 50 steps | 10–15 min or more | 5m08 x2–3 | Over budget | Not practical |
| FLUX.2 dev Q4 or FP8, 28 steps | ~2–5 min, possibly ~10 if thrashing | 56 s x2–3, plus streaming penalty; cross-check: 5070 Ti at 2–4 min | Over budget (53.5 GB fp8 weights vs ~24 GB free) | Runs, but not for iteration |

- The widely repeated "60–80 s for FLUX.2 dev on 12 GB" looks like a recycled FLUX.1 figure and should not be used.
- 12 GB here is effectively ~9.2 GB. Rows with estimated peaks at 8–11 GB (klein 9B FP8 at ~11.2 GB per LocalAIMaster) will stream unless the desktop is trimmed. Moving the display cable to the motherboard's video output should recover about 2.8 GB. This assumes the 9700X's iGPU works on this board; the AMD spec page timed out, so confirm it.
- Likely outcome at 32 GB: slowdowns and disk re-reads rather than hard failures, because of Dynamic VRAM, provided models live on the NVMe and the pagefile stays on. This is reasoning, not a test result. Text encoders are the pressure point: the 18 GB Mistral fp8 plus a 35.5 GB transformer cannot both stay cached, so changing the prompt may force re-loads.
- A one-evening self-test would beat all these numbers. Run each template twice and record the second run — the method [LocalAIMaster suggests](https://localaimaster.com/blog/best-gpu-for-image-generation).
- Native formats (INT8, NVFP4, FP8) should be tried before GGUF on this NVIDIA card.

### Gaps
- No firsthand FLUX.2 dev, Qwen-Image or Z-Image timing on an RTX 4070, 4070 Super or 5070 with stated settings. Reddit content was not reachable through search.
- No measured peak system RAM for FLUX.2 dev on 12 GB + 32 GB, and the Comfy 32 GB chart values could not be extracted.
- Unknown whether the ComfyUI-GGUF custom node benefits from Dynamic VRAM's file-backed loader. The Comfy post describes only ComfyUI's safetensors loader.
- No HiDream-I1 timing on any 12 GB card. Qwen 2.5 VL text encoder size not confirmed.
- A GTX 1660 Ti report shows unexplained swings with tiny resolution changes on Klein and Z-Image ([ComfyUI #11916](https://github.com/Comfy-Org/ComfyUI/issues/11916)). It has no root cause and may not apply to a 4070.

## 2. Performance gap with larger cards; does extra VRAM change what is possible or only speed?

### Takeaway
On models that fit, moving up is a speed gain: a 5090 is about 2.2x a 4070 at 1 MP, widening to 3.4x at 2048² where 12 GB runs short. Staying at 12 GB (5070, 4070 Super) gains only ~13–16%. Thanks to streaming, extra VRAM mostly changes whether heavy models are usable rather than whether they run. 16 GB fits Qwen Q4, 24 GB fits FLUX.2 dev Q4 and Qwen FP8, and only pro cards fit FLUX.2 dev FP8 in full. No RTX 50 Super card has launched.

### Cited Findings

**Same-model comparisons**
- FLUX 3 Klein (see section 1): 5090 14.6 images/min, 5070 7.8, 4070 6.7 at 1024² (per-minute figures are my arithmetic from the seconds) — [LocalAIMaster](https://localaimaster.com/blog/best-gpu-for-image-generation).
- [Independent-measured] FLUX.1-dev fp8, 20 steps, 1024²; peak VRAM in parentheses — [ComputingForGeeks](https://computingforgeeks.com/best-gpu-for-stable-diffusion-comfyui/):
  - RTX 3060 12 GB: 63.91 s, ~56/h (11,857 MiB)
  - RTX 5060 Ti 16 GB: 37.02 s, ~97/h (15,749 MiB)
  - RTX 3090 24 GB: 23.23 s, ~155/h (19,460 MiB)
  - RTX 5090 capped at 450 W: 8.84 s, ~407/h (17,638 MiB)
- [Independent-measured] SDXL, euler, 30 steps, same test: 3060 20.75 s; 5060 Ti 11.34 s; 3090 8.28 s; 5090 4.84 s — [ComputingForGeeks](https://computingforgeeks.com/best-gpu-for-stable-diffusion-comfyui/).
- [Third-party, different engines, not comparable to the above] Procyon SDXL 100 steps on Windows (StorageReview): 5060 Ti 20.41 s, 5070 Ti 11.18 s, 5080 8.81 s. ComfyUI SDXL 30 steps (Back2Gaming): RTX 5070 Ti 9.84 images/min, Radeon AI PRO R9700 on Linux 9.03 images/min — both via [ComputingForGeeks](https://computingforgeeks.com/best-gpu-for-stable-diffusion-comfyui/).
- [Vendor/affiliate, low confidence] 5090 ~7 s vs 4090 ~10 s on FLUX.1 dev — [Compute Market](https://www.compute-market.com/blog/best-gpu-ai-image-generation-2026). SDXL 20 steps: 38 vs 28 images/min — [Spheron](https://www.spheron.network/blog/rent-nvidia-rtx-5090/). Both imply about 1.4x.

**VRAM thresholds (all estimates)**
- Qwen Q4_K_S ~15.0 GB (fits 16 GB); Qwen FP8 ~22.9 GB (fits 24 GB); FLUX.2 dev Q4_K_S ~22.1 GB denoise, ~24.6 GB encode (fits 24 GB with the encoder on CPU, or 32 GB); FLUX.2 dev FP8 ~35.1 GB (needs 48 GB); Z-Image base BF16 ~14.2 GB; klein 9B FP8 ~11.2 GB — [LocalAIMaster calculator](https://localaimaster.com/tools/image-model-vram-calculator).
- The 5090 used 17.6 GB on FLUX.1 fp8 where the 12 GB and 16 GB cards pinned at their limit, and `--gpu-only` failed on those smaller cards — [ComputingForGeeks](https://computingforgeeks.com/best-gpu-for-stable-diffusion-comfyui/).

**RTX 50 Super status**
- Not launched and not officially announced. The Information, via Tom's Hardware, reports no new GeForce RTX gaming GPUs in 2026 and RTX 60 possibly in 2028 — [Tom's Hardware](https://www.tomshardware.com/pc-components/gpus/report-claims-nvidia-will-not-be-releasing-any-new-rtx-gaming-gpus-in-2026-rtx-60-series-likely-debuting-in-2028). A leaker claims intent to launch by end of 2026 — [Club386](https://club386.com/nvidia-rtx-50-super-launch-rumour-2026/). Rumored 5070 Ti Super 24 GB, 5080 Super 24 GB, 5070 Super 18 GB — [Notebookcheck](https://www.notebookcheck.net/Nvidia-RTX-50-Super-series-launch-tipped-once-again-later-than-expected.1317926.0.html).

**AMD and Intel**
- Dynamic VRAM is NVIDIA-only; AMD and others are "on the roadmap" as of March 2026 — [Comfy blog](https://blog.comfy.org/p/dynamic-vram-in-comfyui-saving-local).
- ComfyUI on Windows uses ROCm 10.0 for RDNA 2–4 and `torch.xpu` for Intel Arc — [Comfy docs](https://docs.comfy.org/installation/system_requirements).
- AMD's own numbers compare software versions, not GPUs: ROCm 7.1.1 vs 6.4 is 2.6x on SDXL and 5.2x on FLUX.1 schnell — [AMD](https://www.amd.com/en/blogs/2026/amd-comfyui-advancing-professional-quality-generative-ai-ryzen-radeon.html).
- The Level1Techs R9700 thread has no ComfyUI numbers, only that it needed little special setup after recent ROCm changes — [Level1Techs](https://forum.level1techs.com/t/ai-r9700-pro-32gb-amd-gpu-for-ai-and-creative-workloads-benchmarks/239508).

### Inferences
- [Extrapolated] 4070 on FLUX.1 fp8: ~25–40 s, between the measured 3090 and 3060. 4070 on SDXL: ~8–11 s.
- [Extrapolated] 5070 Ti over 4070: ~1.5–1.8x on fitting models. No same-test pair exists.
- Sideways 12 GB moves (5070, 4070 Super) are not worth buying. The 5080 has the same 16 GB as the 5070 Ti at $500+ more, so it buys speed only.
- A 24 GB used card changes the FLUX.2 dev and Qwen FP8 experience more than any 16 GB card. A 32 GB card adds encoder residency and headroom, and much more compute on the 5090.
- For this workflow the non-NVIDIA options carry a real software penalty today: no Dynamic VRAM and thinner custom node support. The second part is my judgment rather than something a source tested.

### Gaps
- No same-test FLUX.2 dev or Qwen-Image comparison across 12/16/24/32 GB cards.
- No same-test 4090 or 5080 row alongside the ComputingForGeeks data.
- No ComfyUI FLUX benchmark found for Intel Arc B580/B60/B70 or for the R9700 against NVIDIA.
- RTX PRO 4500/5000 image-generation benchmarks not found.
- A search excerpt attributed to an unnamed GPU-rental blog gave R9700 ~3.1 s vs RTX 5080 ~2.3 s on SDXL at 30 steps. I could not open or identify the page, and the timing conflicts with the measured figures above, so it should not be used.

## 3. US street prices (new and used), 64 GB DDR5, PSU needs, AM5 DIMM stability

### Takeaway
GPU and RAM prices are far above MSRP and still rising: 5070 Ti about $1,270–$1,575, 5080 about $2,000–$2,500, 5090 about $6,900+ with one unreconciled $3,340 listing. A 64 GB kit costs about $930–$1,050 at the low end, against a $222 price point in Aug 2025. Two sticks are the safe choice on AM5; 2x48 GB is a two-stick configuration and does not carry the four-DIMM penalty. Sources disagree widely, so treat prices as ranges.

### Cited Findings

**GPU prices (Nov 2–6, 2026 unless noted)**

| Card | Launch MSRP | New, low tracked | New, other listings | Used |
|---|---|---|---|---|
| RTX 5070 12 GB | $549 | $899 ([Tom's via Tech Insider](https://tech-insider.org/gpu-price-tracking-2026-rtx-5090-6919-tomshardware-lowest-prices/)) | $1,010.92 ([VideoCardPrices](https://videocardprices.com/card/nvidia-rtx-5090/)) | not found |
| RTX 4070 Super 12 GB | — | — | $1,099.00 ([VideoCardPrices](https://videocardprices.com/card/nvidia-rtx-5090/)) | not found |
| RTX 5060 Ti 16 GB | $429 | $769 (Tom's) | $799.99–$879.99 NVIDIA marketplace ([LocalAIMaster](https://localaimaster.com/blog/best-gpu-for-image-generation)) | not found |
| RTX 5070 Ti 16 GB | $749 | $1,269.99 NVIDIA marketplace ([LocalAIMaster](https://localaimaster.com/blog/best-gpu-for-image-generation)) | $1,399 (Tom's); $1,574.95 Amazon ([VideoCardPrices](https://videocardprices.com/card/nvidia-rtx-5070-ti/)) | $1,399.99 eBay ([VideoCardPrices](https://videocardprices.com/card/nvidia-rtx-5070-ti/)) |
| RTX 5080 16 GB | $999 | $1,579 PNY at Walmart, Nov 2 ([Tech Insider](https://tech-insider.org/nvidia-rtx-50-prices-rise-november-2026-rtx-5090-3340/)) | $1,999 (Tom's); $2,159.99–$2,499.99 Newegg; $2,422.56 Amazon ([Wccftech](https://wccftech.com/nvidia-rtx-50-gpus-see-a-massive-price-increase-in-november/)) | $1,599 Newegg, undated ([PickGPU via Tech Insider](https://tech-insider.org/gpu-price-tracking-2026-rtx-5090-6919-tomshardware-lowest-prices/)) |
| RTX 3090 24 GB | — | — | — | $1,299–$1,568, Nov 1–2 ([LocalAIMaster](https://localaimaster.com/blog/best-gpu-for-image-generation)) |
| RTX 4090 24 GB | $1,599 | discontinued | $1,700–$2,100 scarce, Aug 2026 ([ShopBack](https://www.shopback.com/blog/electronics/nvidia-rtx-5090-supply-shortage-2026-us-what-to-buy-instead)) | $1,499.99 eBay low, undated (PickGPU); $1,200–$1,500 mid-2026 estimate (ShopBack) |
| RTX 5090 32 GB | $1,999 (Founders Edition out of stock) | $3,340 GIGABYTE AORUS at Walmart, Nov 2, seller and stock not stated, unreconciled ([Tech Insider](https://tech-insider.org/nvidia-rtx-50-prices-rise-november-2026-rtx-5090-3340/)) | $6,919 (Tom's, Nov 3); $7,699.98 Amazon, Nov 6 ([VideoCardPrices](https://videocardprices.com/card/nvidia-rtx-5090/)); Newegg to $11,896 ([Wccftech](https://wccftech.com/nvidia-rtx-50-gpus-see-a-massive-price-increase-in-november/)) | $6,349.99 eBay, Nov 6 ([VideoCardPrices](https://videocardprices.com/card/nvidia-rtx-5090/)) |

- Tech Insider says its earlier $3,340 report cannot be reconciled with the Tom's figure — [Tech Insider](https://tech-insider.org/gpu-price-tracking-2026-rtx-5090-6919-tomshardware-lowest-prices/).
- Further increases are reported for November, per Colorful: 5080 +$380–$450, 5070 Ti +$150, 5070 +$90–$135, 5060 Ti 16 GB +$37–$60. Converted from yuan and not independently verified — [Wccftech, Nov 3](https://wccftech.com/nvidia-rtx-50-gpus-see-a-massive-price-increase-in-november/).
- Staleness warning: ShopBack's "as of August 2026" table shows 5080 at $999–$1,199 and 5070 Ti at $749–$899, far below every November tracker — [ShopBack](https://www.shopback.com/blog/electronics/nvidia-rtx-5090-supply-shortage-2026-us-what-to-buy-instead).

**AMD, Intel and pro cards (no current US retail price verified)**
- Radeon RX 9070 XT 16 GB: $1,049.99 new ([VideoCardPrices](https://videocardprices.com/card/nvidia-rtx-5090/)); $750 used eBay ([PickGPU via Tech Insider](https://tech-insider.org/gpu-price-tracking-2026-rtx-5090-6919-tomshardware-lowest-prices/)).
- RX 7900 XTX 24 GB: $1,241.04 used (PickGPU); $1,820.99 per VideoCardPrices.
- Radeon AI PRO R9700 32 GB: ~$1,250 expected in July 2025 ([Wccftech](https://wccftech.com/amd-radeon-ai-pro-r9700-32-gb-gpu-listed-pricing-around-1250-half-price-nvidia-rtx-pro-blackwell-24-gb/)); now €2,078–€2,964 in Germany ([Alternate](https://www.alternate.de/AI-Komponenten/AI-Grafikkarten)); £1,399.99 UK ([Overclockers UK](https://www.overclockers.co.uk/pc-components/graphics-cards/professional-graphics-cards)).
- Intel Arc Pro B60 24 GB: £899.99 UK (Overclockers UK); Arc Pro B70 32 GB €1,269 ([Alza](https://www.alza.at/EN/new-arrivals/n18851959.htm)); Arc B580 12 GB $329–$369.99 US.
- RTX PRO 4500 Blackwell 32 GB: $2,500 last seen March 2026 ([PassMark](https://www.videocardbenchmark.net/compare/6850vs6820/Radeon-AI-PRO-R9700-vs-RTX-PRO-4500-Blackwell)); €3,689–€4,962 in Europe. RTX PRO 6000 Blackwell 96 GB: $17,690 ([VideoCardPrices](https://videocardprices.com/card/nvidia-rtx-5090/)).

**DDR5 prices**
- 64 GB, in-stock US desktop kits on Nov 6: lowest $929.99 (Corsair Vengeance RGB 6000 CL40 at Newegg; TeamGroup Vulcan Alpha 6000 CL38 at Amazon); median $1,277.49; cheapest 6000 CL30 $1,049.99 (KLEVV CRAS V RGB) — [PGRID](https://www.pgrid.app/us/advice/compare-64gb-ddr5-ram).
- Other trackers: from $735.21 (Nov 2) with median $1,276.99 and the Aug 2025 to Aug 2026 move of $222 to $1,272 — [The Ramageddon](https://theramageddon.com/64gb-ram-prices/); average $1,423, up 12.4% in 30 days — [Pangoly](https://pangoly.com/en/price-trends/ram/64gb-ddr5); Corsair Vengeance RGB 6000 at $869.99 — [Newegg Insider](https://www.newegg.com/insider/best-ddr5-ram-kits-in-2026-and-why-prices-are-up).
- 32 GB kits: lowest $479.99, median $549.99 (Nov 3). Memory "rarely" resells at a good price, so assume the cost is sunk — [Tech Insider](https://tech-insider.org/32gb-vs-64gb-ram-ddr5-gaming-creative-2026/).
- 96 GB (2x48 GB), undated: ~$945 Corsair CL36 ([RamPricesUSA](https://rampricesusa.com/products/B0F79XH4T7)); $1,255–$1,369.99 Corsair Grey ([BuildCores](https://www.buildcores.com/products/RAM/i6r53rkku/Corsair-Vengeance-Grey-DDR5-6000-CL36-96GB-(2x48GB))); ~$1,460 in September ([Popular AI](https://www.popularai.org/p/how-much-ram-for-comfyui)).

**PSU**
- NVIDIA minimum system PSU with a Ryzen 9 9950X-class baseline, then the guide's "comfort" size: 5070 650 W / 750 W; 5070 Ti 750 W / 850 W; 5080 850 W / 1000 W; 5090 1000 W / 1200 W. Power ratings: 250 W, 300 W, 360 W, 575 W. The guide stresses ATX 3.1 and native 12V-2x6 cables without third-party Y adapters — [DropReference](https://dropreference.com/en/blog/guide/power-supply-rtx-5070-5070-ti-5080-5090-2026-wattage-atx-31).
- PSU catalog prices from the same guide (Oct 7, 2026): MSI MAG A750GL $100; Corsair RM850e $95; be quiet! 1000 W $111.99; ASUS ROG Strix 1200P $230 — [DropReference](https://dropreference.com/en/blog/guide/power-supply-rtx-5070-5070-ti-5080-5090-2026-wattage-atx-31). PSUs are a minor cost next to GPUs and RAM here.
- A 5090 capped at 450 W still reached the 2.38 it/s FLUX.1 result above — [ComputingForGeeks](https://computingforgeeks.com/best-gpu-for-stable-diffusion-comfyui/).

**AM5 DIMM stability**
- Official Ryzen 9000 speed is 5600 with two sticks and 3600 with four — [Newegg community](https://www.newegg.com/gamer/community/t/why-is-ram-compatibility-still-an-issue-on-ryzen/3409).
- Anecdotes: 2x48 GB at DDR5-6000 is reported as working, and as being as easy as 2x32 GB; "it's only 4 DIMMs which makes it tricky" — [Level1Techs thread](https://forum.level1techs.com/t/ddr5-4-dimms-on-am5-whats-working-whats-not/197153); [Reddit mirror](https://lr.in.psf.lt/r/overclocking/s/DbfRuXYPJB). Both are search excerpts; I did not re-open the exact posts.
- Buy one matched kit rather than mixing an old kit with a new one, which can lower speed or fail to boot — [Tech Insider](https://tech-insider.org/32gb-vs-64gb-ram-ddr5-gaming-creative-2026/).

### Inferences
- **Upgrade tiers:**
  - Tier 0, $0: settings only.
  - Tier 1, ~$930–$1,050: 2x32 GB DDR5. Helps FLUX.2 dev, Qwen and Hunyuan load behavior, not the speed of fitting models.
  - Tier 2, ~$1,270–$1,575: 5070 Ti, plus a PSU if under 750 W.
  - Tier 3, ~$1,300–$1,600+: used 3090 or 4090 24 GB, with used-market risk.
  - Tier 2 or 3 plus RAM: ~$2,200–$2,650.
  - Tier 4, ~$6,350–$7,700: 5090 (only $3,340 if that Walmart listing is real and repeatable).
- A used 3090 at about 5070 Ti pricing is a real trade-off: 24 GB and proven FLUX.1 speed against a newer, warrantied, likely faster 16 GB card. Used 4090 prices look low-confidence. They sit at or below used 3090 prices, which is implausible, so expect to pay more than $1,500.
- Check PSU wattage before any purchase. I could not source a recommended PSU for the 4090 (see Gaps); it would likely sit around the 5080's tier given its power class.
- A cheaper RAM path exists: a second 2x16 GB kit at about $480–$550 for 64 GB across four sticks. It risks falling toward 3600 and instability. Section 4's reasoning suggests RAM speed matters little for this workload, so it might be acceptable, but it needs a stress test and a matching kit may not be available.
- At current prices, pro cards deserve a price check before a 5090. A 32 GB RTX PRO 4500 at or near $2,500–$3,800 would undercut 5090 street pricing, though I have no image-generation benchmark or current US price for it.
- Deals on Black Friday (Nov 27) and Cyber Monday (Nov 30) were predicted by some coverage, but the direction of evidence is upward. No purchase urgency is justified by these predictions either way.

### Gaps
- No eBay sold-listing data retrieved. eBay figures are current listings, so true sold prices may be lower. PCPartPicker was not retrieved, and Tom's tracker was read only through Tech Insider's copy (the direct URL returned 404).
- No used price for the RTX 4070 (the user's resale value) or 4070 Super, and no current US retail price for R9700, Arc Pro B60/B70 or RTX PRO 4500.
- Recommended PSU for the RTX 4090 not verified (TechPowerUp returned 403). The user's PSU wattage is unknown and must be read off the unit.
- Whether the Patriot sticks can be matched, and resale value of 2x16 GB DDR5, not found.

## 4. Would the rest of the system bottleneck these cards? Is EXPO useful?

### Takeaway
No meaningful platform bottleneck is expected when a model fits in VRAM: PCIe 4.0 x16 and the 9700X are fine even for a 5090. Enabling EXPO is free and worth doing, but expect little change in sampling speed; I found no ComfyUI-specific measurement. Storage and RAM capacity matter more than RAM speed once models spill out of VRAM.

### Cited Findings
- PCIe 5.0 x16 offers 64 GB/s bidirectional vs 32 GB/s for PCIe 4.0 x16 — [TechPowerUp](https://techpowerup.com/review/nvidia-geforce-rtx-5090-pci-express-scaling/single-page.html). In gaming, a 5090 on PCIe 4.0 x16 trails 5.0 by about 1% at 1080p — [KOC summary of TechPowerUp](https://www.koc.com.tw/?p=584596).
- Puget Systems' RTX 5090 DaVinci Resolve testing: almost identical render times on 5.0 x16, 5.0 x8 and 4.0 x16; roughly 10% slower at 5.0 x4, 4.0 x8 or 3.0 x16; about 25% slower at 4.0 x4 or 3.0 x8. Resolve was the most bandwidth-sensitive app tested. Not an image-generation test, and read through secondary coverage rather than Puget's page — [Tom's Hardware](https://www.tomshardware.com/pc-components/motherboards/lack-of-pcie-bandwidth-can-nerf-rtx-5090-by-up-to-25-percent-in-content-creation-workloads-puget-data-confirms-performance-hit-when-using-older-generations-and-fewer-lanes).
- One rental-vendor blog argues on-card memory bandwidth is the main image-generation bottleneck — [Spheron](https://www.spheron.network/blog/comfyui-gpu-cloud-2026). Opinion, no measurement shown.
- A low-RAM, slower-PCIe host barely changed warm FLUX.1 times (65.15 s vs 63.91 s) but more than doubled the first image (159.8 s vs 68.3 s) — [ComputingForGeeks](https://computingforgeeks.com/best-gpu-for-stable-diffusion-comfyui/).
- DDR5-6000 is AMD's 1:1 sweet spot; 6400 at 1:1 needs "a bit of tinkering and luck" — [TechPowerUp](https://techpowerup.com/review/ddr5-memory-performance-scaling-with-amd-zen-5/single-page.html). The default ratio becomes 1:2 above DDR5-6000, and FCLK 2000 is recommended with 6000 — [HWBusters](https://hwbusters.com/cpu/ddr5-6000-vs-8000-mhz-ram-amd-ryzen-9-9950x/2/).
- Rated EXPO speed and stability depend on board and CPU — [TechPowerUp](https://techpowerup.com/review/amd-zen-5-technical-deep-dive/4.html).

### Inferences
- DDR5 dual-channel bandwidth is about 77 GB/s at 4800 and 96 GB/s at 6000 (arithmetic: MT/s x 8 bytes x 2). Both exceed the PCIe 4.0 x16 link, so when weights stream to the GPU the slot should be the limiter, not RAM speed. EXPO's gain should therefore be small for sampling, and more visible for CPU-side work such as text encoding and general desktop responsiveness. Not measured.
- For the Patriot 6600 sticks: enabling the 6600 EXPO profile may land in 1:2 mode. Trying manual 6000 with 1:1 is the safer first target, followed by a memory test. Back off if unstable; a corrupted long batch costs more than the small gain.
- A 5090's PCIe 4.0 penalty should only appear when streaming, and a 5090 rarely streams for these models.
- Storage: keep models on the 980 PRO, since Dynamic VRAM re-reads evicted weights from disk. The drive-letter mapping is unknown to me, so confirm which letter is the NVMe. FLUX.2 dev alone needs ~60 GB ([Botmonster](https://botmonster.com/ai/how-to-set-up-flux-2-dev-locally-in-2026/)), and Hunyuan W4A8 is 43.6 GiB. C's 161 GB would fill fast; D's 637 GB suits this if it is on the NVMe.

### Gaps
- No benchmark of ComfyUI at different DDR5 speeds or PCIe generations.
- No measured 9700X text encoder time for Mistral or Qwen encoders on CPU.
- ASUS QVL status of the Patriot kit, and the kit's exact EXPO profile, not checked.

## 5. Local vs renting: cost per image and break-even against gpt-image-2

### Takeaway
The $0.05 assumption holds only for medium quality: gpt-image-2 at 1024² is about $0.006 low, $0.053 medium and $0.211 high, half that in batch. On the existing PC, electricity is about $0.0001–$0.005 per image, so local beats gpt-image-2 medium from the first image for models this PC can run. Buying hardware only pays off at high volume: a $1,400 card takes ~27,000 images to break even against gpt-image-2 medium and ~121,000 against hosted FLUX.2 on fal. For occasional heavy models, hosted APIs or rental are far cheaper than upgrading at today's prices.

### Cited Findings

**gpt-image-2**
- Image output $30/M tokens, image input $8/M, text input $5/M; batch half — [OpenAI pricing](https://developers.openai.com/api/docs/pricing).
- Per-image at 1024²: $0.006 low, $0.053 medium, $0.211 high. These are calculator-derived and quoted by third parties, not read from an OpenAI table; input tokens and reference images are extra — [LaoZhang](https://blog.laozhang.ai/en/posts/gpt-image-2-api-pricing.md); [Yingtu](https://yingtu.ai/zh/blog/gpt-image-2-cost-per-image).
- Resellers vary: Segmind $0.0663 medium, $0.2639 high ([Segmind](https://www.segmind.com/models/gpt-image-2/pricing)); Atlas Cloud a flat $0.008 ([Atlas Cloud](https://www.atlascloud.ai/blog/gpt-image-2-api-guide)).
- OpenAI's image guide now also discusses `gpt-image-2.5-sunburst`, `gpt-image-2.5-flare` and GPT Image 2.6 — [OpenAI guide](https://developers.openai.com/api/docs/guides/image-generation). I did not get their prices.

**Hosted open models (fal, retrieved Nov 6)**
- Z-Image Turbo $0.005/MP and "FLUX 2" `fal-ai/flux-2` $0.012/MP (page does not say this is the dev variant) — [fal pricing](https://fal.ai/pricing).
- FLUX.2 klein 9B $0.006/MP — [fal endpoint](https://fal.ai/models/fal-ai/flux-2/klein/9b/llms.txt). Qwen-Image $0.02/MP — [fal endpoint](https://fal.ai/models/fal-ai/qwen-image/llms.txt).
- A 1024² image is 1.05 MP, which gives about $0.0052, $0.0063, $0.0126 and $0.0210 respectively (my arithmetic).
- Other listed FLUX.2 dev prices conflict: $0.0084 vs $0.025 per image, from third-party aggregators ([TeamDay](https://www.teamday.ai/blog/fal-ai-pricing-2026); [Fal.ai Pricing tracker](https://pricepertoken.com/fal-ai-pricing)). I could not tell which aggregator carries which figure from the excerpts.

**GPU rental (GetDeploying, Nov 6)**
- RTX 4090: lowest $0.27/h (Theta EdgeCloud), median $0.49/h across 17 providers; RunPod $0.89/h Secure, $0.34/h Community (out of stock) — [GetDeploying](https://getdeploying.com/gpus/nvidia-rtx-4090).
- RTX 5090: lowest $0.35/h (HyperAI), median $0.72/h across 16 providers; RunPod $1.19/h Secure, $0.69/h Community (out of stock) — [GetDeploying](https://getdeploying.com/gpus/nvidia-rtx-5090).
- Runpod bills by the millisecond and shows hourly rates — [RunPod](https://www.runpod.io/product/cloud-gpus). fal serverless RTX PRO 6000 96 GB: $4.00/h list, as low as $1.99/h — [fal pricing](https://fal.ai/pricing).

**Electricity**
- US residential average about 18.2¢/kWh for 2026 in EIA's outlook — [EIA STEO](https://www.eia.gov/outlooks/steo/report/elec_coal_renew.php?sfnsn=mo). The user's local rate may differ.

### Inferences
All figures in this section are my arithmetic. Local system draw is assumed: 4070 ~300 W, 5070 Ti ~400 W, 4090 ~550 W, 5090 ~700 W. A flat $0.001/image running cost is assumed after an upgrade.

**Electricity per image at 18.2¢/kWh**

| Case | Cost |
|---|---|
| 4070, 8.9 s (FLUX 3 Klein) | $0.00013 |
| 4070, 10 s (SDXL) | $0.00015 |
| 4070, 150 s (Qwen, extrapolated) | $0.0023 |
| 4070, 180–300 s (FLUX.2 dev, extrapolated) | $0.0027–$0.0046 |
| 5090, 20 s | $0.0007 |

**Rental cost per image at utilized time only** (excludes idle, setup, downloads and storage)

| Case | $/image |
|---|---|
| 4090 at $0.49/h, Qwen fp8 at measured 71 s | $0.0097 |
| 4090 at $0.49/h, Qwen fp8 + LoRA at 34 s | $0.0046 |
| 4090 at $0.49/h, FLUX.2 dev at estimated 56 s | $0.0076 |
| 5090 at $0.72/h, FLUX.1 fp8 at 8.84 s | $0.0018 |

Rental is about half of fal per image if the pod is kept busy; fal wins for small, sporadic runs.

**Images to break even on hardware purchases**

| Spend | vs gpt-image-2 medium $0.053 | vs high $0.211 | vs batch medium $0.0265 | vs fal Qwen $0.021 | vs fal FLUX.2 $0.0126 |
|---|---|---|---|---|---|
| $1,000 (64 GB RAM) | 19,200 | 4,800 | 39,200 | 50,000 | 86,200 |
| $1,400 (5070 Ti) | 26,900 | 6,700 | 54,900 | 70,000 | 120,700 |
| $1,500 (used 24 GB) | 28,800 | 7,100 | 58,800 | 75,000 | 129,300 |
| $2,500 (used 24 GB + RAM) | 48,100 | 11,900 | 98,000 | 125,000 | 215,500 |
| $3,340 (5090, unreconciled price) | 64,200 | 15,900 | 131,000 | 167,000 | 287,900 |
| $6,919 (5090) | 133,100 | 32,900 | 271,300 | 346,000 | 596,500 |

- Payback at 1,000 images/month vs gpt-image-2 medium: $1,400 takes ~27 months, $2,500 ~48 months, $6,919 ~11 years. Vs high quality: ~7 months, ~12 months, ~33 months.
- Rental hours to break even, net of electricity: used 4090 at $1,500 vs $0.49/h is ~3,850 hours; 5090 at $6,919 vs $0.72/h is ~11,700 hours, roughly 11 years at 20 h/week.
- These comparisons ignore quality differences, which another researcher covers. They also ignore privacy, offline use, LoRA training and iteration latency, which are the real reasons to own a card.
- Recommendation for the report writer to weigh: at Nov 2026 prices, Tier 0 on the existing PC, plus hosted APIs for occasional heavy models, is the cost-rational default. Buy only if volume clearly exceeds about 2,000 images/month of models that do not fit, or if non-cost reasons dominate.

### Gaps
- OpenAI's per-image table was not read directly; the medium and high figures are third-party quotes of the calculator.
- Vast.ai is absent from GetDeploying, and I found no reliable current Vast.ai rate. Replicate per-image prices and RunPod storage costs not researched. `fal-ai/flux-2` is not confirmed as the dev variant; no fal page checked for Qwen-Image-Edit, HiDream or HunyuanImage 3.
- Real wall-power draw during ComfyUI runs not measured on this PC; a smart plug would settle it.

## 6. Does Windows 10 end of support affect drivers or ComfyUI?

### Takeaway
No blocker today. The user's driver 621.01 appears to be the final Windows 10 Game Ready release, and Windows 10 now moves to quarterly security driver updates through Oct 2029. ComfyUI still supports Windows 10, and Dynamic VRAM works on Windows. The risk is future drift rather than present breakage.

### Cited Findings
- NVIDIA's final Windows 10 Game Ready driver was planned for October 2026, with the first non-Windows 10 driver in November; Windows 10 then moves to quarterly security updates with critical fixes through October 2029 — [TechRadar](https://techradar.com/computing/gpu/time-for-gamers-to-upgrade-to-windows-11-nvidia-gpu-driver-support-for-windows-10-ends-in-two-months-heres-what-you-need-to-know); [Neowin](https://www.neowin.net/news/nvidia-gives-a-timeline-on-ending-windows-10-driver-support/) (excerpts; direct Neowin fetch returned 403).
- One source gives Oct 6, 2026 as the final date — [Guru3D](https://guru3d.com/story/nvidia-ends-windows-10-game-ready-driver-support-in-october-2026/) (excerpt). But 621.01 WHQL arrived Oct 21 and still lists Windows 10 — [Gazlog](https://gazlog.jp/entry/geforce-game-ready-driver-621-01-whql/); [Softpedia](https://drivers.softpedia.com/get/GRAPHICS-BOARD/NVIDIA/NVIDIA-GeForce-Game-Ready-Notebook-Graphics-Driver-621-01.shtml).
- Existing drivers and games should continue to work; what is lost is new-game optimization and regular fixes — [TechRadar](https://techradar.com/computing/gpu/time-for-gamers-to-upgrade-to-windows-11-nvidia-gpu-driver-support-for-windows-10-ends-in-two-months-heres-what-you-need-to-know) (search excerpt; I could not open the NVIDIA notice itself).
- Consumer Windows 10 ESU runs to Oct 12, 2027. Enrollment is free with PC Settings sync, 1,000 Microsoft Rewards points, or $30 — [Microsoft](https://www.microsoft.com/en-us/windows/extended-security-updates).
- Comfy Desktop requires "Windows 10 or later," and NVIDIA 20-series and newer require CUDA 13.0 (cu130) or later PyTorch builds. No minimum driver version is stated, only advice to update if it does not start — [Comfy docs](https://docs.comfy.org/installation/system_requirements).
- Dynamic VRAM supports NVIDIA on Windows and Linux, not WSL — [Comfy blog](https://blog.comfy.org/p/dynamic-vram-in-comfyui-saving-local).

### Inferences
- Practical risk: a future PyTorch or CUDA build could expect a driver newer than the Windows 10 security branch provides. I found no report of this happening. Portable and pinned installs reduce the exposure.
- A Windows 11 move is the eventual fix. This AM5 hardware should qualify, but I did not verify that from a source. It is not needed for image generation today.
- Confirm ESU enrollment on the PC, since the build number alone does not show it.

### Gaps
- No NVIDIA primary page confirming 621.01 as the final Windows 10 Game Ready driver; the identification rests on one Japanese report plus a Softpedia listing.
- No November 2026 driver release notes found.
- Did not find any ComfyUI or custom node issue tied specifically to Windows 10.
- Whether quarterly security drivers will track new CUDA versions is undocumented.
