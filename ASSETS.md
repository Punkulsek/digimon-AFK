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

The user selected background A for Viridian Forest (region index 0). Its image is
stored at `public/scene/viridian-forest.png` and embedded in `play.html`.
- Source: https://github.com/smogon/pokemon-showdown-client/blob/0de26d2ef7258e5619057f63b3774240b45cecbd/play.pokemonshowdown.com/fx/bg-forest.png
- Repository license: AGPLv3. The repository credits Kyle Dove for battle backdrops; a separate per-image reuse permission has not been verified. Inclusion does not transfer underlying artwork rights.
- Other regions retain their existing environment pending user selection.
- Current BGM: user-uploaded `1-12. Oldale Town.mp3`, stored unchanged as `public/audio/oldale-town.mp3` and embedded in `play.html`. Metadata: Oldale Town, Pokémon Omega Ruby & Alpha Sapphire Super Music Collection. User explicitly requested using this file. Underlying recording rights remain with their owners; upload does not grant a public reuse license.

Procedural sound effects in `src/audio.js` use local Web Audio oscillators. The previous synthesized background melody has been replaced exclusively by the user-provided MP3. No music search or other recording was used.

`public/scene/forest.svg` is an original vector environment drawn for this project. Interface icons use the installed Lucide package under its ISC license. Pokémon images retain their native aspect ratio and pixel rendering.

## Currency icons

`public/currency/pokecoin.png` and `diamond.png` are unchanged PNG files extracted from the user-provided 포켓코인.zip and 다이아.zip, respectively. Both are embedded in the standalone HTML. No substitute artwork was generated.
