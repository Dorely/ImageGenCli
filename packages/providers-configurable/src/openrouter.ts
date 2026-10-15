import type { GenerateRequest, ImageInput } from "@imagegencli/core";
import { imageSize } from "./image-size.js";
export function openRouterRequest(
  model: string,
  request: GenerateRequest,
  images: ImageInput[],
) {
  return {
    path: "images",
    body: JSON.stringify({
      model,
      prompt: request.prompt,
      n: 1,
      ...imageSize(request.size, "openrouter"),
      ...(request.quality && request.quality !== "auto"
        ? { quality: request.quality }
        : {}),
      ...(request.format
        ? { output_format: request.format === "jpg" ? "jpeg" : request.format }
        : {}),
      ...(images.length
        ? {
            input_references: images.map((image) => ({
              type: "image_url",
              image_url: {
                url: `data:${image.contentType};base64,${Buffer.from(image.data).toString("base64")}`,
              },
            })),
          }
        : {}),
    }),
    json: true,
  };
}
