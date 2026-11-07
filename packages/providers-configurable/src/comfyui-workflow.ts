import { readFile } from "node:fs/promises";
import { ProviderError } from "@imagegencli/core";
import { record } from "./http.js";
export interface ComfyNode {
  class_type: string;
  inputs: Record<string, unknown>;
}
export type ComfyGraph = Record<string, ComfyNode>;
export interface ComfyWorkflow {
  graph: ComfyGraph;
  images: number;
  sized: boolean;
}
export interface WorkflowValues {
  prompt: string;
  seed: number;
  size?: { width: number; height: number };
  images: string[];
}
const TOKEN = /\{\{(\w+)\}\}/g;
function usedTokens(graph: ComfyGraph): Set<string> {
  const used = new Set<string>();
  for (const node of Object.values(graph))
    for (const value of Object.values(node.inputs))
      if (typeof value === "string")
        for (const match of value.matchAll(TOKEN)) used.add(match[1]);
  return used;
}
// Workflow files are the ComfyUI API format, with {{tokens}} as input values.
export async function loadWorkflow(path: string): Promise<ComfyWorkflow> {
  const invalid = (detail: string) =>
    new ProviderError({
      kind: "configuration",
      message: `ComfyUI workflow ${path} ${detail}`,
    });
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path, "utf8"));
  } catch {
    throw invalid("could not be read as JSON.");
  }
  const nodes = Object.values(record(parsed));
  if (
    !nodes.length ||
    nodes.some(
      (node) =>
        typeof record(node).class_type !== "string" ||
        typeof record(node).inputs !== "object",
    )
  )
    throw invalid("is not in API format. Export it from ComfyUI as API JSON.");
  const graph = parsed as ComfyGraph;
  const used = usedTokens(graph);
  const unknown = [...used].filter(
    (t) => !/^(prompt|seed|width|height|image[1-9]\d*)$/.test(t),
  );
  if (unknown.length)
    throw invalid(`uses unknown tokens: ${unknown.join(", ")}.`);
  if (!used.has("prompt") || !used.has("seed"))
    throw invalid("must use {{prompt}} and {{seed}}.");
  if (used.has("width") !== used.has("height"))
    throw invalid("must use {{width}} and {{height}} together.");
  const images = [...used].filter((t) => t.startsWith("image")).length;
  for (let i = 1; i <= images; i++)
    if (!used.has(`image${i}`))
      throw invalid(`must number its image tokens from {{image1}} in order.`);
  return { graph, images, sized: used.has("width") };
}
export function fillWorkflow(
  { graph }: ComfyWorkflow,
  { prompt, seed, size, images }: WorkflowValues,
): ComfyGraph {
  const values: Record<string, string | number> = {
    prompt,
    seed,
    ...(size ?? {}),
    ...Object.fromEntries(images.map((image, i) => [`image${i + 1}`, image])),
  };
  // A value that is only a token keeps its type, so seeds and sizes stay numbers.
  const fill = (value: unknown) => {
    if (typeof value !== "string") return value;
    const whole = /^\{\{(\w+)\}\}$/.exec(value);
    if (whole) return values[whole[1]];
    return value.replace(TOKEN, (_, token: string) => String(values[token]));
  };
  return Object.fromEntries(
    Object.entries(graph).map(([id, node]) => [
      id,
      {
        ...node,
        inputs: Object.fromEntries(
          Object.entries(node.inputs).map(([key, value]) => [key, fill(value)]),
        ),
      },
    ]),
  );
}
