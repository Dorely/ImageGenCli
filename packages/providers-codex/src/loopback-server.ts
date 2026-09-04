import { createServer, type Server } from "node:http";
import { CALLBACK_PATH, FLOW_TIMEOUT_MINUTES, LOOPBACK_PORT } from "./codex-constants.js";

export interface CallbackResult {
  code: string;
  state: string;
}

export type LoopbackErrorCode = "port_busy" | "timeout" | "callback_error";

export class LoopbackError extends Error {
  readonly code: LoopbackErrorCode;

  constructor(message: string, code: LoopbackErrorCode) {
    super(message);
    this.name = "LoopbackError";
    this.code = code;
  }
}

function callbackPage(title: string, message: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head>` +
    `<body style="font-family:sans-serif;padding:2rem"><h1>${title}</h1><p>${message}</p></body></html>`;
}

export async function waitForOAuthCallback(
  timeoutMs: number = FLOW_TIMEOUT_MINUTES * 60 * 1000,
  port: number = LOOPBACK_PORT,
): Promise<CallbackResult> {
  return new Promise((resolve, reject) => {
    let server: Server | undefined;
    const timer = setTimeout(() => {
      closeServer();
      reject(new LoopbackError("OAuth flow timed out waiting for the browser callback.", "timeout"));
    }, timeoutMs);

    const closeServer = () => {
      clearTimeout(timer);
      server?.close();
    };

    const fail = (error: Error) => {
      closeServer();
      reject(error);
    };

    server = createServer((req, res) => {
      try {
        const url = new URL(req.url ?? "/", "http://localhost");
        if (url.pathname !== CALLBACK_PATH) {
          res.writeHead(404, { "content-type": "text/plain" });
          res.end("Not found.");
          return;
        }
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const errorParam = url.searchParams.get("error");
        if (errorParam) {
          res.writeHead(400, { "content-type": "text/html" });
          res.end(callbackPage("Authorization failed", "The provider returned an error. You can close this tab."));
          fail(new LoopbackError("OAuth provider returned an error.", "callback_error"));
          return;
        }
        if (!code || !state) {
          res.writeHead(400, { "content-type": "text/html" });
          res.end(callbackPage("Authorization failed", "The callback was missing the authorization code."));
          fail(new LoopbackError("OAuth callback was missing the authorization code.", "callback_error"));
          return;
        }
        res.writeHead(200, { "content-type": "text/html" });
        res.end(callbackPage("Connected", "ImageGenCli is connected. You can close this tab."));
        closeServer();
        resolve({ code, state });
      } catch (error) {
        fail(error instanceof Error ? error : new LoopbackError("OAuth callback failed.", "callback_error"));
      }
    });

    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        fail(new LoopbackError(
          `Port ${port} is busy. Close the conflicting process and retry.`,
          "port_busy",
        ));
        return;
      }
      fail(error);
    });

    server.listen(port, "127.0.0.1");
  });
}
