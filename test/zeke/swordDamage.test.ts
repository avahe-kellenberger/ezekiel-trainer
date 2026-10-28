import { Projectile, Settings, TrainerInstance } from "osrs-sdk";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import { ZekePlayer } from "../../src/content/zeke/ZekePlayer";
import { Zeke } from "../../src/content/zeke/Zeke";
import { ZekeSword } from "../../src/content/zeke/hazards";

function flight(charge: number, options: { invincible?: boolean; hp?: number; prayer?: boolean } = {}) {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false });
  const region = new ZekeRegion({ seed: 1, invincible: true });
  const trainer = new TrainerInstance(region);
  const player = trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const boss = region.primaryBoss;
  if (!(player instanceof ZekePlayer) || !(boss instanceof Zeke)) throw new Error("Expected encounter actors.");
  const tickTo = (at: number) => { while (boss.encounterTick < at) region.world.tickWorld(); };
  region.world.tickWorld(region.world.getReadyTimer - 1);
  tickTo(16);
  const sword = [...region.mobs, ...region.newMobs].find((mob) => mob instanceof ZekeSword && mob.location.y === 6);
  if (!(sword instanceof ZekeSword)) throw new Error("Expected horizontal blade.");
  sword.addProjectile(new Projectile(null, charge, player, sword, "magic", { setDelay: 1 }));
  tickTo(29);
  expect(sword.chargeDamage).toBe(charge);
  region.invincible = options.invincible ?? false;
  player.currentStats.hitpoint = options.hp ?? 200;
  player.setLocation({ x: 7, y: 5 });
  if (options.prayer) player.prayerController.findPrayerByName("Protect from Magic").toggle(player);
  boss.setLocation({ x: 4, y: 6 });
  tickTo(31);
  return { region, player, boss, dispose: () => trainer.dispose() };
}

function damageSample(charge: number, prayer = false) {
  const drill = flight(charge, { prayer });
  try {
    return {
      playerHits: drill.player.hitsThisTick.map((hit) => hit.damage),
      bossHits: drill.boss.hitsThisTick.map((hit) => hit.damage),
      playerHp: drill.player.currentStats.hitpoint,
      bossHp: drill.boss.currentStats.hitpoint,
      dying: drill.player.dying,
      result: drill.region.result,
    };
  } finally { drill.dispose(); }
}

describe("swords retain player impact damage separately from boss charge damage", () => {
  test.each([1, 40, 80, 100])("%i charge adds to player impact damage and deals exactly that damage to the boss", (charge) => {
    const uncharged = damageSample(0);
    const charged = damageSample(charge, true);
    expect(uncharged.playerHits).toHaveLength(1);
    expect(uncharged.playerHits[0]).toBeGreaterThanOrEqual(54);
    expect(uncharged.playerHits[0]).toBeLessThanOrEqual(62);
    expect(uncharged.bossHits).toEqual([0]);
    expect(charged.playerHits).toEqual([uncharged.playerHits[0] + charge]);
    expect(charged.bossHits).toEqual([charge]);
    expect(charged.playerHp).toBe(uncharged.playerHp - charge);
    expect(charged.bossHp).toBe(uncharged.bossHp - charge);
    expect(charged.playerHp).toBeGreaterThan(0);
    expect(charged.dying).toBe(-1);
    expect(charged.result).toBeNull();
  });

  test("protection prayer does not reduce sword damage", () => {
    const unprotected = damageSample(40);
    const protectedPlayer = damageSample(40, true);
    expect(protectedPlayer.playerHp).toBe(unprotected.playerHp);
    expect(protectedPlayer.playerHits).toEqual(unprotected.playerHits);
  });

  test.each([0, 80])("%i charge swords exceeding remaining health retain native death presentation", (charge) => {
    const drill = flight(charge, { hp: 20, prayer: true });
    try {
      expect(drill.player.currentStats.hitpoint).toBe(0);
      expect(drill.player.hitsThisTick[0].damage).toBe(20);
      expect(drill.player.dying).toBe(4);
      expect(drill.region.result).toBeNull();
      drill.region.world.tickWorld(4);
      expect(drill.region.result).toEqual({ kind: "death", tick: 31, invincible: false });
    } finally { drill.dispose(); }
  });

  test("practice invincibility restores health after otherwise fatal sword damage", () => {
    const drill = flight(80, { hp: 20, invincible: true });
    try {
      expect(drill.player.currentStats.hitpoint).toBe(drill.player.stats.hitpoint);
      expect(drill.player.hitsThisTick[0].damage).toBe(20);
      expect(drill.player.dying).toBe(-1);
      expect(drill.region.result).toBeNull();
      drill.region.world.tickWorld();
      expect(drill.boss.encounterTick).toBe(32);
    } finally { drill.dispose(); }
  });
});
