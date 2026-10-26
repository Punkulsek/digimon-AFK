# Asset credits

## Pokémon sprites

- Source: https://github.com/PokeAPI/sprites
- Pinned revision: `97a7832d307311c0e1c6ea9035308bf80cc94f81`
- Static artwork: `sprites/pokemon/1.png` through `151.png`
- Animated pixel sprites: `sprites/pokemon/versions/generation-v/black-white/animated/1.gif` through `151.gif`
- Local paths: `public/pokemon/` and `public/pokemon/animated/`
- Exact source URLs and SHA-256 hashes: `public/pokemon/sources.json`

Pokémon and Pokémon character names and artwork belong to Nintendo, Creatures Inc. and GAME FREAK inc. PokeAPI hosts these sprite assets; their inclusion does not imply endorsement or transfer their underlying artwork rights. The sprites were obtained from the repository requested by the user, not generated.

## Pokédex data

Kanto data was imported from the user-provided PokeAPI ZIP. The PokeAPI data license is retained at `public/POKEAPI-LICENSE.txt` and inside `play.html`.

## Music and environment art

The user previously selected background A for Viridian Forest. The legacy file is
retained at `public/scene/viridian-forest.png`. The current overworld uses the newly
generated region art described below.
- Source: https://github.com/smogon/pokemon-showdown-client/blob/0de26d2ef7258e5619057f63b3774240b45cecbd/play.pokemonshowdown.com/fx/bg-forest.png
- Repository license: AGPLv3. The repository credits Kyle Dove for battle backdrops; a separate per-image reuse permission has not been verified. Inclusion does not transfer underlying artwork rights.
- This legacy art has been superseded for overworld regions; the approved dungeon art is retained.
- Current BGM: user-uploaded `1-12. Oldale Town.mp3`, stored unchanged as `public/audio/oldale-town.mp3` and embedded in `play.html`. Metadata: Oldale Town, Pokémon Omega Ruby & Alpha Sapphire Super Music Collection. User explicitly requested using this file. Underlying recording rights remain with their owners; upload does not grant a public reuse license.

Procedural sound effects in `src/audio.js` use local Web Audio oscillators. The previous synthesized background melody has been replaced exclusively by the user-provided MP3. No music search or other recording was used.

`public/scene/forest.svg` is an original vector environment drawn for this project. Interface icons use the installed Lucide package under its ISC license. Pokémon images retain their native aspect ratio and pixel rendering.

## Currency icons

`public/currency/pokecoin.png` and `diamond.png` are unchanged PNG files extracted from the user-provided 포켓코인.zip and 다이아.zip, respectively. Both are embedded in the standalone HTML. No substitute artwork was generated.

## Approved dungeon backgrounds

The user approved the recommended combination. Files are unchanged copies from
Pokémon Showdown client revision `0de26d2ef7258e5619057f63b3774240b45cecbd`,
stored under `public/scene/dungeons/` and embedded in `play.html`.

- `coin.png`: https://github.com/smogon/pokemon-showdown-client/blob/0de26d2ef7258e5619057f63b3774240b45cecbd/play.pokemonshowdown.com/fx/bg-earthycave.png
- `candy.png`: https://github.com/smogon/pokemon-showdown-client/blob/0de26d2ef7258e5619057f63b3774240b45cecbd/play.pokemonshowdown.com/fx/bg-meadow.png
- `evolution-fire.png`: https://github.com/smogon/pokemon-showdown-client/blob/0de26d2ef7258e5619057f63b3774240b45cecbd/play.pokemonshowdown.com/fx/bg-volcanocave.png
- `evolution-water.png`: https://github.com/smogon/pokemon-showdown-client/blob/0de26d2ef7258e5619057f63b3774240b45cecbd/play.pokemonshowdown.com/fx/bg-beach.png
- `evolution-grass.png`: https://github.com/smogon/pokemon-showdown-client/blob/0de26d2ef7258e5619057f63b3774240b45cecbd/play.pokemonshowdown.com/fx/bg-forest.png
- `evolution-electric.png`: https://github.com/smogon/pokemon-showdown-client/blob/0de26d2ef7258e5619057f63b3774240b45cecbd/play.pokemonshowdown.com/fx/bg-thunderplains.png
- `evolution-rock.png`: https://github.com/smogon/pokemon-showdown-client/blob/0de26d2ef7258e5619057f63b3774240b45cecbd/play.pokemonshowdown.com/fx/bg-mountain.png
- `evolution-ice.png`: https://github.com/smogon/pokemon-showdown-client/blob/0de26d2ef7258e5619057f63b3774240b45cecbd/play.pokemonshowdown.com/fx/bg-icecave.png

The client repository specifies AGPLv3; separate per-image reuse permissions
have not been verified. User selection does not transfer underlying artwork rights.

## Generated Kanto region backgrounds

The user explicitly requested creating and applying new backgrounds in a similar
pixel-art style to the existing environments. Twenty new environment scenes were
created with OpenAI image generation for this project. These are original generated
interpretations of the requested locations, not extracted official game backgrounds.
No Pokémon sprites, music, currency icons or dungeon art were generated or replaced.

- Files: `public/scene/regions/kanto-1.png` through `kanto-5.png`.
- Each unchanged 1536×1024 PNG contains four 768×512 scenes in reading order.
- Five sheets cover region IDs 1–4, 5–8, 9–12, 13–16 and 17–20 respectively.
- The renderer displays one quadrant at its native aspect ratio, using CSS to cover
  the viewport. No other quadrant is shown in the game.
