import {readFile} from 'node:fs/promises';
const html=await readFile('dist/index.html','utf8');
const entry=html.match(/src="(\/assets\/[^\"]+\.js)"/)[1];
const js=await readFile('dist'+entry,'utf8');
for(const marker of ['dungeonSweep','dungeonKeys','offlineRewards','claimOffline'])if(!js.includes(marker))throw Error('Missing deployed feature: '+marker);
const config=JSON.parse(await readFile('wrangler.jsonc','utf8'));
if(config.name!=='digimon-afk'||config.assets.directory!=='./dist'||config.pages_build_output_dir)throw Error('Wrong deployment target');
console.log('Verified Workers target digimon-afk and actual HTML entry '+entry+' includes keys, sweeps and offline rewards.');
