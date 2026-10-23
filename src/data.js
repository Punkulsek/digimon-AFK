import {STAGE_REGIONS,regionForStage,localStage,regionIndex} from "./stages.js";
import kanto from "./generated/kanto.json" with { type: "json" };

export const RARITIES = [
  { name: "일반", color: "#87938d", chance: 50 },
  { name: "고급", color: "#57a780", chance: 28 },
  { name: "희귀", color: "#559bc4", chance: 15 },
  { name: "영웅", color: "#a078c0", chance: 6 },
  { name: "전설", color: "#d6ab4e", chance: 1 },
];
// 사용자 제공 도트 파일을 public/pokemon에 넣거나 sprite 경로를 변경하세요.
const STARTER_BALANCE = [
  [1, "이상해씨", 2, "풀", "leaf", 72, 12],
  [4, "파이리", 2, "불꽃", "flame", 60, 15],
  [7, "꼬부기", 2, "물", "droplets", 85, 10],
  [25, "피카츄", 3, "전기", "zap", 65, 18],
  [39, "푸린", 1, "페어리", "sparkles", 82, 9],
  [133, "이브이", 2, "노말", "star", 70, 13],
  [10, "캐터피", 0, "벌레", "leaf", 45, 7],
  [16, "구구", 0, "비행", "wind", 48, 8],
  [19, "꼬렛", 0, "노말", "star", 44, 9],
  [43, "뚜벅쵸", 1, "풀", "leaf", 65, 10],
  [54, "고라파덕", 1, "물", "droplets", 70, 11],
  [58, "가디", 2, "불꽃", "flame", 75, 14],
  [63, "캐이시", 2, "에스퍼", "sparkles", 50, 18],
  [94, "팬텀", 3, "고스트", "moon", 90, 23],
  [149, "망나뇽", 3, "드래곤", "wind", 110, 22],
  [144, "프리져", 4, "얼음", "snowflake", 130, 28],
  [145, "썬더", 4, "전기", "zap", 115, 32],
  [146, "파이어", 4, "불꽃", "flame", 120, 30],
  [150, "뮤츠", 4, "에스퍼", "sparkles", 125, 35],
].map(([id, name, rarity, type, icon, hp, atk]) => ({
  id,
  name,
  rarity,
  type,
  icon,
  hp,
  atk,
}));
const TYPE_ICONS = {
  풀: "leaf",
  벌레: "leaf",
  불꽃: "flame",
  물: "droplets",
  얼음: "snowflake",
  전기: "zap",
  에스퍼: "sparkles",
  페어리: "sparkles",
  고스트: "moon",
  비행: "wind",
  드래곤: "wind",
  격투: "swords",
  바위: "shield",
  땅: "shield",
  강철: "shield",
  독: "droplets",
  노말: "star",
};
export const SPECIES = kanto.map((entry) => {
  const original = STARTER_BALANCE.find((p) => p.id === entry.id);
  const total = Object.values(entry.baseStats).reduce((a, b) => a + b, 0);
  const rarity =
    entry.legendary || entry.mythical
      ? 4
      : total >= 480
        ? 3
        : total >= 380
          ? 2
          : total >= 300
            ? 1
            : 0;
  return {
    ...entry,
    rarity,
    hp: Math.round(35 + entry.baseStats.hp * 0.7),
    atk: Math.round(5 + entry.baseStats.attack * 0.16),
    ...original,
    name: entry.name,
    type: entry.types[0],
    icon: TYPE_ICONS[entry.types[0]] || "star",
    sprite:
      globalThis.POKEMON_SPRITES?.[entry.id]?.still ||
      `${globalThis.POKEMON_ASSET_BASE || "/pokemon/"}${entry.id}.png`,
    animated:
      globalThis.POKEMON_SPRITES?.[entry.id]?.animated ||
      `${globalThis.POKEMON_ASSET_BASE || "/pokemon/"}animated/${entry.id}.gif`,
  };
});
export const species = (id) => SPECIES.find((p) => p.id === id);
export const REGIONS = STAGE_REGIONS.map(region=>region.name);
export const stageLabel = stage => `${regionIndex(stage)+1}-${localStage(stage)}`;
export const regionName = stage => regionForStage(stage).name;
