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
