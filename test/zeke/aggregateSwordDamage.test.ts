import { Projectile, Settings, TestRegion, TrainerInstance } from "osrs-sdk";
import { Zeke } from "../../src/content/zeke/Zeke";
import { ZekePlayer } from "../../src/content/zeke/ZekePlayer";
import { dressZekePlayer } from "../../src/content/zeke/loadout";
import type { SwordPattern } from "../../src/content/zeke/mechanics";

class SwordImpactRegion extends TestRegion {
  constructor(private readonly pattern: SwordPattern) { super(12, 12); }

  override initialiseRegion(): { player: ZekePlayer } {
    const player = new ZekePlayer(this, { x: 4, y: 7 }, "tank", () => true);
    dressZekePlayer(player, "melee");
    this.addPlayer(player);
    const boss = new Zeke(this, player, 1, this.pattern);
    this.addMob(boss);
    this.setBoss(boss);
    return { player };
  }

  override postTick(): void {
    if (this.primaryBoss instanceof Zeke) this.primaryBoss.recordTick();
  }
}

function practice(charges: readonly number[], pattern: SwordPattern = { kind: "cross", row: 5, column: 5 }) {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false });
  const region = new SwordImpactRegion(pattern);
  const trainer = new TrainerInstance(region);
  const player = trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const boss = region.primaryBoss;
  if (!(boss instanceof Zeke) || !(player instanceof ZekePlayer)) throw new Error("Expected native sword impact actors.");
  const tickTo = (at: number) => {
    for (let attempts = 0; boss.encounterTick < at; attempts++) {
      if (attempts > at + 10) throw new Error("Native sword impacts did not advance.");
      region.world.tickWorld();
    }
  };
  region.world.tickWorld(region.world.getReadyTimer - 1);
  tickTo(16);
  charges.forEach((charge, index) => {
    const sword = boss.swordTarget(index);
    if (!sword) throw new Error("Expected a native sword target.");
    sword.addProjectile(new Projectile(null, charge, player, sword, "magic", { setDelay: 1 }));
  });
  tickTo(29);
  player.currentStats.hitpoint = 1000;
  player.setAggro(null);
  const align = (lane: number) => {
    boss.setLocation({ x: 4, y: lane + 1 });
    player.setLocation({ x: 5, y: lane });
    player.destinationLocation = { ...player.location };
  };
  return { region, player, boss, tickTo, align, dispose: () => trainer.dispose() };
}

describe("native simultaneous sword impact damage", () => {
  test.each([
    { charges: [80, 80, 80, 80], damage: 320, stunEnd: 41 },
    { charges: [80, 0, 0, 0], damage: 80, stunEnd: 41 },
    { charges: [0, 0, 0, 0], damage: 0, stunEnd: 41 },
    { charges: [100, 100, 100, 100], damage: 400, stunEnd: 57 },
  ])("four crossing swords charged $charges combine player impacts while dealing exactly $damage to the boss", ({ charges, damage, stunEnd }) => {
    const drill = practice(charges);
    try {
      const ally = new ZekePlayer(drill.region, { x: 5, y: 5 }, "ally", () => true);
      drill.region.addPlayer(ally);
      ally.currentStats.hitpoint = 1000;
      ally.destinationLocation = { ...ally.location };
      drill.player.prayerController.findPrayerByName("Protect from Magic").toggle(drill.player);
      drill.align(5);
      drill.tickTo(30);
      drill.align(5);
      const health = drill.boss.currentStats.hitpoint;
      drill.tickTo(31);
      expect(drill.boss.hitsThisTick.map((hit) => hit.damage)).toEqual([damage]);
      expect(drill.boss.currentStats.hitpoint).toBe(health - damage);
      for (const victim of [drill.player, ally]) {
        expect(victim.hitsThisTick).toHaveLength(1);
        const impact = victim.hitsThisTick[0].damage;
        expect(impact).toBeGreaterThanOrEqual(damage + 4 * 27);
        expect(impact).toBeLessThanOrEqual(damage + 4 * 31);
        expect(victim.currentStats.hitpoint).toBe(1000 - impact);
      }
      const impacts = drill.boss.rows.at(-1)?.events ?? [];
      expect(impacts.filter((event) => event.kind === "sword-hit-boss")).toHaveLength(4);
      expect(impacts.filter((event) => event.kind === "sword-hit-player" && event.target === "tank")).toHaveLength(4);
      expect(impacts.filter((event) => event.kind === "sword-hit-player" && event.target === "ally")).toHaveLength(4);
      expect(drill.boss.encounter.phase).toMatchObject({ kind: "recovery", recovery: "weaken", stunnedUntil: stunEnd });
      drill.tickTo(32);
      expect(drill.boss.hitsThisTick).toEqual([]);
      expect(drill.player.hitsThisTick).toEqual([]);
      expect(ally.hitsThisTick).toEqual([]);
    } finally { drill.dispose(); }
  });

  test("each player receives only the sword damage that crossed their own tile", () => {
    const drill = practice([80, 80, 80, 80]);
    try {
      const ally = new ZekePlayer(drill.region, { x: 8, y: 5 }, "ally", () => true);
      drill.region.addPlayer(ally);
      ally.currentStats.hitpoint = 1000;
      ally.destinationLocation = { ...ally.location };
      drill.tickTo(30);
      drill.align(5);
      drill.tickTo(31);
      expect(drill.player.hitsThisTick).toHaveLength(1);
      expect(ally.hitsThisTick).toHaveLength(1);
      const tankDamage = drill.player.hitsThisTick[0].damage;
      const allyDamage = ally.hitsThisTick[0].damage;
      expect(tankDamage).toBeGreaterThanOrEqual(320 + 4 * 27);
      expect(tankDamage).toBeLessThanOrEqual(320 + 4 * 31);
      expect(allyDamage).toBeGreaterThanOrEqual(160 + 2 * 27);
      expect(allyDamage).toBeLessThanOrEqual(160 + 2 * 31);
      expect(drill.player.currentStats.hitpoint).toBe(1000 - tankDamage);
      expect(ally.currentStats.hitpoint).toBe(1000 - allyDamage);
      expect(drill.boss.rows.at(-1)?.events.filter((event) => event.kind === "sword-hit-player" && event.target === "ally")).toHaveLength(2);
    } finally { drill.dispose(); }
  });

  test("staggered sword impacts remain separate on their own ticks", () => {
    const drill = practice([80, 80, 80], { kind: "parallel", axis: "x", direction: 1 });
    try {
      const health = drill.boss.currentStats.hitpoint;
      for (const [index, lane] of [2, 5, 8].entries()) {
        const playerHealth = drill.player.currentStats.hitpoint;
        drill.align(lane);
        drill.tickTo(31 + index);
        expect(drill.boss.hitsThisTick.map((hit) => hit.damage)).toEqual([80]);
        expect(drill.player.hitsThisTick).toHaveLength(1);
        const impact = drill.player.hitsThisTick[0].damage;
        expect(impact).toBeGreaterThanOrEqual(107);
        expect(impact).toBeLessThanOrEqual(111);
        expect(drill.boss.currentStats.hitpoint).toBe(health - (index + 1) * 80);
        expect(drill.player.currentStats.hitpoint).toBe(playerHealth - impact);
      }
    } finally { drill.dispose(); }
  });
});
