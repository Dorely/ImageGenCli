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
import {
  fillWorkflow,
  loadWorkflow,
  type ComfyGraph,
} from "./comfyui-workflow.js";
import { EndpointHttp, record, type EndpointRequests } from "./http.js";
import { comfySize } from "./image-size.js";
import { usage, validateProfile, type EndpointProfile } from "./profiles.js";
import { validateImageRequest } from "./validation.js";
import {
  FLUX3_KLEIN_CHECKPOINT,
  FLUX3_KLEIN_MODELS,
  flux3KleinModel,
  flux3KleinSteps,
  flux3KleinWeights,
  flux3KleinWorkflow,
  type Flux3KleinModel,
} from "./flux3-klein.js";
import type { EndpointModel, EndpointOptions } from "./provider.js";
export interface ComfyUIOptions extends EndpointOptions {
  pollIntervalMs?: number;
}
interface ComfyPlan {
  model: string;
  preflight(http: EndpointRequests): Promise<void>;
  graph(images: string[], seed: number): ComfyGraph;
  described(
    outputs: Record<string, unknown>,
    seed: number,
  ): Pick<GeneratedImage, "prompt" | "servedModel" | "usage">;
}
const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
// ComfyUI reports loader files as [[...]] or ["COMBO", { options: [...] }].
function comboOptions(spec: unknown): unknown[] | undefined {
  if (!Array.isArray(spec)) return undefined;
  const choices = spec[0] === "COMBO" ? record(spec[1]).options : spec[0];
  return Array.isArray(choices) ? choices : undefined;
}
const comboChoices = (spec: unknown): unknown[] => comboOptions(spec) ?? [];
async function sourceShape(image: ImageInput) {
  try {
    const { width, height } = await sharp(image.data).metadata();
    return comfySize(`${width}:${height}`);
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    throw usage("Could not read the source image's dimensions.");
  }
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
  private readonly profile: EndpointProfile;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly http: EndpointHttp;
  private readonly pollIntervalMs: number;
  constructor(profile: EndpointProfile, options: ComfyUIOptions = {}) {
    const valid = validateProfile(profile);
    this.profile = valid;
    this.name = valid.name;
    this.baseUrl = valid.baseUrl;
    this.defaultModel = valid.model as string;
    // A cold first image also loads the model's weights.
    this.http = new EndpointHttp(
      options.fetchImpl,
      options.timeoutSeconds ?? 600,
    );
    this.pollIntervalMs = options.pollIntervalMs ?? 500;
  }
  readonly sizePolicy = {
    resolveSize: (size: string | undefined) => {
      const resolved = comfySize(size);
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
        "ComfyUI profiles have no mask input. Describe the edit region in the prompt.",
      );
    return this.run(request, [
      request.sourceImage,
      ...(request.referenceImages ?? []),
    ]);
  }
  private get usesWorkflowFiles(): boolean {
    return Boolean(this.profile.workflow || this.profile.editWorkflow);
  }
  async models(): Promise<EndpointModel[]> {
    if (this.usesWorkflowFiles) {
      const { workflow, editWorkflow } = this.profile;
      const files = await Promise.all(
        [workflow, editWorkflow].flatMap((f) => (f ? [loadWorkflow(f)] : [])),
      );
      return this.reachable(() =>
        this.http.run(async (http) => {
          for (const file of files) await this.requireInputs(http, file.graph);
          return [
            {
              id: this.defaultModel,
              name: `${this.defaultModel}, from this profile's workflow files`,
              capabilities: "reported",
              inputModalities: editWorkflow ? ["text", "image"] : ["text"],
              outputModalities: ["image"],
            },
          ];
        }),
      );
    }
    flux3KleinModel(this.defaultModel);
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
    const { count, format } = validateImageRequest(request, images);
    const plan = this.usesWorkflowFiles
      ? await this.workflowPlan(request, images)
      : this.kleinPlan(request);
    return this.reachable(async () => {
      await this.http.run((http) => plan.preflight(http));
      const uploaded: string[] = [];
      for (const image of images) uploaded.push(await this.upload(image));
      const results: GeneratedImage[] = [];
      for (let i = 0; i < count; i++)
        results.push(
          await this.render(
            plan,
            uploaded,
            randomInt(0xffffffffffff),
            format,
          ),
        );
      return {
        provider: this.name,
        requestedModel: plan.model,
        images: results,
      };
    });
  }
  private kleinPlan(request: GenerateRequest): ComfyPlan {
    const model = flux3KleinModel((request.model ?? this.defaultModel).trim());
    const steps = flux3KleinSteps(request.quality);
    const size = comfySize(request.size);
    return {
      model: model.id,
      preflight: async (http) => {
        const missing = await this.missingWeights(http, model);
        if (missing.length)
          throw new ProviderError({
            kind: "configuration",
            message: `ComfyUI is missing FLUX 3 Klein weights: ${missing.join(", ")}. Download them from black-forest-labs/flux-3-image-klein-comfy into its models folder.`,
          });
      },
      graph: (images, seed) =>
        flux3KleinWorkflow({
          prompt: request.prompt,
          upsample: model.upsample,
          images,
          size,
          steps,
          seed,
        }),
      described: (outputs, seed) => {
        const caption = record(outputs.caption).text;
        return {
          prompt:
            model.upsample &&
            Array.isArray(caption) &&
            typeof caption[0] === "string"
              ? caption[0]
              : request.prompt,
          servedModel: FLUX3_KLEIN_CHECKPOINT,
          usage: { served: { steps, seed, upsampled: model.upsample } },
        };
      },
    };
  }
  private async workflowPlan(
    request: GenerateRequest,
    images: ImageInput[],
  ): Promise<ComfyPlan> {
    const model = this.defaultModel;
    if (request.model && request.model.trim() !== model)
      throw usage(
        `Profile ${this.name} renders ${model} from its workflow files. Update the profile to change models.`,
      );
    if ((request.quality ?? "auto").trim().toLowerCase() !== "auto")
      throw usage(
        "Workflow files set their own sampling, so only --quality auto applies.",
      );
    const path = images.length
      ? this.profile.editWorkflow
      : this.profile.workflow;
    if (!path)
      throw usage(
        images.length
          ? `Profile ${this.name} has no --edit-workflow, so it cannot take input images.`
          : `Profile ${this.name} has no --workflow, so it needs a source image.`,
      );
    const workflow = await loadWorkflow(path);
    if (workflow.images !== images.length)
      throw usage(
        `This workflow takes ${workflow.images} input images, but the request has ${images.length}.`,
      );
    const requested = comfySize(request.size);
    if (requested && !workflow.sized)
      throw usage(
        "This workflow has fixed dimensions, so only --size auto applies.",
      );
    const size = !workflow.sized
      ? undefined
      : (requested ??
        (images[0]
          ? await sourceShape(images[0])
          : { width: 1024, height: 1024 }));
    return {
      model,
      preflight: (http) => this.requireInputs(http, workflow.graph),
      graph: (uploaded, seed) =>
        fillWorkflow(workflow, {
          prompt: request.prompt,
          seed,
          size,
          images: uploaded,
        }),
      described: (_, seed) => ({
        prompt: request.prompt,
        servedModel: model,
        usage: { served: { seed } },
      }),
    };
  }
  private async reachable<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (e) {
      if (e instanceof ProviderError && e.kind === "transport") {
        const start = this.profile.startCommand;
        throw new ProviderError({
          kind: "transport",
          message: `ComfyUI is not reachable at ${this.baseUrl}. Start it${start ? ` with \`${start}\`` : ""} and retry.`,
        });
      }
      throw e;
    }
  }
  // Names what a workflow file needs instead of queueing a doomed job.
  private async requireInputs(
    http: EndpointRequests,
    graph: ComfyGraph,
  ): Promise<void> {
    const specs = new Map<string, Record<string, unknown>>();
    const missing = new Set<string>();
    for (const node of Object.values(graph)) {
      if (!specs.has(node.class_type)) {
        const info = await http.json(
          `${this.baseUrl}/object_info/${encodeURIComponent(node.class_type)}`,
        );
        specs.set(node.class_type, record(info[node.class_type]));
      }
      const spec = record(specs.get(node.class_type));
      if (!Object.keys(spec).length) {
        missing.add(`node type ${node.class_type}`);
        continue;
      }
      const inputs = {
        ...record(record(spec.input).required),
        ...record(record(spec.input).optional),
      };
      for (const [name, value] of Object.entries(node.inputs)) {
        if (typeof value !== "string" || value.includes("{{")) continue;
        if (comboOptions(inputs[name])?.includes(value) === false)
          missing.add(`${value} for ${node.class_type}.${name}`);
      }
    }
    if (missing.size)
      throw new ProviderError({
        kind: "configuration",
        message: `ComfyUI is missing what this workflow needs: ${[...missing].join(", ")}. Install it under ComfyUI, restart the server, and retry.`,
      });
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
    plan: ComfyPlan,
    images: string[],
    seed: number,
    format: "png" | "jpeg" | "webp",
  ): Promise<GeneratedImage> {
    return this.http.run(async (http) => {
      const queued = await http
        .json(`${this.baseUrl}/prompt`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt: plan.graph(images, seed) }),
        })
        .catch((e: unknown) => {
          if (e instanceof ProviderError && e.statusCode === 400)
            throw new ProviderError({
              kind: "server",
              statusCode: 400,
              message: `ComfyUI rejected the ${plan.model} workflow. Check its console for the failing node, and update ComfyUI if a node is unknown.`,
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
      const saved = Object.values(outputs)
        .map((output) => record(output).images)
        .find((list) => Array.isArray(list) && list.length);
      const file = record(Array.isArray(saved) ? saved[0] : undefined);
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
      return {
        ...(await encoded(data, format)),
        mimeType: `image/${format}`,
        responseId: queued.prompt_id,
        ...plan.described(outputs, seed),
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
