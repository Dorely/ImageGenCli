const PROFILE_HELP = `Named endpoint profiles:
  imagegen providers add <name> --api <openrouter|openai-images> [--base-url <url>]
                         [--model <id>] [--auth <bearer|none>]
  imagegen providers show <name>
  imagegen providers update <name> [--api <format>] [--base-url <url>]
                         [--model <id>] [--auth <bearer|none>]
  imagegen providers remove <name>
  imagegen auth <name> login [--key-stdin]
  imagegen auth <name> status [--show-path]
  imagegen auth <name> logout
  imagegen models --provider <name>

OpenRouter defaults to https://openrouter.ai/api/v1. openai-images requires
--base-url including the API prefix (e.g. https://api.openai.com/v1).
Keys use hidden terminal input or explicit --key-stdin and the existing vault/file
store. --auth none supports endpoints without keys. Config is saved in providers.json
alongside the credential file. Origin changes clear the saved key; removing a
profile removes its credentials. Logout preserves profile configuration.

Select named profiles with --provider. Model precedence: --model > profile default;
provide one if no default is saved. models explicitly discovers model metadata;
OpenAI-compatible model listings do not establish image capabilities.

Supported protocols: OpenRouter dedicated Images API and OpenAI Images JSON /
multipart endpoints, not arbitrary HTTP templates. Options vary by model.
OpenRouter accepts aspect ratios; openai-images needs pixels or presets:
square 1024x1024, portrait 1024x1536, landscape 1536x1024, wide 1536x864.
Auto options are omitted. Native masks require openai-images or Codex.
Outputs are measured and converted to PNG/JPEG/WebP without resizing. Count uses
separate single-image requests without automatic retries or model substitution.
`;

const IMAGE_OPTIONS = `Image options (generate, edit):
  --prompt <text>        Prompt text (required)
  --out <path|dir>       Output file or directory (required)
  --provider <name>      Repeatable. Defaults to the only configured provider;
                         required when several are configured.
  --model <id>          Image model override (defaults listed below)
  --reference <file>     Reference image for continuity (repeatable, max 4)
  --size <size>          auto, WIDTHxHEIGHT, aspect (16:9), or preset
                     square, portrait, landscape, wide (validated per
                     provider; bad aspects are rejected)
  --quality <quality>    Quality hint (provider-specific, default auto)
  --format <format>      png, jpeg, or webp (default png)
  --count <n>            Number of images, 1-4 (default 1)

Gemini provider:
  gemini-nano-banana-2.1 Default; generation, references, and independent edits
  gemini-3-pro-image    Precision creative work and brand consistency
  gemini-3.1-flash-image Previous-generation Flash; also supports 512 resolution
  gemini-2.5-flash-image Legacy; up to three inputs including edit source
  --quality auto only; no --mask or guaranteed native alpha transparency.
  --size normalizes to model-native ratios and resolution tiers without resizing.
  auto keeps model defaults; aspect/preset requests use 1K. JSON reports actual pixels.
  PNG/JPEG/WebP output; format conversion happens locally when needed.
  Model precedence: --model > constructor imageModel > IMAGEGEN_GEMINI_IMAGE_MODEL
  > gemini-nano-banana-2.1. Calls are independent; use prior output as --source.

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
`;

const GENERATE_EXAMPLES = `Examples:
  imagegen generate --provider gemini --size 16:9 --prompt "a lighthouse at dawn" --out ./gemini.png
  imagegen generate --prompt "a lighthouse at dawn" --out ./lighthouse.png
  imagegen generate --model gpt-image-2 --prompt "a lighthouse" --out ./classic.png
  imagegen generate --model gpt-image-2.5-sunburst --quality max --prompt "a product photo" --out ./product.png
`;

const EDIT_EXAMPLES = `Edit options:
  --source <file>        Source image (required)
  --mask <file>          Optional edit mask (Codex or openai-images)

Examples:
  imagegen edit --format webp --source ./product.png --prompt "make the product blue" --out ./blue.webp
  imagegen edit --model gpt-image-2.5-sunburst --quality max --source ./product.png --prompt "add a ribbon" --out ./ribbon.png
`;

