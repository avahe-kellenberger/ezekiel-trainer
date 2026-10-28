import { span, tile } from "../../sim/brands";
import type { TickSpan, Tile } from "../../sim/brands";
import type { SwordPattern } from "./mechanics";

export type ZekeRouteId = "cross-2-2" | "cross-5-2" | "cross-8-2" | "cross-2-5" | "cross-8-5" | "cross-2-8" | "cross-5-8" | "cross-8-8" | "parallel-x" | "parallel-y" | "two-rows";
export type ZekeRouteClick = Readonly<{ at: TickSpan; to: Tile }>;
export type ZekeRouteScenario = Readonly<{ id: ZekeRouteId; label: string; pattern: SwordPattern; clicks: readonly ZekeRouteClick[]; trace: readonly Tile[]; expectedHits: number }>;

// Orientation-zero native SDK plans, with click times advanced by native replay.
// Every earlier individual click was checked against native hazards, melee range, sword centers,
// ordered waypoint arrivals and the home reset (see routeTiming.test.ts).
// This checks individual click advances, not global optimality. Player attacks were excluded.
export const ZEKE_ROUTE_SCENARIOS: readonly ZekeRouteScenario[] = [
  {
    id: "cross-2-2", label: "Upper left", pattern: { kind: "cross", row: 2, column: 2 }, expectedHits: 4,
    clicks: [
      { at: span(1), to: tile(2, 3) },
      { at: span(3), to: tile(3, 1) },
      { at: span(6), to: tile(1, 2) },
      { at: span(7), to: tile(1, 4) },
      { at: span(14), to: tile(4, 7) },
    ],
    trace: [tile(4, 7), tile(4, 5), tile(2, 3), tile(3, 1), tile(1, 2), tile(1, 4), tile(4, 7)],
  },
  {
    id: "cross-5-2", label: "Upper middle", pattern: { kind: "cross", row: 2, column: 5 }, expectedHits: 4,
    clicks: [
      { at: span(1), to: tile(2, 3) },
      { at: span(3), to: tile(3, 1) },
      { at: span(6), to: tile(5, 1) },
      { at: span(7), to: tile(7, 2) },
      { at: span(14), to: tile(3, 6) },
      { at: span(15), to: tile(4, 7) },
    ],
    trace: [tile(4, 7), tile(4, 5), tile(2, 3), tile(3, 1), tile(5, 1), tile(7, 2), tile(3, 6), tile(4, 7)],
  },
  {
    id: "cross-8-2", label: "Upper right", pattern: { kind: "cross", row: 2, column: 8 }, expectedHits: 4,
    clicks: [
      { at: span(1), to: tile(2, 3) },
      { at: span(3), to: tile(4, 1) },
      { at: span(5), to: tile(6, 2) },
      { at: span(6), to: tile(8, 4) },
      { at: span(7), to: tile(9, 2) },
      { at: span(8), to: tile(9, 4) },
      { at: span(14), to: tile(5, 6) },
      { at: span(15), to: tile(4, 7) },
    ],
    trace: [tile(4, 7), tile(4, 5), tile(2, 3), tile(4, 1), tile(6, 2), tile(8, 4), tile(9, 2), tile(9, 4), tile(5, 6), tile(4, 7)],
  },
  {
    id: "cross-2-5", label: "Middle left", pattern: { kind: "cross", row: 5, column: 2 }, expectedHits: 4,
    clicks: [
      { at: span(1), to: tile(2, 7) },
      { at: span(5), to: tile(1, 5) },
      { at: span(6), to: tile(1, 7) },
      { at: span(14), to: tile(5, 3) },
      { at: span(15), to: tile(6, 5) },
      { at: span(25), to: tile(4, 7) },
    ],
    trace: [tile(4, 7), tile(2, 7), tile(1, 5), tile(1, 7), tile(5, 3), tile(6, 5), tile(4, 7)],
  },
  {
    id: "cross-8-5", label: "Middle right", pattern: { kind: "cross", row: 5, column: 8 }, expectedHits: 4,
    clicks: [
      { at: span(1), to: tile(6, 5) },
      { at: span(2), to: tile(8, 3) },
      { at: span(5), to: tile(9, 5) },
      { at: span(6), to: tile(7, 7) },
      { at: span(14), to: tile(3, 7) },
      { at: span(15), to: tile(3, 5) },
      { at: span(24), to: tile(4, 7) },
    ],
    trace: [tile(4, 7), tile(6, 5), tile(8, 3), tile(9, 5), tile(7, 7), tile(3, 7), tile(3, 5), tile(4, 7)],
  },
  {
    id: "cross-2-8", label: "Lower left", pattern: { kind: "cross", row: 8, column: 2 }, expectedHits: 4,
    clicks: [
      { at: span(1), to: tile(3, 9) },
      { at: span(6), to: tile(1, 9) },
      { at: span(7), to: tile(1, 7) },
      { at: span(8), to: tile(1, 6) },
      { at: span(14), to: tile(4, 3) },
      { at: span(26), to: tile(3, 5) },
      { at: span(27), to: tile(4, 7) },
    ],
    trace: [tile(4, 7), tile(3, 9), tile(1, 9), tile(1, 7), tile(1, 6), tile(4, 3), tile(3, 5), tile(4, 7)],
  },
  {
    id: "cross-5-8", label: "Lower middle", pattern: { kind: "cross", row: 8, column: 5 }, expectedHits: 4,
    clicks: [
      { at: span(1), to: tile(4, 9) },
      { at: span(5), to: tile(5, 9) },
      { at: span(6), to: tile(3, 9) },
      { at: span(14), to: tile(2, 5) },
      { at: span(15), to: tile(4, 3) },
      { at: span(26), to: tile(3, 5) },
      { at: span(27), to: tile(4, 7) },
    ],
    trace: [tile(4, 7), tile(4, 9), tile(5, 9), tile(3, 9), tile(2, 5), tile(4, 3), tile(3, 5), tile(4, 7)],
  },
  {
    id: "cross-8-8", label: "Lower right", pattern: { kind: "cross", row: 8, column: 8 }, expectedHits: 4,
    clicks: [
      { at: span(1), to: tile(4, 9) },
      { at: span(5), to: tile(5, 8) },
      { at: span(6), to: tile(7, 9) },
      { at: span(7), to: tile(9, 9) },
      { at: span(8), to: tile(9, 7) },
      { at: span(9), to: tile(9, 6) },
      { at: span(14), to: tile(5, 5) },
      { at: span(15), to: tile(3, 5) },
      { at: span(26), to: tile(4, 7) },
    ],
    trace: [tile(4, 7), tile(4, 9), tile(5, 8), tile(7, 9), tile(9, 9), tile(9, 7), tile(9, 6), tile(5, 5), tile(3, 5), tile(4, 7)],
  },
  {
    id: "parallel-x", label: "Horizontal sweep", pattern: { kind: "parallel", axis: "x", direction: 1 }, expectedHits: 1,
    clicks: [
      { at: span(1), to: tile(2, 3) },
      { at: span(3), to: tile(3, 1) },
      { at: span(6), to: tile(1, 3) },
      { at: span(14), to: tile(1, 7) },
      { at: span(15), to: tile(2, 5) },
      { at: span(16), to: tile(4, 7) },
    ],
    trace: [tile(4, 7), tile(4, 5), tile(2, 3), tile(3, 1), tile(1, 3), tile(1, 7), tile(2, 5), tile(4, 7)],
  },
  {
    id: "parallel-y", label: "Vertical sweep", pattern: { kind: "parallel", axis: "y", direction: 1 }, expectedHits: 1,
    clicks: [
      { at: span(1), to: tile(2, 8) },
      { at: span(6), to: tile(1, 8) },
      { at: span(14), to: tile(4, 4) },
      { at: span(15), to: tile(7, 1) },
      { at: span(16), to: tile(6, 5) },
      { at: span(25), to: tile(4, 7) },
    ],
    trace: [tile(4, 7), tile(2, 8), tile(1, 8), tile(4, 4), tile(7, 1), tile(6, 5), tile(4, 7)],
  },
  {
    id: "two-rows", label: "Split rows", pattern: { kind: "two-rows" }, expectedHits: 2,
    clicks: [
      { at: span(1), to: tile(3, 5) },
      { at: span(2), to: tile(1, 3) },
      { at: span(6), to: tile(3, 5) },
      { at: span(14), to: tile(4, 7) },
    ],
    trace: [tile(4, 7), tile(3, 5), tile(1, 3), tile(3, 5), tile(4, 7)],
  },
];

export function parseZekeRouteId(value: string | null): ZekeRouteId | null {
  return ZEKE_ROUTE_SCENARIOS.find((scenario) => scenario.id === value)?.id ?? null;
}
