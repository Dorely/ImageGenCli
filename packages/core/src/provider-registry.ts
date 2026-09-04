import type { IImageProvider } from "./image-provider.js";

export interface ProviderAuthInfo {
  name: string;
  configured: boolean;
  detail?: string;
}

export interface ProviderEntry {
  provider: IImageProvider;
  authStatus(): Promise<ProviderAuthInfo>;
}

export class ProviderRegistry {
  private readonly entries = new Map<string, ProviderEntry>();

  register(entry: ProviderEntry): void {
    this.entries.set(entry.provider.name, entry);
  }

  names(): string[] {
    return [...this.entries.keys()].sort();
  }

  get(name: string): ProviderEntry {
    const entry = this.entries.get(name);
    if (!entry) {
      throw new Error(`Unknown provider "${name}". Configured providers: ${this.describe()}.`);
    }
    return entry;
  }

  async configuredNames(): Promise<string[]> {
    const names: string[] = [];
    for (const [name, entry] of this.entries) {
      const status = await entry.authStatus();
      if (status.configured) names.push(name);
    }
    return names.sort();
  }

  async resolve(requested: string[] | undefined): Promise<ProviderEntry[]> {
    if (requested && requested.length > 0) {
      const resolved = requested.map((name) => this.get(name));
      for (const entry of resolved) {
        const status = await entry.authStatus();
        if (!status.configured) {
          throw new Error(`Provider "${entry.provider.name}" is not configured. ${status.detail ?? "Run its auth command first."}`);
        }
      }
      return resolved;
    }
    const configured = await this.configuredNames();
    if (configured.length === 0) {
      throw new Error(`No providers are configured. Available providers: ${this.describe()}.`);
    }
    if (configured.length > 1) {
      throw new Error(`Multiple providers are configured (${configured.join(", ")}). Pass --provider to choose one or more.`);
    }
    return [this.get(configured[0])];
  }

  describe(): string {
    const names = this.names();
    return names.length > 0 ? names.join(", ") : "(none registered)";
  }
}
