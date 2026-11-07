import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import sharp from "sharp";
import { ComfyUIImageProvider } from "./comfyui.js";
import { fillWorkflow, loadWorkflow } from "./comfyui-workflow.js";
import { validateProfile, type EndpointProfile } from "./profiles.js";
type Workflow = Record<
  string,
  { class_type: string; inputs: Record<string, unknown> }
>;
const profile = validateProfile({
  name: "local",
  api: "comfyui",
  baseUrl: "http://127.0.0.1:8188/",
  model: "flux3-klein",
});
const INPUTS: Record<string, string> = {
  UNETLoader: "unet_name",
  CLIPLoader: "clip_name",
  VAELoader: "vae_name",
};
const UPSAMPLER = "qwen3.5_9b_flux3_prompt_upsampler_w4a8.safetensors";
const ALL_WEIGHTS: Record<string, string[]> = {
  UNETLoader: ["flux3-image-klein-int8-convrot.safetensors"],
  CLIPLoader: ["qwen3vl_4b_int8_convrot.safetensors", UPSAMPLER],
  VAELoader: ["flux2-vae.safetensors"],
};
const png = () =>
  sharp({ create: { width: 8, height: 6, channels: 3, background: "red" } })
    .png()
    .toBuffer();
const request = { prompt: "a red cube", out: "unused" };
interface Server {
  weights?: Record<string, string[]>;
  combo?: boolean;
  image?: Uint8Array;
  history?: Record<string, unknown>;
  promptStatus?: number;
  pending?: boolean;
  timeoutSeconds?: number;
  profile?: EndpointProfile;
  unknownNodes?: string[];
}
async function comfy(server: Server = {}) {
  const image = server.image ?? (await png());
  const prompts: Workflow[] = [];
  const uploads: { file: File; type: unknown }[] = [];
  const paths: string[] = [];
  let polls = 0;
  const fetchImpl: typeof fetch = async (input, init) => {
    if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const url = new URL(String(input));
    paths.push(`${url.pathname}${url.search}`);
    if (url.pathname.startsWith("/object_info/")) {
      const node = url.pathname.split("/").pop() ?? "";
      if (server.unknownNodes?.includes(node)) return Response.json({});
      const files = (server.weights ?? ALL_WEIGHTS)[node] ?? [];
      return Response.json({
        [node]: {
          input: {
            required: {
              [INPUTS[node]]: server.combo
                ? ["COMBO", { options: files }]
                : [files],
            },
          },
        },
      });
    }
    if (url.pathname === "/upload/image") {
      const form = init?.body as FormData;
      const file = form.get("image") as File;
      uploads.push({ file, type: form.get("type") });
      return Response.json({
        name: file.name,
        subfolder: "",
        type: form.get("type"),
      });
    }
    if (url.pathname === "/prompt") {
      if (server.promptStatus)
        return Response.json(
          { error: { message: "raw diagnostic" } },
          { status: server.promptStatus },
        );
      prompts.push(JSON.parse(String(init?.body)).prompt);
      return Response.json({ prompt_id: `job-${prompts.length}` });
    }
    if (url.pathname.startsWith("/history/")) {
      const id = url.pathname.split("/").pop() ?? "";
      if (server.pending || polls++ === 0) return Response.json({});
      return Response.json({
        [id]: server.history ?? {
          status: { status_str: "success", completed: true, messages: [] },
          outputs: {
            caption: { text: ["Expanded caption"] },
            output: {
              images: [{ filename: "out.png", subfolder: "", type: "temp" }],
            },
          },
        },
      });
    }
    if (url.pathname === "/view") return new Response(new Uint8Array(image));
    throw new Error(`Unexpected request ${url}`);
  };
  return {
    prompts,
    uploads,
    paths,
    provider: new ComfyUIImageProvider(server.profile ?? profile, {
      fetchImpl,
      pollIntervalMs: 0,
      timeoutSeconds: server.timeoutSeconds,
    }),
  };
}
describe("ComfyUI FLUX 3 Klein provider", () => {
  it("renders text-to-image through the upsampler and reports the caption it used", async () => {
    const { provider, prompts, uploads, paths } = await comfy();
    const result = await provider.generate(request);
    const [graph] = prompts;
    expect(graph.upsampler.class_type).toBe("TextGenerateV2");
    expect(graph.upsampler.inputs.prompt).toBe("a red cube");
    expect(graph.upsampler.inputs.system_prompt).toContain("text-to-image");
    expect(graph.upsampler.inputs["sampling_mode.presence_penalty"]).toBe(1.5);
    expect(graph.positive.inputs.text).toEqual(["upsampler", 0]);
    expect(graph.negative.class_type).toBe("CLIPTextEncode");
    expect(graph.latent.inputs).toEqual({
      width: 1024,
      height: 1024,
      batch_size: 1,
    });
    expect(graph.sampler.inputs).toMatchObject({
      steps: 16,
      cfg: 1,
      sampler_name: "euler",
      scheduler: "simple",
      denoise: 1,
      latent_image: ["latent", 0],
    });
    expect(graph.references).toBeUndefined();
    expect(uploads).toEqual([]);
    expect(paths.filter((p) => p.startsWith("/history/"))).toHaveLength(2);
    expect(paths).toContain("/view?filename=out.png&subfolder=&type=temp");
    expect(result.provider).toBe("local");
    expect(result.requestedModel).toBe("flux3-klein");
    expect(result.images[0]).toMatchObject({
      width: 8,
      height: 6,
      mimeType: "image/png",
      prompt: "Expanded caption",
      responseId: "job-1",
      servedModel: "flux3-image-klein-int8-convrot",
      usage: {
        served: {
          steps: 16,
          upsampled: true,
          seed: graph.sampler.inputs.seed,
        },
      },
    });
    expect(JSON.stringify(result.images[0].usage)).not.toContain("caption");
  });
  it("sends the prompt verbatim for the raw model without needing the upsampler weights", async () => {
    const { provider, prompts } = await comfy({
      weights: {
        ...ALL_WEIGHTS,
        CLIPLoader: ["qwen3vl_4b_int8_convrot.safetensors"],
      },
    });
    const result = await provider.generate({
      ...request,
      model: "flux3-klein-raw",
    });
    expect(prompts[0].upsampler).toBeUndefined();
    expect(prompts[0].caption).toBeUndefined();
    expect(prompts[0].positive.inputs.text).toBe("a red cube");
    expect(result.requestedModel).toBe("flux3-klein-raw");
    expect(result.images[0].prompt).toBe("a red cube");
  });
  it("edits with the source first, then references, keeping the first reference's shape", async () => {
    const { provider, prompts, uploads } = await comfy();
    const data = await png();
    await provider.edit({
      ...request,
      sourceImage: { data, contentType: "image/png" },
      referenceImages: [{ data, contentType: "image/jpeg" }],
    });
    const [graph] = prompts;
    expect(uploads.map((u) => u.type)).toEqual(["temp", "temp"]);
    expect(uploads[0].file.name).toMatch(/^imagegen-.+\.png$/);
    expect(uploads[1].file.name).toMatch(/^imagegen-.+\.jpg$/);
    expect(uploads[0].file.name).not.toBe(uploads[1].file.name);
    expect(graph.image0.inputs.image).toBe(`${uploads[0].file.name} [temp]`);
    expect(graph.image1.inputs.image).toBe(`${uploads[1].file.name} [temp]`);
    expect(graph.upsampler.inputs.system_prompt).toContain("image-editing");
    expect(graph.upsampler.inputs["sampling_mode.presence_penalty"]).toBe(0);
    expect(graph.upsampler.inputs["images.image1"]).toEqual(["image0", 0]);
    expect(graph.upsampler.inputs["images.image2"]).toEqual(["image1", 0]);
    expect(graph.negative.class_type).toBe("ConditioningZeroOut");
    expect(graph.references.inputs).toMatchObject({
      positive: ["positive", 0],
      negative: ["negative", 0],
      vae: ["vae", 0],
      resolution: "resize",
      "resolution.megapixels": 1,
      "images.image0": ["image0", 0],
      "images.image1": ["image1", 0],
    });
    expect(graph.latent).toBeUndefined();
    expect(graph.sampler.inputs).toMatchObject({
      positive: ["references", 0],
      negative: ["references", 1],
      latent_image: ["references", 2],
    });
  });
  it("uses the edit graph for references on generate and honors a requested edit size", async () => {
    const { provider, prompts } = await comfy();
    await provider.generate({
      ...request,
      size: "landscape",
      referenceImages: [{ data: await png(), contentType: "image/png" }],
    });
    const [graph] = prompts;
    expect(graph.references.class_type).toBe("ReferenceMultiLatent");
    expect(graph.latent.inputs).toMatchObject({ width: 1536, height: 1024 });
    expect(graph.sampler.inputs.latent_image).toEqual(["latent", 0]);
    expect(graph.upsampler.inputs.prompt).toBe("a red cube");
  });
  it("runs count as separate seeded jobs over one set of uploads", async () => {
    const { provider, prompts, uploads } = await comfy();
    const result = await provider.edit({
      ...request,
      count: 2,
      sourceImage: { data: await png(), contentType: "image/png" },
    });
    expect(result.images).toHaveLength(2);
    expect(prompts).toHaveLength(2);
    expect(uploads).toHaveLength(1);
    expect(prompts[0].sampler.inputs.seed).not.toBe(
      prompts[1].sampler.inputs.seed,
    );
  });
  it("maps sizes to multiples of 16 and composes for non-square canvases", async () => {
    const { provider, prompts } = await comfy();
    await provider.generate({ ...request, size: "16:9" });
    expect(prompts[0].latent.inputs).toMatchObject({
      width: 1360,
      height: 768,
    });
    expect(prompts[0].upsampler.inputs.prompt).toBe(
      "TARGET CANVAS: 85:48\na red cube",
    );
    await provider.generate({ ...request, size: "1000x1000" });
    expect(prompts[1].latent.inputs).toMatchObject({
      width: 1008,
      height: 1008,
    });
    expect(prompts[1].upsampler.inputs.prompt).toBe("a red cube");
    expect(provider.sizePolicy.resolveSize("auto")).toEqual({ size: "auto" });
    expect(provider.sizePolicy.resolveSize("wide")).toEqual({
      width: 1536,
      height: 864,
      pixels: 1327104,
      size: "1536x864",
    });
    for (const size of ["100x1024", "4096x1024", "banana"])
      await expect(
        provider.generate({ ...request, size }),
      ).rejects.toMatchObject({ kind: "usage" });
  });
  it("maps quality to distilled step counts", async () => {
    const { provider, prompts } = await comfy();
    for (const quality of ["low", "medium", "high", "auto"])
      await provider.generate({ ...request, quality });
    expect(prompts.map((p) => p.sampler.inputs.steps)).toEqual([4, 8, 16, 16]);
    await expect(
      provider.generate({ ...request, quality: "ultra" }),
    ).rejects.toMatchObject({ kind: "usage" });
  });
  it("re-encodes outputs so embedded metadata never reaches the saved file", async () => {
    const image = await sharp({
      create: { width: 8, height: 6, channels: 3, background: "red" },
    })
      .withExif({ IFD0: { ImageDescription: "hidden-caption" } })
      .png()
      .toBuffer();
    expect(image.includes("hidden-caption")).toBe(true);
    const { provider } = await comfy({ image });
    const [plain] = (await provider.generate(request)).images;
    expect(Buffer.from(plain.data).includes("hidden-caption")).toBe(false);
    const [webp] = (await provider.generate({ ...request, format: "webp" }))
      .images;
    expect(webp.mimeType).toBe("image/webp");
    expect((await sharp(webp.data).metadata()).format).toBe("webp");
  });
  it("rejects unsupported requests before contacting ComfyUI", async () => {
    const { provider, paths } = await comfy();
    const data = await png();
    await expect(
      provider.edit({
        ...request,
        sourceImage: { data, contentType: "image/png" },
        mask: { data, contentType: "image/png" },
      }),
    ).rejects.toMatchObject({ kind: "usage" });
    const unknownModel = provider.generate({
      ...request,
      model: "flux3-klein-base",
    });
    await expect(unknownModel).rejects.toMatchObject({ kind: "usage" });
    await expect(unknownModel).rejects.toThrow("--workflow");
    await expect(
      provider.generate({ ...request, count: 5 }),
    ).rejects.toMatchObject({ kind: "usage" });
    await expect(
      provider.generate({
        ...request,
        referenceImages: [{ data, contentType: "image/gif" }],
      }),
    ).rejects.toMatchObject({ kind: "usage" });
    expect(paths).toEqual([]);
  });
  it("names missing weights instead of queueing a doomed job", async () => {
    const { provider, paths } = await comfy({
      weights: { UNETLoader: [], CLIPLoader: [], VAELoader: ["pixel_space"] },
    });
    const failure = provider.generate(request);
    await expect(failure).rejects.toMatchObject({ kind: "configuration" });
    await expect(failure).rejects.toThrow(
      "diffusion_models/flux3-image-klein-int8-convrot.safetensors, text_encoders/qwen3vl_4b_int8_convrot.safetensors, vae/flux2-vae.safetensors, text_encoders/qwen3.5_9b_flux3_prompt_upsampler_w4a8.safetensors",
    );
    expect(paths).not.toContain("/prompt");
  });
  it("reads both ComfyUI combo shapes and lists only installed models", async () => {
    const complete = await comfy({ combo: true });
    expect((await complete.provider.models()).map((m) => m.id)).toEqual([
      "flux3-klein",
      "flux3-klein-raw",
    ]);
    await expect(complete.provider.generate(request)).resolves.toBeDefined();
    const partial = await comfy({
      weights: {
        ...ALL_WEIGHTS,
        CLIPLoader: ["qwen3vl_4b_int8_convrot.safetensors"],
      },
    });
    expect((await partial.provider.models()).map((m) => m.id)).toEqual([
      "flux3-klein-raw",
    ]);
  });
  it("tells the user to start ComfyUI when it is not reachable", async () => {
    const provider = new ComfyUIImageProvider(profile, {
      fetchImpl: async () => {
        throw new TypeError("fetch failed");
      },
    });
    const failure = provider.generate(request);
    await expect(failure).rejects.toMatchObject({ kind: "transport" });
    await expect(failure).rejects.toThrow(
      "ComfyUI is not reachable at http://127.0.0.1:8188.",
    );
    await expect(provider.models()).rejects.toThrow("not reachable");
    const configured = new ComfyUIImageProvider(
      { ...profile, startCommand: "start-comfy --port 8188" },
      {
        fetchImpl: async () => {
          throw new TypeError("fetch failed");
        },
      },
    );
    await expect(configured.generate(request)).rejects.toThrow(
      "Start it with `start-comfy --port 8188` and retry.",
    );
  });
  it("reports the failing node, bounded, with a hint for GPU memory", async () => {
    const { provider } = await comfy({
      history: {
        status: {
          status_str: "error",
          completed: false,
          messages: [
            [
              "execution_error",
              {
                node_type: "KSampler",
                exception_type: "torch.OutOfMemoryError",
                exception_message: `Allocation\non device ${"x".repeat(500)}`,
              },
            ],
          ],
        },
        outputs: {},
      },
    });
    const failure = await provider.generate(request).catch((e: Error) => e);
    expect(failure).toMatchObject({ kind: "server" });
    expect((failure as Error).message).toContain(
      "ComfyUI failed in KSampler: Allocation on device",
    );
    expect((failure as Error).message).toContain("smaller --size");
    expect((failure as Error).message.length).toBeLessThan(420);
  });
  it("explains a rejected workflow without echoing the response", async () => {
    const { provider } = await comfy({ promptStatus: 400 });
    const failure = await provider.generate(request).catch((e: Error) => e);
    expect(failure).toMatchObject({ kind: "server", statusCode: 400 });
    expect((failure as Error).message).toContain("flux3-klein workflow");
    expect((failure as Error).message).not.toContain("raw diagnostic");
  });
  it("classifies jobs without images and invalid image bytes", async () => {
    const empty = await comfy({
      history: { status: { completed: true }, outputs: {} },
    });
    await expect(empty.provider.generate(request)).rejects.toMatchObject({
      kind: "no_image",
    });
    const invalid = await comfy({ image: Buffer.from("not an image") });
    await expect(invalid.provider.generate(request)).rejects.toMatchObject({
      kind: "malformed",
    });
  });
  it("times out a job that never finishes", async () => {
    const { provider } = await comfy({ pending: true, timeoutSeconds: 0.02 });
    await expect(provider.generate(request)).rejects.toMatchObject({
      kind: "timeout",
    });
  });
});
describe("ComfyUI workflow files", () => {
  const text = {
    loader: {
      class_type: "UNETLoader",
      inputs: { unet_name: "other.safetensors" },
    },
    encode: {
      class_type: "CLIPTextEncode",
      inputs: { text: "pixel art, {{prompt}}", clip: ["loader", 0] },
    },
    latent: {
      class_type: "EmptyLatentImage",
      inputs: { width: "{{width}}", height: "{{height}}", batch_size: 1 },
    },
    sampler: {
      class_type: "KSampler",
      inputs: { seed: "{{seed}}", steps: 20, latent_image: ["latent", 0] },
    },
    save: { class_type: "SaveImage", inputs: { images: ["sampler", 0] } },
  };
  const edit = {
    ...text,
    source: { class_type: "LoadImage", inputs: { image: "{{image1}}" } },
  };
  const fixed = {
    encode: text.encode,
    sampler: text.sampler,
    latent: {
      class_type: "EmptyLatentImage",
      inputs: { width: 512, height: 512 },
    },
  };
  const weights = { UNETLoader: ["other.safetensors"] };
  const history = {
    status: { status_str: "success", completed: true },
    outputs: {
      note: { text: ["not an image"] },
      save: { images: [{ filename: "out.png", type: "output" }] },
    },
  };
  let dir: string;
  const file = async (name: string, value: unknown) => {
    const path = join(dir, name);
    await writeFile(path, JSON.stringify(value));
    return path;
  };
  const workflowProfile = (fields: Partial<EndpointProfile>) =>
    validateProfile({ ...profile, model: "my-model", ...fields });
  const data = () => png();
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "imagegen-comfy-"));
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });
  it("fills tokens, keeps their types, and reports the profile's label", async () => {
    const { provider, prompts, paths } = await comfy({
      weights,
      history,
      profile: workflowProfile({ workflow: await file("text.json", text) }),
    });
    const result = await provider.generate({ ...request, size: "landscape" });
    const [graph] = prompts;
    expect(graph.encode.inputs).toEqual({
      text: "pixel art, a red cube",
      clip: ["loader", 0],
    });
    expect(graph.latent.inputs).toEqual({
      width: 1536,
      height: 1024,
      batch_size: 1,
    });
    expect(graph.sampler.inputs.seed).toEqual(expect.any(Number));
    expect(graph.sampler.inputs.steps).toBe(20);
    expect(paths).toContain("/view?filename=out.png&subfolder=&type=output");
    expect(result.requestedModel).toBe("my-model");
    expect(result.images[0]).toMatchObject({
      prompt: "a red cube",
      servedModel: "my-model",
      usage: { served: { seed: graph.sampler.inputs.seed } },
    });
  });
  it("defaults to a square, or to the first input's shape when editing", async () => {
    const { provider, prompts, uploads } = await comfy({
      weights,
      history,
      profile: workflowProfile({
        workflow: await file("square.json", text),
        editWorkflow: await file("edit.json", edit),
      }),
    });
    await provider.generate(request);
    expect(prompts[0].latent.inputs).toMatchObject({
      width: 1024,
      height: 1024,
    });
    await provider.edit({
      ...request,
      sourceImage: { data: await data(), contentType: "image/png" },
    });
    expect(prompts[1].latent.inputs).toMatchObject({ width: 1184, height: 880 });
    expect(prompts[1].source.inputs.image).toBe(
      `${uploads[0].file.name} [temp]`,
    );
  });
  it("keeps alpha from a workflow that outputs it", async () => {
    const image = await sharp({
      create: {
        width: 8,
        height: 6,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();
    const { provider } = await comfy({
      weights,
      history,
      image,
      profile: workflowProfile({ workflow: await file("alpha.json", text) }),
    });
    const [result] = (await provider.generate(request)).images;
    expect((await sharp(result.data).metadata()).hasAlpha).toBe(true);
  });
  it("substitutes prompts literally", async () => {
    const workflow = await loadWorkflow(await file("literal.json", text));
    const graph = fillWorkflow(workflow, {
      prompt: "{{seed}} costs $& today",
      seed: 7,
      size: { width: 256, height: 256 },
      images: [],
    });
    expect(graph.encode.inputs.text).toBe(
      "pixel art, {{seed}} costs $& today",
    );
  });
  it("rejects requests the workflow files cannot honor, before contacting ComfyUI", async () => {
    const { provider, paths } = await comfy({
      weights,
      profile: workflowProfile({
        workflow: await file("fixed.json", fixed),
      }),
    });
    const source = { data: await data(), contentType: "image/png" as const };
    const rejected: [() => Promise<unknown>, string][] = [
      [() => provider.generate({ ...request, model: "other" }), "my-model"],
      [
        () => provider.generate({ ...request, quality: "high" }),
        "--quality auto",
      ],
      [() => provider.generate({ ...request, size: "wide" }), "--size auto"],
      [
        () => provider.edit({ ...request, sourceImage: source }),
        "--edit-workflow",
      ],
    ];
    for (const [call, message] of rejected) {
      const failure = call();
      await expect(failure).rejects.toMatchObject({ kind: "usage" });
      await expect(failure).rejects.toThrow(message);
    }
    const editOnly = await comfy({
      profile: workflowProfile({
        editWorkflow: await file("only-edit.json", edit),
      }),
    });
    await expect(editOnly.provider.generate(request)).rejects.toThrow(
      "no --workflow",
    );
    await expect(
      editOnly.provider.edit({
        ...request,
        sourceImage: source,
        referenceImages: [source],
      }),
    ).rejects.toThrow("takes 1 input images, but the request has 2");
    expect([...paths, ...editOnly.paths]).toEqual([]);
  });
  it("rejects malformed workflow files with the reason", async () => {
    const bad = (mutate: Record<string, unknown>) => ({ ...text, ...mutate });
    const cases: [unknown, string][] = [
      [{ nodes: [], links: [] }, "API format"],
      [[], "API format"],
      [
        bad({ extra: { class_type: "X", inputs: { a: "{{cfg}}" } } }),
        "unknown tokens: cfg",
      ],
      [{ encode: text.encode }, "{{prompt}} and {{seed}}"],
      [
        bad({ latent: { class_type: "L", inputs: { width: "{{width}}" } } }),
        "{{width}} and {{height}} together",
      ],
      [
        bad({ source: { class_type: "L", inputs: { image: "{{image2}}" } } }),
        "from {{image1}}",
      ],
    ];
    for (const [i, [value, message]] of cases.entries())
      await expect(
        loadWorkflow(await file(`bad-${i}.json`, value)),
      ).rejects.toThrow(message);
    await expect(loadWorkflow(join(dir, "absent.json"))).rejects.toMatchObject({
      kind: "configuration",
    });
  });
  it("names missing nodes and files instead of queueing a doomed job", async () => {
    const { provider, paths } = await comfy({
      weights: { UNETLoader: ["different.safetensors"] },
      unknownNodes: ["SaveImage"],
      profile: workflowProfile({ workflow: await file("needs.json", text) }),
    });
    const failure = provider.generate(request);
    await expect(failure).rejects.toMatchObject({ kind: "configuration" });
    await expect(failure).rejects.toThrow(
      "other.safetensors for UNETLoader.unet_name, node type SaveImage",
    );
    expect(paths).not.toContain("/prompt");
    await expect(provider.models()).rejects.toMatchObject({
      kind: "configuration",
    });
  });
  it("lists the label once everything the files need is installed", async () => {
    const { provider } = await comfy({
      weights,
      profile: workflowProfile({ workflow: await file("list.json", text) }),
    });
    expect(await provider.models()).toMatchObject([
      {
        id: "my-model",
        inputModalities: ["text"],
        outputModalities: ["image"],
      },
    ]);
  });
});
describe("ComfyUI profiles", () => {
  it("requires a model and keeps server fields to comfyui", () => {
    const base = {
      name: "local",
      api: "comfyui",
      baseUrl: "http://127.0.0.1:8188",
    };
    expect(() => validateProfile(base)).toThrow("need --model");
    const absolute = join(tmpdir(), "workflow.json");
    expect(
      validateProfile({
        ...base,
        model: "my-model",
        startCommand: " start-comfy ",
        workflow: absolute,
      }),
    ).toMatchObject({ startCommand: "start-comfy", workflow: absolute });
    expect(() =>
      validateProfile({ ...base, model: "m", workflow: "relative.json" }),
    ).toThrow("absolute path");
    expect(() =>
      validateProfile({ ...base, model: "m", startCommand: " " }),
    ).toThrow("must not be blank");
    expect(() =>
      validateProfile({
        name: "cloud",
        api: "openrouter",
        startCommand: "start-comfy",
      }),
    ).toThrow("only to comfyui");
  });
  it("defaults to no authentication and refuses API keys", () => {
    expect(profile.auth).toBe("none");
    expect(profile.baseUrl).toBe("http://127.0.0.1:8188");
    expect(() =>
      validateProfile({
        name: "local",
        api: "comfyui",
        baseUrl: "http://127.0.0.1:8188",
        model: "flux3-klein",
        auth: "bearer",
      }),
    ).toThrow("do not use API keys");
    expect(() => validateProfile({ name: "local", api: "comfyui" })).toThrow(
      "--base-url",
    );
  });
});
