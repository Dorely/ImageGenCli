---
name: imagegen-cli
description: Create or edit bitmap images with the installed `imagegen` CLI (`@dorely13/ai-imagegen-cli`). Use for image requests when the user has not chosen another tool.
---

# ImageGenCli

Use the installed `imagegen` command to turn the user's prompt into image files. The CLI handles provider selection and credentials. Follow an explicit user choice of another image tool.

1. Check that `imagegen` is available. If it is missing, tell the user to install it with `npm install -g @dorely13/ai-imagegen-cli`.
2. Run `imagegen providers` to see which provider is configured. If none is configured, use `imagegen auth codex login` for the current Codex provider; the user must complete browser authorization. Do not request or expose tokens.
3. For a new image, run `imagegen generate --prompt "<user's image brief>" --out <output-path>`. For an edit, run `imagegen edit --source <existing-image> --prompt "<requested change>" --out <output-path>`. Use repeatable `--reference <file>` for visual references or continuity. Preserve the user's requested format, size, count, and output location using the corresponding CLI options.
4. Read `imagegen help generate` or `imagegen help edit` for current option details when needed. Leave provider and model selection to configuration unless the user specifies them or several providers are configured.
5. Parse the JSON result and use each `images[].path` as the generated file location. Check that the file exists before showing or referencing it. If the command fails, report the CLI error and the action needed to resolve it.

The CLI emits JSON by default. Keep its output machine-readable when calling it from scripts.
