// Copies the repository README and LICENSE into the CLI package before
// packing, so the npm page shows the README and the tarball carries the
// license. Relative README links are pinned to this version's Git tag, since
// docs/ and other repository files are not part of the package.
import { copyFile, readFile, writeFile } from "node:fs/promises";

const pkg = JSON.parse(await readFile("package.json", "utf8"));
const repository = pkg.repository.url.replace(/^git\+/, "").replace(/\.git$/, "");
const blobBase = `${repository}/blob/v${pkg.version}/`;

const readme = await readFile("../../README.md", "utf8");
const pinned = readme.replace(
  /\]\((?!https?:|mailto:|#)([^)\s]+)\)/g,
  (_, target) => `](${blobBase}${target})`,
);
await writeFile("README.md", pinned);
await copyFile("../../LICENSE", "LICENSE");
