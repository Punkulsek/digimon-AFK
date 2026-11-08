# Pokémon Eternal — Cloudflare Pages

Use the existing GitHub → Cloudflare Pages integration. No direct Cloudflare authentication is required by this repository. A push triggers deployment when this branch is the configured production branch. Live deployment and project-name availability have not been verified from this workspace; do not choose an alternative name automatically.

## Git-integrated Pages setup
1. Cloudflare → Workers & Pages → Create → Pages → Connect to Git.
2. Select `Punkulsek/digimon-AFK`; production branch `feature/pokemon-idle-v1`.
3. Set project name **pokemon-eternal**. If unavailable, stop and report it.
4. Framework: Vite; build command `npm run build:web`; output `dist`; root repository root; Node 22.
5. Enable automatic production builds for commits on the production branch. Deploy and verify https://pokemon-eternal.pages.dev.

Use the multi-file `dist` build: `play.html` exceeds the Pages per-file limit. Images, music and summon video are retained in dist. No save key changes or storage-clearing operations are included.

## Existing saves
Browser localStorage is origin-specific. Keep existing browser data. Google sign-in synchronizes linked saves through Firestore after the required Firebase setup; a different device resumes with the same Google account. Manual save-file export/import has been removed. This removal does not delete existing local saves or backups.

## Google authentication and cloud saves
See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for the supplied pokemon-eternal configuration, required Google authorized domains, the existing named `default` Firestore database and security rule publication. Do not create another database or change billing. Account saves synchronize through Firestore; existing browser guest data is preserved. Pages deployment does not deploy Firestore rules.

Title music autoplay is attempted; browsers may require the first user gesture. It loops until game entry. The title pauses game simulation and blocks interaction with the underlying game.

## Asset download and updates
The Vite plugin in `vite.config.js` creates `dist/asset-manifest.json` on every build. Each local image, font, audio/video file and built JS/CSS asset has a SHA-256 hash and byte length. The existing `npm run build:web` command still produces the complete Pages output; no separate deployment step is required.

The original title shows a byte-based 0–100% download bar. Login and game entry remain disabled until the required files are verified and cached. `/asset-worker.js` uses Cache Storage under the `pokemon-eternal-assets-*` names. Cached hashes are reused; only missing or changed files download. Transfers retry after failures, never store partial/corrupt bodies, and support media Range requests. On subsequent visits the manifest is checked again. Stale asset versions are pruned only when no open game tab needs them. Browser storage eviction naturally requires missing assets to be downloaded again.

HTML, `/auth-config.json`, Firebase authentication requests and player saves are never stored by this worker. It does not delete localStorage, IndexedDB, or other applications' caches. Public fonts now come from this same site. Standalone `play.html` already embeds assets and bypasses the downloader. HTTPS (or localhost) and browser Service Worker/Cache Storage support are required for web precaching.
