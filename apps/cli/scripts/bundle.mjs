import { build } from "esbuild";
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "dist/index.mjs",
  external: ["keytar", "open"],
  sourcemap: true,
  logLevel: "info",
});

await mkdir("dist", { recursive: true });
let bundled = await readFile("dist/index.mjs", "utf8");
bundled = bundled.replace(/^#!.*\n/, "");
await writeFile("dist/index.js", `#!/usr/bin/env node\n${bundled}`);
await chmod("dist/index.js", 0o755);
await rm("dist/index.mjs", { force: true });
await rm("dist/index.mjs.map", { force: true });
const { readdir } = await import("node:fs/promises");
for (const file of await readdir("dist")) {
  if (file.endsWith(".d.ts") || file.endsWith(".d.ts.map") || (file.endsWith(".js.map") && file !== "index.js.map")) {
    await rm(`dist/${file}`, { force: true });
  }
}
