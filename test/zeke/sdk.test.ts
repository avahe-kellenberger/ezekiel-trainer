import { InputController, Pathing, Projectile, Settings, Trainer, TrainerInstance } from "osrs-sdk";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import type { ZekeConfig } from "../../src/content/zeke/ZekeRegion";
import { Zeke } from "../../src/content/zeke/Zeke";
import { ZekePlayer } from "../../src/content/zeke/ZekePlayer";
import { ZekeSword } from "../../src/content/zeke/hazards";
import { ZEKE_RULES } from "../../src/content/zeke/ZekeRules";
import { ZEKE_PRESENTATION } from "../../src/content/zeke/assets";
import { besideBoss } from "../../src/content/zeke/mechanics";
import { tile } from "../../src/sim/brands";

function practice(config: ZekeConfig = {}) {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false });
  const region = new ZekeRegion({ seed: 1, ...config });
  const trainer = new TrainerInstance(region);
  const player = trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const boss = region.primaryBoss;
  if (!(boss instanceof Zeke) || !(player instanceof ZekePlayer)) throw new Error("Zeke's native actors were not mounted.");
  region.world.tickWorld(region.world.getReadyTimer - 1);
  const tickTo = (at: number) => {
    for (let tries = 0; boss.encounterTick < at; tries++) {
      if (tries > at + 10) throw new Error("Encounter did not advance.");
      region.world.tickWorld();
    }
  };
  return { region, trainer, player, boss, tickTo, dispose: () => trainer.dispose() };
}

