import { describe, expect, it } from "vitest";
import { seed, tick, tile } from "../../src/sim/brands";
import { advanceEncounter, besideBoss, bossContains, cleaveHits, createEncounter, inDodgeWindow, resolveAfterMovement, safeFromEnrage } from "../../src/content/zeke/mechanics";
import type { EncounterEvent, EncounterObservation, EncounterState, EncounterStep } from "../../src/content/zeke/mechanics";

const BOSS = tile(4, 6);
const BESIDE = tile(4, 7);
const UNDER = tile(5, 5);
type Row = Readonly<{ at: number; step: EncounterStep }>;
type Observe = (at: number, state: EncounterState) => Partial<EncounterObservation>;

function observation(at: number, extra: Partial<EncounterObservation> = {}): EncounterObservation {
  return { tick: tick(at), boss: BOSS, tank: BESIDE, party: [], dodgeLandings: [], bossAlive: true, bossHp: 3000, maxHp: 3000, swordCharges: [], ...extra };
}

function run(until: number, observe: Observe = () => ({}), initial = createEncounter(seed(1))): readonly Row[] {
  let state = initial;
  const rows: Row[] = [];
  for (let at = initial.tick + 1; at <= until; at++) {
    const seen = observation(at, observe(at, state));
    const before = advanceEncounter(state, seen);
    const after = resolveAfterMovement(before.state, seen);
    const step: EncounterStep = { state: after.state, movement: before.movement, events: [...before.events, ...after.events] };
    state = step.state;
    rows.push({ at, step });
  }
  return rows;
}

function events(rows: readonly Row[]): readonly Readonly<{ at: number; event: EncounterEvent }>[] {
  return rows.flatMap(({ at, step }) => step.events.map((event) => ({ at, event })));
}

function last(rows: readonly Row[]): EncounterState {
  const row = rows[rows.length - 1];
  if (!row) throw new Error("The test must run at least one tick.");
  return row.step.state;
}

describe("Normal attacks and real movement observations", () => {
  it("uses the SDK three-tile footprint and excludes diagonal-only melee adjacency", () => {
    expect(bossContains(BOSS, tile(4, 4))).toBe(true);
    expect(bossContains(BOSS, tile(6, 6))).toBe(true);
    expect(bossContains(BOSS, tile(5, 7))).toBe(false);
    expect(besideBoss(BOSS, UNDER)).toBe(false);
    expect(besideBoss(BOSS, tile(3, 3))).toBe(false);
    expect(besideBoss(BOSS, tile(3, 4))).toBe(true);
  });

  it("counts under-triggered arena magic as both normal autos and then casts the star", () => {
    const rows = run(16, () => ({ tank: UNDER, party: [{ id: "tank", tile: UNDER }, { id: "ally-1", tile: tile(8, 8) }, { id: "ally-2", tile: tile(1, 3) }] }));
    expect(events(rows).filter(({ event }) => event.kind === "auto")).toEqual([
      { at: 6, event: { kind: "auto", style: "magic", targets: ["tank", "ally-1", "ally-2"], ordinal: 1 } },
      { at: 11, event: { kind: "auto", style: "magic", targets: ["tank", "ally-1", "ally-2"], ordinal: 2 } },
    ]);
    expect(events(rows).filter(({ event }) => event.kind === "star-tell").map(({ at }) => at)).toEqual([16]);
  });

  it("selects melee when the tank has exited overlap before the attack turn", () => {
    const rows = run(16, (at) => ({ tank: at === 5 ? UNDER : BESIDE }));
    expect(events(rows).filter(({ event }) => event.kind === "auto")).toEqual([
      { at: 6, event: { kind: "auto", style: "melee", targets: ["tank"], ordinal: 1 } },
      { at: 11, event: { kind: "auto", style: "melee", targets: ["tank"], ordinal: 2 } },
    ]);
  });

  it("selects room magic if the tank enters overlap on the attack turn", () => {
    const rows = run(16, (at) => ({ tank: at === 6 ? UNDER : BESIDE }));
    expect(events(rows).filter(({ event }) => event.kind === "auto")).toEqual([
      { at: 6, event: { kind: "auto", style: "magic", targets: ["tank"], ordinal: 1 } },
      { at: 11, event: { kind: "auto", style: "melee", targets: ["tank"], ordinal: 2 } },
    ]);
    expect(events(rows).filter(({ event }) => event.kind === "star-tell").map(({ at }) => at)).toEqual([16]);
  });

  it("cleaves thirteen ring tiles and the footprint, keeping three opposite the tank safe", () => {
    const tank = tile(3, 5);
    const hitTiles: string[] = [];
    for (let x = 3; x <= 7; x++) for (let y = 3; y <= 7; y++) {
      if (Math.max(Math.abs(x - 5), Math.abs(y - 5)) === 2 && cleaveHits(BOSS, tank, tile(x, y))) hitTiles.push(`${x},${y}`);
    }
    expect(hitTiles).toHaveLength(13);
    expect([tile(7, 4), tile(7, 5), tile(7, 6)].every((point) => !cleaveHits(BOSS, tank, point))).toBe(true);
    expect(cleaveHits(BOSS, tank, UNDER)).toBe(true);
    expect(cleaveHits(BOSS, tank, tile(2, 5))).toBe(false);
    const rows = run(6, () => ({ tank, party: [{ id: "under", tile: UNDER }, { id: "ring", tile: tile(5, 7) }, { id: "safe", tile: tile(7, 5) }] }));
    expect(events(rows).find(({ event }) => event.kind === "auto")?.event).toEqual({ kind: "auto", style: "melee", targets: ["tank", "under", "ring"], ordinal: 1 });
  });

  it("rerolls on every active overlap tick and holds only during the star root", () => {
    const rows = run(21, () => ({ tank: UNDER }));
    expect(rows.filter(({ at, step }) => at < 16 && step.movement.kind === "walk-under").map(({ at }) => at)).toEqual(Array.from({ length: 15 }, (_, index) => index + 1));
    expect(new Set(rows.slice(0, 15).map(({ step }) => JSON.stringify(step.movement))).size).toBeGreaterThan(1);
    expect(rows.filter(({ at }) => at >= 16 && at < 21).every(({ step }) => step.movement.kind === "hold")).toBe(true);
    expect(rows[20].step.movement.kind).toBe("walk-under");
    expect(run(15, () => ({ tank: UNDER }))).toEqual(rows.slice(0, 15));
  });
});

