import {
  FLUX3_KLEIN_EDIT_PROMPT,
  FLUX3_KLEIN_GENERATE_PROMPT,
} from "./flux3-klein-prompts.js";
import { imageSize } from "./image-size.js";
import { usage } from "./profiles.js";
export interface ComfyNode {
  class_type: string;
  inputs: Record<string, unknown>;
}
export interface Flux3KleinModel {
  id: string;
  name: string;
  upsample: boolean;
}
export interface Flux3KleinJob {
  prompt: string;
  upsample: boolean;
  // ComfyUI LoadImage values, source image first. Empty for text-to-image.
  images: string[];
  size?: { width: number; height: number };
  steps: number;
  seed: number;
}
export const FLUX3_KLEIN_CHECKPOINT = "flux3-image-klein-int8-convrot";
export const FLUX3_KLEIN_MODELS: Flux3KleinModel[] = [
  {
    id: "flux3-klein",
    name: "FLUX 3 Klein, prompt expanded by its upsampler",
    upsample: true,
  },
  {
    id: "flux3-klein-raw",
    name: "FLUX 3 Klein, prompt used verbatim as the full caption",
    upsample: false,
  },
];
const UPSAMPLER = "qwen3.5_9b_flux3_prompt_upsampler_w4a8.safetensors";
const ENCODER = "qwen3vl_4b_int8_convrot.safetensors";
const VAE = "flux2-vae.safetensors";
const WEIGHTS = [
  {
    node: "UNETLoader",
    input: "unet_name",
    folder: "diffusion_models",
    file: `${FLUX3_KLEIN_CHECKPOINT}.safetensors`,
  },
  {
    node: "CLIPLoader",
    input: "clip_name",
    folder: "text_encoders",
    file: ENCODER,
  },
  {
    node: "VAELoader",
    input: "vae_name",
    folder: "vae",
    file: VAE,
  },
];
export const flux3KleinWeights = (model: Flux3KleinModel) =>
  model.upsample
    ? [
        ...WEIGHTS,
        {
          node: "CLIPLoader",
          input: "clip_name",
          folder: "text_encoders",
          file: UPSAMPLER,
        },
      ]
    : WEIGHTS;
