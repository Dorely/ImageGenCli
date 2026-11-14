import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { EditRequest, GenerateRequest, ProviderResult } from "@imagegencli/core";

// One JSON line per provider result when the usage-log config setting names a file.
// Records metering and request shape only: no prompts, image bytes, or credentials.
export function usageLogEntry(request: GenerateRequest, edit: EditRequest | undefined, result: ProviderResult, paths: string[]): Record<string, unknown> {
  return {
    timestamp: new Date().toISOString(),
    command: edit ? "edit" : "generate",
    provider: result.provider,
    requestedModel: result.requestedModel,
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
      servedModel: image.servedModel ?? null,
      usage: image.usage,
    })),
  };
}

export async function appendUsageLog(path: string, entry: Record<string, unknown>): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${JSON.stringify(entry)}\n`, "utf8");
}
