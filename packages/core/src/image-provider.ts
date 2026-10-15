import type { EditRequest, GenerateRequest, ProviderResult } from "./types.js";

export type ImageSizeResolution =
  | { width: number; height: number; size: string; pixels: number }
  | { size: string; width?: never; height?: never; pixels?: never };

export interface ImageSizePolicy {
  resolveSize(size: string | undefined): ImageSizeResolution;
}

export interface IImageProvider {
  readonly name: string;
  readonly sizePolicy: ImageSizePolicy;
  generate(request: GenerateRequest): Promise<ProviderResult>;
  edit(request: EditRequest): Promise<ProviderResult>;
}
