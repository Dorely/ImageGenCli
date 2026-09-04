import { homedir } from "node:os";
import { join } from "node:path";
import type { ITokenStore, TokenSet, TokenStoreInfo } from "@imagegencli/core";

interface KeytarLike {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, password: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

function asKeytar(module: unknown): KeytarLike | null {
  if (typeof module !== "object" || module === null) return null;
  const record = module as Record<string, unknown>;
  const candidate = (record["default"] ?? module) as Partial<KeytarLike>;
  if (
    typeof candidate.getPassword === "function" &&
    typeof candidate.setPassword === "function" &&
    typeof candidate.deletePassword === "function"
  ) {
    return candidate as KeytarLike;
  }
  return null;
}

export async function resolveTokenStore(): Promise<ITokenStore> {
  try {
    const keytar = asKeytar(await import("keytar"));
    if (!keytar) return new FileTokenStore();
    const store = new KeytarTokenStore(keytar);
    await store.probe();
    return store;
  } catch {
    return new FileTokenStore();
  }
}

class KeytarTokenStore implements ITokenStore {
  constructor(private readonly keytar: KeytarLike) {}

  async probe(): Promise<void> {
    await this.keytar.getPassword("ImageGenCli", "__probe__");
  }

  async load(provider: string): Promise<TokenSet | null> {
    const raw = await this.keytar.getPassword("ImageGenCli", provider);
    if (!raw) return null;
    return JSON.parse(raw) as TokenSet;
  }

  async save(provider: string, tokens: TokenSet): Promise<void> {
    await this.keytar.setPassword("ImageGenCli", provider, JSON.stringify(tokens));
  }

  async clear(provider: string): Promise<void> {
    await this.keytar.deletePassword("ImageGenCli", provider);
  }

  describe(): TokenStoreInfo {
    return { backend: "vault", location: "OS credential vault (service ImageGenCli)" };
  }
}

export class FileTokenStore implements ITokenStore {
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath ?? defaultTokenFilePath();
  }

  async load(provider: string): Promise<TokenSet | null> {
    const all = await this.readAll();
    return all[provider] ?? null;
  }

  async save(provider: string, tokens: TokenSet): Promise<void> {
    const all = await this.readAll();
    all[provider] = tokens;
    await this.writeAll(all);
  }

  async clear(provider: string): Promise<void> {
    const all = await this.readAll();
    delete all[provider];
    await this.writeAll(all);
  }

  describe(): TokenStoreInfo {
    return { backend: "file", location: this.filePath };
  }

  private async readAll(): Promise<Record<string, TokenSet>> {
    const { readFile } = await import("node:fs/promises");
    try {
      const raw = await readFile(this.filePath, "utf8");
      return JSON.parse(raw) as Record<string, TokenSet>;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
      throw error;
    }
  }

  private async writeAll(all: Record<string, TokenSet>): Promise<void> {
    const { mkdir, writeFile, chmod } = await import("node:fs/promises");
    const { dirname } = await import("node:path");
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(all, null, 2), { mode: 0o600 });
    if (process.platform !== "win32") {
      await chmod(this.filePath, 0o600);
    }
  }
}

export function defaultTokenFilePath(): string {
  if (process.platform === "win32") {
    const base = process.env["LOCALAPPDATA"] ?? join(process.env["USERPROFILE"] ?? ".", "AppData", "Local");
    return join(base, "ImageGenCli", "tokens.json");
  }
  const base = process.env["XDG_DATA_HOME"] ?? join(homedir(), ".local", "share");
  return join(base, "ImageGenCli", "tokens.json");
}
