import { randomInt, randomUUID } from "node:crypto";
import sharp from "sharp";
import {
  ProviderError,
  type EditRequest,
  type GeneratedImage,
  type GenerateRequest,
  type IImageProvider,
  type ImageInput,
  type ProviderResult,
} from "@imagegencli/core";
import { EndpointHttp, record, type EndpointRequests } from "./http.js";
import { usage, validateProfile, type EndpointProfile } from "./profiles.js";
import { validateImageRequest } from "./validation.js";
import {
  FLUX3_KLEIN_CHECKPOINT,
  FLUX3_KLEIN_MODELS,
  flux3KleinModel,
  flux3KleinSize,
  flux3KleinSteps,
  flux3KleinWeights,
  flux3KleinWorkflow,
  type Flux3KleinJob,
  type Flux3KleinModel,
} from "./flux3-klein.js";
import type { EndpointModel, EndpointOptions } from "./provider.js";
export interface ComfyUIOptions extends EndpointOptions {
  pollIntervalMs?: number;
}
const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
// ComfyUI reports loader files as [[...]] or ["COMBO", { options: [...] }].
function comboChoices(spec: unknown): unknown[] {
  if (!Array.isArray(spec)) return [];
  const choices = spec[0] === "COMBO" ? record(spec[1]).options : spec[0];
  return Array.isArray(choices) ? choices : [];
}
function executionFailure(messages: unknown): ProviderError {
  const failure = Array.isArray(messages)
    ? messages.find((m) => Array.isArray(m) && m[0] === "execution_error")
    : undefined;
  const detail = record(Array.isArray(failure) ? failure[1] : undefined);
  const node =
    typeof detail.node_type === "string" ? detail.node_type : "the workflow";
  const reason =
    typeof detail.exception_message === "string"
      ? detail.exception_message.replace(/\s+/g, " ").trim().slice(0, 300)
      : "";
  const memory = /out ?of ?memory/i.test(`${detail.exception_type} ${reason}`);
  return new ProviderError({
    kind: "server",
    message: `ComfyUI failed in ${node}${reason ? `: ${reason}` : "."}${memory ? " Close other GPU applications or request a smaller --size." : ""}`,
  });
}
// Always re-encodes: ComfyUI embeds the workflow, caption included, in its PNGs.
async function encoded(data: Uint8Array, format: "png" | "jpeg" | "webp") {
  try {
    const result = await sharp(data)
      .toFormat(format)
      .toBuffer({ resolveWithObject: true });
    return {
      data: result.data,
      width: result.info.width,
      height: result.info.height,
    };
  } catch {
    throw new ProviderError({
      kind: "malformed",
      message: "ComfyUI returned an invalid raster image.",
    });
  }
}
export class ComfyUIImageProvider implements IImageProvider {
  readonly name: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly http: EndpointHttp;
  private readonly pollIntervalMs: number;
  constructor(profile: EndpointProfile, options: ComfyUIOptions = {}) {
    const valid = validateProfile(profile);
    this.name = valid.name;
    this.baseUrl = valid.baseUrl;
    this.defaultModel = valid.model ?? FLUX3_KLEIN_MODELS[0].id;
    // A cold first image also loads about 18 GB of weights.
    this.http = new EndpointHttp(
      options.fetchImpl,
      options.timeoutSeconds ?? 600,
    );
    this.pollIntervalMs = options.pollIntervalMs ?? 500;
  }
  readonly sizePolicy = {
    resolveSize: (size: string | undefined) => {
      const resolved = flux3KleinSize(size);
      if (!resolved) return { size: "auto" };
      const { width, height } = resolved;
      return {
        width,
        height,
        pixels: width * height,
        size: `${width}x${height}`,
      };
    },
  };
  generate(request: GenerateRequest): Promise<ProviderResult> {
    return this.run(request, request.referenceImages ?? []);
  }
  async edit(request: EditRequest): Promise<ProviderResult> {
    if (request.mask)
      throw usage(
        "FLUX 3 Klein has no mask input. Describe the edit region in the prompt.",
      );
    return this.run(request, [
      request.sourceImage,
      ...(request.referenceImages ?? []),
    ]);
  }
  async models(): Promise<EndpointModel[]> {
    return this.reachable(() =>
      this.http.run(async (http) => {
        const models: EndpointModel[] = [];
        for (const { id, name, upsample } of FLUX3_KLEIN_MODELS)
          if (!(await this.missingWeights(http, { id, name, upsample })).length)
            models.push({
              id,
              name,
              capabilities: "reported",
              inputModalities: ["text", "image"],
              outputModalities: ["image"],
            });
        return models;
      }),
    );
  }
  private async run(
    request: GenerateRequest,
    images: ImageInput[],
  ): Promise<ProviderResult> {
    const requestedModel = (request.model ?? this.defaultModel).trim();
    const model = flux3KleinModel(requestedModel);
    const { count, format } = validateImageRequest(request, images);
    const steps = flux3KleinSteps(request.quality);
    const size = flux3KleinSize(request.size);
    return this.reachable(async () => {
      const missing = await this.http.run((http) =>
        this.missingWeights(http, model),
      );
      if (missing.length)
        throw new ProviderError({
          kind: "configuration",
          message: `ComfyUI is missing FLUX 3 Klein weights: ${missing.join(", ")}. Download them from black-forest-labs/flux-3-image-klein-comfy into its models folder.`,
        });
      const uploaded: string[] = [];
      for (const image of images) uploaded.push(await this.upload(image));
      const results: GeneratedImage[] = [];
      for (let i = 0; i < count; i++)
        results.push(
          await this.render(
            {
              prompt: request.prompt,
              upsample: model.upsample,
              images: uploaded,
              size,
              steps,
              seed: randomInt(0xffffffffffff),
            },
            format,
          ),
        );
      return { provider: this.name, requestedModel, images: results };
    });
  }
  private async reachable<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (e) {
      if (e instanceof ProviderError && e.kind === "transport")
        throw new ProviderError({
          kind: "transport",
          message: `ComfyUI is not reachable at ${this.baseUrl}. Start it and retry.`,
        });
      throw e;
    }
  }
  private async missingWeights(
    http: EndpointRequests,
    model: Flux3KleinModel,
  ): Promise<string[]> {
    const choices = new Map<string, unknown[]>();
    const missing: string[] = [];
    for (const weight of flux3KleinWeights(model)) {
      if (!choices.has(weight.node)) {
        const info = await http.json(
          `${this.baseUrl}/object_info/${weight.node}`,
        );
        const inputs = record(record(record(info[weight.node]).input).required);
        choices.set(weight.node, comboChoices(inputs[weight.input]));
      }
      if (!choices.get(weight.node)?.includes(weight.file))
        missing.push(`${weight.folder}/${weight.file}`);
    }
    return missing;
  }
  // The temp folder keeps inputs out of ComfyUI's library; it clears on restart.
  private upload(image: ImageInput): Promise<string> {
    return this.http.run(async (http) => {
      const form = new FormData();
      form.set(
        "image",
        new Blob([new Uint8Array(image.data)], { type: image.contentType }),
        `imagegen-${randomUUID()}.${EXTENSIONS[image.contentType]}`,
      );
      form.set("type", "temp");
      const body = await http.json(`${this.baseUrl}/upload/image`, {
        method: "POST",
        body: form,
      });
      if (typeof body.name !== "string")
        throw new ProviderError({
          kind: "malformed",
          message: "ComfyUI did not return an uploaded image name.",
        });
      return `${body.name} [temp]`;
    });
  }
  private render(
    job: Flux3KleinJob,
    format: "png" | "jpeg" | "webp",
  ): Promise<GeneratedImage> {
    return this.http.run(async (http) => {
      const queued = await http
        .json(`${this.baseUrl}/prompt`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt: flux3KleinWorkflow(job) }),
        })
        .catch((e: unknown) => {
          if (e instanceof ProviderError && e.statusCode === 400)
            throw new ProviderError({
              kind: "server",
              statusCode: 400,
              message:
                "ComfyUI rejected the FLUX 3 Klein workflow. Update it to v0.44 or later and check its console for the failing node.",
            });
          throw e;
        });
      if (typeof queued.prompt_id !== "string")
        throw new ProviderError({
          kind: "malformed",
          message: "ComfyUI did not return a prompt ID.",
        });
      const outputs = record(
        (await this.finished(http, queued.prompt_id)).outputs,
      );
      const images = record(outputs.output).images;
      const file = record(Array.isArray(images) ? images[0] : undefined);
      if (typeof file.filename !== "string")
        throw new ProviderError({
          kind: "no_image",
          message: "ComfyUI finished without an output image.",
        });
      const query = new URLSearchParams({
        filename: file.filename,
        subfolder: typeof file.subfolder === "string" ? file.subfolder : "",
        type: typeof file.type === "string" ? file.type : "temp",
      });
      const data = await http.bytes(`${this.baseUrl}/view?${query}`);
      const caption = record(outputs.caption).text;
      return {
        ...(await encoded(data, format)),
        mimeType: `image/${format}`,
        prompt:
          job.upsample && Array.isArray(caption) && typeof caption[0] === "string"
            ? caption[0]
            : job.prompt,
        responseId: queued.prompt_id,
        servedModel: FLUX3_KLEIN_CHECKPOINT,
        usage: {
          served: {
            steps: job.steps,
            seed: job.seed,
            upsampled: job.upsample,
          },
        },
      };
    });
  }
  private async finished(
    http: EndpointRequests,
    id: string,
  ): Promise<Record<string, unknown>> {
    for (;;) {
      const history = await http.json(`${this.baseUrl}/history/${id}`);
      const entry = record(history[id]);
      const status = record(entry.status);
      if (status.status_str === "error")
        throw executionFailure(status.messages);
      if (status.completed === true) return entry;
      await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
    }
  }
}
