import type { UnitBonuses } from "osrs-sdk";

function stats(attack: readonly [number, number, number, number, number], defence: readonly [number, number, number, number, number], strength: number, prayer: number): UnitBonuses {
  return {
    attack: { stab: attack[0], slash: attack[1], crush: attack[2], magic: attack[3], range: attack[4] },
    defence: { stab: defence[0], slash: defence[1], crush: defence[2], magic: defence[3], range: defence[4] },
    other: { meleeStrength: strength, rangedStrength: 0, magicDamage: 0, prayer }, targetSpecific: { undead: 0, slayer: 0 },
  };
}

export const ZEKE_GEAR = {
  inquisitorsGreatHelm: { id: 24419, bonuses: stats([0, 0, 10, -5, -5], [19, 10, 21, 0, 12], 6, 1), crushBonus: 0.005, source: "https://oldschool.runescape.wiki/w/Inquisitor%27s_great_helm" },
  inquisitorsHauberk: { id: 24420, bonuses: stats([0, 0, 16, -11, -10], [67, 55, 71, 0, 35], 4, 2), crushBonus: 0.01, source: "https://oldschool.runescape.wiki/w/Inquisitor%27s_hauberk" },
  inquisitorsPlateskirt: { id: 24421, bonuses: stats([0, 0, 12, -9, -5], [42, 30, 49, 0, 22], 2, 2), crushBonus: 0.01, source: "https://oldschool.runescape.wiki/w/Inquisitor%27s_plateskirt" },
  elderMaul: {
    id: 21003, bonuses: stats([0, 0, 135, 0, 0], [0, 0, 0, 0, 0], 147, 0), speed: 6, specialEnergy: 50, specialAccuracy: 1.25, defenceDrain: 0.35,
    attack: 7516, idle: 7518, run: 7519, walk: 7520, special: 11124, specialGlow: 2804, specialImpact: 2805,
    source: "https://oldschool.runescape.wiki/w/Elder_maul",
  },
  crimsonKisten: {
    id: 33631, bonuses: stats([0, 0, 80, 0, 0], [0, 0, 0, 0, 0], 56, 0), speed: 4, specialEnergy: 50, accuracyRolls: 4, minimumHit: 0.7, maximumHit: 1.1, additionalHit: 0.2,
    attack: 566, stab: 14253, idle: 14251, walk: 14252, run: 14254, special: 14255, specialGlow: 3908,
    source: "https://oldschool.runescape.wiki/w/Crimson_kisten",
  },
} as const;
