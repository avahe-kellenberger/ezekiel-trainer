import { Settings, TrainerInstance } from "osrs-sdk";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import type { ZekeConfig } from "../../src/content/zeke/ZekeRegion";
import { Zeke } from "../../src/content/zeke/Zeke";
import { HarmonisedNightmareStaff } from "../../src/content/zeke/HarmonisedNightmareStaff";
import { ZekePlayer } from "../../src/content/zeke/ZekePlayer";
import { ZEKE_ROUTE_SCENARIOS, parseZekeRouteId } from "../../src/content/zeke/ZekeRoutePlans";

function practice(config: ZekeConfig = {}) {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false, inputDelay: 0 });
  const region = new ZekeRegion({ seed: 1, ...config });
  const trainer = new TrainerInstance(region, { readyTimer: 0 });
  trainer.mount(document.createElement("canvas"), document.createElement("div"));
  if (!config.routeDemo) region.world.tickWorld(region.world.getReadyTimer - 1);
  const actors = () => {
    const boss = region.primaryBoss;
    const player = region.players[0];
    if (!(boss instanceof Zeke) || !(player instanceof ZekePlayer)) throw new Error("Native actors missing.");
    return { boss, player };
  };
  const castLanes: Readonly<{ cycle: number; lane: number }>[] = [];
  const tickTo = (at: number) => {
    const { boss } = actors();
    for (let count = 0; boss.encounterTick < at; count++) {
      if (count > at + 10) throw new Error("Encounter did not advance.");
      region.world.tickWorld();
      const status = region.routeDemoSnapshot();
      if (status.kind === "playing" && status.combat.some((event) => event.kind === "cast" && event.tick === boss.encounterTick)) {
        const { player } = actors();
        expect(player.equipment.weapon).toBeInstanceOf(HarmonisedNightmareStaff);
        expect(player.manualSpellCastSelection).toBeFalsy();
        expect(player.attackDelay).toBe(4);
        for (const event of status.combat) {
          if (event.kind !== "cast" || event.tick !== boss.encounterTick) continue;
          const sword = boss.encounter.swords[event.swordIndex];
          if (!sword) throw new Error("Native cast had no live sword target.");
          castLanes.push({ cycle: event.cycle, lane: sword.lane });
        }
      }
    }
  };
  return { region, trainer, actors, tickTo, castLanes };
}

