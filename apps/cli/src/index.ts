#!/usr/bin/env node
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import {
  MAX_IMAGE_COUNT,
  MAX_REFERENCE_IMAGES,
  MIN_IMAGE_COUNT,
  normalizeImageBackground,
  normalizeOutputFormat,
  ProviderError,
  ProviderRegistry,
  type EditRequest,
  type GenerateRequest,
  type ImageInput,
  type ProviderEntry,
  type ProviderResult,
} from "@imagegencli/core";
import {
  createCodexEntry,
  DEFAULT_REDIRECT_URI,
  LOOPBACK_PORT,
  PROVIDER_NAME,
  ReauthRequiredError,
  LoopbackError,
  consumeVerifier,
  resolveTokenStore,
  startPkceFlow,
  waitForOAuthCallback,
  CodexTokenManager,
} from "@imagegencli/providers-codex";
import { helpFor } from "./help.js";

const EXIT_USAGE = 2;
const EXIT_AUTH = 3;
const EXIT_PROVIDER = 4;
const EXIT_IO = 5;

function fail(kind: string, message: string, exitCode: number): never {
  process.stderr.write(`${JSON.stringify({ error: { kind, message } })}\n`);
  process.exit(exitCode);
}

function parseArgs(argv: string[]): { flags: Map<string, string | boolean | string[]>; positionals: string[] } {
  const flags = new Map<string, string | boolean | string[]>();
  const positionals: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      flags.set("help", true);
      continue;
    }
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      if (key === "no-open" || key === "show-path") {
        flags.set(key, true);
        continue;
      }
      if (key === "reference" || key === "provider") {
        const value = argv[i + 1];
        if (!value || value.startsWith("--")) fail("usage", `Missing value for --${key}.`, EXIT_USAGE);
        i += 1;
        const existing = flags.get(key);
        flags.set(key, [...(Array.isArray(existing) ? existing : []), value]);
        continue;
      }
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) fail("usage", `Missing value for --${key}.`, EXIT_USAGE);
      i += 1;
      flags.set(key, value);
      continue;
    }
    positionals.push(arg);
  }
  return { flags, positionals };
}

function flagValue(flags: Map<string, string | boolean | string[]>, key: string): string | undefined {
  const value = flags.get(key);
  return typeof value === "string" ? value : undefined;
}

function imageSelection(flags: Map<string, string | boolean | string[]>): Pick<GenerateRequest, "model" | "background"> {
  const model = flagValue(flags, "model")?.trim();
  if (model !== undefined && !model) fail("usage", "--model must not be blank.", EXIT_USAGE);
  try {
    const background = normalizeImageBackground(flagValue(flags, "background"), normalizeOutputFormat(flagValue(flags, "format")));
    return { model, background };
  } catch (error) {
    fail("usage", error instanceof Error ? error.message : String(error), EXIT_USAGE);
  }
}

function redirectUri(): string {
  return process.env["IMAGEGEN_CODEX_REDIRECT_URI"] ?? DEFAULT_REDIRECT_URI;
}

function redirectPort(uri: string): number {
  try {
    const parsed = new URL(uri);
    if (parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
      fail("usage", "Custom redirect URI must use localhost.", EXIT_USAGE);
    }
    return parsed.port ? Number(parsed.port) : LOOPBACK_PORT;
  } catch {
    fail("usage", "IMAGEGEN_CODEX_REDIRECT_URI is not a valid URL.", EXIT_USAGE);
  }
}

async function loadImageInput(path: string, label: string): Promise<ImageInput> {
  let data: Buffer;
  try {
    data = await readFile(path);
  } catch {
    fail("io", `${label} not found: ${path}`, EXIT_IO);
  }
  return { data: new Uint8Array(data), contentType: contentTypeFor(path), filename: basename(path) };
}

function contentTypeFor(path: string): string {
  switch (extname(path).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".png":
      return "image/png";
    default:
      return "image/png";
  }
}

async function loadReferences(flags: Map<string, string | boolean | string[]>): Promise<ImageInput[]> {
  const raw = flags.get("reference");
  const paths = Array.isArray(raw) ? raw : [];
  if (paths.length > MAX_REFERENCE_IMAGES) {
    fail("usage", `At most ${MAX_REFERENCE_IMAGES} --reference images are allowed.`, EXIT_USAGE);
  }
  const images: ImageInput[] = [];
  for (const path of paths) {
    images.push(await loadImageInput(path, "Reference image"));
  }
  return images;
}

function parseCount(flags: Map<string, string | boolean | string[]>): number {
  const raw = flagValue(flags, "count");
  if (!raw) return 1;
  const count = Number(raw);
  if (!Number.isInteger(count) || count < MIN_IMAGE_COUNT || count > MAX_IMAGE_COUNT) {
    fail("usage", `--count must be an integer from ${MIN_IMAGE_COUNT} to ${MAX_IMAGE_COUNT}.`, EXIT_USAGE);
  }
  return count;
}

function registry(): ProviderRegistry {
  const registry = new ProviderRegistry();
  registry.register(createCodexEntry());
  return registry;
}

