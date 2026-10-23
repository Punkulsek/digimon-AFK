import { readFile, writeFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

// Inline Vite's bundled modules and CSS so file:// works without a server.
const root = fileURLToPath(new URL("../", import.meta.url));
const assets = await readdir(resolve(root, "dist/assets"));
const script = await readFile(
  resolve(
    root,
    "dist/assets",
    assets.find((f) => /^index-.*\.js$/.test(f)),
  ),
  "utf8",
);
const css = await readFile(
  resolve(
    root,
    "dist/assets",
    assets.find((f) => /^index-.*\.css$/.test(f)),
  ),
  "utf8",
);
const license = await readFile(
  resolve(root, "public/POKEAPI-LICENSE.txt"),
  "utf8",
);
const credits = await readFile(resolve(root, "ASSETS.md"), "utf8");
const safeScript = script.replace(/<\/script/gi, "<\\/script");
const spriteData = {};
for (let id = 1; id <= 151; id++) {
  const still = await readFile(resolve(root, `public/pokemon/${id}.png`));
  const animated = await readFile(
    resolve(root, `public/pokemon/animated/${id}.gif`),
  );
  spriteData[id] = {
    still: `data:image/png;base64,${still.toString("base64")}`,
    animated: `data:image/gif;base64,${animated.toString("base64")}`,
  };
}
const currencyData = {};
for (const name of ["pokecoin", "diamond"]) {
  const png = await readFile(resolve(root, `public/currency/${name}.png`));
  currencyData[name] = `data:image/png;base64,${png.toString("base64")}`;
}
const bgm = await readFile(resolve(root, "public/audio/oldale-town.mp3"));
const forest = await readFile(resolve(root, "public/scene/forest.svg"));
const viridianForest = await readFile(resolve(root, "public/scene/viridian-forest.png"));
const offlineCss = css
  .replace(/@import\s+url\([^)]*\);?/g, "")
  .replace(
    /url\(["']?\/scene\/forest\.svg["']?\)/g,
    `url("data:image/svg+xml;base64,${forest.toString("base64")}")`,
  )
  .replace(
    /url\(["']?\/scene\/viridian-forest\.png["']?\)/g,
    `url("data:image/png;base64,${viridianForest.toString("base64")}")`,
  );
const html = `<!doctype html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>포켓몬 데이즈 · 바로 플레이</title><style>${offlineCss}</style></head>
<body><div id="app"></div>
<script>window.POKEMON_CURRENCY=${JSON.stringify(currencyData)};window.POKEMON_BGM="data:audio/mpeg;base64,${bgm.toString("base64")}";window.POKEMON_SPRITES=${JSON.stringify(spriteData)};</script>
<script type="module">${safeScript}</script>
<!-- PokeAPI data attribution and license:\n${license.replace(/-->/g, "-- >")}-->
<!-- Asset credits:\n${credits.replace(/-->/g, "-- >")}-->
</body></html>`;
await writeFile(resolve(root, "play.html"), html);
console.log(
  "Built play.html — double-click to play, no Node.js/server required.",
);
