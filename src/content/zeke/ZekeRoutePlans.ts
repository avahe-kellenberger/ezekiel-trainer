import { span, tile } from "../../sim/brands";
import type { TickSpan, Tile } from "../../sim/brands";
import type { SwordHazard, SwordPattern } from "./mechanics";
import type { ZekeTimedRouteAction } from "./ZekeRouteActions";
import { ZEKE_RULES } from "./ZekeRules";

export type ZekeRouteId = "cross-2-2" | "cross-5-2" | "cross-8-2" | "cross-2-5" | "cross-8-5" | "cross-2-8" | "cross-5-8" | "cross-8-8" | "parallel-x" | "parallel-y" | "two-rows";
export type ZekeRouteClick = Readonly<{ at: TickSpan; to: Tile }>;
export type ZekeRouteReturnPlan = Readonly<{ lead: TickSpan; actions: readonly ZekeTimedRouteAction[] }>;
export type ZekeRouteScenario = Readonly<{ id: ZekeRouteId; label: string; pattern: SwordPattern; meleeApproach: "first-impact" | "final-impact"; actions: readonly ZekeTimedRouteAction[]; returnPlan: ZekeRouteReturnPlan; recoveryReturnPlan: ZekeRouteReturnPlan; openingActions: readonly ZekeTimedRouteAction[]; clicks: readonly Tile[]; trace: readonly Tile[]; expectedHits: number; expectedCasts: number }>;

const openingActions: readonly ZekeTimedRouteAction[] = [
  { at: span(1), action: { kind: "attack-boss" } },
  { at: span(14), action: { kind: "move", to: tile(4, 7) } },
  { at: span(15), action: { kind: "equip", weapon: "harm" } },
];

function scenario(data: Omit<ZekeRouteScenario, "clicks" | "trace" | "openingActions" | "recoveryReturnPlan">, recoveryReturnPlan: ZekeRouteReturnPlan = data.returnPlan): ZekeRouteScenario {
  const moves = [...data.actions, ...data.returnPlan.actions].flatMap(({ action }) => action.kind === "move" ? [action.to] : []);
  const clicks = moves.filter((to, index) => {
    const previous = moves[index - 1];
    return previous === undefined || to.x !== previous.x || to.y !== previous.y;
  });
  const trace = [ZEKE_RULES.arena.playerSpawn.value, ...clicks];
  return { ...data, recoveryReturnPlan, openingActions, clicks, trace };
}

