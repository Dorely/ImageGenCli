const IMAGE_OPTIONS = `Image options (generate, edit):
  --prompt <text>        Prompt text (required)
  --out <path|dir>       Output file or directory (required)
  --provider <name>      Repeatable. Defaults to the only configured provider;
                         required when several are configured.
  --model <id>          Image model override (Codex default gpt-image-2.5-flare)
  --background <value>  auto, opaque, or transparent (default auto)
  --reference <file>     Reference image for continuity (repeatable, max 4)
  --size <size>          auto, WIDTHxHEIGHT, aspect (16:9), or preset
                     square, portrait, landscape, wide (validated per
                     provider; bad aspects are rejected)
  --quality <quality>    Quality hint (provider-specific, default auto)
  --format <format>      png, jpeg, or webp (default png)
  --count <n>            Number of images, 1-4 (default 1)

Supported Codex models (account availability is determined by the provider):
  gpt-image-2.5-flare     Default; fast image generation and editing
  gpt-image-2.5-sunburst  Higher-precision image generation and editing
  gpt-image-2            Previous model; retained for compatibility

Use full model IDs; other provider-supported IDs may also be supplied.
Model precedence: --model > constructor imageModel (library callers) >
IMAGEGEN_CODEX_IMAGE_MODEL > gpt-image-2.5-flare.
IMAGEGEN_CODEX_MODEL configures orchestration separately; --model selects images.

Codex quality: auto (default), low, medium, high; Flare/Sunburst also support
xhigh and max. gpt-image-2 rejects xhigh/max.
Transparent backgrounds require --format png (default) or webp; JPEG is rejected.
gpt-image-2 transparency is in preview. Codex endpoint availability may differ
from the public API; unsupported transparency returns a provider error.
`;

const GENERATE_EXAMPLES = `Examples:
  imagegen generate --prompt "a lighthouse at dawn" --out ./lighthouse.png
  imagegen generate --model gpt-image-2 --prompt "a lighthouse" --out ./classic.png
  imagegen generate --model gpt-image-2.5-sunburst --quality max --prompt "a product photo" --out ./product.png
  imagegen generate --background transparent --prompt "a bicycle cutout" --out ./bicycle.png
  imagegen generate --background opaque --prompt "a landscape" --out ./landscape.png
`;

const EDIT_EXAMPLES = `Edit options:
  --source <file>        Source image (required)
  --mask <file>          Optional edit mask

Examples:
  imagegen edit --model gpt-image-2.5-sunburst --quality max --source ./product.png --prompt "add a ribbon" --out ./ribbon.png
  imagegen edit --background transparent --format webp --source ./bicycle.png --prompt "make the frame blue" --out ./blue.webp
`;

export const USAGE = `imagegen - provider-agnostic image generation CLI

Usage:
  imagegen auth codex login [--timeout <minutes>] [--no-open]
  imagegen auth codex status [--show-path]
  imagegen auth codex logout
  imagegen generate --prompt <text> --out <path|dir> [--provider <name>] [options]
  imagegen edit --prompt <text> --source <file> [--mask <file>] --out <path|dir> [--provider <name>] [options]
  imagegen providers
  imagegen help [command]

${IMAGE_OPTIONS}
${GENERATE_EXAMPLES}
${EDIT_EXAMPLES}

Auth options:
  --timeout <minutes>    Login wait timeout (default 10)
  --no-open              Print the URL without opening a browser
  --show-path            Show where tokens are stored (auth status)

Global:
  -h, --help             Show help and exit 0
`;

const COMMAND_HELP: Record<string, string> = {
  auth: `imagegen auth - manage provider credentials (one namespace per provider)

Usage:
  imagegen auth codex login [--timeout <minutes>] [--no-open]
  imagegen auth codex status [--show-path]
  imagegen auth codex logout
`,
  login: `imagegen auth codex login - connect Codex via browser OAuth

Usage:
  imagegen auth codex login [--timeout <minutes>] [--no-open]

Starts a temporary localhost callback server, opens the browser,
exchanges the code, and stores tokens in the OS vault (file fallback).
`,
  status: `imagegen auth codex status - show Codex connection state

Usage:
  imagegen auth codex status [--show-path]

Prints JSON without secrets. --show-path reveals the token location.
`,
  logout: `imagegen auth codex logout - remove stored Codex credentials

Usage:
  imagegen auth codex logout
`,
  generate: `imagegen generate - create images from a prompt

Usage:
  imagegen generate --prompt <text> --out <path|dir> [--provider <name>] [options]

${IMAGE_OPTIONS}
${GENERATE_EXAMPLES}
`,
  edit: `imagegen edit - edit a source image with a prompt

Usage:
  imagegen edit --prompt <text> --source <file> [--mask <file>] --out <path|dir> [--provider <name>] [options]

${IMAGE_OPTIONS}
${EDIT_EXAMPLES}
`,
  providers: `imagegen providers - list registered and configured providers

Usage:
  imagegen providers

Prints JSON with each provider and whether it is configured.
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