export function flux3KleinModel(id: string): Flux3KleinModel {
  const model = FLUX3_KLEIN_MODELS.find((m) => m.id === id);
  if (!model)
    throw usage(
      `ComfyUI profiles support ${FLUX3_KLEIN_MODELS.map((m) => m.id).join(" and ")}.`,
    );
  return model;
}
const STEPS: Record<string, number> = { low: 4, medium: 8, high: 16, auto: 16 };
export function flux3KleinSteps(quality: string | undefined): number {
  const steps = STEPS[(quality ?? "auto").trim().toLowerCase()];
  if (!steps) throw usage("Quality must be low, medium, high, or auto.");
  return steps;
}
export function flux3KleinSize(
  value: string | undefined,
): Flux3KleinJob["size"] {
  const fields = imageSize(value, "comfyui");
  let width: number, height: number;
  if (fields.aspect_ratio) {
    const [w, h] = fields.aspect_ratio.split(":").map(Number);
    const scale = Math.sqrt((1024 * 1024) / (w * h));
    [width, height] = [w * scale, h * scale];
  } else if (fields.size) [width, height] = fields.size.split("x").map(Number);
  else return undefined;
  width = Math.round(width / 16) * 16;
  height = Math.round(height / 16) * 16;
  if (Math.min(width, height) < 256 || Math.max(width, height) > 2048)
    throw usage("FLUX 3 Klein image edges must be from 256 to 2048 pixels.");
  return { width, height };
}
// The generate instructions accept a leading canvas line, which keeps wide and
// tall compositions from being planned as squares.
function upsamplerRequest(job: Flux3KleinJob): string {
  if (job.images.length || !job.size || job.size.width === job.size.height)
    return job.prompt;
  const divisor = (a: number, b: number): number =>
    b ? divisor(b, a % b) : a;
  const shared = divisor(job.size.width, job.size.height);
  return `TARGET CANVAS: ${job.size.width / shared}:${job.size.height / shared}\n${job.prompt}`;
}
// Mirrors Comfy's distilled Klein templates in API format, with the upsampler
// settings they ship. Node ids are stable so the provider can read outputs back.
export function flux3KleinWorkflow(
  job: Flux3KleinJob,
): Record<string, ComfyNode> {
  const editing = job.images.length > 0;
  const nodes: Record<string, ComfyNode> = {
    model: {
      class_type: "UNETLoader",
      inputs: {
        unet_name: `${FLUX3_KLEIN_CHECKPOINT}.safetensors`,
        weight_dtype: "default",
      },
    },
    encoder: {
      class_type: "CLIPLoader",
      inputs: { clip_name: ENCODER, type: "flux3", device: "default" },
    },
    vae: { class_type: "VAELoader", inputs: { vae_name: VAE } },
  };
  job.images.forEach((image, i) => {
    nodes[`image${i}`] = { class_type: "LoadImage", inputs: { image } };
  });
  if (job.upsample) {
    nodes.upsampler_clip = {
      class_type: "CLIPLoader",
      inputs: { clip_name: UPSAMPLER, type: "flux3", device: "default" },
    };
    nodes.upsampler = {
      class_type: "TextGenerateV2",
      inputs: {
        clip: ["upsampler_clip", 0],
        prompt: upsamplerRequest(job),
        system_prompt: editing
          ? FLUX3_KLEIN_EDIT_PROMPT
          : FLUX3_KLEIN_GENERATE_PROMPT,
        max_length: 3584,
        sampling_mode: "on",
        "sampling_mode.temperature": 1,
        "sampling_mode.top_k": 1,
        "sampling_mode.top_p": 0.95,
        "sampling_mode.min_p": 0,
        "sampling_mode.repetition_penalty": 1.05,
        "sampling_mode.presence_penalty": editing ? 0 : 1.5,
        "sampling_mode.seed": 0,
        thinking: false,
        use_default_template: true,
        mtp: "off",
        ...Object.fromEntries(
          job.images.map((_, i) => [`images.image${i + 1}`, [`image${i}`, 0]]),
        ),
      },
    };
    nodes.caption = {
      class_type: "PreviewAny",
      inputs: { source: ["upsampler", 0] },
    };
  }
  nodes.positive = {
    class_type: "CLIPTextEncode",
    inputs: {
      clip: ["encoder", 0],
      text: job.upsample ? ["upsampler", 0] : job.prompt,
    },
  };
  nodes.negative = editing
    ? {
        class_type: "ConditioningZeroOut",
        inputs: { conditioning: ["positive", 0] },
      }
    : {
        class_type: "CLIPTextEncode",
        inputs: { clip: ["encoder", 0], text: "" },
      };
  if (editing)
    nodes.references = {
      class_type: "ReferenceMultiLatent",
      inputs: {
        positive: ["positive", 0],
        negative: ["negative", 0],
        vae: ["vae", 0],
        resolution: "resize",
        "resolution.megapixels": 1,
        ...Object.fromEntries(
          job.images.map((_, i) => [`images.image${i}`, [`image${i}`, 0]]),
        ),
      },
    };
  if (!editing || job.size) {
    const { width, height } = job.size ?? { width: 1024, height: 1024 };
    nodes.latent = {
      class_type: "EmptyFlux2LatentImage",
      inputs: { width, height, batch_size: 1 },
    };
  }
  nodes.sampler = {
    class_type: "KSampler",
    inputs: {
      model: ["model", 0],
      seed: job.seed,
      steps: job.steps,
      cfg: 1,
      sampler_name: "euler",
      scheduler: "simple",
      denoise: 1,
      positive: editing ? ["references", 0] : ["positive", 0],
      negative: editing ? ["references", 1] : ["negative", 0],
      // Without a requested size, edits keep the first reference's shape.
      latent_image: nodes.latent ? ["latent", 0] : ["references", 2],
    },
  };
  nodes.decode = {
    class_type: "VAEDecode",
    inputs: { samples: ["sampler", 0], vae: ["vae", 0] },
  };
  nodes.output = {
    class_type: "PreviewImage",
    inputs: { images: ["decode", 0] },
  };
  return nodes;
}
