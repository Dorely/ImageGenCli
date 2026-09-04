import type { EditRequest, GenerateRequest, ProviderResult } from "./types.js";

export interface IImageProvider {
  readonly name: string;
  generate(request: GenerateRequest): Promise<ProviderResult>;
  edit(request: EditRequest): Promise<ProviderResult>;
}
