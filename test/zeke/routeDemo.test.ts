import { InputController, LineOfSight, Pathing, ScytheOfVitur, Settings, Trainer, TrainerInstance } from "osrs-sdk";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import type { ZekeConfig } from "../../src/content/zeke/ZekeRegion";
import { Zeke } from "../../src/content/zeke/Zeke";
import { HarmonisedNightmareStaff } from "../../src/content/zeke/HarmonisedNightmareStaff";
import { ZekePlayer } from "../../src/content/zeke/ZekePlayer";
import { WindSurge } from "../../src/content/zeke/WindSurge";
import { ZEKE_ROUTE_SCENARIOS, parseZekeRouteId } from "../../src/content/zeke/ZekeRoutePlans";

function practice(config: ZekeConfig = {}) {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false, inputDelay: 0 });
  const region = new ZekeRegion({ seed: 1, ...config });
  const trainer = new TrainerInstance(region, { readyTimer: 0 });
  trainer.mount(document.createElement("canvas"), document.createElement("div"));
  vi.spyOn(region.world, "startLoop").mockImplementation(() => {});
  region.world.startTicking();
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
  test.each(ZEKE_ROUTE_SCENARIOS)("$id starts turning toward the boss during post-drag scythe swings", (scenario) => {
    const drill = practice({ routeDemo: scenario.id, routeAutoplay: true });
    const { boss, player } = drill.actors();
    const swings: Readonly<{ tick: number; facing: number; target: number }>[] = [];
    let now = window.performance.now();
    const clock = vi.spyOn(window.performance, "now").mockImplementation(() => now);
    const playAnimation = player.playAnimation.bind(player);
    const observe = vi.spyOn(player, "playAnimation").mockImplementation((...args) => {
      if (args[0] === player.attackAnimationId && player.equipment.weapon instanceof ScytheOfVitur && player.aggro === boss) {
        const from = player.getPerceivedLocation(drill.region.world.tickPercent);
        const to = boss.getPerceivedLocation(drill.region.world.tickPercent);
        swings.push({ tick: boss.encounterTick, facing: player.getPerceivedRotation(0), target: -Pathing.angle(from.x + player.size / 2, from.y - player.size / 2, to.x + boss.size / 2, to.y - boss.size / 2) });
      }
      return playAnimation(...args);
    });
    let turningSwings = 0;
    try {
      for (let at = 1; at <= 31; at++) {
        const before = player.getPerceivedRotation(0);
        drill.tickTo(at);
        const swing = swings.at(-1);
        for (let client = 0; client < 30; client++) {
          drill.region.world.tickClient(client / 30, now);
          now += 20;
          if (client !== 0 || !swing || swing.tick !== at || at <= 16) continue;
          expect(swing.facing).toBeCloseTo(before);
          const errorBefore = Math.abs(Math.atan2(Math.sin(swing.target - before), Math.cos(swing.target - before)));
          if (errorBefore <= 0.25) continue;
          const after = player.getPerceivedRotation(0);
          const turned = Math.abs(Math.atan2(Math.sin(after - before), Math.cos(after - before)));
          const errorAfter = Math.abs(Math.atan2(Math.sin(swing.target - after), Math.cos(swing.target - after)));
          expect(turned, `Turn starts at tick ${at}`).toBeGreaterThan(0);
          expect(turned).toBeLessThan(0.25);
          expect(errorAfter).toBeLessThan(errorBefore);
          turningSwings++;
        }
      }
      expect(turningSwings).toBeGreaterThan(0);
    } finally { observe.mockRestore(); clock.mockRestore(); drill.trainer.dispose(); }
  });

  test("manual targeting starts a smooth turn before an attack is ready", () => {
    const drill = practice();
    const { boss, player } = drill.actors();
    let now = window.performance.now();
    const clock = vi.spyOn(window.performance, "now").mockImplementation(() => now);
    try {
      player.setRotationImmediate(-1);
      player.attackDelay = 3;
      InputController.controller.queueAction(() => Trainer.clickController.playerAttackClick(boss));
      drill.tickTo(1);
      expect(player.attackDelay).toBeGreaterThan(0);
      expect(player.getPerceivedRotation(0)).toBeCloseTo(-1);
      const target = player.getTargetAngle();
      drill.region.world.tickClient(0, now);
      now += 20;
      const facing = player.getPerceivedRotation(0);
      expect(facing).toBeGreaterThan(-1);
      expect(facing).toBeLessThan(target);
    } finally { clock.mockRestore(); drill.trainer.dispose(); }
  });

  test("manual spell casting after movement keeps its facing when the SDK clears its target", () => {
    const drill = practice();
    const { boss, player } = drill.actors();
    const spell = new WindSurge();
    const facings: number[] = [];
    const playAnimation = player.playAnimation.bind(player);
    const observe = vi.spyOn(player, "playAnimation").mockImplementation((...args) => {
      if (args[0] === spell.attackAnimationId) facings.push(player.getPerceivedRotation(0));
      return playAnimation(...args);
    });
    try {
      player.queueMovement(player.location.x + 2, player.location.y);
      drill.tickTo(1);
      expect(player.visualPath.length).toBeGreaterThan(0);
      player.setRotationImmediate(1.2);
      player.manualSpellCastSelection = spell;
      InputController.controller.queueAction(() => Trainer.clickController.playerAttackClick(boss));
      drill.tickTo(2);
      expect(player.manualSpellCastSelection).toBeNull();
      expect(player.aggro).toBeNull();
      expect(facings).toEqual([1.2]);
    } finally { observe.mockRestore(); drill.trainer.dispose(); }
  });

  test.each(modes)("Lower Left returns both native actors home before the next star in %s", (attackMode) => {
    const drill = practice({ routeDemo: "cross-2-8", routeAutoplay: true, routeAttackMode: attackMode });
    const { boss, player } = drill.actors();
    const swings: number[] = [];
    const didAttack = player.didAttack.bind(player);
    const observe = vi.spyOn(player, "didAttack").mockImplementation(() => {
      if (player.equipment.weapon instanceof ScytheOfVitur && player.aggro === boss) swings.push(boss.encounterTick);
      didAttack();
    });
    try {
      drill.tickTo(31);
      const phase = boss.encounter.phase;
      if (phase.kind !== "recovery" || phase.recovery !== "weaken") throw new Error("Missing Lower Left stun.");
      drill.tickTo(phase.stunnedUntil - 1);
      expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "playing", stage: { kind: "returning", started: phase.stunnedUntil - 1 } });
      drill.tickTo(phase.stunnedUntil + 3);
      expect(player.location).toEqual({ x: 4, y: 7 });
      expect(boss.location).toEqual({ x: 4, y: 6 });
      expect(drill.region.routeDemoSnapshot().kind).toBe("playing");
      expect(swings).toEqual(attackMode === "scythe" ? [1, 6, 11, 16, 22, 27, 32, 37, 43] : [1, 6, 11, 33, 38, 43]);
      for (let at = boss.encounterTick + 1; at <= phase.stunnedUntil + 10; at++) drill.tickTo(at);
      expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "playing", stage: { kind: "awaiting-star" } });
      expect(player.location).toEqual({ x: 4, y: 7 });
      expect(boss.location).toEqual({ x: 4, y: 6 });
      expect(boss.rows.flatMap(({ events }) => events).filter((event) => event.kind === "auto").every((event) => event.style === "melee")).toBe(true);
    } finally { observe.mockRestore(); drill.trainer.dispose(); }
  });

  test.each(ZEKE_ROUTE_SCENARIOS.flatMap((scenario) => modes.map((attackMode) => ({ scenario, attackMode }))))(
    "$scenario.id repeats three safe cycles in one fight with $attackMode and visibly finishes each return",
    ({ scenario, attackMode }) => {
      const drill = practice({ routeDemo: scenario.id, routeAutoplay: true, routeAttackMode: attackMode });
      const { boss, player } = drill.actors();
      const reset = vi.spyOn(drill.trainer, "reset");
      const swings: number[] = [];
      const opportunities: number[] = [];
      const stars: number[] = [];
      const completed = new Set<number>();
      const stuns = new Map<number, Readonly<{ started: number; until: number }>>();
      const impacts = new Map<number, number>();
      const didAttack = player.didAttack.bind(player);
      const attackStep = player.attackStep.bind(player);
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
        attackStep();
      });
      let now = window.performance.now();
      const clock = vi.spyOn(window.performance, "now").mockImplementation(() => now);
      try {
        drill.region.world.startTicking();
        for (let at = 1; at <= 250 && stars.length < 4; at++) {
          const previousTick = boss.encounterTick;
          drill.tickTo(at);
          expect(boss.encounterTick).toBe(previousTick + 1);
          expect(drill.actors().boss).toBe(boss);
          expect(drill.actors().player).toBe(player);
          expect(drill.trainer.getSnapshot().player).toBe(player);
          expect(drill.region.world.getReadyTimer).toBe(0);
          expect(drill.region.world.isPaused).toBe(false);
          const status = drill.region.routeDemoSnapshot();
          expect(status.kind).toBe("playing");
          if (status.kind !== "playing") throw new Error(`Native route stopped at ${at}.`);
          const row = boss.rows.at(-1);
          if (!row) throw new Error("Missing native fight row.");
          expect(row.events.some((event) => event.kind === "star-hit" || event.kind === "sword-hit-player" || event.kind === "swords-missed" || event.kind === "boss-heal")).toBe(false);
          expect(row.events.filter((event) => event.kind === "auto").every((event) => event.style === "melee")).toBe(true);
          for (const event of row.events) {
            if (event.kind !== "star-tell") continue;
            expect(event.pattern).toEqual(scenario.pattern);
            if (stars.length > 0) {
              expect(completed.has(stars.length)).toBe(true);
              expect(player.location).toEqual({ x: 4, y: 7 });
              expect(boss.location).toEqual({ x: 4, y: 6 });
              expect(player.visualPath).toHaveLength(0);
              expect(boss.visualPath).toHaveLength(0);
            }
            stars.push(at);
            expect(status.cycle).toBe(stars.length);
            if (attackMode === "wind-surge") expect(player.equipment.weapon).toBeInstanceOf(HarmonisedNightmareStaff);
          }
          const phase = boss.encounter.phase;
          if (stars.length > 0) expect(phase.kind).not.toBe("opening");
          if (phase.kind === "recovery" && phase.recovery === "weaken") stuns.set(status.cycle, { started: phase.started, until: phase.stunnedUntil });
          if (stars.length > 0 && !impacts.has(status.cycle) && boss.encounter.swords.length > 0 && boss.encounter.swords.every((sword) => sword.status === "impacted" || sword.status === "spent")) impacts.set(status.cycle, at);
          for (let client = 0; client < 30; client++) {
            drill.region.world.tickClient(client / 30, now);
            now += 20;
          }
          if (status.stage.kind !== "awaiting-star") continue;
          expect(player.location).toEqual({ x: 4, y: 7 });
          expect(boss.location).toEqual({ x: 4, y: 6 });
          if (player.visualPath.length > 0 || boss.visualPath.length > 0) continue;
          expect(player.getPerceivedLocation(0)).toMatchObject(player.location);
          expect(boss.getPerceivedLocation(0)).toMatchObject(boss.location);
          if (completed.has(status.cycle)) continue;
          completed.add(status.cycle);
          const firstStar = stars[status.cycle - 1];
          const stun = stuns.get(status.cycle);
          const impactedAt = impacts.get(status.cycle);
          if (firstStar === undefined || !stun || impactedAt === undefined) throw new Error("Missing cycle mechanics.");
          const combat = status.combat.filter((event) => event.cycle === status.cycle);
          const issued = status.issuedActions.filter((event) => event.cycle === status.cycle);
          const events = boss.rows.filter((entry) => entry.tick >= firstStar && entry.tick <= at).flatMap((entry) => entry.events);
          expect(events.filter((event) => event.kind === "sword-hit-boss")).toHaveLength(scenario.expectedHits);
          expect(events.filter((event) => event.kind === "auto")).toHaveLength(4);
          const casts = combat.filter((event) => event.kind === "cast");
          const landed = combat.filter((event) => event.kind === "sword-hit");
          expect(casts).toHaveLength(attackMode === "wind-surge" ? scenario.expectedCasts : 0);
          expect(landed).toHaveLength(casts.length);
          for (const cast of casts) {
            expect(cast.damage).toBe(80);
            expect(cast.landingAt - cast.tick).toBeGreaterThanOrEqual(2);
            expect(landed).toContainEqual(expect.objectContaining({ tick: cast.landingAt, swordIndex: cast.swordIndex, damage: cast.damage }));
          }
          expect(combat.some((event) => event.kind === "scythe-hit" && event.tick > stun.started && event.tick <= stun.until)).toBe(true);
          const stunnedSwings = swings.filter((tick) => tick > stun.started && tick < stun.until);
          expect(stunnedSwings.length).toBeGreaterThanOrEqual(1);
          expect(stunnedSwings.every((tick, index) => index === 0 || tick - (stunnedSwings[index - 1] ?? tick) === player.attackSpeed)).toBe(true);
          expect(new Set(issued.map((entry) => entry.tick)).size).toBe(issued.length);
          expect(player.equipment.weapon).toBeInstanceOf(ScytheOfVitur);
          expect(player.manualSpellCastSelection).toBeFalsy();
          expect(opportunities.filter((tick) => tick >= impactedAt && tick < stun.until && !swings.includes(tick) && !issued.some((entry) => entry.tick === tick))).toEqual([]);
          if (attackMode === "scythe") {
            expect(combat.every((event) => event.kind === "scythe-hit")).toBe(true);
            expect(opportunities.filter((tick) => tick >= firstStar && tick < stun.until && !swings.includes(tick) && !issued.some((entry) => entry.tick === tick))).toEqual([]);
          }
        }
        expect(stars).toHaveLength(4);
        expect([...completed]).toEqual([1, 2, 3]);
        expect(swings.slice(0, 3)).toEqual([1, 6, 11]);
        expect(reset).not.toHaveBeenCalled();
      } finally {
        clock.mockRestore();
        observeOpportunities.mockRestore();
        observeSwings.mockRestore();
        reset.mockRestore();
        drill.trainer.dispose();
      }
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
      drill.tickTo(52);
      const scythe = drill.region.routeDemoSnapshot();
      if (scythe.kind === "disabled") throw new Error("Native route was disabled.");
      expect(scythe).toMatchObject({ kind: "playing", attackMode: "scythe", cycle: 1, stage: { kind: "awaiting-star" } });
      expect(scythe.combat.every((event) => event.kind === "scythe-hit")).toBe(true);
      expect(drill.actors().player.equipment.weapon).toBeInstanceOf(ScytheOfVitur);
    } finally { drill.trainer.dispose(); }
  });

  test("normal practice keeps routes disabled and starts with Protect from Melee and Piety, including after restart", () => {
    const drill = practice();
    try {
      drill.tickTo(18);
      expect(drill.region.routeDemoSnapshot()).toEqual({ kind: "disabled", attackMode: "scythe" });
      expect(drill.actors().player.location).toEqual({ x: 4, y: 7 });
      expect(drill.actors().player.prayerController.activePrayers().map((prayer) => prayer.name)).toEqual(["Protect from Melee", "Piety"]);
      drill.trainer.reset();
      drill.tickTo(1);
      expect(drill.actors().player.prayerController.activePrayers().map((prayer) => prayer.name)).toEqual(["Protect from Melee", "Piety"]);
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

  test("manual attempts keep the same actors and repeat the selected pattern after hazard damage", () => {
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
      drill.tickTo(120);
      expect(drill.actors().boss).toBe(boss);
      expect(drill.actors().player).toBe(player);
      expect(drill.region.world.isPaused).toBe(false);
      expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "practice", cycle: 4 });
      expect(boss.rows.flatMap((row) => row.events).filter((event) => event.kind === "star-tell")).toEqual([
        { kind: "star-tell", pattern: { kind: "cross", row: 2, column: 2 } },
        { kind: "star-tell", pattern: { kind: "cross", row: 2, column: 2 } },
        { kind: "star-tell", pattern: { kind: "cross", row: 2, column: 2 } },
        { kind: "star-tell", pattern: { kind: "cross", row: 2, column: 2 } },
      ]);
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

  test.each(["magic", "stepped under"])("the return home still stops on %s", (violation) => {
    const drill = practice({ routeDemo: "cross-2-8", routeAutoplay: true });
    try {
      drill.tickTo(41);
      expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "playing", stage: { kind: "returning" } });
      const { boss, player } = drill.actors();
      const destination = violation === "magic" ? { x: 9, y: 1 } : { x: boss.location.x + 1, y: boss.location.y - 1 };
      player.setLocation(destination);
      player.moveTo(destination.x, destination.y);
      for (let at = 42; at <= 43 && drill.region.routeDemoSnapshot().kind === "playing"; at++) drill.tickTo(at);
      expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "failed", reason: expect.stringContaining(violation) });
      expect(drill.region.world.isPaused).toBe(true);
    } finally { drill.trainer.dispose(); }
  });

  test("a blocked return fails before the next star instead of completing away from home", () => {
    const drill = practice({ routeDemo: "cross-2-8", routeAutoplay: true });
    try {
      drill.tickTo(41);
      const blockedMovement = vi.spyOn(drill.actors().player, "moveTo").mockImplementation(() => {});
      try {
        for (let at = 42; at <= 52 && drill.region.routeDemoSnapshot().kind === "playing"; at++) drill.tickTo(at);
        expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "failed", reason: expect.stringContaining("starting tiles") });
        expect(drill.actors().boss.encounterTick).toBe(52);
        expect(drill.region.world.isPaused).toBe(true);
      } finally { blockedMovement.mockRestore(); }
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
      drill.tickTo(52);
      expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "playing", cycle: 1, stage: { kind: "awaiting-star" } });
      const initial = drill.actors().player;
      const replacement = drill.trainer.reset();
      expect(replacement).not.toBe(initial);
      expect(drill.region.world.getReadyTimer).toBe(0);
      drill.tickTo(52);
      expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: "playing", cycle: 1, stage: { kind: "awaiting-star" } });
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
