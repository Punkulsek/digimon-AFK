# pokemon-eternal Firebase setup

The supplied public web config is in public/auth-config.json. Firebase Auth and Firestore SDKs are bundled locally, including in play.html. No admin/service-account credential is embedded.

## Required console settings
1. Firebase console → pokemon-eternal → Authentication → Sign-in method: keep Google enabled.
2. Authentication → Settings → Authorized domains: include `pokemon-eternal.pages.dev` (and any actual custom domain). `localhost` is needed only for development. Google login should be used on HTTPS or localhost, not file://.
3. Select the **existing `default` database (no parentheses)** in project `pokemon-eternal`: Enterprise edition, Firestore Native mode, location `asia-northeast3`. Do not create `(default)`, delete any database or upgrade billing. In Google Cloud → APIs & Services, check that Cloud Firestore API (`firestore.googleapis.com`) is enabled for this same project. This client uses the Firestore Native API, not the MongoDB API. The actual Enterprise API access settings require project administrator access to verify.
4. With **`default` selected**, Firestore → Rules: publish the exact contents of `firestore.rules`. A GitHub/Cloudflare Pages deployment does **not** publish Firebase rules. Alternatively, an authorized project administrator can run `npx firebase deploy --only firestore:rules --project pokemon-eternal` from this repository. `firebase.json` explicitly targets only the existing `default` database. Rules already use `/databases/{database}/documents`, so they work for this named database without changing document paths.
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
- Settings → 로그아웃 queues the final snapshot, waits for the in-flight write and then the latest snapshot (up to 8 seconds), signs out of Firebase and returns to the title. Failed uploads remain pending in that account's local slot; no save, backup or cloud document is deleted. Google login explicitly opens the account picker. Manual save-file export/import is no longer available.
- Offline first launch of a linked account waits for the server rather than risking stale progress. Game entry now requires Google authentication; unlinked users see only the link button. Existing guest saves remain available for first-account migration.

## Audio
Existing music files and mute/volume preferences are preserved. Title BGM attempts autoplay immediately, loops, and stops at entry. In-game playback attempts immediately on entry and visibility restoration. When blocked by browser policy it retries on the first pointer/key input. No browser-policy bypass is possible. The single game BGM currently assigned is Oldale Town; no per-region tracks are invented. Mode changes resolve existing optional `POKEMON_BGM_TRACKS` mappings and stop previous sources when the assigned file changes. Summon-video exclusive audio still suspends game music/effects.

## Background combat
The combat scheduler accounts for wall-clock time at the selected 1× / 1.5× / 2× speed, using the existing 0.1-second battle ticks. Hidden tabs continue on browser-permitted timer callbacks; suspended callbacks catch up in batches on resume, without estimating rewards or dropping elapsed time. Visual effects are skipped during catch-up. All stage/dungeon outcomes, mission kill counts and rewards still come from the battle engine, with kill timestamps reflecting the simulated time across daily/weekly boundaries. Title, paused combat and dungeon selection remain paused. A completed dungeon grants its result once and presents it on return. This applies to a page that remains loaded; browser process termination or tab discarding is not a server-side offline battle service.

`tests/battle-clock.test.js` compares regular and throttled combat at every speed and in every dungeon. `tests/browser/account-session.spec.js` exercises logout, account switching, removal of file transfer, and hidden-tab recovery using mocked Firebase services; it does not establish live Firebase connectivity.

## Validation and remaining live verification
`node --test tests/cloud-save.test.js tests/audio-lifecycle.test.js` checks migration, account isolation, read/write failures, reconnects, revision conflicts and audio source races.
`npm run test:firebase` runs ownership rules plus the real Firestore chunk transaction adapter against the local demo emulator.
The development environment denied the emulator JAR download (HTTP 403 Domain forbidden), so emulator checks could not run here. Live sign-in, cross-device Firestore access, and rule publication must be verified after the above console setup. No live rules deployment is claimed.

Login entry errors include the Firebase error code. `permission-denied` requires checking rules published to `default`; `not-found` requires checking the reported project/database target. Server reads time out after 45 seconds without overwriting records. First linking no longer forces a reload.

## Connection diagnostics (not-found)
Web deployments fetch `/auth-config.json` with `cache: no-store`; embedded configuration is used only for file:// builds. The expected project, auth domain and web app ID are validated before choosing the default Firebase app. Firestore uses `getFirestore(auth.app, 'default')` through `FIREBASE_DATABASE`; `asia-northeast3` is a server-side database location, not a database ID or client hostname. The public web config identifies the project; it does not select a Firestore database. Firebase Auth still uses the same project and persistent Google login.

Reads now use server-only document reads, checking metadata before/after chunk reads and retrying inconsistent revisions. Missing player documents return no save without a read-only transaction commit. Backend not-found errors are propagated, never treated as missing player data or proof that the database is absent. Writes remain revision-checked atomic transactions.
The supplied server response identified the missing `(default)` database. The user confirmed the existing database is named `default`, establishing the target-name mismatch in the previous code. The client and rules deployment target now use `default`. The deployed endpoint and administrator API settings could not be inspected from this workspace (outbound proxy HTTP 403). No live sign-in, rules publication or production save success is claimed. If an error persists, the message includes the actual Firebase response and target `[pokemon-eternal / default]` for diagnosis.

## Connection timeout correction
The old 15-second `cloud-timeout` was an application deadline covering both reading and the first upload, not proof of a server-side timeout. Entry now waits only for the validated server read. The first upload runs separately; failures retain the dirty local snapshot for retry. Firestore Lite uses finite authenticated HTTP batchGet/commit calls instead of a Listen/WebChannel connection. Document paths, chunks and optimistic write revisions are unchanged. The same SDK adapter is tested against a local HTTP server, including authentication headers and both reads and writes to `/databases/default/`. This verifies request behavior, not production connectivity.

## 배포 후 확인 순서
1. Cloudflare Pages에서 이번 GitHub 커밋의 배포가 성공했는지 확인하고 게임 페이지를 새로고침합니다. 브라우저 사이트 데이터는 삭제하지 않습니다.
2. Firebase 콘솔의 `pokemon-eternal` 프로젝트에서 Firestore 데이터베이스 **`default`(괄호 없음)**를 선택합니다. 새 데이터베이스를 만들지 않습니다.
3. Google Cloud의 같은 프로젝트에서 Cloud Firestore API가 사용 설정되어 있는지 확인합니다. 결제나 새 데이터베이스 생성을 요구하는 화면으로 진행하지 않습니다.
4. 해당 데이터베이스의 규칙에 저장소의 `firestore.rules` 내용을 게시합니다. 전체 공개 규칙으로 바꾸지 않습니다.
5. 게임에서 Google 로그인 → 게임 시작을 누릅니다. 오류가 남으면 대상이 `[pokemon-eternal / default]`인지 확인합니다. `(default)`로 보이면 이전 배포 파일입니다.
6. 정상 진입 후 진행하고 잠시 기다린 뒤 새로고침하여 기록이 복원되는지 확인합니다. 다른 기기에서는 동일한 Google 계정으로 로그인해 확인합니다. 확인 중 원래 브라우저의 로컬 데이터는 유지합니다.
