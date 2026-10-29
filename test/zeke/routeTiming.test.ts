import { Random, ScytheOfVitur, Settings, TestNpc, TrainerInstance } from "osrs-sdk";
import { Zeke } from "../../src/content/zeke/Zeke";
import { ZekePlayer } from "../../src/content/zeke/ZekePlayer";
import { WindSurge } from "../../src/content/zeke/WindSurge";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import { ZEKE_ROUTE_SCENARIOS } from "../../src/content/zeke/ZekeRoutePlans";
import type { ZekeRouteScenario } from "../../src/content/zeke/ZekeRoutePlans";

function nativeCross(scenario: ZekeRouteScenario, lateFinalAttack: boolean) {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false, inputDelay: 0 });
  const region = new ZekeRegion({ seed: 1, routeDemo: scenario.id, routeAutoplay: true, routeAttackMode: "wind-surge" });
  const trainer = new TrainerInstance(region, { readyTimer: 0 });
  trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const boss = region.primaryBoss;
  const player = region.players[0];
  if (!(boss instanceof Zeke) || !(player instanceof ZekePlayer)) throw new Error("Missing native actors.");
  let impactSwordIds: readonly number[] = [];
  const rolls = vi.spyOn(Random, "get").mockReturnValue(0.5);
  try {
    for (let at = 1; at <= 52; at++) {
      if (lateFinalAttack && at === 29) player.attackDelay = 2;
      region.world.tickWorld();
      if (at === 31) impactSwordIds = boss.encounter.swords.map((sword) => sword.id);
    }
    return { status: region.routeDemoSnapshot(), rows: boss.rows, impactSwordIds };
  } finally { rolls.mockRestore(); trainer.dispose(); }
}

describe("native sword deadline", () => {
  const crosses = ZEKE_ROUTE_SCENARIOS.filter((scenario) => scenario.pattern.kind === "cross");

  test.each(crosses)("$id applies its fourth native projectile on the sixteenth displayed sword tick", (scenario) => {
    const { status, rows, impactSwordIds } = nativeCross(scenario, false);
    expect(status).toMatchObject({ kind: "playing", stage: { kind: "awaiting-star" }, cycle: 1 });
    if (status.kind === "disabled") throw new Error("Native route was disabled.");
    const casts = status.combat.filter((event) => event.kind === "cast");
    expect(casts.map((event) => event.starOffset + 1)).toEqual([2, 6, 10, 14]);
    const final = casts.at(-1);
    if (!final) throw new Error("Missing fourth native cast.");
    expect(final.landingAt).toBe(31);
    expect(status.combat).toContainEqual(expect.objectContaining({ kind: "sword-hit", tick: 31, starOffset: 15, swordIndex: final.swordIndex }));
    expect(rows.find((row) => row.tick === 30)?.events).toContainEqual(expect.objectContaining({ kind: "sword-charge" }));
    const impacts = rows.find((row) => row.tick === 31)?.events.filter((event) => event.kind === "sword-hit-boss");
    expect(impacts).toHaveLength(4);
    expect(final.damage).toBeGreaterThan(0);
    expect(impacts).toContainEqual(expect.objectContaining({ swordId: impactSwordIds[final.swordIndex], chargeDamage: final.damage }));
  });

  test.each(crosses)("$id fails completion if the final native attack is delayed one tick", (scenario) => {
    const { status } = nativeCross(scenario, true);
    expect(status).toMatchObject({ kind: "failed", reason: expect.stringContaining("casts, landings, or return to scythe") });
    if (status.kind === "disabled") throw new Error("Native route was disabled.");
    expect(status.combat.filter((event) => event.kind === "cast")).toHaveLength(3);
    expect(status.combat.filter((event) => event.kind === "sword-hit")).toHaveLength(3);
  });
});

const splitRowsCases = (["scythe", "wind-surge"] as const).flatMap((attackMode) => [0, 1, 2].map((fullCharges) => ({ attackMode, fullCharges })));

