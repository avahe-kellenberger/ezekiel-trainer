import { describe, expect, it } from "vitest";
import { seed, tick, tile } from "../../src/sim/brands";
import { advanceEncounter, createEncounter, resolveAfterMovement } from "../../src/content/zeke/mechanics";
import type { EncounterObservation, EncounterState, EncounterStep, SwordPattern } from "../../src/content/zeke/mechanics";

const CROSS: SwordPattern = { kind: "cross", row: 5, column: 2 };
const ALL_CROSS: SwordPattern = { kind: "cross", row: 5, column: 5 };
const SWEEP: SwordPattern = { kind: "parallel", axis: "x", direction: 1 };
type Row = Readonly<{ at: number; step: EncounterStep }>;

function simulate(until: number, charges: readonly number[], pattern: SwordPattern = CROSS, staggered = false): readonly Row[] {
  let state: EncounterState = createEncounter(seed(1));
  const rows: Row[] = [];
  for (let at = 1; at <= until; at++) {
    const boss = staggered && at === 31 ? tile(4, 3) : staggered && at >= 33 ? tile(4, 9) : tile(4, 6);
    const observation: EncounterObservation = {
      tick: tick(at), boss, tank: tile(4, 7), party: [], dodgeLandings: [], bossAlive: true, bossHp: 3000, maxHp: 3000,
      swordCharges: state.swords.map((sword, index) => ({ id: sword.id, damage: charges[index] ?? 0 })),
    };
    const before = advanceEncounter(state, observation, pattern);
    const after = resolveAfterMovement(before.state, observation);
    const step: EncounterStep = { state: after.state, movement: before.movement, events: [...before.events, ...after.events] };
    state = step.state;
    rows.push({ at, step });
  }
  return rows;
}

function rowAt(rows: readonly Row[], at: number): Row {
  const row = rows.find((candidate) => candidate.at === at);
  if (!row) throw new Error(`No encounter row at tick ${at}.`);
  return row;
}

function eventTicks(rows: readonly Row[], kind: "auto" | "star-tell"): readonly number[] {
  return rows.filter((row) => row.step.events.some((event) => event.kind === kind)).map((row) => row.at);
}

