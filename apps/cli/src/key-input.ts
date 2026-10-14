import { emitKeypressEvents } from "node:readline";
import type { ReadStream, WriteStream } from "node:tty";
import { ProviderError } from "@imagegencli/core";
const failure = (message: string) =>
  new ProviderError({ kind: "auth", message });
export async function readApiKey(
  fromStdin: boolean,
  input: NodeJS.ReadStream = process.stdin,
  output: NodeJS.WriteStream = process.stderr,
): Promise<string> {
  if (fromStdin) {
    let text = "";
    for await (const chunk of input) {
      text += chunk.toString();
      if (Buffer.byteLength(text) > 8192)
        throw failure("API key input is too long.");
    }
    return text;
  }
  if (!input.isTTY)
    throw failure("Gemini login requires a terminal, or explicit --key-stdin.");
  const terminal = input as ReadStream;
  const wasRaw = terminal.isRaw;
  const wasFlowing = input.readableFlowing === true;
  emitKeypressEvents(input);
  return new Promise((resolve, reject) => {
    let text = "";
    const cleanup = () => {
      input.removeListener("keypress", onKey);
      input.removeListener("end", onEnd);
      input.removeListener("error", onError);
      terminal.setRawMode(wasRaw);
      if (!wasFlowing) input.pause();
      (output as WriteStream).write("\n");
    };
    const onEnd = () => {
      cleanup();
      reject(failure("Gemini login cancelled before a key was entered."));
    };
    const onError = () => {
      cleanup();
      reject(failure("Could not read the API key."));
    };
    const onKey = (
      value: string | undefined,
      key: { name?: string; ctrl?: boolean },
    ) => {
      if (key.ctrl && (key.name === "c" || key.name === "d")) {
        onEnd();
        return;
      }
      if (key.name === "return" || key.name === "enter") {
        cleanup();
        resolve(text);
        return;
      }
      if (key.name === "backspace") {
        text = text.slice(0, -1);
        return;
      }
      if (value && !key.ctrl && !/[\x00-\x1f\x7f]/.test(value)) text += value;
      if (text.length > 8192) {
        cleanup();
        reject(failure("API key input is too long."));
      }
    };
    output.write("Gemini API key (hidden): ");
    input.on("keypress", onKey);
    input.once("end", onEnd);
    input.once("error", onError);
    terminal.setRawMode(true);
    input.resume();
  });
}
