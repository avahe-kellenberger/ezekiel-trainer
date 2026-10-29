import { Projectile, Settings, TrainerInstance, TwistedBow } from "osrs-sdk";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import type { ZekeConfig } from "../../src/content/zeke/ZekeRegion";
import { Zeke } from "../../src/content/zeke/Zeke";
import { ZekePlayer } from "../../src/content/zeke/ZekePlayer";
import { ZEKE_RULES } from "../../src/content/zeke/ZekeRules";
import type { EncounterState } from "../../src/content/zeke/mechanics";
import { seed } from "../../src/sim/brands";

function practice(config: ZekeConfig = {}) {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false });
  const region = new ZekeRegion({ skipCountdown: true, ...config });
  const trainer = new TrainerInstance(region);
  const loop = vi.spyOn(trainer.world, "startLoop").mockImplementation(() => {});
  trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const actors = () => {
    const boss = region.primaryBoss;
    const player = region.players[0];
    if (!(boss instanceof Zeke) || !(player instanceof ZekePlayer)) throw new Error("Native actors missing.");
    return { boss, player };
  };
  const tickTo = (at: number) => {
    const { boss } = actors();
    for (let count = 0; boss.encounterTick < at; count++) {
      if (count > at + 10) throw new Error("Encounter did not advance.");
      trainer.world.tickWorld();
    }
  };
  return { region, trainer, actors, tickTo, dispose: () => { trainer.dispose(); loop.mockRestore(); } };
}

test("changing the seed resets the native encounter deterministically without replacing its world", () => {
  const drill = practice({ seed: 1, invincible: true });
  const world = drill.trainer.world;
  let reseededWave: EncounterState | null = null;
  try {
    drill.tickTo(ZEKE_RULES.autos.openingStar.value);
    const originalBoss = drill.actors().boss;
    const originalWave = originalBoss.encounter;
    drill.region.configureRun({ ...drill.region.runOptions, seed: seed(0xdeadbeef) });
    expect(drill.actors().boss).toBe(originalBoss);
    expect(drill.actors().boss.encounter).toBe(originalWave);
    drill.trainer.reset();
    expect(drill.trainer.world).toBe(world);
    expect(drill.actors().boss.encounter.rng).toBe(0xdeadbeef);
    expect(drill.region.fightLog()).toEqual({ seed: 0xdeadbeef, rows: [] });
    drill.tickTo(ZEKE_RULES.autos.openingStar.value);
    reseededWave = drill.actors().boss.encounter;
    expect(reseededWave).not.toEqual(originalWave);
    drill.trainer.reset();
    drill.tickTo(ZEKE_RULES.autos.openingStar.value);
    expect(drill.actors().boss.encounter).toEqual(reseededWave);
  } finally { drill.dispose(); }
  const fresh = practice({ seed: 0xdeadbeef, invincible: true });
  try {
    fresh.tickTo(ZEKE_RULES.autos.openingStar.value);
    expect(fresh.actors().boss.encounter).toEqual(reseededWave);
  } finally { fresh.dispose(); }
});

test.each([false, true])("seed changes retain the selected scenario, attack mode and autoplay=%s", (autoplay) => {
  const drill = practice({ routeDemo: "cross-2-2", routeAutoplay: autoplay, routeAttackMode: "wind-surge", setup: "ranged", invincible: true });
  try {
    const previous = drill.actors();
    drill.tickTo(2);
    drill.region.configureRun({ ...drill.region.runOptions, seed: seed(42) });
    drill.trainer.reset();
    expect(drill.region.runOptions).toEqual({ seed: 42, setup: "ranged", phase: "full", invincible: true });
    expect(drill.region.routeDemoSnapshot()).toMatchObject({ kind: autoplay ? "playing" : "practice", scenario: { id: "cross-2-2" }, attackMode: "wind-surge", cycle: 1, issuedActions: [], combat: [], starOffset: null });
    expect(drill.actors().boss).not.toBe(previous.boss);
    expect(drill.actors().player).not.toBe(previous.player);
    if (!autoplay) expect(drill.actors().player.equipment.weapon).toBeInstanceOf(TwistedBow);
  } finally { drill.dispose(); }
});

test("reseed clears the previous result, actors, hazards and projectiles", () => {
  const drill = practice({ seed: 1 });
  try {
    drill.tickTo(ZEKE_RULES.autos.openingStar.value);
    const { boss, player } = drill.actors();
    const oldActors = [...drill.region.mobs, ...drill.region.newMobs];
    expect(oldActors.length).toBeGreaterThan(1);
    const shot = new Projectile(null, 1, boss, player, "typeless", { setDelay: 10 });
    player.addProjectile(shot);
    player.currentStats.hitpoint = 0;
    for (let count = 0; count < 20 && drill.region.result === null; count++) drill.trainer.world.tickWorld();
    expect(drill.region.result?.kind).toBe("death");
    drill.region.configureRun({ ...drill.region.runOptions, seed: seed(2) });
    drill.trainer.reset();
    expect(drill.region.result).toBeNull();
    expect(drill.region.projectiles).toEqual([]);
    expect(drill.region.projectileGraphics).toEqual([]);
    expect(drill.region.players).toEqual([drill.actors().player]);
    expect([...drill.region.mobs, ...drill.region.newMobs].some((mob) => oldActors.includes(mob))).toBe(false);
    expect(drill.actors().boss.encounter.stars).toEqual([]);
    expect(drill.actors().boss.encounter.swords).toEqual([]);
    expect(drill.actors().player.incomingProjectiles).toEqual([]);
    expect(drill.region.fightLog()).toEqual({ seed: 2, rows: [] });
  } finally { drill.dispose(); }
});

test("run settings apply on reset and finale exits the current scenario", () => {
  const drill = practice({ routeDemo: "cross-2-2", routeAutoplay: true });
  try {
    drill.region.configureRun({ seed: seed(9), setup: "ranged", phase: "finale", invincible: true });
    drill.trainer.reset();
    expect(drill.actors().player.equipment.weapon).toBeInstanceOf(TwistedBow);
    expect(drill.region.routeDemoSnapshot().kind).toBe("disabled");
    expect(drill.actors().boss.currentStats.hitpoint).toBe(Math.floor(drill.actors().boss.stats.hitpoint * ZEKE_RULES.enrage.threshold.value));
    expect(drill.region.invincible).toBe(true);
    drill.region.invincible = false;
    expect(drill.region.runOptions.invincible).toBe(false);
    drill.region.configureRun({ ...drill.region.runOptions, setup: "melee", phase: "full" });
    drill.trainer.reset();
    expect(drill.actors().player.equipment.weapon).not.toBeInstanceOf(TwistedBow);
    expect(drill.actors().boss.currentStats.hitpoint).toBe(drill.actors().boss.stats.hitpoint);
  } finally { drill.dispose(); }
});
