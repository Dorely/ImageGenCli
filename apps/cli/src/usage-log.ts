import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { EditRequest, GenerateRequest, ProviderResult } from "@imagegencli/core";

export const USAGE_LOG_ENV = "IMAGEGEN_USAGE_LOG";

// One JSON line per provider result when IMAGEGEN_USAGE_LOG names a file.
// Records metering and request shape only: no prompts, image bytes, or credentials.
export function usageLogEntry(request: GenerateRequest, edit: EditRequest | undefined, result: ProviderResult, paths: string[]): Record<string, unknown> {
  return {
    timestamp: new Date().toISOString(),
    command: edit ? "edit" : "generate",
    provider: result.provider,
    imageModel: result.imageModel,
    requested: {
      size: request.size ?? "auto",
      quality: request.quality ?? "auto",
      format: request.format ?? "png",
      count: request.count ?? 1,
      references: request.referenceImages?.length ?? 0,
      mask: edit ? edit.mask !== undefined : undefined,
    },
    images: result.images.map((image, i) => ({
      path: paths[i],
      width: image.width,
      height: image.height,
      bytes: image.data.byteLength,
      responseId: image.responseId,
      promptRevised: image.revisedPrompt === undefined ? undefined : image.revisedPrompt !== image.prompt,
      usage: image.usage,
    })),
  };
}

export async function appendUsageLog(entry: Record<string, unknown>): Promise<string | undefined> {
  const target = process.env[USAGE_LOG_ENV]?.trim();
  if (!target) return undefined;
  const path = resolve(target);
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${JSON.stringify(entry)}\n`, "utf8");
  return path;
}