describe("fully charged sword stun", () => {
  it.each([0, 80, 100])("%i percent charge anchors movement and recovery attacks to the stun end", (charge) => {
    const full = charge === 100;
    const until = full ? 45 : 41;
    const rows = simulate(until + 12, [charge, 0, 0, 0]);
    expect(rowAt(rows, 31).step.state.phase).toEqual({ kind: "recovery", recovery: "weaken", started: 31, stunnedUntil: until });
    expect(rowAt(rows, until - 1).step.movement).toEqual({ kind: "hold" });
    expect(rowAt(rows, until).step.movement).toEqual({ kind: "follow" });
    expect(eventTicks(rows, "auto")).toEqual([6, 11, 24, 29, until + 2, until + 7]);
    expect(eventTicks(rows, "star-tell")).toEqual([16, until + 12]);
  });

  it.each([{ charges: [80, 100] }, { charges: [100, 80] }])("a simultaneous fully charged hit adds four ticks in sword order $charges", ({ charges }) => {
    const rows = simulate(31, [...charges, 0, 0]);
    const impact = rowAt(rows, 31).step;
    expect(impact.events.filter((event) => event.kind === "sword-hit-boss")).toHaveLength(2);
    expect(impact.state.phase).toEqual({ kind: "recovery", recovery: "weaken", started: 31, stunnedUntil: 45 });
  });

  it("a fully charged sword that misses the boss does not lengthen the stun", () => {
    const rows = simulate(31, [80, 80, 100, 100]);
    const impact = rowAt(rows, 31).step;
    expect(impact.events.filter((event) => event.kind === "sword-hit-boss")).toEqual([
      expect.objectContaining({ charged: false, chargeDamage: 80 }),
      expect.objectContaining({ charged: false, chargeDamage: 80 }),
    ]);
    expect(impact.state.phase).toMatchObject({ recovery: "weaken", stunnedUntil: 41 });
  });

  it("a later fully charged impact adds four ticks and later partial hits do not refresh the base stun", () => {
    const rows = simulate(57, [80, 100, 80], SWEEP, true);
    expect(rowAt(rows, 31).step.state.phase).toEqual({ kind: "recovery", recovery: "weaken", started: 31, stunnedUntil: 41 });
    expect(rowAt(rows, 32).step.events).toContainEqual(expect.objectContaining({ kind: "sword-hit-boss", charged: true }));
    expect(rowAt(rows, 32).step.state.phase).toEqual({ kind: "recovery", recovery: "weaken", started: 31, stunnedUntil: 45 });
    expect(rowAt(rows, 33).step.events).toContainEqual(expect.objectContaining({ kind: "sword-hit-boss", charged: false }));
    expect(rowAt(rows, 33).step.state.phase).toEqual({ kind: "recovery", recovery: "weaken", started: 31, stunnedUntil: 45 });
    expect(rowAt(rows, 44).step.movement).toEqual({ kind: "hold" });
    expect(rowAt(rows, 45).step.movement).toMatchObject({ kind: "walk-under" });
    expect(eventTicks(rows, "auto")).toEqual([6, 11, 24, 29, 47, 52]);
    expect(eventTicks(rows, "star-tell")).toEqual([16, 57]);
  });
  it.each([
    { pattern: CROSS, charges: [80, 80, 0, 0], hits: 2, until: 41 },
    { pattern: ALL_CROSS, charges: [80, 80, 80, 80], hits: 4, until: 41 },
    { pattern: CROSS, charges: [100, 100, 0, 0], hits: 2, until: 49 },
    { pattern: ALL_CROSS, charges: [100, 100, 100, 100], hits: 4, until: 57 },
  ])("$charges with $hits hits preserves one base stun and stacks only full bonuses", ({ pattern, charges, hits, until }) => {
    const rows = simulate(until + 12, charges, pattern);
    expect(rowAt(rows, 31).step.events.filter((event) => event.kind === "sword-hit-boss")).toHaveLength(hits);
    expect(rowAt(rows, 31).step.state.phase).toMatchObject({ started: 31, stunnedUntil: until });
    expect(rowAt(rows, 34).step.state.phase).toMatchObject({ started: 31, stunnedUntil: until });
    expect(rowAt(rows, until - 1).step.movement).toEqual({ kind: "hold" });
    expect(rowAt(rows, until).step.movement).toEqual({ kind: "follow" });
    expect(eventTicks(rows, "auto")).toEqual([6, 11, 24, 29, until + 2, until + 7]);
    expect(eventTicks(rows, "star-tell")).toEqual([16, until + 12]);
  });

  it("later partial swords leave the original ten-tick stun unchanged", () => {
    const rows = simulate(41, [80, 80, 80], SWEEP, true);
    for (const at of [31, 32, 33, 34]) {
      expect(rowAt(rows, at).step.state.phase).toMatchObject({ started: 31, stunnedUntil: 41 });
    }
    expect(rowAt(rows, 40).step.movement).toEqual({ kind: "hold" });
    expect(rowAt(rows, 41).step.movement).toMatchObject({ kind: "walk-under" });
  });

  it("successive fully charged swords each add four ticks exactly once", () => {
    const rows = simulate(53, [100, 100, 100], SWEEP, true);
    expect(rowAt(rows, 31).step.state.phase).toMatchObject({ started: 31, stunnedUntil: 45 });
    expect(rowAt(rows, 32).step.state.phase).toMatchObject({ started: 31, stunnedUntil: 49 });
    expect(rowAt(rows, 33).step.state.phase).toMatchObject({ started: 31, stunnedUntil: 53 });
    expect(rowAt(rows, 34).step.state.phase).toMatchObject({ started: 31, stunnedUntil: 53 });
    expect(rowAt(rows, 52).step.movement).toEqual({ kind: "hold" });
    expect(rowAt(rows, 53).step.movement).toMatchObject({ kind: "walk-under" });
  });

});