export const ZEKE_ROUTE_SCENARIOS: readonly ZekeRouteScenario[] = [
  scenario({
    id: "cross-2-2", label: "Upper left", pattern: { kind: "cross", row: 2, column: 2 }, expectedHits: 4, expectedCasts: 4,
    meleeApproach: "final-impact",
    actions: [
      { at: span(1), action: { kind: "attack-sword", index: 1 } },
      { at: span(2), action: { kind: "move", to: tile(2, 7) } },
      { at: span(3), action: { kind: "move", to: tile(2, 5) } },
      { at: span(4), action: { kind: "move", to: tile(2, 3) } },
      { at: span(5), action: { kind: "attack-sword", index: 2 } },
      { at: span(8), action: { kind: "move", to: tile(3, 1) } },
      { at: span(9), action: { kind: "attack-sword", index: 3 } },
      { at: span(11), action: { kind: "move", to: tile(1, 2) } },
      { at: span(12), action: { kind: "move", to: tile(1, 4) } },
      { at: span(13), action: { kind: "attack-sword", index: 0 } },
      { at: span(14), action: { kind: "move", to: tile(4, 7) } },
    ],
    returnPlan: { lead: span(0), actions: [
      { at: span(2), action: { kind: "move", to: tile(4, 7) } },
    ] },
  }),
  scenario({
    id: "cross-5-2", label: "Upper middle", pattern: { kind: "cross", row: 2, column: 5 }, expectedHits: 4, expectedCasts: 4,
    meleeApproach: "final-impact",
    actions: [
      { at: span(1), action: { kind: "attack-sword", index: 0 } },
      { at: span(2), action: { kind: "move", to: tile(2, 7) } },
      { at: span(3), action: { kind: "move", to: tile(2, 5) } },
      { at: span(4), action: { kind: "move", to: tile(2, 3) } },
      { at: span(5), action: { kind: "attack-sword", index: 1 } },
      { at: span(8), action: { kind: "move", to: tile(3, 1) } },
      { at: span(9), action: { kind: "attack-sword", index: 3 } },
      { at: span(11), action: { kind: "move", to: tile(5, 1) } },
      { at: span(12), action: { kind: "move", to: tile(7, 1) } },
      { at: span(13), action: { kind: "attack-sword", index: 2 } },
      { at: span(14), action: { kind: "move", to: tile(3, 5) } },
    ],
    returnPlan: { lead: span(0), actions: [
      { at: span(0), action: { kind: "move", to: tile(3, 5) } },
      { at: span(2), action: { kind: "move", to: tile(4, 7) } },
    ] },
  }),
  scenario({
    id: "cross-8-2", label: "Upper right", pattern: { kind: "cross", row: 2, column: 8 }, expectedHits: 4, expectedCasts: 4,
    meleeApproach: "final-impact",
    actions: [
      { at: span(1), action: { kind: "attack-sword", index: 0 } },
      { at: span(2), action: { kind: "move", to: tile(2, 7) } },
      { at: span(3), action: { kind: "move", to: tile(2, 5) } },
      { at: span(4), action: { kind: "move", to: tile(2, 3) } },
      { at: span(5), action: { kind: "attack-sword", index: 2 } },
      { at: span(7), action: { kind: "move", to: tile(4, 2) } },
      { at: span(8), action: { kind: "move", to: tile(6, 2) } },
      { at: span(9), action: { kind: "attack-sword", index: 3 } },
      { at: span(10), action: { kind: "move", to: tile(9, 2) } },
      { at: span(12), action: { kind: "move", to: tile(9, 4) } },
      { at: span(13), action: { kind: "attack-sword", index: 1 } },
      { at: span(14), action: { kind: "move", to: tile(5, 6) } },
    ],
    returnPlan: { lead: span(0), actions: [
      { at: span(0), action: { kind: "move", to: tile(5, 6) } },
      { at: span(2), action: { kind: "move", to: tile(4, 7) } },
    ] },
  }),
  scenario({
    id: "cross-2-5", label: "Middle left", pattern: { kind: "cross", row: 5, column: 2 }, expectedHits: 4, expectedCasts: 4,
    meleeApproach: "final-impact",
    actions: [
      { at: span(1), action: { kind: "attack-sword", index: 1 } },
      { at: span(2), action: { kind: "move", to: tile(2, 7) } },
      { at: span(3), action: { kind: "move", to: tile(1, 6) } },
      { at: span(5), action: { kind: "attack-sword", index: 2 } },
      { at: span(7), action: { kind: "move", to: tile(1, 7) } },
      { at: span(9), action: { kind: "attack-sword", index: 3 } },
      { at: span(13), action: { kind: "attack-sword", index: 0 } },
      { at: span(14), action: { kind: "move", to: tile(4, 7) } },
    ],
    returnPlan: { lead: span(0), actions: [
      { at: span(0), action: { kind: "move", to: tile(6, 5) } },
      { at: span(2), action: { kind: "move", to: tile(4, 7) } },
    ] },
  }),
  scenario({
    id: "cross-8-5", label: "Middle right", pattern: { kind: "cross", row: 5, column: 8 }, expectedHits: 4, expectedCasts: 4,
    meleeApproach: "final-impact",
    actions: [
      { at: span(1), action: { kind: "attack-sword", index: 0 } },
      { at: span(2), action: { kind: "move", to: tile(6, 9) } },
      { at: span(4), action: { kind: "move", to: tile(7, 8) } },
      { at: span(5), action: { kind: "attack-sword", index: 2 } },
      { at: span(9), action: { kind: "attack-sword", index: 3 } },
      { at: span(11), action: { kind: "move", to: tile(9, 6) } },
      { at: span(12), action: { kind: "move", to: tile(9, 7) } },
      { at: span(13), action: { kind: "attack-sword", index: 1 } },
      { at: span(14), action: { kind: "move", to: tile(5, 7) } },
    ],
    returnPlan: { lead: span(0), actions: [
      { at: span(1), action: { kind: "move", to: tile(5, 7) } },
      { at: span(2), action: { kind: "move", to: tile(3, 6) } },
      { at: span(3), action: { kind: "move", to: tile(4, 7) } },
    ] },
  }),
  scenario({
    id: "cross-2-8", label: "Lower left", pattern: { kind: "cross", row: 8, column: 2 }, expectedHits: 4, expectedCasts: 4,
    meleeApproach: "final-impact",
    actions: [
      { at: span(1), action: { kind: "attack-sword", index: 1 } },
      { at: span(2), action: { kind: "move", to: tile(3, 9) } },
      { at: span(5), action: { kind: "attack-sword", index: 2 } },
      { at: span(9), action: { kind: "attack-sword", index: 3 } },
      { at: span(10), action: { kind: "move", to: tile(1, 9) } },
      { at: span(11), action: { kind: "move", to: tile(1, 7) } },
      { at: span(12), action: { kind: "move", to: tile(1, 6) } },
      { at: span(13), action: { kind: "attack-sword", index: 0 } },
      { at: span(14), action: { kind: "move", to: tile(4, 3) } },
    ],
    returnPlan: { lead: span(1), actions: [
      { at: span(0), action: { kind: "move", to: tile(4, 3) } },
      { at: span(3), action: { kind: "move", to: tile(3, 5) } },
      { at: span(4), action: { kind: "move", to: tile(4, 7) } },
    ] },
  }, { lead: span(0), actions: [
    { at: span(3), action: { kind: "move", to: tile(4, 3) } },
    { at: span(7), action: { kind: "move", to: tile(3, 5) } },
    { at: span(8), action: { kind: "move", to: tile(4, 7) } },
  ] }),
  scenario({
    id: "cross-5-8", label: "Lower middle", pattern: { kind: "cross", row: 8, column: 5 }, expectedHits: 4, expectedCasts: 4,
    meleeApproach: "final-impact",
    actions: [
      { at: span(1), action: { kind: "attack-sword", index: 0 } },
      { at: span(2), action: { kind: "move", to: tile(3, 9) } },
      { at: span(5), action: { kind: "attack-sword", index: 1 } },
      { at: span(9), action: { kind: "attack-sword", index: 2 } },
      { at: span(11), action: { kind: "move", to: tile(5, 9) } },
      { at: span(12), action: { kind: "move", to: tile(7, 9) } },
      { at: span(13), action: { kind: "attack-sword", index: 3 } },
      { at: span(14), action: { kind: "move", to: tile(3, 5) } },
    ],
    returnPlan: { lead: span(0), actions: [
      { at: span(0), action: { kind: "move", to: tile(3, 5) } },
      { at: span(2), action: { kind: "move", to: tile(4, 3) } },
      { at: span(4), action: { kind: "move", to: tile(3, 5) } },
      { at: span(5), action: { kind: "move", to: tile(4, 7) } },
    ] },
  }),
  scenario({
    id: "cross-8-8", label: "Lower right", pattern: { kind: "cross", row: 8, column: 8 }, expectedHits: 4, expectedCasts: 4,
    meleeApproach: "final-impact",
    actions: [
      { at: span(1), action: { kind: "attack-sword", index: 0 } },
      { at: span(2), action: { kind: "move", to: tile(6, 9) } },
      { at: span(5), action: { kind: "attack-sword", index: 2 } },
      { at: span(7), action: { kind: "move", to: tile(5, 9) } },
      { at: span(8), action: { kind: "move", to: tile(9, 9) } },
      { at: span(9), action: { kind: "attack-sword", index: 3 } },
      { at: span(10), action: { kind: "move", to: tile(9, 9) } },
      { at: span(11), action: { kind: "move", to: tile(9, 7) } },
      { at: span(12), action: { kind: "move", to: tile(9, 6) } },
      { at: span(13), action: { kind: "attack-sword", index: 1 } },
      { at: span(14), action: { kind: "move", to: tile(5, 5) } },
    ],
    returnPlan: { lead: span(0), actions: [
      { at: span(1), action: { kind: "move", to: tile(3, 5) } },
      { at: span(4), action: { kind: "move", to: tile(4, 7) } },
    ] },
  }),
  scenario({
    id: "parallel-x", label: "Horizontal sweep", pattern: { kind: "parallel", axis: "x", direction: 1 }, expectedHits: 1, expectedCasts: 1,
    meleeApproach: "final-impact",
    actions: [
      { at: span(1), action: { kind: "move", to: tile(6, 5) } },
      { at: span(2), action: { kind: "move", to: tile(8, 3) } },
      { at: span(3), action: { kind: "move", to: tile(6, 1) } },
      { at: span(4), action: { kind: "attack-sword", index: 0 } },
      { at: span(5), action: { kind: "equip", weapon: "scythe" } },
      { at: span(6), action: { kind: "move", to: tile(4, 3) } },
      { at: span(8), action: { kind: "attack-boss" } },
      { at: span(14), action: { kind: "move", to: tile(1, 7) } },
      { at: span(16), action: { kind: "move", to: tile(2, 5) } },
    ],
    returnPlan: { lead: span(0), actions: [
      { at: span(0), action: { kind: "move", to: tile(2, 5) } },
      { at: span(2), action: { kind: "move", to: tile(4, 7) } },
    ] },
  }),
  scenario({
    id: "parallel-y", label: "Vertical sweep", pattern: { kind: "parallel", axis: "y", direction: 1 }, expectedHits: 1, expectedCasts: 1,
    meleeApproach: "first-impact",
    actions: [
      { at: span(1), action: { kind: "move", to: tile(2, 8) } },
      { at: span(4), action: { kind: "attack-sword", index: 0 } },
      { at: span(5), action: { kind: "equip", weapon: "scythe" } },
      { at: span(7), action: { kind: "attack-boss" } },
      { at: span(13), action: { kind: "move", to: tile(1, 8) } },
      { at: span(14), action: { kind: "move", to: tile(4, 4) } },
    ],
    returnPlan: { lead: span(0), actions: [
      { at: span(0), action: { kind: "move", to: tile(6, 5) } },
      { at: span(2), action: { kind: "move", to: tile(4, 7) } },
    ] },
  }),
  scenario({
    id: "two-rows", label: "Split rows", pattern: { kind: "two-rows" }, expectedHits: 2, expectedCasts: 2,
    meleeApproach: "final-impact",
    actions: [
      { at: span(2), action: { kind: "move", to: tile(6, 9) } },
      { at: span(3), action: { kind: "attack-sword", index: 0 } },
      { at: span(7), action: { kind: "attack-sword", index: 2 } },
      { at: span(8), action: { kind: "equip", weapon: "scythe" } },
      { at: span(9), action: { kind: "attack-boss" } },
    ],
    returnPlan: { lead: span(1), actions: [
      { at: span(0), action: { kind: "move", to: tile(3, 5) } },
      { at: span(3), action: { kind: "move", to: tile(4, 7) } },
    ] },
  }, { lead: span(0), actions: [
    { at: span(1), action: { kind: "move", to: tile(3, 5) } },
    { at: span(4), action: { kind: "move", to: tile(4, 7) } },
  ] }),
];

