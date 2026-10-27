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
  tickTo(30);
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

describe("sword damage scales with wind charge", () => {
  test.each([1, 40, 80])("%i charge adds damage to both player and boss without guaranteeing death", (charge) => {
    const uncharged = damageSample(0);
    const charged = damageSample(charge, true);
    expect(uncharged.playerHits).toHaveLength(2);
    expect(uncharged.playerHits.every((damage) => damage >= 27 && damage <= 31)).toBe(true);
    expect(uncharged.bossHits).toHaveLength(2);
    expect(uncharged.bossHits.every((damage) => damage >= 12 && damage <= 15)).toBe(true);
    expect(charged.playerHits).toEqual([uncharged.playerHits[0] + charge, uncharged.playerHits[1]]);
    expect(charged.bossHits).toEqual([uncharged.bossHits[0] + charge, uncharged.bossHits[1]]);
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

  test("damage exceeding remaining health retains native death presentation", () => {
    const drill = flight(80, { hp: 20, prayer: true });
    try {
      expect(drill.player.currentStats.hitpoint).toBe(0);
      expect(drill.player.hitsThisTick[0].damage).toBe(20);
      expect(drill.player.dying).toBe(4);
      expect(drill.region.result).toBeNull();
      drill.region.world.tickWorld(4);
      expect(drill.region.result).toEqual({ kind: "death", tick: 30, invincible: false });
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
      expect(drill.boss.encounterTick).toBe(31);
    } finally { drill.dispose(); }
  });
});
