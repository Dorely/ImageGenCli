import type { GenerateRequest, ImageInput } from "@imagegencli/core";
import { imageSize } from "./image-size.js";
export function openAIRequest(
  model: string,
  request: GenerateRequest,
  images: ImageInput[],
  mask?: ImageInput,
) {
  const fields = {
    model,
    prompt: request.prompt,
    n: 1,
    ...imageSize(request.size, "openai-images"),
    ...(request.quality && request.quality !== "auto"
      ? { quality: request.quality }
      : {}),
    ...(request.format
      ? { output_format: request.format === "jpg" ? "jpeg" : request.format }
      : {}),
  };
  if (!images.length)
    return {
      path: "images/generations",
      body: JSON.stringify(fields),
      json: true,
    };
  const body = new FormData();
  for (const [key, value] of Object.entries(fields))
    body.set(key, String(value));
  const add = (name: string, image: ImageInput, index: number) =>
    body.append(
      name,
      new Blob([new Uint8Array(image.data)], { type: image.contentType }),
      image.filename ?? `image-${index}.png`,
    );
  images.forEach((image, i) =>
    add(images.length === 1 ? "image" : "image[]", image, i),
  );
  if (mask) add("mask", mask, 0);
  return { path: "images/edits", body, json: false };
}
