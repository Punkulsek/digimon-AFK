# pokemon-eternal Firebase setup

The supplied public web config is in public/auth-config.json. Firebase Auth and Firestore SDKs are bundled locally, including in play.html. No admin/service-account credential is embedded.

## Required console settings
1. Firebase console → pokemon-eternal → Authentication → Sign-in method: keep Google enabled.
2. Authentication → Settings → Authorized domains: include `pokemon-eternal.pages.dev` (and any actual custom domain). `localhost` is needed only for development. Google login should be used on HTTPS or localhost, not file://.
3. Firestore Database: create the `(default)` database if absent, in production mode. Choose the intended permanent region.
4. Firestore → Rules: publish the exact contents of `firestore.rules`. A GitHub/Cloudflare Pages deployment does **not** publish Firebase rules. Alternatively, an authorized project administrator can run `npx firebase deploy --only firestore:rules --project pokemon-eternal`.
5. Push to the existing Pages production branch, build `npm run build:web`, output `dist`.

Rules restrict both `players/{uid}` and `players/{uid}/saveChunks/{n}` to that authenticated Google UID; other paths are denied. Rules protect account isolation, not anti-cheat validation of every gameplay value.

## Data behavior
- The complete game state is serialized, including inventory and each Pokémon's level/evolution/breakthrough/runes, currencies, quests/missions, unlocked collection/portraits, trainer data, stage progress, dungeon records, presets and party order. No subset of progression is selected.
- Saves are split into chunks within one atomic Firestore transaction. The metadata revision prevents simultaneous devices from silently overwriting newer saves.
- State is saved locally immediately on existing save triggers and queued remotely; all other state mutations are sampled every 5 seconds. Successful changes flush to Firestore every 5 seconds and on background/online events. Browsers cannot guarantee final network completion when abruptly closed; pending data is retained locally for the next connection.
- Server reads must succeed before entering a linked account. A failed read never creates or writes an initial save.
- A first account with no cloud save may inherit the existing guest save. The guest save is retained, and this migration is assigned to that account only. A second new account does not inherit the first account's data.
- Local account slots use `pokemon-days-v1:account:{uid}`; the original guest key `pokemon-days-v1` remains intact.
- Failed writes keep local progress and pending revision metadata (`pokemon-eternal-sync:{uid}`) and retry. Revision conflicts block further uploads until reload; pending data is backed up before loading the server winner (`pokemon-eternal-backup:{uid}:...`). No automatic last-write-wins overwrite.
- Current payloads are supported up to 7 MiB / 200 chunks; exceeding the transaction budget reports a save error and retains local data, without truncating or replacing the server save.
- Sign-in changes on an already running page reload into the title to prevent cross-account writes.
- Offline first launch of a linked account waits for the server rather than risking stale progress. Guest play remains local.

## Audio
Existing music files and mute/volume preferences are preserved. Title BGM attempts autoplay immediately, loops, and stops at entry. In-game playback attempts immediately on entry and visibility restoration. When blocked by browser policy it retries on the first pointer/key input. No browser-policy bypass is possible. The single game BGM currently assigned is Oldale Town; no per-region tracks are invented. Mode changes resolve existing optional `POKEMON_BGM_TRACKS` mappings and stop previous sources when the assigned file changes. Summon-video exclusive audio still suspends game music/effects.

## Validation and remaining live verification
`node --test tests/cloud-save.test.js tests/audio-lifecycle.test.js` checks migration, account isolation, read/write failures, reconnects, revision conflicts and audio source races.
`npm run test:firebase` runs ownership rules plus the real Firestore chunk transaction adapter against the local demo emulator.
The development environment denied the emulator JAR download (HTTP 403 Domain forbidden), so emulator checks could not run here. Live sign-in, cross-device Firestore access, and rule publication must be verified after the above console setup. No live rules deployment is claimed.