describe("Recorded star and sword mechanics", () => {
  it("stages the star outward in client cycles and keeps its visuals through both damage beats", () => {
    const rows = run(24, () => ({ boss: tile(2, 6) }));
    const initial = rows[15].step.state.stars;
    const at = (x: number, y: number) => initial.find((star) => star.tile.x === x && star.tile.y === y)?.visual;
    expect(at(5, 5)).toEqual({ kind: "star", delay: 34 });
    expect(at(6, 4)).toEqual({ kind: "star", delay: 36 });
    expect(at(7, 5)).toEqual({ kind: "star", delay: 38 });
    expect(at(8, 5)).toEqual({ kind: "star", delay: 40 });
    expect(at(9, 5)).toBeUndefined();
    expect(rows[18].step.state.stars).toEqual(initial);
    expect(rows[20].step.state.stars).toEqual(initial);
    expect(rows[23].step.state.stars).toEqual([]);
  });

  it("waits eight ticks after the star cue before the first auto and thirteen before the second", () => {
    const rows = run(29);
    expect(events(rows).filter(({ event }) => event.kind === "star-tell").map(({ at }) => at)).toEqual([16]);
    expect(events(rows).filter(({ at, event }) => at >= 16 && event.kind === "auto")).toEqual([
      { at: 24, event: { kind: "auto", style: "melee", targets: ["tank"], ordinal: 1 } },
      { at: 29, event: { kind: "auto", style: "melee", targets: ["tank"], ordinal: 2 } },
    ]);
    const under = run(29, () => ({ tank: UNDER, party: [{ id: "ally-1", tile: tile(8, 8) }] }));
    expect(events(under).filter(({ at, event }) => at >= 16 && event.kind === "auto")).toEqual([
      { at: 24, event: { kind: "auto", style: "magic", targets: ["tank", "ally-1"], ordinal: 1 } },
      { at: 29, event: { kind: "auto", style: "magic", targets: ["tank", "ally-1"], ordinal: 2 } },
    ]);
  });

  it("renders the ring and arms, hits only at S+3/S+5, and includes underneath only on beat two", () => {
    const rows = run(24, () => ({ tank: UNDER, party: [{ id: "ring", tile: tile(3, 5) }, { id: "gap", tile: tile(2, 2) }] }));
    const cue = rows[15].step.state;
    const mask = new Set(cue.stars.map((star) => `${star.tile.x},${star.tile.y}`));
    expect(mask.has("3,3")).toBe(true);
    expect(mask.has("8,4")).toBe(true);
    expect(mask.has("9,5")).toBe(true);
    expect(mask.has("5,5")).toBe(false);
    expect(mask.has("4,4")).toBe(false);
    expect(mask.has("2,2")).toBe(false);
    expect(events(rows).filter(({ event }) => event.kind === "star-hit")).toEqual([
      { at: 19, event: { kind: "star-hit", target: "ring" } },
      { at: 21, event: { kind: "star-hit", target: "tank" } },
      { at: 21, event: { kind: "star-hit", target: "ring" } },
    ]);
    expect(last(rows).stars).toEqual([]);
  });

  it("spawns swords at the cue and crosses the entire arena exactly fourteen ticks later", () => {
    const rows = run(32, () => ({ tank: tile(3, 5) }));
    const cue = rows[15].step.state;
    expect(cue.phase).toEqual({ kind: "star", started: 16, pattern: { kind: "cross", row: 5, column: 2 } });
    expect(cue.swords.map((sword) => sword.tile)).toEqual([tile(-1, 5), tile(11, 5), tile(2, -1), tile(2, 11)]);
    expect(rows[28].step.state.swords.map((sword) => sword.tile)).toEqual(cue.swords.map((sword) => sword.tile));
    expect(rows[29].step.state.swords.map((sword) => sword.tile)).toEqual([tile(11, 5), tile(-1, 5), tile(2, 11), tile(2, -1)]);
    expect(events(rows).filter(({ event }) => event.kind === "sword-charge").map(({ at }) => at)).toEqual([30, 30, 30, 30]);
    expect(events(rows).filter(({ event }) => event.kind === "sword-hit-player")).toHaveLength(4);
    expect(events(rows).filter(({ event }) => event.kind === "sword-hit-player").every(({ at }) => at === 30)).toBe(true);
    expect(last(rows).swords.every((sword) => sword.status === "spent")).toBe(true);
  });

  it("uses the boss's post-movement anchor and rejects a merely overlapping sword lane", () => {
    const state = last(run(29));
    const before = advanceEncounter(state, observation(30));
    expect(before.events.some((event) => event.kind === "sword-hit-boss")).toBe(false);
    const after = resolveAfterMovement(before.state, observation(30, { boss: tile(4, 5) }));
    expect(after.events.some((event) => event.kind === "sword-hit-boss")).toBe(false);
    expect(after.state.phase.kind).toBe("star");
    const aligned = resolveAfterMovement(before.state, observation(30));
    expect(aligned.events.filter((event) => event.kind === "sword-hit-boss")).toHaveLength(2);
  });

  it("uses the SDK pre-flight charge snapshot without delaying flight or accepting later damage", () => {
    const state = last(run(28));
    const [first, second] = state.swords;
    const charged = run(30, (at) => ({ swordCharges: at === 29 ? [] : [{ id: first.id, damage: 54 }, { id: second.id, damage: 90 }] }), state);
    const hits = events(charged).filter(({ event }) => event.kind === "sword-hit-boss");
    expect(hits).toEqual([
      { at: 30, event: { kind: "sword-hit-boss", swordId: first.id, charged: false, chargeDamage: 54 } },
      { at: 30, event: { kind: "sword-hit-boss", swordId: second.id, charged: true, chargeDamage: 80 } },
    ]);
    expect(last(charged).phase.kind).toBe("recovery");
    const tooLate = run(31, () => ({ swordCharges: [{ id: first.id, damage: 80 }, { id: second.id, damage: 90 }] }), last(charged));
    expect(last(tooLate).swords[0].chargeDamage).toBe(54);
    expect(events(tooLate).filter(({ event }) => event.kind === "sword-hit-boss")).toEqual([]);
  });

  it("uncharged hits also weaken, stop walking through W+9, then resume with two autos before another star", () => {
    const state = last(run(30));
    expect(state.phase).toEqual({ kind: "recovery", recovery: "weaken", started: 30, stunnedUntil: 40 });
    const rows = run(52, () => ({ tank: UNDER }), state);
    expect(rows.filter(({ at }) => at < 40).every(({ step }) => step.movement.kind === "hold")).toBe(true);
    expect(rows.filter(({ at }) => at >= 40 && at < 52).every(({ step }) => step.movement.kind === "walk-under")).toBe(true);
    expect(events(rows).filter(({ event }) => event.kind === "auto").map(({ at }) => at)).toEqual([42, 47]);
    expect(events(rows).filter(({ event }) => event.kind === "star-tell").map(({ at }) => at)).toEqual([52]);
  });

  it("heals a missed cross at flight+4 after the flight+2 tell, then restarts autos", () => {
    const rows = run(47, () => ({ boss: tile(4, 5), tank: tile(4, 6) }));
    expect(events(rows).filter(({ event }) => event.kind === "swords-missed")).toEqual([{ at: 32, event: { kind: "swords-missed" } }]);
    expect(events(rows).filter(({ event }) => event.kind === "boss-heal")).toEqual([{ at: 34, event: { kind: "boss-heal", fraction: 0.1 } }]);
    expect(events(rows).filter(({ at, event }) => at > 32 && event.kind === "auto").map(({ at }) => at)).toEqual([37, 42]);
    expect(events(rows).filter(({ event }) => event.kind === "star-tell").map(({ at }) => at)).toEqual([16, 47]);
  });

  it("supports crossed, paired-row and sequential parallel layouts", () => {
    const seen = new Set<string>();
    for (let n = 1; n <= 120; n++) {
      const rows = run(110, () => ({}), createEncounter(seed(n * 7919)));
      for (const { step } of rows) {
        const phase = step.state.phase;
        if (phase.kind !== "star") continue;
        const name = phase.pattern.kind === "parallel" ? `parallel-${phase.pattern.axis}` : phase.pattern.kind;
        seen.add(name);
        if (phase.pattern.kind === "parallel") {
          expect(step.state.swords.map((sword) => sword.chargeAt - phase.started)).toEqual([14, 15, 16]);
        }
      }
    }
    expect([...seen].sort()).toEqual(["cross", "parallel-x", "parallel-y", "two-rows"]);
  });

  it("offers a sword dodge only on the flight tick to a player in its band", () => {
    const state = last(run(29));
    expect(inDodgeWindow(state, tick(29), tile(3, 5))).toBe(false);
    expect(inDodgeWindow(state, tick(30), tile(3, 5))).toBe(true);
    expect(inDodgeWindow(state, tick(30), tile(6, 8))).toBe(false);
    expect(inDodgeWindow(last(run(30)), tick(31), tile(3, 5))).toBe(false);
  });
});