test.each(splitRowsCases)("Split rows lures directly before stun end and reaches home two ticks after it in $attackMode with $fullCharges full charges", ({ attackMode, fullCharges }) => {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false, inputDelay: 0 });
  const region = new ZekeRegion({ seed: 1, routeDemo: "two-rows", routeAutoplay: true, routeAttackMode: attackMode });
  const trainer = new TrainerInstance(region, { readyTimer: 0 });
  trainer.mount(document.createElement("canvas"), document.createElement("div"));
  vi.spyOn(region.world, "startLoop").mockImplementation(() => {});
  region.world.startTicking();
  const boss = region.primaryBoss;
  const player = region.players[0];
  if (!(boss instanceof Zeke) || !(player instanceof ZekePlayer)) throw new Error("Missing native actors.");
  const swings: number[] = [];
  const didAttack = player.didAttack.bind(player);
  const observe = vi.spyOn(player, "didAttack").mockImplementation(() => {
    if (player.aggro === boss && player.equipment.weapon instanceof ScytheOfVitur) swings.push(boss.encounterTick);
    didAttack();
  });
  let now = window.performance.now();
  const clock = vi.spyOn(window.performance, "now").mockImplementation(() => now);
  const rolls = vi.spyOn(Random, "get").mockReturnValue(0.5);
  try {
    let until = 0;
    const positions = new Map<number, Readonly<{ player: Readonly<{ x: number; y: number }>; boss: Readonly<{ x: number; y: number }> }>>();
    for (let at = 1; at <= 70; at++) {
      if (at === 25) {
        for (const index of [2, 3].slice(0, fullCharges)) {
          const sword = boss.swordTarget(index);
          if (!sword) throw new Error("Missing split rows sword.");
          const caster = new TestNpc(region, { x: sword.location.x, y: sword.location.y - 1 }, {});
          caster.setStats();
          caster.currentStats.magic = 99;
          new WindSurge().cast(caster, sword);
          new WindSurge().cast(caster, sword);
        }
      }
      region.world.tickWorld();
      const phase = boss.encounter.phase;
      if (phase.kind === "recovery" && phase.recovery === "weaken") until = phase.stunnedUntil;
      positions.set(at, { player: { ...player.location }, boss: { ...boss.location } });
      for (let client = 0; client < 30; client++) { region.world.tickClient(client / 30, now); now += 20; }
      const status = region.routeDemoSnapshot();
      expect(status.kind).toBe("playing");
      if (status.kind !== "playing") throw new Error("Split rows route stopped.");
      if (status.stage.kind !== "awaiting-star") continue;
      expect(until).toBe(41 + fullCharges * 4);
      expect(status.issuedActions.filter((entry) => entry.tick >= until - 1 && entry.action.kind === "move").map(({ tick, action }) => ({ tick, action }))).toEqual([
        { tick: until - 1, action: { kind: "move", to: { x: 3, y: 5 } } },
        { tick: until + 2, action: { kind: "move", to: { x: 4, y: 7 } } },
      ]);
      expect(positions.get(until)?.player).toEqual({ x: 3, y: 5 });
      expect(positions.get(until + 2)?.player).toEqual({ x: 4, y: 7 });
      expect(positions.get(until + 2)?.boss).toEqual({ x: 4, y: 6 });
      expect(player.getPerceivedLocation(0)).toMatchObject({ x: 4, y: 7 });
      expect(player.visualPath).toHaveLength(0);
      expect(boss.getPerceivedLocation(0)).toMatchObject({ x: 4, y: 6 });
      expect(boss.visualPath).toHaveLength(0);
      const expectedStunned = [32, 37, 42, 47];
      expect(swings.filter((at) => at >= 31 && at < until)).toEqual(expectedStunned.filter((at) => at < until));
      expect(boss.rows.flatMap((row) => row.events).filter((event) => event.kind === "sword-hit-boss")).toHaveLength(2);
      expect(boss.rows.flatMap((row) => row.events).some((event) => event.kind === "star-hit" || event.kind === "sword-hit-player" || (event.kind === "auto" && event.style === "magic"))).toBe(false);
      expect(region.world.isPaused).toBe(false);
      return;
    }
    throw new Error("Split rows did not finish its visible return.");
  } finally { rolls.mockRestore(); clock.mockRestore(); observe.mockRestore(); trainer.dispose(); }
});

test.each(["scythe", "wind-surge"] as const)("Upper right skips the extra lure tile in %s without delaying the sword hits", (attackMode) => {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false, inputDelay: 0 });
  const region = new ZekeRegion({ seed: 1, routeDemo: "cross-8-2", routeAutoplay: true, routeAttackMode: attackMode });
  const trainer = new TrainerInstance(region, { readyTimer: 0 });
  trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const boss = region.primaryBoss;
  const player = region.players[0];
  if (!(boss instanceof Zeke) || !(player instanceof ZekePlayer)) throw new Error("Missing native actors.");
  try {
    for (let at = 1; at <= 31; at++) {
      region.world.tickWorld();
      if (at === 26) expect(player.location).toEqual({ x: 8, y: 2 });
      if (at === 27) expect(player.location).toEqual({ x: 9, y: 2 });
    }
    const status = region.routeDemoSnapshot();
    expect(status.kind).toBe("playing");
    if (status.kind !== "playing") throw new Error("Upper right route stopped.");
    expect(status.issuedActions.filter((entry) => entry.tick >= 26 && entry.tick <= 27 && entry.action.kind === "move")).toEqual([
      expect.objectContaining({ tick: 26, action: { kind: "move", to: { x: 9, y: 2 } } }),
    ]);
    expect(boss.rows.find((row) => row.tick === 31)?.events.filter((event) => event.kind === "sword-hit-boss")).toHaveLength(4);
    const casts = status.combat.filter((event) => event.kind === "cast");
    expect(casts.map((event) => event.tick)).toEqual(attackMode === "wind-surge" ? [17, 21, 25, 29] : []);
    expect(boss.rows.flatMap((row) => row.events).some((event) => event.kind === "star-hit" || event.kind === "sword-hit-player" || (event.kind === "auto" && event.style === "magic"))).toBe(false);
  } finally { trainer.dispose(); }
});

