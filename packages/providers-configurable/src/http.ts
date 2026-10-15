import { ProviderError } from "@imagegencli/core";
export const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
export class EndpointHttp {
  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutSeconds = 180,
  ) {
    if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0)
      throw new ProviderError({
        kind: "configuration",
        message: "Request timeout must be positive and finite.",
      });
  }
  async run<T>(
    action: (http: {
      json: (
        url: string,
        init?: RequestInit,
      ) => Promise<Record<string, unknown>>;
      bytes: (url: string) => Promise<Uint8Array>;
    }) => Promise<T>,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.timeoutSeconds * 1000,
    );
    const send = async (
      url: string,
      init: RequestInit = {},
      download = false,
    ) => {
      const response = await this.fetchImpl(url, {
        ...init,
        redirect: download ? "follow" : "error",
        signal: controller.signal,
      });
      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        const status = response.status;
        throw new ProviderError({
          kind: download
            ? "download"
            : status === 401 || status === 403
              ? "auth"
              : status === 429
                ? "rate_limit"
                : status >= 500
                  ? "server"
                  : "usage",
          statusCode: status,
          message: download
            ? `Image download failed (HTTP ${status}).`
            : status === 401 || status === 403
              ? "Endpoint authentication failed. Check the saved key and model access."
              : status === 429
                ? "Endpoint quota or rate limit reached. Check your account before retrying."
                : `Endpoint returned HTTP ${status}. Check the API format, model ID, and supported image options.`,
        });
      }
      return response;
    };
    try {
      return await action({
        json: async (url, init) => {
          const response = await send(url, init);
          try {
            const value: unknown = await response.json();
            if (!value || typeof value !== "object" || Array.isArray(value))
              throw new Error();
            return record(value);
          } catch {
            throw new ProviderError({
              kind: "malformed",
              message: "Endpoint returned an invalid JSON response.",
            });
          }
        },
        bytes: async (url) =>
          new Uint8Array(await (await send(url, {}, true)).arrayBuffer()),
      });
    } catch (e) {
      if (controller.signal.aborted)
        throw new ProviderError({
          kind: "timeout",
          message:
            "Endpoint request timed out; no automatic retry was attempted.",
        });
      if (e instanceof ProviderError) throw e;
      throw new ProviderError({
        kind: "transport",
        message:
          "Endpoint request failed. Check connectivity and the configured URL.",
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
