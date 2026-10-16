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
        const status = response.status;
        // Inspect only structured diagnostic fields; never echo raw provider bodies.
        const failure = record(await response.json().catch(() => null));
        const detail = record(failure.error);
        const upstream = record(detail.metadata).provider_name;
        const token = new Headers(init.headers)
          .get("authorization")
          ?.replace(/^Bearer\s+/i, "");
        const upstreamProvider =
          typeof upstream === "string" &&
          /^[A-Za-z0-9][A-Za-z0-9 ._()-]{0,63}$/.test(upstream) &&
          !(token && upstream.includes(token)) &&
          !/(?:sk-|AIza)/.test(upstream)
            ? upstream
            : undefined;
        const retryHeader = response.headers.get("retry-after");
        const retryAfterSeconds =
          retryHeader &&
          /^\d+$/.test(retryHeader) &&
          Number.isSafeInteger(Number(retryHeader))
            ? Number(retryHeader)
            : undefined;
        const upstreamQuota =
          status === 429 &&
          upstreamProvider &&
          typeof detail.message === "string" &&
          /quota|resource.exhausted/i.test(detail.message);
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
          upstreamProvider,
          retryAfterSeconds,
          message: download
            ? `Image download failed (HTTP ${status}).`
            : status === 401 || status === 403
              ? "Endpoint authentication failed. Check the saved key and model access."
              : upstreamQuota
                ? `Upstream ${upstreamProvider} quota is exhausted (HTTP 429). Gateway credits may still be available. Select a different model or upstream, or resolve that upstream's quota.`
                : status === 429 && upstreamProvider
                  ? `Upstream ${upstreamProvider} rate limit reached (HTTP 429). Wait for its limit to reset or select another model/upstream.`
                  : status === 429
                    ? "Endpoint quota or rate limit reached (HTTP 429). Check gateway and upstream limits before retrying."
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