test.each(["scythe", "wind-surge"] as const)("Middle left dodges directly home in three steps in %s without delaying the sword hits", (attackMode) => {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false, inputDelay: 0 });
  const region = new ZekeRegion({ seed: 1, routeDemo: "cross-2-5", routeAutoplay: true, routeAttackMode: attackMode });
  const trainer = new TrainerInstance(region, { readyTimer: 0 });
  trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const boss = region.primaryBoss;
  const player = region.players[0];
  if (!(boss instanceof Zeke) || !(player instanceof ZekePlayer)) throw new Error("Missing native actors.");
  try {
    for (let at = 1; at <= 31; at++) {
      region.world.tickWorld();
      if (at === 30) {
        expect(player.lastDodge).toMatchObject({ tick: 30, to: { x: 4, y: 7 }, steps: 3 });
        expect(player.location).toEqual({ x: 4, y: 7 });
      }
    }
    const status = region.routeDemoSnapshot();
    expect(status.kind).toBe("playing");
    if (status.kind !== "playing") throw new Error("Middle left route stopped.");
    expect(boss.rows.find((row) => row.tick === 31)?.events.filter((event) => event.kind === "sword-hit-boss")).toHaveLength(4);
    const casts = status.combat.filter((event) => event.kind === "cast");
    expect(casts.map((event) => event.tick)).toEqual(attackMode === "wind-surge" ? [17, 21, 25, 29] : []);
    expect(boss.rows.flatMap((row) => row.events).some((event) => event.kind === "star-hit" || event.kind === "sword-hit-player" || (event.kind === "auto" && event.style === "magic"))).toBe(false);
  } finally { trainer.dispose(); }
});

const lowerRightCases = (["scythe", "wind-surge"] as const).flatMap((attackMode) => [1, 17, 99].map((seed) => ({ attackMode, seed })));

test.each(lowerRightCases)("Lower right skips the extra lure and runs past the old stop in $attackMode with seed $seed", ({ attackMode, seed }) => {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false, inputDelay: 0 });
  const region = new ZekeRegion({ seed, routeDemo: "cross-8-8", routeAutoplay: true, routeAttackMode: attackMode });
  const trainer = new TrainerInstance(region, { readyTimer: 0 });
  trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const boss = region.primaryBoss;
  const player = region.players[0];
  if (!(boss instanceof Zeke) || !(player instanceof ZekePlayer)) throw new Error("Missing native actors.");
  try {
    for (let at = 1; at <= 31; at++) {
      region.world.tickWorld();
      if (at === 20) expect(player.location).toEqual({ x: 6, y: 9 });
      if (at === 24) {
        expect(player.location).toEqual({ x: 7, y: 9 });
        expect(player.destinationLocation).toEqual({ x: 9, y: 9 });
      }
      if (at === 25 && attackMode === "scythe") expect(player.location).toEqual({ x: 9, y: 9 });
      if (at === 26) expect(player.location).toEqual({ x: 9, y: 9 });
    }
    const status = region.routeDemoSnapshot();
    expect(status.kind).toBe("playing");
    if (status.kind !== "playing") throw new Error("Lower right route stopped.");
    expect(status.scenario.clicks).not.toContainEqual({ x: 7, y: 8 });
    expect(status.scenario.clicks).not.toContainEqual({ x: 7, y: 9 });
    expect(boss.rows.find((row) => row.tick === 31)?.events.filter((event) => event.kind === "sword-hit-boss")).toHaveLength(4);
    expect(status.combat.filter((event) => event.kind === "cast").map((event) => event.tick)).toEqual(attackMode === "wind-surge" ? [17, 21, 25, 29] : []);
    expect(boss.rows.flatMap((row) => row.events).some((event) => event.kind === "star-hit" || event.kind === "sword-hit-player" || (event.kind === "auto" && event.style === "magic"))).toBe(false);
  } finally { trainer.dispose(); }
});