describe("Zeke through the real SDK world", () => {
  test.each([{ x: 1, y: 1 }, { x: 1, y: 9 }, { x: 9, y: 1 }, { x: 9, y: 9 }])("the tank can run to arena corner ($x, $y)", (corner) => {
    const drill = practice({ invincible: true });
    try {
      drill.player.moveTo(corner.x, corner.y);
      drill.tickTo(5);
      expect(drill.player.location).toEqual(corner);
    } finally { drill.dispose(); }
  });

  test("all 81 floor tiles and all corner crossing footprints are walkable, with the border blocked", () => {
    const drill = practice();
    try {
      for (let x = 1; x <= 9; x++) for (let y = 1; y <= 9; y++) {
        expect(Pathing.canTileBePathedTo(drill.region, x, y, 1), `floor ${x},${y}`).toBe(true);
      }
      for (const x of [1, 7]) for (const y of [3, 9]) {
        expect(Pathing.canTileBePathedTo(drill.region, x, y, 3), `boss footprint ${x},${y}`).toBe(true);
      }
      for (let edge = 0; edge <= 10; edge++) for (const point of [{ x: edge, y: 0 }, { x: edge, y: 10 }, { x: 0, y: edge }, { x: 10, y: edge }]) {
        expect(Pathing.canTileBePathedTo(drill.region, point.x, point.y, 1)).toBe(false);
      }
    } finally { drill.dispose(); }
  });

  test("the encounter starts solo and restart replaces the tank without adding allies", () => {
    const drill = practice();
    try {
      expect(drill.region.players).toHaveLength(1);
      expect(drill.region.players[0]).toBe(drill.player);
      const reset = drill.region.reset(false);
      expect(reset.player).not.toBe(drill.player);
      expect(drill.region.players).toHaveLength(1);
      expect(drill.region.players[0]).toBe(reset.player);
    } finally { drill.dispose(); }
  });

  test("an attacking tank underneath gets a fresh cardinal escape attempt on each active tick", () => {
    const drill = practice({ invincible: true });
    try {
      for (let at = 1; at <= 5; at++) {
        const before = { ...drill.boss.location };
        drill.player.setLocation({ x: before.x + 1, y: before.y - 1 });
        drill.player.setAggro(drill.boss);
        drill.tickTo(at);
        expect(Math.abs(drill.boss.location.x - before.x) + Math.abs(drill.boss.location.y - before.y)).toBe(1);
        expect(drill.player.aggro).toBe(drill.boss);
      }
    } finally { drill.dispose(); }
  });

  test("a tank adjacent after the preceding completed turn receives melee", () => {
    const drill = practice({ invincible: true });
    try {
      Settings.set({ inputDelay: 0 });
      drill.tickTo(2);
      Trainer.clickController.playerWalkClick(4, 9);
      InputController.controller.onClientTick();
      drill.tickTo(5);
      expect(drill.boss.location).toEqual({ x: 4, y: 8 });
      expect(drill.player.location).toEqual({ x: 4, y: 9 });
      drill.tickTo(6);
      expect(drill.boss.rows.at(-1)?.events).toContainEqual({ kind: "auto", style: "melee", ordinal: 1, targets: ["tank"] });
    } finally { drill.dispose(); }
  });

  test("ordinary player movement on the attack tick remains too late to change that attack", () => {
    const drill = practice({ invincible: true });
    try {
      drill.tickTo(5);
      drill.boss.setLocation({ x: 4, y: 6 });
      drill.player.setLocation({ x: 7, y: 9 });
      drill.player.moveTo(7, 8);
      drill.tickTo(6);
      expect(drill.boss.rows.at(-1)?.events).toContainEqual({ kind: "auto", style: "magic", ordinal: 1, targets: ["tank"] });
      expect(besideBoss(tile(drill.boss.location.x, drill.boss.location.y), tile(drill.player.location.x, drill.player.location.y))).toBe(true);
    } finally { drill.dispose(); }
  });

  test("the boss can step into range and melee during the same attack turn", () => {
    const drill = practice({ invincible: true });
    try {
      Settings.set({ inputDelay: 0 });
      drill.tickTo(3);
      Trainer.clickController.playerWalkClick(4, 9);
      InputController.controller.onClientTick();
      drill.tickTo(5);
      expect(drill.boss.location).toEqual({ x: 4, y: 7 });
      expect(drill.player.location).toEqual({ x: 4, y: 9 });
      drill.tickTo(6);
      expect(drill.boss.location).toEqual({ x: 4, y: 8 });
      expect(drill.boss.rows.at(-1)?.events).toContainEqual({ kind: "auto", style: "melee", ordinal: 1, targets: ["tank"] });
    } finally { drill.dispose(); }
  });

  test("room magic damages every real participant including the tank and spends one normal auto", () => {
    const drill = practice({ invincible: true });
    for (const [index, location] of [{ x: 2, y: 7 }, { x: 8, y: 7 }, { x: 5, y: 8 }].entries()) {
      drill.region.addPlayer(new ZekePlayer(drill.region, location, `ally-${index + 1}`, () => true));
    }
    try {
      drill.tickTo(ZEKE_RULES.autos.openingFirst.value - 1);
      drill.player.setLocation({ x: drill.boss.location.x + 1, y: drill.boss.location.y - 1 });
      const health = drill.region.players.map((player) => player.currentStats.hitpoint);
      drill.tickTo(ZEKE_RULES.autos.openingFirst.value);
      const attacks = drill.boss.rows.flatMap((row) => row.events).filter((event) => event.kind === "auto");
      expect(attacks).toEqual([{ kind: "auto", style: "magic", ordinal: 1, targets: ["tank", "ally-1", "ally-2", "ally-3"] }]);
      expect(drill.region.players.every((player, index) => player.currentStats.hitpoint < health[index])).toBe(true);
      drill.tickTo(ZEKE_RULES.autos.openingStar.value);
      expect(drill.boss.rows.flatMap((row) => row.events).filter((event) => event.kind === "auto").map((event) => event.ordinal)).toEqual([1, 2]);
      expect(drill.boss.rows.flatMap((row) => row.events).filter((event) => event.kind === "star-tell")).toHaveLength(1);
    } finally { drill.dispose(); }
  });

  test("protect from magic changes actual incoming damage independently for each player", () => {
    const drill = practice({ invincible: true });
    drill.region.addPlayer(new ZekePlayer(drill.region, { x: 2, y: 7 }, "ally-1", () => true));
    try {
      drill.tickTo(ZEKE_RULES.autos.openingFirst.value - 1);
      drill.player.setLocation({ x: drill.boss.location.x + 1, y: drill.boss.location.y - 1 });
      drill.player.prayerController.findPrayerByName("Protect from Magic").toggle(drill.player);
      const health = drill.region.players.map((player) => player.currentStats.hitpoint);
      drill.tickTo(ZEKE_RULES.autos.openingFirst.value);
      expect(drill.player.currentStats.hitpoint).toBe(health[0]);
      expect(drill.region.players[1].currentStats.hitpoint).toBeLessThan(health[1]);
    } finally { drill.dispose(); }
  });

  test("native sword projectiles fill a hundred-percent charge without killing the sword", () => {
    const drill = practice({ invincible: true });
    try {
      drill.tickTo(ZEKE_RULES.autos.openingStar.value);
      const sword = [...drill.region.mobs, ...drill.region.newMobs].find((mob) => mob instanceof ZekeSword);
      if (!(sword instanceof ZekeSword)) throw new Error("The star did not spawn attackable swords.");
      sword.addProjectile(new Projectile(null, 54, drill.player, sword, "magic", { setDelay: 1 }));
      drill.tickTo(ZEKE_RULES.autos.openingStar.value + 1);
      expect(sword.chargeDamage).toBe(54);
      sword.addProjectile(new Projectile(null, 50, drill.player, sword, "magic", { setDelay: 1 }));
      drill.tickTo(ZEKE_RULES.autos.openingStar.value + 2);
      expect(sword.chargeDamage).toBe(100);
      expect(sword.currentStats.hitpoint).toBe(100);
      expect(sword.isDying()).toBe(false);
      expect(sword.canBeAttacked()).toBe(false);
    } finally { drill.dispose(); }
  });

  test("sword recovery starts rising four ticks before the next auto without releasing movement early", () => {
    const drill = practice({ invincible: true });
    try {
      const animations: { at: number; id: number }[] = [];
      const play = vi.spyOn(drill.boss, "playAnimation");
      play.mockImplementation(async (id) => { animations.push({ at: drill.boss.encounterTick, id }); });
      drill.tickTo(31);
      expect(drill.boss.encounter.phase).toEqual({ kind: "recovery", recovery: "weaken", started: 31, stunnedUntil: 41 });
      const anchor = { ...drill.boss.location };
      drill.tickTo(38);
      expect(drill.boss.idlePoseId).toBe(ZEKE_PRESENTATION.weaken);
      drill.tickTo(39);
      expect(animations.filter(({ id }) => id === ZEKE_PRESENTATION.weakenEnd)).toEqual([{ at: 39, id: ZEKE_PRESENTATION.weakenEnd }]);
      expect(drill.boss.idlePoseId).toBe(ZEKE_PRESENTATION.idle);
      drill.player.setLocation({ x: anchor.x + 1, y: anchor.y - 1 });
      drill.player.setAggro(drill.boss);
      drill.tickTo(40);
      expect(drill.boss.location).toEqual(anchor);
      drill.player.setLocation({ x: anchor.x + 1, y: anchor.y - 1 });
      drill.tickTo(41);
      expect(drill.boss.canMove()).toBe(true);
      drill.tickTo(53);
      expect(drill.boss.rows.filter((row) => row.tick > 31 && row.events.some((event) => event.kind === "auto")).map((row) => row.tick)).toEqual([43, 48]);
      expect(drill.boss.rows.filter((row) => row.tick > 31 && row.events.some((event) => event.kind === "star-tell")).map((row) => row.tick)).toEqual([53]);
      expect(animations.filter(({ id }) => id === ZEKE_PRESENTATION.weakenEnd)).toHaveLength(1);
      play.mockRestore();
    } finally { drill.dispose(); }
  });

  test("sword impact applies HP and native hitsplats on the weaken tick without advancing other projectiles", () => {
    const drill = practice({ invincible: true });
    try {
      drill.tickTo(30);
      const health = drill.boss.currentStats.hitpoint;
      const dueNow = new Projectile(null, 7, drill.player, drill.boss, "magic", { setDelay: 1 });
      const later = new Projectile(null, 11, drill.player, drill.boss, "magic", { setDelay: 3 });
      drill.boss.addProjectile(dueNow);
      drill.boss.addProjectile(later);
      drill.tickTo(31);
      expect(drill.boss.encounter.phase).toEqual({ kind: "recovery", recovery: "weaken", started: 31, stunnedUntil: 41 });
      const landed = drill.boss.hitsThisTick;
      expect(landed.map((hit) => hit.attackStyle)).toEqual(["magic", "typeless", "typeless"]);
      expect(landed[0].damage).toBe(7);
      expect(drill.boss.currentStats.hitpoint).toBe(health - landed.reduce((total, hit) => total + hit.damage, 0));
      expect(drill.boss.incomingProjectiles.filter((hit) => hit.attackStyle === "typeless" && hit.remainingDelay === 0)).toHaveLength(2);
      expect(later.remainingDelay).toBe(2);
      const afterImpact = drill.boss.currentStats.hitpoint;
      drill.tickTo(32);
      expect(drill.boss.currentStats.hitpoint).toBe(afterImpact);
      expect(drill.boss.hitsThisTick).toEqual([]);
      expect(later.remainingDelay).toBe(1);
      drill.tickTo(33);
      expect(drill.boss.currentStats.hitpoint).toBe(afterImpact - 11);
      expect(drill.boss.hitsThisTick).toEqual([{ damage: 11, attackStyle: "magic", from: drill.player }]);
    } finally { drill.dispose(); }
  });

  test("a new movement click in a sword flight window rolls before hazard damage and skips normal movement", () => {
    const drill = practice({ invincible: true });
    try {
      const flight = ZEKE_RULES.autos.openingStar.value + ZEKE_RULES.swords.chargeAfter.value;
      drill.tickTo(flight - 1);
      const sword = drill.boss.encounter.swords[0];
      const from = sword.axis === "x" ? { x: 5, y: sword.lane } : { x: sword.lane, y: 5 };
      const to = sword.axis === "x" ? { x: 5, y: sword.lane <= 5 ? sword.lane + 4 : sword.lane - 4 } : { x: sword.lane <= 5 ? sword.lane + 4 : sword.lane - 4, y: 5 };
      drill.player.setLocation(from);
      Trainer.clickController.playerWalkClick(to.x, to.y);
      InputController.controller.onClientTick();
      expect(drill.player.location).toEqual(from);
      expect(drill.boss.encounterTick).toBe(flight - 1);
      const visualBefore = { ...drill.player.perceivedLocation };
      drill.region.world.tickClient(0);
      drill.region.world.tickClient(0);
      expect(drill.player.perceivedLocation).toEqual(visualBefore);
      expect(drill.player.perceivedLocation).not.toEqual(to);
      Trainer.clickController.playerWalkClick(from.x, from.y);
      InputController.controller.onClientTick();
      expect(drill.player.location).toEqual(from);
      drill.tickTo(flight);
      expect(drill.player.lastDodge).toEqual({ tick: flight, from, to, steps: 4 });
      expect(drill.player.location).toEqual(to);
      for (let cycle = 0; cycle <= 15; cycle++) drill.region.world.tickClient(0);
      expect(drill.player.perceivedLocation).toEqual(to);
    } finally { drill.dispose(); }
  });

  test.each([{ steps: 1, cycles: 8 }, { steps: 2, cycles: 15 }])("a $steps-tile dodge begins its native $cycles-cycle travel on the resolution tick", ({ steps, cycles }) => {
    const drill = practice({ phase: "finale", invincible: true });
    try {
      drill.tickTo(16);
      const from = { x: 4, y: 5 };
      const to = { x: 4 + steps, y: 5 };
      drill.player.setLocation(from);
      Trainer.clickController.playerWalkClick(to.x, to.y);
      const stalledTimestamp = window.performance.now();
      drill.region.world.tickClient(0, stalledTimestamp);
      expect(drill.player.lastDodge?.steps).toBe(steps);
      expect(drill.player.perceivedLocation).toEqual(from);
      for (let cycle = 0; cycle < 30; cycle++) drill.region.world.tickClient(0, stalledTimestamp);
      expect(drill.player.perceivedLocation).toEqual(from);
      expect(drill.player.location).toEqual(from);
      drill.tickTo(17);
      expect(drill.player.location).toEqual(to);
      expect(drill.player.perceivedLocation).toEqual(from);
      drill.region.world.tickClient(0, stalledTimestamp);
      for (let cycle = 1; cycle < cycles; cycle++) drill.region.world.tickClient(0, stalledTimestamp);
      expect(drill.player.perceivedLocation.x).toBeGreaterThan(from.x);
      expect(drill.player.perceivedLocation.x).toBeLessThan(to.x);
      drill.region.world.tickClient(0, stalledTimestamp);
      expect(drill.player.perceivedLocation).toEqual(to);
      for (let cycle = 0; cycle < 30; cycle++) drill.region.world.tickClient(0, stalledTimestamp);
      expect(drill.player.perceivedLocation).toEqual(to);
    } finally { drill.dispose(); }
  });

  test("standing under the star takes damage on both explosion ticks, with a safe tick between", () => {
    const drill = practice({ invincible: true });
    try {
      drill.tickTo(16);
      drill.player.currentStats.hitpoint = drill.player.stats.hitpoint;
      drill.player.setLocation({ x: 5, y: 5 });
      drill.player.moveTo(5, 5);
      drill.tickTo(18);
      const before = drill.player.currentStats.hitpoint;
      drill.tickTo(19);
      const first = drill.player.currentStats.hitpoint;
      expect(before - first).toBeGreaterThanOrEqual(20);
      expect(before - first).toBeLessThanOrEqual(34);
      expect(drill.boss.rows.at(-1)?.events).toContainEqual({ kind: "star-hit", target: "tank" });
      drill.tickTo(20);
      expect(drill.player.currentStats.hitpoint).toBe(first);
      expect(drill.boss.rows.at(-1)?.events.some((event) => event.kind === "star-hit")).toBe(false);
      drill.tickTo(21);
      expect(first - drill.player.currentStats.hitpoint).toBeGreaterThanOrEqual(20);
      expect(first - drill.player.currentStats.hitpoint).toBeLessThanOrEqual(34);
      expect(drill.boss.rows.at(-1)?.events).toContainEqual({ kind: "star-hit", target: "tank" });
    } finally { drill.dispose(); }
  });

  test("ordinary walk clicks still wait for a world tick outside a dodge window", () => {
    const drill = practice({ invincible: true });
    try {
      Settings.set({ inputDelay: 0 });
      drill.tickTo(1);
      const from = { ...drill.player.location };
      Trainer.clickController.playerWalkClick(8, 8);
      InputController.controller.onClientTick();
      expect(drill.player.location).toEqual(from);
      expect(drill.player.lastDodge).toBeNull();
      drill.tickTo(2);
      expect(drill.player.location).not.toEqual(from);
      expect(drill.player.lastDodge).toBeNull();
    } finally { drill.dispose(); }
  });

  test("dodging preserves the aligned boss until sword impact while hazards use the landing tile", () => {
    const drill = practice({ invincible: true });
    try {
      drill.tickTo(29);
      drill.boss.setLocation({ x: 4, y: 6 });
      drill.player.setLocation({ x: 7, y: 5 });
      Trainer.clickController.playerWalkClick(9, 8);
      InputController.controller.onClientTick();
      expect(drill.player.location).toEqual({ x: 7, y: 5 });
      drill.tickTo(30);
      expect(drill.boss.location).toEqual({ x: 4, y: 6 });
      expect(drill.player.location).toEqual({ x: 9, y: 8 });
      expect(drill.boss.encounter.phase.kind).toBe("star");
      drill.tickTo(31);
      expect(drill.boss.location).toEqual({ x: 4, y: 6 });
      expect(drill.boss.rows.at(-1)?.events.filter((event) => event.kind === "sword-hit-boss")).toHaveLength(2);
      expect(drill.boss.rows.at(-1)?.events.filter((event) => event.kind === "sword-hit-player")).toEqual([]);
      expect(drill.boss.encounter.phase.kind).toBe("recovery");
    } finally { drill.dispose(); }
  });

  test.each([{ x: 4, hit: false }, { x: 6, hit: true }])("finale hazards evaluate a pending landing at x=$x", ({ x, hit }) => {
    const drill = practice({ phase: "finale", invincible: true });
    try {
      drill.tickTo(16);
      drill.player.setLocation({ x: 5, y: 5 });
      Trainer.clickController.playerWalkClick(x, 5);
      InputController.controller.onClientTick();
      expect(drill.player.location).toEqual({ x: 5, y: 5 });
      drill.tickTo(17);
      expect(drill.player.location).toEqual({ x, y: 5 });
      expect(drill.boss.rows.at(-1)?.events).toContainEqual({ kind: "star-burst" });
      expect(drill.boss.rows.at(-1)?.events.filter((event) => event.kind === "enrage-hit")).toEqual(hit ? [{ kind: "enrage-hit", target: "tank" }] : []);
    } finally { drill.dispose(); }
  });

  test("a missed sword volley holds the boss through impact before resuming follow", () => {
    const drill = practice({ invincible: true });
    try {
      drill.tickTo(29);
      drill.boss.setLocation({ x: 4, y: 5 });
      drill.player.setLocation({ x: 7, y: 5 });
      Trainer.clickController.playerWalkClick(9, 8);
      InputController.controller.onClientTick();
      drill.tickTo(30);
      expect(drill.boss.location).toEqual({ x: 4, y: 5 });
      expect(drill.boss.rows.at(-1)?.events.filter((event) => event.kind === "sword-hit-boss")).toEqual([]);
      drill.tickTo(31);
      expect(drill.boss.location).toEqual({ x: 4, y: 5 });
      drill.tickTo(32);
      expect(drill.boss.location).not.toEqual({ x: 4, y: 5 });
    } finally { drill.dispose(); }
  });

  test("finale drill cages the actual player at six ticks and reset restores native state", () => {
    const drill = practice({ phase: "finale", invincible: true });
    try {
      drill.tickTo(1 + ZEKE_RULES.enrage.cageAfter.value);
      expect(drill.boss.encounter.phase.kind).toBe("enrage");
      expect(drill.player.location).toEqual(ZEKE_RULES.enrage.playerSpawn.value);
      drill.player.moveTo(1, 1);
      drill.tickTo(12);
      expect(drill.player.location.x).toBeGreaterThanOrEqual(4);
      expect(drill.player.location.y).toBeGreaterThanOrEqual(4);
      expect(drill.player.location.x).toBeLessThanOrEqual(6);
      expect(drill.player.location.y).toBeLessThanOrEqual(6);
      const reset = drill.region.reset(false);
      expect(reset.player.currentStats.hitpoint).toBe(reset.player.stats.hitpoint);
      expect(drill.region.snapshot()?.tick).toBe(0);
      expect(drill.region.snapshot()?.phase.kind).toBe("opening");
      expect(drill.region.snapshot()?.boss.hp).toBe(Math.floor(ZEKE_RULES.boss.hitpoints.value * ZEKE_RULES.enrage.threshold.value));
    } finally { drill.dispose(); }
  });

  test("reset removes in-flight graphics and their old actors", () => {
    const drill = practice();
    try {
      drill.player.addProjectile(new Projectile(null, 20, drill.boss, drill.player, "magic", { setDelay: 4 }));
      expect(drill.region.projectileGraphics).toHaveLength(1);
      const oldPlayer = drill.player;
      const reset = drill.region.reset(false);
      expect(drill.region.projectileGraphics).toHaveLength(0);
      expect(reset.player).not.toBe(oldPlayer);
      expect(reset.player.incomingProjectiles).toHaveLength(0);
    } finally { drill.dispose(); }
  });
});
