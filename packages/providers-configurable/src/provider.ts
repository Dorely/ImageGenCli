import sharp from "sharp";
import {
  ProviderError,
  type GenerateRequest,
  type EditRequest,
  type ImageInput,
  type ProviderResult,
  type IImageProvider,
  type ProviderEntry,
} from "@imagegencli/core";
import {
  profileStore,
  profileKey,
  validateProfile,
  usage,
  validateApiKey,
  type EndpointProfile,
} from "./profiles.js";
import { imageSize } from "./image-size.js";
import { EndpointHttp, record } from "./http.js";
import { openRouterRequest } from "./openrouter.js";
import { openAIRequest } from "./openai-images.js";
export interface EndpointModel {
  id: string;
  name?: string;
  capabilities: "reported" | "unknown";
  supportedParameters?: Record<string, unknown>;
  inputModalities?: string[];
  outputModalities?: string[];
}
export interface EndpointOptions {
  fetchImpl?: typeof fetch;
  timeoutSeconds?: number;
}
export class ConfigurableImageProvider implements IImageProvider {
  readonly name: string;
  private readonly profile: EndpointProfile;
  private readonly http: EndpointHttp;
  constructor(
    profile: EndpointProfile,
    private readonly getKey: () => Promise<string | undefined>,
    options: EndpointOptions = {},
  ) {
    this.profile = validateProfile(profile);
    this.name = profile.name;
    this.http = new EndpointHttp(options.fetchImpl, options.timeoutSeconds);
  }
  readonly sizePolicy = {
    resolveSize: (size: string | undefined) => {
      const fields = imageSize(size, this.profile.api);
      if (!fields.size) return { size: fields.aspect_ratio ?? "auto" };
      const [width, height] = fields.size.split("x").map(Number);
      return {
        width,
        height,
        pixels: width * height,
        size: fields.size ?? fields.aspect_ratio ?? "auto",
      };
    },
  };
  generate(request: GenerateRequest): Promise<ProviderResult> {
    return this.run(request, request.referenceImages ?? []);
  }
  edit(request: EditRequest): Promise<ProviderResult> {
    return this.run(
      request,
      [request.sourceImage, ...(request.referenceImages ?? [])],
      request.mask,
    );
  }
  private async headers(): Promise<Record<string, string>> {
    if (this.profile.auth === "none") return {};
    try {
      const key = await this.getKey();
      if (!key) throw new Error();
      return { authorization: `Bearer ${validateApiKey(key)}` };
    } catch {
      throw new ProviderError({
        kind: "auth",
        message: `Could not load endpoint credentials. Run imagegen auth ${this.name} login.`,
      });
    }
  }
  async models(): Promise<EndpointModel[]> {
    const headers = await this.headers();
    return this.http.run(async (http) => {
      const body = await http.json(
        `${this.profile.baseUrl}/${this.profile.api === "openrouter" ? "images/models" : "models"}`,
        { headers },
      );
      if (!Array.isArray(body.data))
        throw new ProviderError({
          kind: "malformed",
          message: "Model discovery response must contain a data array.",
        });
      return body.data.map((value) => {
        const model = record(value);
        if (typeof model.id !== "string")
          throw new ProviderError({
            kind: "malformed",
            message: "Discovered model has no string ID.",
          });
        const architecture = record(model.architecture);
        const supported = record(model.supported_parameters);
        const strings = (v: unknown) =>
          Array.isArray(v) && v.every((s) => typeof s === "string")
            ? (v as string[])
            : undefined;
        return {
          id: model.id,
          ...(typeof model.name === "string" ? { name: model.name } : {}),
          capabilities:
            this.profile.api === "openrouter" ? "reported" : "unknown",
          ...(this.profile.api === "openrouter"
            ? {
                supportedParameters: supported,
                inputModalities: strings(architecture.input_modalities),
                outputModalities: strings(architecture.output_modalities),
              }
            : {}),
        };
      });
    });
  }
  private async run(
    request: GenerateRequest,
    images: ImageInput[],
    mask?: ImageInput,
  ): Promise<ProviderResult> {
    const model = (request.model ?? this.profile.model ?? "").trim();
    if (!model)
      throw usage(
        "Supply --model or configure a default model with providers update.",
      );
    if ((request.referenceImages?.length ?? 0) > 4)
      throw usage("At most four reference images are allowed.");
    const count = request.count ?? 1;
    if (!Number.isInteger(count) || count < 1 || count > 4)
      throw usage("Image count must be from 1 to 4.");
    if (mask && this.profile.api === "openrouter")
      throw usage(
        "OpenRouter image API does not expose masks. Describe the edit region in the prompt.",
      );
    for (const image of [...images, ...(mask ? [mask] : [])])
      if (
        !["image/png", "image/jpeg", "image/webp"].includes(image.contentType)
      )
        throw usage("Input images must be PNG, JPEG, or WebP.");
    const format = (request.format ?? "png")
      .trim()
      .toLowerCase()
      .replace(/^jpg$/, "jpeg");
    if (!["png", "jpeg", "webp"].includes(format))
      throw usage("Output format must be png, jpeg, or webp.");
    const quality = request.quality?.trim().toLowerCase();
    if (quality && !/^[a-z][a-z0-9_-]*$/.test(quality))
      throw usage("Quality must be a provider-supported quality name.");
    const normalized = {
      ...request,
      ...(request.format ? { format } : {}),
      quality,
    };
    const payload =
      this.profile.api === "openrouter"
        ? openRouterRequest(model, normalized, images)
        : openAIRequest(model, normalized, images, mask);
    const headers = await this.headers();
    const results: ProviderResult["images"] = [];
    for (let i = 0; i < count; i++)
      results.push(
        await this.http.run(async (http) => {
          const body = await http.json(
            `${this.profile.baseUrl}/${payload.path}`,
            {
              method: "POST",
              headers: {
                ...headers,
                ...(payload.json ? { "content-type": "application/json" } : {}),
              },
              body: payload.body,
            },
          );
          if (!Array.isArray(body.data) || body.data.length !== 1)
            throw new ProviderError({
              kind: "malformed",
              message:
                "Endpoint must return exactly one image for a single-image request.",
            });
          const image = record(body.data[0]);
          let data: Uint8Array;
          if (typeof image.b64_json === "string") {
            if (
              !image.b64_json ||
              image.b64_json.length % 4 !== 0 ||
              !/^[A-Za-z0-9+/]+={0,2}$/.test(image.b64_json)
            )
              throw new ProviderError({
                kind: "malformed",
                message: "Endpoint returned invalid base64 image data.",
              });
            data = Buffer.from(image.b64_json, "base64");
          } else if (typeof image.url === "string") {
            let url: URL;
            try {
              url = new URL(image.url);
            } catch {
              throw new ProviderError({
                kind: "malformed",
                message: "Endpoint returned an invalid image URL.",
              });
            }
            if (
              (headers.authorization &&
                image.url.includes(headers.authorization.slice(7))) ||
              url.username ||
              url.password ||
              (url.protocol !== "https:" &&
                !(
                  url.protocol === "http:" &&
                  ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
                ))
            )
              throw new ProviderError({
                kind: "malformed",
                message:
                  "Image download URL must use HTTPS or loopback HTTP without embedded credentials.",
              });
            data = await http.bytes(url.toString());
          } else
            throw new ProviderError({
              kind: "no_image",
              message: "Endpoint returned no image bytes or download URL.",
            });
          try {
            const metadata = await sharp(data).metadata();
            if (
              !metadata.width ||
              !metadata.height ||
              !["png", "jpeg", "webp"].includes(metadata.format ?? "") ||
              (typeof image.media_type === "string" &&
                image.media_type !== `image/${metadata.format}`)
            )
              throw new Error();
            // Decode to verify that a valid header is not concealing truncated pixels.
            await sharp(data).stats();
            if (metadata.format !== format)
              data = await sharp(data)
                .toFormat(format as "png" | "jpeg" | "webp")
                .toBuffer();
            return {
              data,
              width: metadata.width,
              height: metadata.height,
              mimeType: `image/${format}`,
              prompt: request.prompt,
              ...(typeof body.id === "string" ? { responseId: body.id } : {}),
            };
          } catch {
            throw new ProviderError({
              kind: "malformed",
              message:
                "Endpoint returned an invalid raster image or inconsistent image format.",
            });
          }
        }),
      );
    return { provider: this.name, imageModel: model, images: results };
  }
}
export function createProfileEntry(profile: EndpointProfile): ProviderEntry {
  return {
    provider: new ConfigurableImageProvider(profile, async () =>
      profileKey(profile, await profileStore()),
    ),
    authStatus: async () => {
      let configured = profile.auth === "none";
      if (!configured)
        try {
          await profileKey(profile, await profileStore());
          configured = true;
        } catch {
          /* No network request for local status. */
        }
      return {
        name: profile.name,
        configured,
        detail: `Run imagegen auth ${profile.name} login.`,
      };
    },
  };
}
