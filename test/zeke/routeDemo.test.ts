import { LineOfSight, ScytheOfVitur, Settings, TrainerInstance } from "osrs-sdk";
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
  vi.spyOn(region.world, "startLoop").mockImplementation(() => {});
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
  const modes = ["scythe", "wind-surge"] as const;
  test.each(ZEKE_ROUTE_SCENARIOS.flatMap((scenario) => modes.map((attackMode) => ({ scenario, attackMode }))))(
    "$scenario.id keeps attacking during stun in $attackMode and restarts through the native trainer",
    ({ scenario, attackMode }) => {
      const drill = practice({ routeDemo: scenario.id, routeAutoplay: true, routeAttackMode: attackMode });
      try {
        for (let cycle = 1; cycle <= 3; cycle++) {
          const { boss, player } = drill.actors();
          const swings: number[] = [];
          const opportunities: number[] = [];
          const inputs: number[] = [];
          let inputTick = 0;
          let inputDepth = 0;
          const observeInput = (invoke: () => void) => {
            if (inputDepth === 0) inputs.push(inputTick);
            inputDepth++;
            try { invoke(); } finally { inputDepth--; }
          };
          const restores: (() => void)[] = [];
          const dispatch = drill.region.beforeNpcTurns.bind(drill.region);
          restores.push(vi.spyOn(drill.region, "beforeNpcTurns").mockImplementation(() => {
            inputTick = boss.encounterTick + 1;
            dispatch();
          }).mockRestore);
          const move = player.moveTo.bind(player);
          const target = player.setAggro.bind(player);
          restores.push(vi.spyOn(player, "moveTo").mockImplementation((...args) => observeInput(() => move(...args))).mockRestore);
          restores.push(vi.spyOn(player, "setAggro").mockImplementation((...args) => observeInput(() => target(...args))).mockRestore);
          for (const item of new Set([...player.inventory, player.equipment.weapon])) {
            if (!item) continue;
            const click = item.inventoryLeftClick.bind(item);
            restores.push(vi.spyOn(item, "inventoryLeftClick").mockImplementation((...args) => observeInput(() => click(...args))).mockRestore);
          }
          const didAttack = player.didAttack.bind(player);
          const beforeAttack = player.attackStep.bind(player);
          const observeSwings = vi.spyOn(player, "didAttack").mockImplementation(() => {
            if (player.equipment.weapon instanceof ScytheOfVitur && player.aggro === boss) swings.push(boss.encounterTick);
            didAttack();
          });
          const observeOpportunities = vi.spyOn(player, "attackStep").mockImplementation(() => {
            const phase = boss.encounter.phase;
            const duringStun = phase.kind === "recovery" && phase.recovery === "weaken" && boss.encounterTick < phase.stunnedUntil;
            const destination = player.destinationLocation;
            const moving = destination && (destination.x !== player.location.x || destination.y !== player.location.y);
            if (player.equipment.weapon instanceof ScytheOfVitur && player.attackDelay === 0 && (duringStun || !moving)
              && LineOfSight.playerHasLineOfSightOfMob(drill.region, player.location.x, player.location.y, boss, player.attackRange)) opportunities.push(boss.encounterTick);
            beforeAttack();
          });
          try {
            expect(drill.trainer.getSnapshot().player).toBe(player);
            expect(drill.region.world.getReadyTimer).toBe(0);
            drill.region.world.startTicking();
            drill.tickTo(31);
            const phase = boss.encounter.phase;
            if (phase.kind !== "recovery" || phase.recovery !== "weaken") throw new Error("Native route did not stun the boss.");
            let until = phase.stunnedUntil;
            let allSwordsImpactedAt: number | null = null;
            while (boss.encounterTick < until) {
              expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "playing", attackMode, cycle });
              const current = boss.encounter;
              if (allSwordsImpactedAt === null && current.swords.every((sword) => sword.status === "impacted" || sword.status === "spent")) allSwordsImpactedAt = boss.encounterTick;
              drill.tickTo(boss.encounterTick + 1);
              if (boss.encounter.phase.kind === "recovery") until = boss.encounter.phase.stunnedUntil;
            }
            const status = drill.region.routeDemoSnapshot();
            expect(status).toMatchObject({ kind: "complete", control: "playing", attackMode, scenario, cycle });
            if (status.kind !== "complete") throw new Error("Native route did not complete.");
            expect(drill.region.world.isPaused).toBe(true);
            expect(boss.encounterTick).toBe(until);
            const stunnedSwings = swings.filter((at) => at > phase.started && at < until);
            expect(stunnedSwings.length).toBeGreaterThanOrEqual(1);
            expect(stunnedSwings.every((at, index) => index === 0 || at - (stunnedSwings[index - 1] ?? at) === player.attackSpeed)).toBe(true);
            expect(swings).not.toContain(until);
            expect(status.combat.some((event) => event.kind === "scythe-hit" && event.tick > phase.started && event.tick <= until)).toBe(true);
            expect(new Set(status.issuedActions.map((entry) => entry.tick)).size).toBe(status.issuedActions.length);
            expect(inputs).toEqual(status.issuedActions.map((entry) => entry.tick));
            expect(status.issuedActions.filter(({ action }) => action.kind === "stop-attacking")).toHaveLength(1);
            expect(player.equipment.weapon).toBeInstanceOf(ScytheOfVitur);
            expect(player.manualSpellCastSelection).toBeFalsy();
            const casts = status.combat.filter((event) => event.kind === "cast");
            const landed = status.combat.filter((event) => event.kind === "sword-hit");
            const expectedCasts = attackMode === "wind-surge" ? scenario.expectedCasts : 0;
            expect(casts).toHaveLength(expectedCasts);
            expect(landed).toHaveLength(expectedCasts);
            for (const cast of casts) {
              expect(cast.damage).toBe(80);
              expect(cast.landingAt - cast.tick).toBeGreaterThanOrEqual(2);
              expect(landed).toContainEqual(expect.objectContaining({ tick: cast.landingAt, swordIndex: cast.swordIndex, damage: cast.damage }));
            }
            const events = boss.rows.flatMap((row) => row.events);
            expect(events.filter((event) => event.kind === "sword-hit-boss")).toHaveLength(scenario.expectedHits);
            expect(events.some((event) => event.kind === "star-hit" || event.kind === "sword-hit-player" || (event.kind === "auto" && event.style === "magic"))).toBe(false);
            expect(events.filter((event) => event.kind === "star-tell")).toEqual([{ kind: "star-tell", pattern: scenario.pattern }]);
            expect(allSwordsImpactedAt).not.toBeNull();
            if (allSwordsImpactedAt === null) throw new Error("Swords never finished their native impacts.");
            expect(status.issuedActions.filter((entry) => entry.tick > allSwordsImpactedAt && entry.action.kind === "move")).toEqual([]);
            const firstStar = boss.rows.find((row) => row.events.some((event) => event.kind === "star-tell"));
            if (!firstStar) throw new Error("Missing native star.");
            const expectedPath = scenario.actions.filter(({ action, at }) => action.kind === "move" && at + firstStar.tick <= allSwordsImpactedAt);
            const actualPath = status.issuedActions.filter((entry) => entry.starOffset !== null && entry.action.kind === "move");
            expect(actualPath.map(({ starOffset, action }) => ({ at: starOffset, action }))).toEqual(expectedPath);
            expect(opportunities.filter((at) => at >= allSwordsImpactedAt && at < until && !swings.includes(at) && !status.issuedActions.some((entry) => entry.tick === at))).toEqual([]);
            if (attackMode === "scythe") {
              expect(swings.slice(0, 3)).toEqual([1, 6, 11]);
              expect(status.combat.every((event) => event.kind === "scythe-hit")).toBe(true);
              expect(opportunities.filter((at) => at < until && !swings.includes(at) && !status.issuedActions.some((entry) => entry.tick === at))).toEqual([]);
            }
            const replaced = drill.trainer.reset();
            expect(replaced).not.toBe(player);
            expect(drill.trainer.getSnapshot().player).toBe(replaced);
            expect(drill.region.players[0]).toBe(replaced);
            expect(replaced.location).toEqual({ x: 4, y: 7 });
            expect(drill.actors().boss.location).toEqual({ x: 4, y: 6 });
            expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "playing", attackMode, cycle: cycle + 1, starOffset: null });
          } finally {
            restores.reverse().forEach((restore) => restore());
            observeOpportunities.mockRestore();
            observeSwings.mockRestore();
          }
        }
      } finally { drill.trainer.dispose(); }
    },
  );

  test("route attack selection persists through restarts and switches back to scythe", () => {
    const drill = practice({ routeDemo: "cross-2-2", routeAutoplay: true });
    try {
      expect(drill.region.routeDemoSnapshot()).toMatchObject({ attackMode: "scythe" });
      drill.region.setRouteAttackMode("wind-surge");
      drill.trainer.reset();
      drill.tickTo(30);
      const wind = drill.region.routeDemoSnapshot();
      if (wind.kind === "disabled") throw new Error("Native route was disabled.");
      expect(wind).toMatchObject({ kind: "playing", attackMode: "wind-surge" });
      expect(wind.combat.filter((event) => event.kind === "cast")).toHaveLength(4);
      drill.trainer.reset();
      expect(drill.region.routeDemoSnapshot()).toMatchObject({ attackMode: "wind-surge" });
      drill.region.setRouteAttackMode("scythe");
      drill.trainer.reset();
      drill.tickTo(41);
      const scythe = drill.region.routeDemoSnapshot();
      if (scythe.kind === "disabled") throw new Error("Native route was disabled.");
      expect(scythe).toMatchObject({ kind: "complete", attackMode: "scythe" });
      expect(scythe.combat.every((event) => event.kind === "scythe-hit")).toBe(true);
      expect(drill.actors().player.equipment.weapon).toBeInstanceOf(ScytheOfVitur);
    } finally { drill.trainer.dispose(); }
  });

  test("normal practice leaves routes and protection prayer disabled", () => {
    const drill = practice();
    try {
      drill.tickTo(18);
      expect(drill.region.routeDemoSnapshot()).toEqual({ kind: "disabled", attackMode: "scythe" });
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
      expect(drill.region.routeDemoSnapshot()).toEqual({ kind: "disabled", attackMode: "scythe" });
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
    const drill = practice({ routeDemo: "cross-2-2", routeAutoplay: true, routeAttackMode: "wind-surge" });
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
    const drill = practice({ routeDemo: "cross-2-2", routeAutoplay: true, routeAttackMode: "wind-surge" });
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
    const drill = practice({ routeDemo: "cross-2-2", routeAutoplay: true, routeAttackMode: "wind-surge" });
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

  test("pause preserves the current route and restart replays the opening attacks", () => {
    const drill = practice({ routeDemo: "two-rows", routeAutoplay: true, routeAttackMode: "wind-surge" });
    try {
      drill.tickTo(5);
      const before = drill.region.routeDemoSnapshot();
      drill.region.world.stopTicking();
      expect(drill.region.world.isPaused).toBe(true);
      expect(drill.region.routeDemoSnapshot()).toEqual(before);
      drill.region.world.startTicking();
      drill.tickTo(41);
      expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "complete", cycle: 1 });
      const initial = drill.actors().player;
      const replacement = drill.trainer.reset();
      expect(replacement).not.toBe(initial);
      expect(drill.region.world.getReadyTimer).toBe(0);
      drill.tickTo(41);
      expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "complete", cycle: 2 });
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
