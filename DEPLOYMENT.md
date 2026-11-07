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
