export const USAGE = `imagegen - provider-agnostic image generation CLI

Usage:
  imagegen auth login [--timeout <minutes>] [--no-open]
  imagegen auth status [--show-path]
  imagegen auth logout
  imagegen generate --prompt <text> --out <path|dir> [options]
  imagegen edit --prompt <text> --source <file> [--mask <file>] --out <path|dir> [options]
  imagegen help [command]

Image options (generate, edit):
  --prompt <text>        Prompt text (required)
  --out <path|dir>       Output file or directory (required)
  --reference <file>     Reference image for continuity (repeatable, max 4)
  --size <size>          Image size, e.g. auto, 1024x1024, 1536x1024
  --quality <quality>    Quality hint (provider-specific, default auto)
  --format <format>      png, jpeg, or webp (default png)
  --count <n>            Number of images, 1-4 (default 1)

Auth options:
  --timeout <minutes>    Login wait timeout (default 10)
  --no-open              Print the URL without opening a browser
  --show-path            Show where tokens are stored (auth status)

Global:
  -h, --help             Show help and exit 0
`;

const COMMAND_HELP: Record<string, string> = {
  auth: `imagegen auth - manage provider credentials

Usage:
  imagegen auth login [--timeout <minutes>] [--no-open]
  imagegen auth status [--show-path]
  imagegen auth logout
`,
  login: `imagegen auth login - connect Codex via browser OAuth

Usage:
  imagegen auth login [--timeout <minutes>] [--no-open]

Starts a temporary localhost callback server, opens the browser,
exchanges the code, and stores tokens in the OS vault (file fallback).
`,
  status: `imagegen auth status - show Codex connection state

Usage:
  imagegen auth status [--show-path]

Prints JSON without secrets. --show-path reveals the token location.
`,
  logout: `imagegen auth logout - remove stored Codex credentials

Usage:
  imagegen auth logout
`,
  generate: `imagegen generate - create images from a prompt

Usage:
  imagegen generate --prompt <text> --out <path|dir> [options]

Options: --reference <file> (repeatable, max 4), --size, --quality,
--format png|jpeg|webp, --count 1-4.
`,
  edit: `imagegen edit - edit a source image with a prompt

Usage:
  imagegen edit --prompt <text> --source <file> [--mask <file>] --out <path|dir> [options]

Same image options as generate.
`,
  help: `imagegen help - show human-readable usage

Usage:
  imagegen help [command]
`,
};

export function helpFor(topic: string | undefined): string {
  if (!topic) return USAGE;
  const text = COMMAND_HELP[topic];
  if (!text) return `Unknown help topic "${topic}".\n\n${USAGE}`;
  return text;
}