export const USAGE = `imagegen - provider-agnostic image generation CLI

Usage:
  imagegen auth gemini login [--key-stdin]
  imagegen auth gemini status [--show-path]
  imagegen auth gemini logout
  imagegen auth codex login [--timeout <minutes>] [--no-open]
  imagegen auth codex status [--show-path]
  imagegen auth codex logout
  imagegen generate --prompt <text> --out <path|dir> [--provider <name>] [options]
  imagegen edit --prompt <text> --source <file> [--mask <file>] --out <path|dir> [--provider <name>] [options]
  imagegen providers
  imagegen models --provider <profile-name>
  imagegen skill
  imagegen skill install --target <claude|codex|skills-dir> [--target <...>] [--force]
  imagegen help [command]

${PROFILE_HELP}
${IMAGE_OPTIONS}
${GENERATE_EXAMPLES}
${EDIT_EXAMPLES}

Auth options:
  --key-stdin           Read an API key from explicit stdin; otherwise hidden
                         terminal entry. Keys are stored in the vault/file fallback.
  --timeout <minutes>    Login wait timeout (default 10)
  --no-open              Print the URL without opening a browser
  --show-path            Show where tokens are stored (auth status)

Global:
  -h, --help             Show help and exit 0
`;

const COMMAND_HELP: Record<string, string> = {
  auth: `imagegen auth - manage provider credentials (one namespace per provider)

${PROFILE_HELP}

Usage:
  imagegen auth gemini login [--key-stdin]
  imagegen auth gemini status [--show-path]
  imagegen auth gemini logout
  imagegen auth codex login [--timeout <minutes>] [--no-open]
  imagegen auth codex status [--show-path]
  imagegen auth codex logout
`,
  login: `imagegen auth login - connect Gemini with an API key or Codex via OAuth

Usage:
  imagegen auth gemini login [--key-stdin]
  imagegen auth gemini status [--show-path]
  imagegen auth gemini logout
  imagegen auth codex login [--timeout <minutes>] [--no-open]

Gemini login reads a hidden API key (or explicit --key-stdin), stores it in the
OS vault with file fallback, and makes no paid verification request.
Codex login starts a temporary localhost callback server, opens the browser,
exchanges the code, and stores tokens in the OS vault (file fallback).
`,
  status: `imagegen auth status - show provider connection state

Usage:
  imagegen auth gemini status [--show-path]
  imagegen auth codex status [--show-path]

Prints JSON without secrets. --show-path reveals the credential location.
Gemini status is local configured state, not API-key validity.
`,
  logout: `imagegen auth logout - remove stored provider credentials

Usage:
  imagegen auth gemini logout
  imagegen auth codex logout
`,
  generate: `imagegen generate - create images from a prompt

Usage:
  imagegen generate --prompt <text> --out <path|dir> [--provider <name>] [options]

${PROFILE_HELP}
${IMAGE_OPTIONS}
${GENERATE_EXAMPLES}
`,
  edit: `imagegen edit - edit a source image with a prompt

Usage:
  imagegen edit --prompt <text> --source <file> [--mask <file>] --out <path|dir> [--provider <name>] [options]

${IMAGE_OPTIONS}
${EDIT_EXAMPLES}
`,
  providers: `imagegen providers - list providers and manage named endpoints

Usage:
  imagegen providers

Prints JSON with each provider and whether it is configured.

${PROFILE_HELP}`,
  models: `imagegen models - discover models for a named endpoint profile

Usage:
  imagegen models --provider <profile-name>

Discovery is explicit and may require saved credentials. OpenRouter returns image
models and reported capabilities; generic /models results have unknown image
capabilities. This command does not generate images.
`,
  skill: `imagegen skill - print or install the reusable agent skill

Usage:
  imagegen skill
  imagegen skill install --target <claude|codex|skills-dir> [--target <...>] [--force]

Without install, prints SKILL.md as Markdown. Install accepts repeatable targets:
  claude          ~/.claude/skills/imagegen-cli/SKILL.md
  codex           ~/.agents/skills/imagegen-cli/SKILL.md
  <skills-dir>    <skills-dir>/imagegen-cli/SKILL.md

Install prints JSON with each path and status. Existing different content is
preserved unless --force is passed.
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
