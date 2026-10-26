import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workerPath = resolve(projectRoot, "dist/server/index.js");
const manifestPath = resolve(projectRoot, "dist/.openai/hosting.json");

const [source, manifest] = await Promise.all([
  readFile(workerPath, "utf8"),
  readFile(manifestPath, "utf8"),
]);
JSON.parse(manifest);

// A data URL forces ESM parsing even though the generated output has no package.json.
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const workerModule = await import(moduleUrl);
assert.equal(
  typeof workerModule.default?.fetch,
  "function",
  `${pathToFileURL(workerPath)} must export default.fetch`,
);

console.log("Artifact is valid ESM and exports default.fetch");

const editions=JSON.parse(await readFile(resolve(projectRoot,'ui/editions.json'),'utf8'));
assert.equal(editions.length,12);
for(const edition of editions){
  if(!edition.asset)continue;
  const data=await readFile(resolve(projectRoot,'dist/assets'+edition.asset));
  assert.equal(data.readUInt32BE(0),0x89504e47,edition.id+' must have real PNG artwork');
}
console.log('All twelve editions have their packaged artwork.');
