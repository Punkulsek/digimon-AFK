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
Browser localStorage is origin-specific. A local play.html save cannot be read automatically by a pages.dev website. Keep the original file/browser data. Replace the existing play.html at the SAME path with the updated version, enter game → Settings → 진행 기록 옮기기 → 내보내기. On the website use 불러오기 with that JSON. Import validates the save, requests overwrite confirmation and retains a local pre-import backup. Google sign-in does not upload or synchronize game saves.

## Google only authentication
Populate public/auth-config.json with Firebase web app public configuration (apiKey, authDomain, projectId, appId). Enable Google in Firebase Authentication and authorize pokemon-eternal.pages.dev. Never put service-account keys or OAuth client secrets in this public file. Authentication uses Firebase GoogleAuthProvider and browser persistence; the button is hidden only for an authenticated Google user, never on a fabricated local linked flag. With configuration absent the game remains playable and the button reports setup pending. Actual login requires HTTPS/localhost and has not been verified against a live Firebase project.

Title music autoplay is attempted; browsers may require the first user gesture. It loops until game entry. The title pauses game simulation and blocks interaction with the underlying game.