describe("Finale", () => {
  it("pulls the party in at F+6, shows three cues at F+12, and hits at V+4+k", () => {
    const rows = run(31, () => ({ bossHp: 1003, tank: tile(4, 4), party: [{ id: "ally-1", tile: tile(6, 5) }] }));
    expect(events(rows).filter(({ event }) => event.kind === "enrage-start").map(({ at }) => at)).toEqual([1]);
    expect(events(rows).filter(({ event }) => event.kind === "enrage-cage").map(({ at }) => at)).toEqual([7]);
    expect(events(rows).filter(({ event }) => event.kind === "enrage-tell").map(({ at }) => at)).toEqual([13, 14, 15, 24, 25, 26]);
    expect(events(rows).filter(({ event }) => event.kind === "enrage-hit" && event.target === "ally-1").map(({ at }) => at)).toEqual([17, 18, 19, 28, 29, 30]);
    expect(events(rows).filter(({ event }) => event.kind === "auto")).toEqual([]);
    expect(rows.every(({ step }) => step.movement.kind === "hold")).toBe(true);
  });

  it("uses the source six-order cycle, never places the back-row pattern last, and offers matching dodge windows", () => {
    const rows = run(80, () => ({ bossHp: 1003 }));
    const tells = events(rows).filter(({ event }) => event.kind === "enrage-tell");
    expect(tells.slice(0, 18).map(({ event }) => event.kind === "enrage-tell" ? event.safe : null)).toEqual([
      "west", "south", "north", "west", "north", "south", "north", "west", "south",
      "south", "west", "north", "west", "north", "south", "west", "south", "north",
    ]);
    expect(tells.filter(({ event }) => event.kind === "enrage-tell" && event.volley === 3).every(({ event }) => event.kind === "enrage-tell" && event.safe !== "west")).toBe(true);
    const state = rows[14].step.state;
    expect(inDodgeWindow(state, tick(16), tile(5, 5))).toBe(false);
    expect([17, 18, 19].every((at) => inDodgeWindow(state, tick(at), tile(5, 5)))).toBe(true);
    expect(inDodgeWindow(state, tick(20), tile(5, 5))).toBe(false);
    expect(safeFromEnrage(tile(4, 6), "west")).toBe(true);
    expect(safeFromEnrage(tile(5, 4), "north")).toBe(true);
    expect(safeFromEnrage(tile(6, 4), "north")).toBe(false);
  });

  it("kills pending mechanics and dodge windows on actual boss death", () => {
    const state = last(run(17, () => ({ bossHp: 1000 })));
    const ended = advanceEncounter(state, observation(18, { bossAlive: false, bossHp: 0 }));
    expect(ended.events).toEqual([{ kind: "ended" }]);
    expect(ended.state.stars).toEqual([]);
    expect(ended.state.swords).toEqual([]);
    expect(inDodgeWindow(ended.state, tick(19), tile(5, 5))).toBe(false);
  });
});
