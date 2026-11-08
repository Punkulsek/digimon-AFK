# Existing Cloudflare Workers deployment

Production: https://digimon-afk.kimdong200808.workers.dev/
Worker name: `digimon-afk`. Keep this existing Worker and domain.

Git branch: `feature/pokemon-idle-v1`.
Build command: `npm run build:web`.
Deploy command: `npx wrangler deploy --config wrangler.jsonc`.
Root directory: repository root. Node: 22 or newer.

The Workers config serves `./dist` through Workers Static Assets. Do not use a Pages deployment command or `pages_build_output_dir`, and do not pass `vite.config.js` to Wrangler. Earlier Pages instructions were for an assumed deployment target and are superseded by this configuration.

The build validates the actual JavaScript entry referenced by `dist/index.html` contains dungeon keys, sweeps and offline rewards. It generates `/version.json` with the full Git commit and build timestamp. After deployment, open `https://digimon-afk.kimdong200808.workers.dev/version.json` and compare `commit` with the successfully deployed GitHub commit. A Ready status for a different Worker, branch or artifact is insufficient.

The Service Worker does not cache navigation documents, authentication config, or Firebase requests. JavaScript and CSS requests now go to the deployment with revalidation; media assets retain hash-based caching. No user localStorage, Firebase data or IndexedDB is cleared. Updated workers activate with skipWaiting/clients.claim; HTML and worker files carry revalidation headers.

This workspace's outbound proxy denied access to the production workers.dev address (CONNECT 403); that is not a response from the game. Live deployment content must be checked using the version endpoint after the build/deploy configuration is applied. No deployment success is claimed from local validation alone.
