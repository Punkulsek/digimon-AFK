import {readdir,stat} from 'node:fs/promises';
async function check(path){for(const name of await readdir(path)){const file=`${path}/${name}`,s=await stat(file);if(s.isDirectory())await check(file);else if(s.size>25*1024*1024)throw Error(`Cloudflare Pages asset exceeds 25 MiB: ${file}`);}}
await check('dist');console.log('Pages asset size check passed. Deploy dist, not play.html.');