- All five sheets are embedded once in `play.html` for offline play.
- `sources.json` records SHA-256 hashes and the region mapping; it does not assert
  a third-party asset license for these generated images.

## 소환 포켓몬 일러스트
사용자 요청에 따라 새로 생성한 만화풍 포켓몬 단체 일러스트: `public/scene/summon/pokemon-ensemble.png`. 포켓몬 캐릭터 권리는 Nintendo / Creatures / GAME FREAK에 있습니다. 독립 실행 HTML에도 포함합니다.

## 18타입 진화재료 던전 배경
사용자 요청에 따라 새로 생성한 원본 도트 배경 18종입니다. `public/scene/type-dungeons/types-1.png`~`types-3.png`는 각각 2열×3행으로 구성되며 이미지 원본을 수정하지 않고 CSS로 해당 장면을 표시합니다. 타입 순서는 `src/dungeon-config.js`, 파일 해시와 크기는 같은 폴더의 `sources.json`에 기록했습니다. 타입 선택·도전 화면·실제 던전 전투에 같은 배경을 적용하며 `play.html`에도 내장합니다. 이전 6타입 배경은 보관용이며 새 타입 배경으로 대체했습니다. 포켓코인·이상한사탕 배경과 사용자 BGM은 유지합니다.

## 사용자 제공 타입 아이콘
`public/types/type-icons.webp`는 첨부 `타입에셋.zip` 안의 `타입 에셋.webp` 원본입니다. 이미지 수정 없이 CSS로 18개 타입 영역을 표시합니다. 복합 타입은 각 아이콘을 함께 표시하며 카드·상세·도감 상세·진화 재료·타입별 던전에 적용합니다. 출처·SHA-256·영역 좌표는 `public/types/source.json`에 기록하며 독립 실행 HTML에도 내장합니다.

### 2단계 기술 이펙트
사용자가 지정한 [rh-hideout/pokeemerald-expansion](https://github.com/rh-hideout/pokeemerald-expansion)의 `graphics/battle_anims/sprites`에서 원본 PNG 10개를 가져왔습니다. `public/effects/sources.json`에 고정 커밋, 원본 링크, SHA-256 및 이미지 크기를 기록했습니다. PNG 파일은 수정하지 않고 브라우저에서 GBA 팔레트 0번을 투명하게 렌더링합니다. 충격파·기술명·회복 표시와 애니메이션 타임라인은 자체 코드입니다. 직선 연결 광선은 사용하지 않습니다. 노래하기(음표)와 악마의키스(하트)는 서로 다른 원본 그래픽을 사용합니다.

검토한 체크아웃에서 루트 LICENSE 또는 해당 그래픽의 개별 재사용 라이선스를 찾지 못했습니다. 공개 저장소라는 사실만으로 그래픽의 자유로운 재배포/상업 이용 권한이 확인되는 것은 아니며, 포켓몬 원본 그래픽 권리는 해당 권리자에게 있습니다.

## 승인된 상태이상·버프 아이콘
`public/ui/status-icons.png`는 사용자가 선택한 첫 번째 생성 시안 원본입니다 (`exec-87175659-a78c-41c3-b406-c2e7e243a080.png`). 이미지 파일을 수정하지 않고 `src/status-icons.js`의 CSS 영역 좌표로 아이콘만 표시합니다. 두 번째 포켓몬 배틀풍 시안은 적용하지 않았습니다. 남은 시간·중첩 수·버프/디버프 색상과 설명은 실제 전투 상태에서 표시하며, 독립 실행 파일에도 원본이 내장됩니다.

### 기술 시전 연출 개편
`src/skill-choreography.js`의 131개 기술 연출 정의와 `src/skill-effects.js`의 Canvas 타임라인은 이 게임을 위해 직접 작성했습니다. 원작의 GBA 애니메이션 스크립트를 이식한 구현은 아닙니다. 기존 PNG 시트의 프레임을 순차 재생하고, 준비 동작·응축 입자·곡선 투사체·타격·회복·보호막 효과를 결합합니다. 시전/발동/타격 효과음은 Web Audio로 합성하며 BGM은 변경하지 않습니다. 모든 리소스는 `play.html`에도 내장됩니다.

## 타입 상성 데이터
`src/type-matchups.js`는 페어리 타입을 포함하는 현대 18타입 상성표입니다. `tests/fixtures/type-efficacy.csv`는 https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/type_efficacy.csv 의 검증용 스냅샷이며 테스트에서 18×18 조합을 전부 대조합니다. 일반 공격은 첫 타입, 기술은 기술별 타입을 사용하며 자속 보정은 적용하지 않습니다. 최대 HP 비례 지속 피해와 반사 피해는 타입 배율에서 제외합니다.

## 알그룹 시너지
`src/generated/egg-groups.json`은 PokeAPI의 `data/v2/csv/pokemon_egg_groups.csv`에서 1~151번 종의 실제 알그룹을 추출했습니다. 두 알그룹이 같은 시너지이면 한 번만 기여합니다. 미발견·알그룹 없음 및 별도 분류인 메타몽 그룹은 초월로 처리합니다. 침식의 피해 보너스는 독 및 지속 피해에 적용하며 회복과 직접 타격에는 적용하지 않습니다.