function requestedProviders(flags: Map<string, string | boolean | string[]>): string[] | undefined {
  const raw = flags.get("provider");
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  return raw;
}

async function resolveOutPaths(out: string, providerName: string, multiProvider: boolean, count: number, format: string): Promise<string[]> {
  const resolved = resolve(out);
  let isDir = false;
  try {
    const info = await stat(resolved);
    isDir = info.isDirectory();
  } catch {
    isDir = extname(resolved) === "";
  }
  const extension = `.${normalizeOutputFormat(format)}`;
  const prefix = multiProvider ? `${providerName}-` : "";
  if (isDir) {
    return Array.from({ length: count }, (_, i) => join(resolved, `${prefix}image-${i + 1}${extension}`));
  }
  if (count > 1 || multiProvider) {
    const dir = dirname(resolved);
    const base = basename(resolved, extname(resolved));
    return Array.from({ length: count }, (_, i) => join(dir, `${prefix}${base}-${i + 1}${extension}`));
  }
  return [resolved.endsWith(extension) ? resolved : `${resolved}${extension}`];
}

function printResult(providerName: string, result: ProviderResult, paths: string[]): void {
  process.stdout.write(
    `${JSON.stringify({
      provider: providerName,
      imageModel: result.imageModel,
      images: result.images.map((image, i) => ({
        path: paths[i],
        mimeType: image.mimeType,
        width: image.width,
        height: image.height,
        prompt: image.prompt,
        responseId: image.responseId,
      })),
    })}\n`,
  );
}

async function saveImages(result: ProviderResult, paths: string[]): Promise<void> {
  for (let i = 0; i < result.images.length; i += 1) {
    const path = paths[i];
    try {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, Buffer.from(result.images[i].data));
    } catch {
      fail("io", `Could not write output file: ${path}`, EXIT_IO);
    }
  }
}

async function runAuthLogin(providerName: string, flags: Map<string, string | boolean | string[]>): Promise<void> {
  if (providerName !== PROVIDER_NAME) {
    fail("usage", `Unknown auth provider "${providerName}". Available: ${registry().describe()}.`, EXIT_USAGE);
  }
  const uri = redirectUri();
  const port = redirectPort(uri);
  const timeoutMinutes = Number(flagValue(flags, "timeout") ?? "10");
  if (!Number.isFinite(timeoutMinutes) || timeoutMinutes <= 0 || timeoutMinutes > 60) {
    fail("usage", "--timeout must be a number of minutes from 1 to 60.", EXIT_USAGE);
  }
  const { url, state } = startPkceFlow(uri);
  let callback: { code: string; state: string };
  const waiter = waitForOAuthCallback(timeoutMinutes * 60 * 1000, port);
  if (!flags.get("no-open")) {
    try {
      const { default: open } = await import("open");
      await open(url);
    } catch {
      process.stderr.write("Could not open a browser automatically. Open this URL manually:\n");
    }
  }
  process.stderr.write(`Authorize in the browser:\n${url}\n`);
  try {
    callback = await waiter;
  } catch (error) {
    if (error instanceof LoopbackError) fail("auth", error.message, EXIT_AUTH);
    throw error;
  }
  if (callback.state !== state) fail("auth", "OAuth state mismatch. Retry `imagegen auth codex login`.", EXIT_AUTH);
  const verifier = consumeVerifier(state);
  if (!verifier) fail("auth", "OAuth flow expired. Retry `imagegen auth codex login`.", EXIT_AUTH);
  const store = await resolveTokenStore();
  if (store.describe().backend === "file") {
    process.stderr.write("Warning: OS vault unavailable; tokens stored in a restricted file. Use `auth status --show-path` to inspect.\n");
  }
  const manager = new CodexTokenManager(store);
  try {
    await manager.exchangeAndSave({ code: callback.code, redirectUri: uri, codeVerifier: verifier });
  } catch (error) {
    if (error instanceof ReauthRequiredError) fail("auth", error.message, EXIT_AUTH);
    throw error;
  }
  process.stdout.write(`${JSON.stringify({ provider: PROVIDER_NAME, status: "connected" })}\n`);
}

async function runProviders(): Promise<void> {
  const entries = registry().names().map((name) => registry().get(name));
  const providers = [];
  for (const entry of entries) {
    const status = await entry.authStatus();
    providers.push({ name: status.name, configured: status.configured });
  }
  process.stdout.write(`${JSON.stringify({ providers })}\n`);
}

async function runAuthStatus(providerName: string, flags: Map<string, string | boolean | string[]>): Promise<void> {
  if (providerName !== PROVIDER_NAME) {
    fail("usage", `Unknown auth provider "${providerName}". Available: ${registry().describe()}.`, EXIT_USAGE);
  }
  const store = await resolveTokenStore();
  const manager = new CodexTokenManager(store);
  const status = await manager.status();
  const output: Record<string, unknown> = { provider: PROVIDER_NAME, connected: status.connected };
  if (status.expiresAt) output["expiresAt"] = new Date(status.expiresAt).toISOString();
  if (flags.get("show-path")) {
    const info = store.describe();
    output["store"] = { backend: info.backend, location: info.location };
  }
  process.stdout.write(`${JSON.stringify(output)}\n`);
}

