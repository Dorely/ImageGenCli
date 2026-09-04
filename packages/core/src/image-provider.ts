import type { EditRequest, GenerateRequest, ProviderResult } from "./types.js";

export interface ImageSizePolicy {
  resolveSize(size: string | undefined): { width: number; height: number; size: string; pixels: number };
}

export interface IImageProvider {
  readonly name: string;
  readonly sizePolicy: ImageSizePolicy;
  generate(request: GenerateRequest): Promise<ProviderResult>;
  edit(request: EditRequest): Promise<ProviderResult>;
}
