import {readFile, writeFile, mkdir, rm, cp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const root = new URL('../', import.meta.url);
execFileSync(process.execPath, [new URL('scripts/compile.mjs', root).pathname], {stdio:'inherit'});
const output = new URL('dist-pages/', root);
await rm(output, {recursive:true, force:true});
await mkdir(output, {recursive:true});
const source = await readFile(new URL('worker/index.js', root), 'utf8');
const start = source.indexOf('const assets=');
const end = source.indexOf(';\nexport default', start);
if (start < 0 || end < 0) throw Error('Embedded asset catalog not found');
const assets = JSON.parse(source.slice(start + 'const assets='.length, end));
for (const [route, asset] of Object.entries(assets)) {
  let bytes = Buffer.from(asset.data, 'base64');
  if (route === '/') {
    bytes = Buffer.from(bytes.toString('utf8').replace('<button class="secondary" id="exportButton">Exportar meus dados</button>', '<button class="secondary" id="exportButton">Exportar meus dados</button><form method="post" action="/auth/logout"><button type="submit" class="text-button">Sair da conta</button></form>'));
  }
  await writeFile(new URL(route === '/' ? 'index.html' : route.slice(1), output), bytes);
}
const app = (source.slice(0, start) + 'const assets={}' + source.slice(end)).replace('export default', 'const app =');
const auth = await readFile(new URL('pages/auth.js', root), 'utf8');
const loginTemplate = await readFile(new URL('pages/login.html', root), 'utf8');
const login = 'function loginPage(message = "") { return ' + JSON.stringify(loginTemplate) + '.replace("{{MESSAGE}}", message.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")); }';
const entry = (await readFile(new URL('pages/entry.js', root), 'utf8')).replace(/^import .*;\n/gm, '');
await writeFile(new URL('_worker.js', output), app + '\n' + login + '\n' + auth + '\n' + entry);
for (const directory of ['editions', 'writers', 'celebrations']) {
  await cp(new URL('assets/' + directory + '/', root), new URL(directory + '/', output), {
    recursive:true, filter: path => !path.includes('.') || path.endsWith('.png')
  });
}
await writeFile(new URL('_routes.json', output), JSON.stringify({version:1, include:['/*'], exclude:[]}));
console.log('Pages upload folder: ' + output.pathname);
