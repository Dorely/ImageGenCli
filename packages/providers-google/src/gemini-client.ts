import sharp from "sharp";
import {
  MAX_REFERENCE_IMAGES,
  normalizeOutputFormat,
  ProviderError,
  type GenerateRequest,
  type EditRequest,
  type ImageInput,
  type ProviderResult,
} from "@imagegencli/core";
import { DEFAULT_IMAGE_MODEL, resolveGeminiSize } from "./image-size.js";
export interface GeminiClientOptions {
  imageModel?: string;
  timeoutSeconds?: number;
  fetchImpl?: typeof fetch;
}
const error = (kind: string, message: string, statusCode?: number) =>
  new ProviderError({ kind, message, statusCode });
export class GeminiImageProvider {
  readonly name = "gemini";
  readonly sizePolicy = {
    resolveSize: (size: string | undefined) =>
      resolveGeminiSize(size, this.options.imageModel),
  };
  constructor(
    private readonly getKey: () => Promise<string>,
    private readonly options: GeminiClientOptions = {},
  ) {}
  generate(request: GenerateRequest): Promise<ProviderResult> {
    return this.run(request, request.referenceImages ?? []);
  }
  edit(request: EditRequest): Promise<ProviderResult> {
    if (request.mask)
      throw error(
        "usage",
        "Gemini does not support --mask. Describe the region to edit in the prompt.",
      );
    return this.run(request, [
      request.sourceImage,
      ...(request.referenceImages ?? []),
    ]);
  }
  private async run(
    request: GenerateRequest,
    inputs: ImageInput[],
  ): Promise<ProviderResult> {
    const model = (
      request.model ??
      this.options.imageModel ??
      process.env["IMAGEGEN_GEMINI_IMAGE_MODEL"] ??
      DEFAULT_IMAGE_MODEL
    ).trim();
    if (!model) throw error("usage", "Image model must not be blank.");
    if (request.quality && request.quality.trim().toLowerCase() !== "auto")
      throw error(
        "usage",
        "Gemini supports only --quality auto. Use --size to select native resolution.",
      );
    if ((request.referenceImages?.length ?? 0) > MAX_REFERENCE_IMAGES)
      throw error("usage", "At most four reference images are allowed.");
    if (model === "gemini-2.5-flash-image" && inputs.length > 3)
      throw error(
        "usage",
        "gemini-2.5-flash-image supports up to three input images in this tool, including the edit source.",
      );
    if (
      inputs.some(
        (i) =>
          !["image/png", "image/jpeg", "image/webp"].includes(i.contentType),
      )
    )
      throw error("usage", "Gemini inputs must be PNG, JPEG, or WebP.");
    const count = request.count ?? 1;
    if (!Number.isInteger(count) || count < 1 || count > 4)
      throw error("usage", "Image count must be from 1 to 4.");
    if (
      request.format &&
      !["png", "jpeg", "jpg", "webp"].includes(
        request.format.trim().toLowerCase(),
      )
    )
      throw error("usage", "Output format must be png, jpeg, or webp.");
    const format = normalizeOutputFormat(request.format);
    const size = resolveGeminiSize(request.size, model);
    const payload = {
      model,
      store: false,
      stream: false,
      input: [
        { type: "text", text: request.prompt },
        ...inputs.map((i) => ({
          type: "image",
          mime_type: i.contentType,
          data: Buffer.from(i.data).toString("base64"),
        })),
      ],
      response_format: {
        type: "image",
        delivery: "inline",
        ...(format === "jpeg" ? { mime_type: "image/jpeg" } : {}),
        ...(size.aspectRatio ? { aspect_ratio: size.aspectRatio } : {}),
        ...(size.imageSize ? { image_size: size.imageSize } : {}),
      },
    };
    if (Buffer.byteLength(JSON.stringify(payload)) > 20_000_000)
      throw error(
        "usage",
        "Gemini inline request exceeds 20 MB. Use smaller reference images.",
      );
    let key: string;
    try {
      key = await this.getKey();
    } catch {
      throw error(
        "auth",
        "Could not load Gemini credentials. Run imagegen auth gemini login.",
      );
    }
    const images: ProviderResult["images"] = [];
    for (let i = 0; i < count; i++)
      images.push(await this.send(payload, key, format, request.prompt));
    return { provider: this.name, imageModel: model, images };
  }
  private async send(
    payload: unknown,
    key: string,
    format: "png" | "jpeg" | "webp",
    prompt: string,
  ): Promise<ProviderResult["images"][number]> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      (this.options.timeoutSeconds ?? 180) * 1000,
    );
    try {
      const response = await (this.options.fetchImpl ?? fetch)(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": key,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        const status = response.status;
        const failure = (await response.json().catch(() => null)) as {
          error?: { details?: { reason?: string }[] };
        } | null;
        const invalidKey =
          Array.isArray(failure?.error?.details) &&
          failure.error.details.some(
            (detail) =>
              detail.reason === "API_KEY_INVALID" ||
              detail.reason === "API_KEY_EXPIRED",
          );
        throw error(
          invalidKey || status === 401 || status === 403
            ? "auth"
            : status === 429
              ? "rate_limit"
              : status >= 500
                ? "server"
                : "usage",
          invalidKey || status === 401 || status === 403
            ? "Gemini rejected the API key or access. Check project access and run imagegen auth gemini login."
            : `Gemini returned HTTP ${status}. Check model access, request options, and project quota.`,
          status,
        );
      }
      const body = (await response.json().catch(() => {
        throw error("malformed", "Gemini returned invalid JSON.");
      })) as {
        status?: string;
        id?: string;
        steps?: {
          type?: string;
          content?: {
            type?: string;
            data?: string;
            mime_type?: string;
            thought?: boolean;
          }[];
        }[];
      };
      if (!body || typeof body !== "object")
        throw error("malformed", "Gemini returned an invalid interaction.");
      if (body.status !== "completed")
        throw error(
          body.status === "failed" ? "blocked" : "incomplete",
          "Gemini did not complete the image request. Check the prompt and model access.",
        );
      if (body.steps !== undefined && !Array.isArray(body.steps))
        throw error("malformed", "Gemini returned invalid output steps.");
      if (
        (body.steps ?? []).some(
          (step) =>
            !step ||
            typeof step !== "object" ||
            (step.content !== undefined && !Array.isArray(step.content)),
        )
      ) {
        throw error("malformed", "Gemini returned invalid output content.");
      }
      const parts = (body.steps ?? [])
        .filter((s) => s.type === "model_output")
        .flatMap((s) => s.content ?? [])
        .filter((p) => p && p.type === "image" && !p.thought);
      const image = parts.at(-1);
      if (!image)
        throw error(
          "no_image",
          "Gemini returned no final image. Refine the image request and try again.",
        );
      if (
        typeof image.data !== "string" ||
        !image.data ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(image.data) ||
        image.data.length % 4 !== 0
      )
        throw error("malformed", "Gemini returned invalid inline image data.");
      const original = Buffer.from(image.data, "base64");
      const metadata = await sharp(original)
        .metadata()
        .catch(() => {
          throw error("malformed", "Gemini returned undecodable image bytes.");
        });
      if (
        !metadata.width ||
        !metadata.height ||
        !["png", "jpeg", "webp"].includes(metadata.format ?? "") ||
        image.mime_type !== `image/${metadata.format}`
      )
        throw error(
          "malformed",
          "Gemini returned an invalid image or inconsistent MIME type.",
        );
      const data =
        metadata.format === format
          ? original
          : await sharp(original).toFormat(format).toBuffer();
      return {
        data,
        mimeType: `image/${format}`,
        width: metadata.width,
        height: metadata.height,
        prompt,
        responseId: typeof body.id === "string" ? body.id : undefined,
      };
    } catch (e) {
      if (controller.signal.aborted)
        throw error(
          "timeout",
          "Gemini image request timed out. Try again when connectivity is restored.",
        );
      if (e instanceof ProviderError) throw e;
      throw error(
        "transport",
        "Gemini request failed while receiving or decoding the image. Check connectivity and try again.",
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