async function runAuthLogout(providerName: string): Promise<void> {
  if (providerName !== PROVIDER_NAME) {
    fail("usage", `Unknown auth provider "${providerName}". Available: ${registry().describe()}.`, EXIT_USAGE);
  }
  const store = await resolveTokenStore();
  await store.clear(PROVIDER_NAME);
  process.stdout.write(`${JSON.stringify({ provider: PROVIDER_NAME, status: "disconnected" })}\n`);
}

async function runGenerate(flags: Map<string, string | boolean | string[]>): Promise<void> {
  const prompt = flagValue(flags, "prompt");
  const out = flagValue(flags, "out");
  if (!prompt) fail("usage", "Missing required --prompt.", EXIT_USAGE);
  if (!out) fail("usage", "Missing required --out.", EXIT_USAGE);
  const selection = imageSelection(flags);
  const providers = await resolveProviders(requestedProviders(flags));
  const request: GenerateRequest = {
    ...selection,
    prompt,
    out,
    size: flagValue(flags, "size"),
    quality: flagValue(flags, "quality"),
    format: flagValue(flags, "format"),
    count: parseCount(flags),
    referenceImages: await loadReferences(flags),
  };
  await runImageRequest(request, undefined, providers);
}

async function resolveProviders(requested: string[] | undefined): Promise<ProviderEntry[]> {
  try {
    return await registry().resolve(requested);
  } catch (error) {
    fail("usage", error instanceof Error ? error.message : String(error), EXIT_USAGE);
  }
}

async function runEdit(flags: Map<string, string | boolean | string[]>): Promise<void> {
  const prompt = flagValue(flags, "prompt");
  const out = flagValue(flags, "out");
  const source = flagValue(flags, "source");
  const mask = flagValue(flags, "mask");
  if (!prompt) fail("usage", "Missing required --prompt.", EXIT_USAGE);
  if (!out) fail("usage", "Missing required --out.", EXIT_USAGE);
  if (!source) fail("usage", "Missing required --source.", EXIT_USAGE);
  const request: EditRequest = {
    ...imageSelection(flags),
    prompt,
    out,
    size: flagValue(flags, "size"),
    quality: flagValue(flags, "quality"),
    format: flagValue(flags, "format"),
    count: parseCount(flags),
    referenceImages: await loadReferences(flags),
    sourceImage: await loadImageInput(source, "Source image"),
    mask: mask ? await loadImageInput(mask, "Mask image") : undefined,
  };
  await runImageRequest(request, request, await resolveProviders(requestedProviders(flags)));
}

async function runImageRequest(request: GenerateRequest, edit: EditRequest | undefined, providers: ProviderEntry[]): Promise<void> {
  const multiProvider = providers.length > 1;
  for (const entry of providers) {
    let result: ProviderResult;
    try {
      result = edit ? await entry.provider.edit(edit) : await entry.provider.generate(request);
    } catch (error) {
      if (error instanceof ReauthRequiredError) fail("auth", `${entry.provider.name}: ${error.message}`, EXIT_AUTH);
      if (error instanceof ProviderError) {
        if (error.kind === "configuration" || error.kind === "usage") fail(error.kind, `${entry.provider.name}: ${error.message}`, EXIT_USAGE);
        fail("provider", `${entry.provider.name}: ${error.kind}: ${error.message}`, EXIT_PROVIDER);
      }
      throw error;
    }
    const paths = await resolveOutPaths(request.out, entry.provider.name, multiProvider, result.images.length, request.format ?? "png");
    await saveImages(result, paths);
    printResult(entry.provider.name, result, paths);
  }
}

async function main(): Promise<void> {
  const { flags, positionals } = parseArgs(process.argv.slice(2));
  if (flags.get("help") || positionals.length === 0) {
    process.stdout.write(helpFor(positionals[0]));
    return;
  }
  const [command, sub, subSub] = positionals;
  try {
    if (command === "help") {
      process.stdout.write(helpFor(sub));
      return;
    }
    if (command === "providers" && !sub) {
      await runProviders();
      return;
    }
    if (command === "auth" && sub && !subSub) {
      fail("usage", `Missing auth action. Usage: imagegen auth ${sub} login|status|logout.`, EXIT_USAGE);
    }
    if (command === "auth" && sub) {
      if (subSub === "login") {
        await runAuthLogin(sub, flags);
        return;
      }
      if (subSub === "status") {
        await runAuthStatus(sub, flags);
        return;
      }
      if (subSub === "logout") {
        await runAuthLogout(sub);
        return;
      }
    }
    if (command === "generate" && !sub) {
      await runGenerate(flags);
      return;
    }
    if (command === "edit" && !sub) {
      await runEdit(flags);
      return;
    }
    fail("usage", `Unknown command: ${positionals.join(" ")}. Run \`imagegen help\`.`, EXIT_USAGE);
  } catch (error) {
    if (error instanceof ProviderError) fail("provider", `${error.kind}: ${error.message}`, EXIT_PROVIDER);
    fail("provider", error instanceof Error ? error.message : String(error), EXIT_PROVIDER);
  }
}

await main();
