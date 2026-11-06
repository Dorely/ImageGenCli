import type { GenerateRequest, ImageInput } from "@imagegencli/core";
import { usage } from "./profiles.js";
export function validateImageRequest(
  request: GenerateRequest,
  images: ImageInput[],
) {
  if ((request.referenceImages?.length ?? 0) > 4)
    throw usage("At most four reference images are allowed.");
  const count = request.count ?? 1;
  if (!Number.isInteger(count) || count < 1 || count > 4)
    throw usage("Image count must be from 1 to 4.");
  for (const image of images)
    if (!["image/png", "image/jpeg", "image/webp"].includes(image.contentType))
      throw usage("Input images must be PNG, JPEG, or WebP.");
  const format = (request.format ?? "png")
    .trim()
    .toLowerCase()
    .replace(/^jpg$/, "jpeg");
  if (!["png", "jpeg", "webp"].includes(format))
    throw usage("Output format must be png, jpeg, or webp.");
  return { count, format: format as "png" | "jpeg" | "webp" };
}
