export type OutputFormat = "png" | "jpeg" | "webp";
export type ImageBackground = "auto" | "opaque" | "transparent";

export interface ImageInput {
  data: Uint8Array;
  contentType: string;
  filename?: string;
}

export interface GenerateRequest {
  prompt: string;
  model?: string;
  background?: ImageBackground;
  size?: string;
  quality?: string;
  format?: string;
  count?: number;
  out: string;
  referenceImages?: ImageInput[];
}

export interface EditRequest extends GenerateRequest {
  sourceImage: ImageInput;
  mask?: ImageInput;
}

export interface GeneratedImage {
  data: Uint8Array;
  mimeType: string;
  width: number;
  height: number;
  prompt: string;
  responseId?: string;
  callId?: string;
}

export interface ProviderResult {
  provider: string;
  imageModel: string;
  images: GeneratedImage[];
}

export interface ProviderErrorDetails {
  kind: string;
  message: string;
  statusCode?: number;
  requestId?: string;
  responseId?: string;
}

export class ProviderError extends Error {
  readonly kind: string;
  readonly statusCode?: number;
  readonly requestId?: string;
  readonly responseId?: string;

  constructor(details: ProviderErrorDetails) {
    super(details.message);
    this.name = "ProviderError";
    this.kind = details.kind;
    this.statusCode = details.statusCode;
    this.requestId = details.requestId;
    this.responseId = details.responseId;
  }
}

export const MAX_REFERENCE_IMAGES = 4;
export const MAX_IMAGE_COUNT = 4;
export const MIN_IMAGE_COUNT = 1;
