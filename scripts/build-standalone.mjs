import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Inline Vite's bundled modules and CSS so file:// works without a server.
const root = fileURLToPath(new URL('../', import.meta.url));
const assets = await readdir(resolve(root, 'dist/assets'));
const script = await readFile(resolve(root, 'dist/assets', assets.find(f => /^index-.*\.js$/.test(f))), 'utf8');
const css = await readFile(resolve(root, 'dist/assets', assets.find(f => /^index-.*\.css$/.test(f))), 'utf8');
const license = await readFile(resolve(root, 'public/POKEAPI-LICENSE.txt'), 'utf8');
const safeScript = script.replace(/<\/script/gi, '<\\/script');
const offlineCss = css.replace(/@import\s+url\([^)]*\);?/g, '');
const html = `<!doctype html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>포켓몬 데이즈 · 바로 플레이</title><style>${offlineCss}</style></head>
<body><div id="app"></div>
<script>window.POKEMON_ASSET_BASE='./public/pokemon/';</script>
<script type="module">${safeScript}</script>
<!-- PokeAPI data attribution and license:\n${license.replace(/-->/g, '-- >')}-->
</body></html>`;
await writeFile(resolve(root, 'play.html'), html);
console.log('Built play.html — double-click to play, no Node.js/server required.');