export function parseZekeRouteId(value: string | null): ZekeRouteId | null {
  return ZEKE_ROUTE_SCENARIOS.find((scenario) => scenario.id === value)?.id ?? null;
}

export function zekeRouteForSwords(swords: readonly SwordHazard[]): ZekeRouteScenario | null {
  if (!swords.some((sword) => sword.status !== "spent")) return null;
  return ZEKE_ROUTE_SCENARIOS.find((candidate) => {
    const pattern = candidate.pattern;
    switch (pattern.kind) {
      case "cross":
        return swords.length === ZEKE_RULES.swords.crossCount.value
          && swords.some((sword) => sword.axis === "x")
          && swords.some((sword) => sword.axis === "y")
          && swords.every((sword) => sword.lane === (sword.axis === "x" ? pattern.row : pattern.column));
      case "parallel":
        return swords.length === ZEKE_RULES.swords.parallelCount.value
          && swords.every((sword) => sword.axis === pattern.axis && sword.direction === pattern.direction)
          && ZEKE_RULES.swords.lanes.value.every((lane) => swords.some((sword) => sword.lane === lane));
      case "two-rows":
        return swords.length === ZEKE_RULES.swords.crossCount.value
          && swords.every((sword) => sword.axis === "x" && ZEKE_RULES.swords.twoRows.value.includes(sword.lane))
          && ZEKE_RULES.swords.twoRows.value.every((lane) => swords.some((sword) => sword.lane === lane));
      default: {
        const unhandled: never = pattern;
        return unhandled;
      }
    }
  }) ?? null;
}
