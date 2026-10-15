import { readFile, mkdir, writeFile, rename, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  defaultCredentialFilePath,
  resolveCredentialStore,
  type CredentialStore,
} from "@imagegencli/credentials";
import { ProviderError } from "@imagegencli/core";
export type ApiFormat = "openrouter" | "openai-images";
export interface EndpointProfile {
  name: string;
  api: ApiFormat;
  baseUrl: string;
  model?: string;
  auth: "bearer" | "none";
}
export interface ApiKeyCredential {
  apiKey: string;
}
export const usage = (message: string) =>
  new ProviderError({ kind: "usage", message });
export const profileStore = () => resolveCredentialStore<ApiKeyCredential>();
export function validateApiKey(value: string): string {
  const key = value.trim();
  if (!key || /\s/.test(key))
    throw new ProviderError({
      kind: "auth",
      message: "Enter a non-empty API key without whitespace.",
    });
  return key;
}
export function validateProfile(value: unknown): EndpointProfile {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw usage("Invalid endpoint profile.");
  const p = value as Record<string, unknown>;
  if (
    Object.keys(p).some(
      (k) => !["name", "api", "baseUrl", "model", "auth"].includes(k),
    )
  )
    throw usage(
      "Endpoint profiles accept only name, api, baseUrl, model, and auth; store keys through auth login.",
    );
  if (
    typeof p.name !== "string" ||
    !/^[a-z][a-z0-9-]{0,63}$/.test(p.name) ||
    ["codex", "gemini"].includes(p.name)
  )
    throw usage(
      "Endpoint name must use lowercase letters, digits, and hyphens, and cannot be codex or gemini.",
    );
  if (p.api !== "openrouter" && p.api !== "openai-images")
    throw usage("API format must be openrouter or openai-images.");
  if (p.auth !== undefined && p.auth !== "bearer" && p.auth !== "none")
    throw usage("Auth must be bearer or none.");
  const raw =
    p.baseUrl ??
    (p.api === "openrouter" ? "https://openrouter.ai/api/v1" : undefined);
  let url: URL;
  try {
    if (typeof raw !== "string") throw new Error();
    url = new URL(raw);
  } catch {
    throw usage("Supply a valid --base-url including the API prefix.");
  }
  const loopback =
    url.hostname === "localhost" ||
    url.hostname === "[::1]" ||
    url.hostname === "127.0.0.1";
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" && !(url.protocol === "http:" && loopback))
  )
    throw usage(
      "Base URL must use HTTPS (or loopback HTTP), without credentials, query, or fragment.",
    );
  if (p.model !== undefined && (typeof p.model !== "string" || !p.model.trim()))
    throw usage("Default model must not be blank.");
  return {
    name: p.name,
    api: p.api,
    baseUrl: url.toString().replace(/\/+$/, ""),
    auth: p.auth ?? "bearer",
    ...(typeof p.model === "string" ? { model: p.model.trim() } : {}),
  };
}
export class ProfileRepository {
  constructor(
    readonly path = join(
      dirname(defaultCredentialFilePath()),
      "providers.json",
    ),
    private readonly credentials: () => Promise<
      CredentialStore<ApiKeyCredential>
    > = profileStore,
  ) {}
  async list(): Promise<EndpointProfile[]> {
    let text: string;
    try {
      text = await readFile(this.path, "utf8");
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw new ProviderError({
        kind: "io",
        message: "Could not read endpoint configuration.",
      });
    }
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      throw usage(
        "Endpoint configuration is invalid JSON. Repair providers.json before retrying.",
      );
    }
    const doc = value as { version?: unknown; profiles?: unknown };
    if (!doc || doc.version !== 1 || !Array.isArray(doc.profiles))
      throw usage(
        "Endpoint configuration requires version 1 and a profiles array.",
      );
    const profiles = doc.profiles.map(validateProfile);
    if (new Set(profiles.map((p) => p.name)).size !== profiles.length)
      throw usage("Endpoint configuration contains duplicate names.");
    return profiles;
  }
  async get(name: string): Promise<EndpointProfile> {
    const p = (await this.list()).find((p) => p.name === name);
    if (!p)
      throw usage(
        "Unknown endpoint profile. Run imagegen providers to list providers.",
      );
    return p;
  }
  async add(value: unknown): Promise<EndpointProfile> {
    const p = validateProfile(value);
    const profiles = await this.list();
    if (profiles.some((v) => v.name === p.name))
      throw usage("Endpoint already exists. Use providers update.");
    await this.save([...profiles, p]);
    return p;
  }
  async update(
    name: string,
    patch: Partial<Omit<EndpointProfile, "name">>,
  ): Promise<EndpointProfile> {
    const profiles = await this.list();
    const old = profiles.find((p) => p.name === name);
    if (!old) throw usage("Unknown endpoint profile.");
    const p = validateProfile({ ...old, ...patch, name });
    if (
      new URL(old.baseUrl).origin !== new URL(p.baseUrl).origin ||
      old.auth !== p.auth
    )
      await (await this.credentials()).clear(name);
    await this.save(profiles.map((v) => (v.name === name ? p : v)));
    return p;
  }
  async remove(name: string): Promise<void> {
    const profiles = await this.list();
    if (!profiles.some((p) => p.name === name))
      throw usage("Unknown endpoint profile.");
    await (await this.credentials()).clear(name);
    await this.save(profiles.filter((p) => p.name !== name));
  }
  private async save(profiles: EndpointProfile[]): Promise<void> {
    const temporary = `${this.path}.${randomUUID()}.tmp`;
    try {
      await mkdir(dirname(this.path), { recursive: true });
      await writeFile(
        temporary,
        JSON.stringify({ version: 1, profiles }, null, 2) + "\n",
        { mode: 0o600 },
      );
      await rename(temporary, this.path);
    } catch {
      throw new ProviderError({
        kind: "io",
        message: "Could not save endpoint configuration.",
      });
    } finally {
      await rm(temporary, { force: true }).catch(() => {});
    }
  }
}
export async function profileKey(
  profile: EndpointProfile,
  store: CredentialStore<ApiKeyCredential>,
): Promise<string | undefined> {
  if (profile.auth === "none") return undefined;
  try {
    const record = await store.load(profile.name);
    if (record && typeof record.apiKey === "string")
      return validateApiKey(record.apiKey);
  } catch {
    /* Keep stored records out of errors. */
  }
  throw new ProviderError({
    kind: "auth",
    message: `Run imagegen auth ${profile.name} login to configure an API key.`,
  });
}