describe("native route practice", () => {
  test.each(ZEKE_ROUTE_SCENARIOS)("$id loops native routes through three sword cycles with a home reset", (scenario) => {
    const drill = practice({ routeDemo: scenario.id, routeAutoplay: true });
    const inputTicks: number[] = [];
    let dispatchTick: number | null = null;
    let inputDepth = 0;
    const observeInput = (invoke: () => void) => {
      if (dispatchTick !== null && inputDepth === 0) inputTicks.push(dispatchTick);
      inputDepth++;
      try { invoke(); } finally { inputDepth--; }
    };
    const restoreInputs: (() => void)[] = [];
    try {
      const { boss, player } = drill.actors();
      const move = player.moveTo.bind(player);
      const target = player.setAggro.bind(player);
      const dispatch = drill.region.beforeNpcTurns.bind(drill.region);
      restoreInputs.push(vi.spyOn(player, "moveTo").mockImplementation((...args) => observeInput(() => move(...args))).mockRestore);
      restoreInputs.push(vi.spyOn(player, "setAggro").mockImplementation((...args) => observeInput(() => target(...args))).mockRestore);
      for (const item of new Set([...player.inventory, player.equipment.weapon])) {
        if (!item) continue;
        const click = item.inventoryLeftClick.bind(item);
        restoreInputs.push(vi.spyOn(item, "inventoryLeftClick").mockImplementation((...args) => observeInput(() => click(...args))).mockRestore);
      }
      restoreInputs.push(vi.spyOn(drill.region, "beforeNpcTurns").mockImplementation(() => {
        dispatchTick = boss.encounterTick + 1;
        try { dispatch(); } finally { dispatchTick = null; }
      }).mockRestore);
      expect(drill.region.world.getReadyTimer).toBe(0);
      drill.tickTo(1);
      drill.region.world.startTicking();
      for (let cycle = 1; cycle <= 3; cycle++) {
        drill.tickTo(15 + 37 * cycle);
        expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "playing", scenario, starOffset: 36, cycle });
        expect(drill.region.world.isPaused).toBe(false);
        expect(boss.location).toEqual({ x: 4, y: 6 });
        expect(player.location).toEqual({ x: 4, y: 7 });
        expect(player.currentStats.hitpoint).toBe(player.stats.hitpoint);
        expect(player.currentStats.prayer).toBe(player.stats.prayer);
        expect(boss.currentStats.hitpoint).toBe(boss.stats.hitpoint);
        const snapshot = drill.region.routeDemoSnapshot();
        if (snapshot.kind === "disabled") throw new Error("Native route was disabled.");
        const combat = snapshot.combat.filter((event) => event.cycle === cycle);
        const casts = combat.filter((event) => event.kind === "cast");
        const landed = combat.filter((event) => event.kind === "sword-hit");
        const expectedCasts = scenario.pattern.kind === "cross" ? 4 : scenario.pattern.kind === "parallel" ? 1 : 2;
        expect(casts).toHaveLength(expectedCasts);
        const lanes = drill.castLanes.filter((cast) => cast.cycle === cycle).map((cast) => cast.lane);
        if (scenario.pattern.kind === "two-rows") expect(lanes).toEqual([3, 7]);
        if (scenario.pattern.kind === "parallel") expect(lanes).toEqual([2]);
        expect(new Set(casts.map((event) => event.swordIndex)).size).toBe(expectedCasts);
        expect(landed).toHaveLength(expectedCasts);
        for (const cast of casts) {
          expect(cast.damage).toBe(80);
          expect(cast.landingAt - cast.tick).toBeGreaterThanOrEqual(2);
          expect(landed).toContainEqual(expect.objectContaining({ tick: cast.landingAt, swordIndex: cast.swordIndex, damage: cast.damage }));
        }
        if (scenario.pattern.kind === "cross") {
          expect(casts.map((event) => event.starOffset + 1)).toEqual([2, 6, 10, 14]);
          expect(Math.max(...landed.map((event) => event.starOffset + 1))).toBe(16);
        }
        for (const [index, cast] of casts.entries()) {
          const previous = casts[index - 1];
          if (previous) expect(cast.tick - previous.tick).toBe(4);
        }
        expect(combat.some((event) => event.kind === "scythe-hit" && event.tick > Math.max(...casts.map((cast) => cast.tick)))).toBe(true);
        const actions = snapshot.issuedActions;
        expect(new Set(actions.map((entry) => entry.tick)).size).toBe(actions.length);
        expect(new Set(inputTicks).size).toBe(inputTicks.length);
        expect(inputTicks).toEqual(actions.map((entry) => entry.tick));
        expect(actions.filter((entry) => entry.cycle === cycle && entry.action.kind === "attack-sword")).toHaveLength(expectedCasts);
        expect(actions.some((entry) => entry.cycle === cycle && entry.action.kind === "equip" && entry.action.weapon === "scythe")).toBe(true);
        expect(player.manualSpellCastSelection).toBeFalsy();
        const firstTick = 16 + 37 * (cycle - 1);
        const trace = boss.rows.filter((row) => row.tick >= firstTick && row.tick <= firstTick + 36).map((row) => row.players.find((participant) => participant.id === "tank"));
        const positions = trace.flatMap((participant) => participant ? [{ x: participant.x, y: participant.y }] : []);
        const changed = positions.filter((position, index) => index === 0 || position.x !== positions[index - 1]?.x || position.y !== positions[index - 1]?.y);
        expect(changed).toEqual(scenario.trace);
      }
      expect(player.aggro).toBeNull();
      expect(player.prayerController.matchFeature("melee")).toBeTruthy();
      expect(player.prayerController.findPrayerByName("Piety").isActive).toBe(true);
      const events = boss.rows.flatMap((row) => row.events);
      expect(events.filter((event) => event.kind === "auto")).toHaveLength(14);
      expect(events.filter((event) => event.kind === "sword-hit-boss")).toHaveLength(scenario.expectedHits * 3);
      if (scenario.pattern.kind !== "two-rows") expect(events.filter((event) => event.kind === "successful-dodge").length).toBeGreaterThanOrEqual(3);
      expect(events.some((event) => event.kind === "star-hit" || event.kind === "sword-hit-player" || (event.kind === "auto" && event.style === "magic"))).toBe(false);
      expect(events.filter((event) => event.kind === "star-tell")).toEqual(Array.from({ length: 3 }, () => ({ kind: "star-tell", pattern: scenario.pattern })));
      expect(boss.rows.filter((row) => row.tick < 16).flatMap((row) => row.events).filter((event) => event.kind === "auto")).toEqual([
        expect.objectContaining({ kind: "auto", style: "melee" }),
        expect.objectContaining({ kind: "auto", style: "melee" }),
      ]);
      expect(boss.rows.find((row) => row.tick === 16)?.events).toContainEqual({ kind: "star-tell", pattern: scenario.pattern });
    } finally {
      restoreInputs.reverse().forEach((restore) => restore());
      drill.trainer.dispose();
    }
  });

  test("normal practice leaves routes and protection prayer disabled", () => {
    const drill = practice();
    try {
      drill.tickTo(18);
      expect(drill.region.routeDemoSnapshot()).toEqual({ kind: "disabled" });
      expect(drill.actors().player.location).toEqual({ x: 4, y: 7 });
      expect(drill.actors().player.prayerController.matchFeature("melee")).toBeFalsy();
    } finally { drill.trainer.dispose(); }
  });

  test("selecting scenarios changes the same native trainer without navigation or a countdown", () => {
    const drill = practice();
    try {
      const initial = drill.actors().player;
      drill.region.selectRouteScenario("two-rows");
      const selected = drill.trainer.reset();
      expect(selected).not.toBe(initial);
      expect(drill.trainer.getSnapshot().player).toBe(selected);
      expect(drill.region.world.getReadyTimer).toBe(0);
      drill.tickTo(17);
      expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "practice", scenario: { id: "two-rows" }, cycle: 1, starOffset: 1, lastClick: null });
      expect(selected.location).toEqual({ x: 4, y: 7 });
      expect(selected.prayerController.matchFeature("melee")).toBeTruthy();
      expect(selected.prayerController.findPrayerByName("Piety").isActive).toBe(true);
      drill.region.playRoute();
      drill.trainer.reset();
      drill.tickTo(18);
      expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "playing", scenario: { id: "two-rows" }, cycle: 1, starOffset: 2 });
      expect(drill.actors().player.location).not.toEqual({ x: 4, y: 7 });
      drill.region.takeRouteControl();
      drill.trainer.reset();
      drill.tickTo(17);
      expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "practice", cycle: 1, lastClick: null });
      expect(drill.actors().player.location).toEqual({ x: 4, y: 7 });
      drill.region.selectRouteScenario(null);
      drill.trainer.reset();
      expect(drill.region.routeDemoSnapshot()).toEqual({ kind: "disabled" });
    } finally { drill.trainer.dispose(); }
  });

  test("manual attempts keep playing after hazard damage and expose the restart boundary", () => {
    const drill = practice({ routeDemo: "cross-2-2", invincible: true });
    try {
      drill.tickTo(18);
      expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "practice", starOffset: 2, lastClick: null });
      const { boss, player } = drill.actors();
      const star = boss.encounter.stars[0];
      if (!star) throw new Error("Expected native stars.");
      player.setLocation(star.tile);
      player.moveTo(star.tile.x, star.tile.y);
      drill.tickTo(19);
      expect(drill.region.routeDemoSnapshot().kind).toBe("practice");
      expect(boss.rows.at(-1)?.events.some((event) => event.kind === "star-hit")).toBe(true);
      drill.tickTo(52);
      expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "practice", cycle: 2 });
      drill.trainer.reset();
      expect(drill.actors().boss.location).toEqual({ x: 4, y: 6 });
      expect(drill.actors().player.location).toEqual({ x: 4, y: 7 });
      expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "practice", cycle: 1 });
    } finally { drill.trainer.dispose(); }
  });

  test("magic stops autopilot with a visible failure", () => {
    const drill = practice({ routeDemo: "cross-2-2", routeAutoplay: true });
    try {
      drill.tickTo(23);
      drill.actors().player.setLocation({ x: 9, y: 1 });
      drill.actors().player.moveTo(9, 1);
      drill.tickTo(24);
      expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "failed", reason: expect.stringContaining("magic") });
      expect(drill.region.world.isPaused).toBe(true);
    } finally { drill.trainer.dispose(); }
  });

  test("an active step-under stops autopilot and Play route clears the failure", () => {
    const drill = practice({ routeDemo: "cross-2-2", routeAutoplay: true });
    try {
      drill.tickTo(22);
      const { boss, player } = drill.actors();
      player.setLocation({ x: boss.location.x + 1, y: boss.location.y - 1 });
      player.moveTo(player.location.x, player.location.y);
      drill.tickTo(23);
      expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "failed", reason: expect.stringContaining("stepped under") });
      drill.region.playRoute();
      drill.trainer.reset();
      expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "playing", lastClick: null, cycle: 1 });
    } finally { drill.trainer.dispose(); }
  });

  test("an explosion hit fails autopilot even when the tank survives it", () => {
    const drill = practice({ routeDemo: "cross-2-2", routeAutoplay: true });
    try {
      drill.tickTo(18);
      const { boss, player } = drill.actors();
      const star = boss.encounter.stars[0];
      if (!star) throw new Error("Expected native stars.");
      player.setLocation(star.tile);
      player.moveTo(star.tile.x, star.tile.y);
      drill.tickTo(19);
      expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "failed", reason: expect.stringContaining("star or sword") });
    } finally { drill.trainer.dispose(); }
  });

  test("a missing home reset fails instead of advancing another autopilot cycle", () => {
    const drill = practice({ routeDemo: "cross-2-2", routeAutoplay: true });
    try {
      drill.tickTo(51);
      drill.actors().player.setLocation({ x: 1, y: 1 });
      drill.actors().player.moveTo(1, 1);
      drill.tickTo(52);
      expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "failed", reason: expect.stringContaining("starting tiles") });
    } finally { drill.trainer.dispose(); }
  });

  test("pause preserves the current route and restart replays the opening attacks", () => {
    const drill = practice({ routeDemo: "two-rows", routeAutoplay: true });
    try {
      drill.tickTo(5);
      const before = drill.region.routeDemoSnapshot();
      drill.region.world.stopTicking();
      expect(drill.region.world.isPaused).toBe(true);
      expect(drill.region.routeDemoSnapshot()).toEqual(before);
      drill.region.world.startTicking();
      drill.tickTo(52);
      expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "playing", cycle: 1, starOffset: 36 });
      const initial = drill.actors().player;
      const replacement = drill.trainer.reset();
      expect(replacement).not.toBe(initial);
      expect(drill.region.world.getReadyTimer).toBe(0);
      drill.tickTo(52);
      expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "playing", starOffset: 36, cycle: 1 });
    } finally { drill.trainer.dispose(); }
  });

  test("route identifiers are parsed against the catalog and traces follow native tank positions", () => {
    expect(parseZekeRouteId("cross-2-2")).toBe("cross-2-2");
    expect(parseZekeRouteId("unknown")).toBeNull();
    expect(parseZekeRouteId(null)).toBeNull();
    for (const scenario of ZEKE_ROUTE_SCENARIOS) {
      expect(scenario.trace[0]).toEqual({ x: 4, y: 7 });
      expect(scenario.trace.at(-1)).toEqual({ x: 4, y: 7 });
    }
  });
});
