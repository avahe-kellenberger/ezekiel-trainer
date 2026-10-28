import { AttackStyle, AttackStylesController, Random, Settings, TestNpc, TestRegion, TrainerInstance, TwistedBow } from "osrs-sdk";
import type { Weapon } from "osrs-sdk";
import { HarmonisedNightmareStaff } from "../../src/content/zeke/HarmonisedNightmareStaff";
import { Zeke } from "../../src/content/zeke/Zeke";
import { CrimsonKisten, ElderMaul, ZekeScythe } from "../../src/content/zeke/ZekeGear";
import { ZekePlayer } from "../../src/content/zeke/ZekePlayer";
import { dressZekePlayer } from "../../src/content/zeke/loadout";
import { tick } from "../../src/sim/brands";
import type { EncounterPhase } from "../../src/content/zeke/mechanics";

class AccuracyRegion extends TestRegion {
  override initialiseRegion(): { player: ZekePlayer } {
    const player = new ZekePlayer(this, { x: 4, y: 7 }, "tank", () => true);
    dressZekePlayer(player, "melee");
    this.addPlayer(player);
    const boss = new Zeke(this, player, 1);
    this.addMob(boss);
    this.setBoss(boss);
    return { player };
  }
}

function practice() {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false });
  const region = new AccuracyRegion(12, 12);
  const trainer = new TrainerInstance(region);
  const player = trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const boss = region.primaryBoss;
  if (!(player instanceof ZekePlayer) || !(boss instanceof Zeke)) throw new Error("Expected native Zeke actors.");
  region.world.tickWorld(region.world.getReadyTimer - 1);
  const tickTo = (at: number) => {
    for (let attempts = 0; boss.encounterTick < at; attempts++) {
      if (attempts > at + 10) throw new Error("Native encounter did not advance.");
      region.world.tickWorld();
    }
  };
  tickTo(17);
  player.setLocation({ x: 4, y: 7 });
  boss.setLocation({ x: 4, y: 6 });
  boss.encounter = { ...boss.encounter, stars: [], swords: [], phase: { kind: "recovery", recovery: "weaken", started: tick(10), stunnedUntil: tick(20) } };
  const equip = (weapon: Weapon) => {
    player.equipment.weapon = weapon;
    player.equipmentChanged();
    return weapon;
  };
  const resolve = () => {
    boss.processIncomingAttacks();
    boss.processIncomingAttacks();
  };
  return { region, player, boss, equip, resolve, tickTo, dispose: () => trainer.dispose() };
}

describe("melee accuracy while the boss is downed", () => {
  test("all three native scythe hits ignore accuracy rolls while the boss is downed", () => {
    const drill = practice();
    const random = vi.spyOn(Random, "get").mockReturnValue(0.999999);
    try {
      const scythe = drill.equip(new ZekeScythe());
      const before = drill.boss.currentStats.hitpoint;
      scythe.attack(drill.player, drill.boss, {});
      const hits = drill.boss.incomingProjectiles.map((hit) => hit.damage);
      expect(hits).toHaveLength(3);
      expect(hits.every((damage) => damage > 0)).toBe(true);
      expect(hits[0]).toBeGreaterThan(hits[1]);
      expect(hits[1]).toBeGreaterThan(hits[2]);
      drill.resolve();
      expect(drill.boss.currentStats.hitpoint).toBe(before - hits.reduce((sum, damage) => sum + damage, 0));
      drill.player.setLocation({ x: 9, y: 9 });
      const ordinary = new TestNpc(drill.region, { x: 10, y: 9 }, {});
      scythe.attack(drill.player, ordinary, {});
      expect(ordinary.incomingProjectiles.map((hit) => hit.damage)).toEqual([0, 0, 0]);
    } finally { random.mockRestore(); drill.dispose(); }
  });

  test("guaranteed accuracy retains ordinary random damage with accurate zero rolls raised to one", () => {
    const drill = practice();
    const random = vi.spyOn(Random, "get").mockReturnValue(0.999999);
    try {
      const scythe = drill.equip(new ZekeScythe());
      scythe.attack(drill.player, drill.boss, {});
      const high = drill.boss.incomingProjectiles.splice(0).map((hit) => hit.damage);
      random.mockReturnValue(0.25);
      scythe.attack(drill.player, drill.boss, {});
      const low = drill.boss.incomingProjectiles.splice(0).map((hit) => hit.damage);
      expect(low).toHaveLength(3);
      low.forEach((damage, index) => {
        expect(damage).toBeGreaterThan(0);
        expect(damage).toBeLessThan(high[index]);
      });
      random.mockReturnValue(0);
      scythe.attack(drill.player, drill.boss, {});
      expect(drill.boss.incomingProjectiles.map((hit) => hit.damage)).toEqual([1, 1, 1]);
    } finally { random.mockRestore(); drill.dispose(); }
  });


  test("a zero damage roll on the third accurate scythe hit deals one", () => {
    const drill = practice();
    const random = vi.spyOn(Random, "get").mockReturnValueOnce(0.8).mockReturnValueOnce(0.6).mockReturnValue(0);
    try {
      const before = drill.boss.currentStats.hitpoint;
      drill.equip(new ZekeScythe()).attack(drill.player, drill.boss, {});
      const hits = drill.boss.incomingProjectiles.map((hit) => hit.damage);
      expect(hits).toHaveLength(3);
      expect(hits[0]).toBeGreaterThan(1);
      expect(hits[1]).toBeGreaterThan(1);
      expect(hits[2]).toBe(1);
      drill.resolve();
      expect(drill.boss.currentStats.hitpoint).toBe(before - hits.reduce((sum, damage) => sum + damage, 0));
    } finally { random.mockRestore(); drill.dispose(); }
  });

  test("ordinary accurate scythe zero rolls also deal one outside the downed phase", () => {
    const drill = practice();
    const random = vi.spyOn(Random, "get").mockReturnValue(0);
    try {
      drill.boss.encounter = { ...drill.boss.encounter, phase: { kind: "opening", started: tick(0) } };
      drill.equip(new ZekeScythe()).attack(drill.player, drill.boss, {});
      expect(drill.boss.incomingProjectiles.map((hit) => hit.damage)).toEqual([1, 1, 1]);
    } finally { random.mockRestore(); drill.dispose(); }
  });

  test.each([
    { name: "opening", phase: { kind: "opening", started: tick(0) } },
    { name: "heal recovery", phase: { kind: "recovery", recovery: "heal", started: tick(10), stunnedUntil: tick(20) } },
    { name: "miss recovery", phase: { kind: "recovery", recovery: "miss", started: tick(10), stunnedUntil: tick(20) } },
  ] satisfies readonly Readonly<{ name: string; phase: EncounterPhase }>[])("$name retains ordinary melee accuracy", ({ phase }) => {
    const drill = practice();
    const random = vi.spyOn(Random, "get").mockReturnValue(0.999999);
    try {
      drill.boss.encounter = { ...drill.boss.encounter, phase };
      drill.equip(new ZekeScythe()).attack(drill.player, drill.boss, {});
      expect(drill.boss.incomingProjectiles.map((hit) => hit.damage)).toEqual([0, 0, 0]);
    } finally { random.mockRestore(); drill.dispose(); }
  });

  test("the first standup tick restores normal accuracy for the rest of recovery", () => {
    const drill = practice();
    const random = vi.spyOn(Random, "get").mockReturnValue(0.999999);
    try {
      const scythe = drill.equip(new ZekeScythe());
      expect(drill.boss.encounterTick).toBe(17);
      scythe.attack(drill.player, drill.boss, {});
      expect(drill.boss.incomingProjectiles.every((hit) => hit.damage > 0)).toBe(true);
      drill.boss.incomingProjectiles = [];
      drill.tickTo(18);
      expect(drill.boss.encounter.phase).toMatchObject({ kind: "recovery", recovery: "weaken", stunnedUntil: 20 });
      scythe.attack(drill.player, drill.boss, {});
      expect(drill.boss.incomingProjectiles.map((hit) => hit.damage)).toEqual([0, 0, 0]);
      drill.boss.incomingProjectiles = [];
      drill.tickTo(19);
      scythe.attack(drill.player, drill.boss, {});
      expect(drill.boss.incomingProjectiles.map((hit) => hit.damage)).toEqual([0, 0, 0]);
      drill.boss.incomingProjectiles = [];
      drill.tickTo(20);
      scythe.attack(drill.player, drill.boss, {});
      expect(drill.boss.incomingProjectiles.map((hit) => hit.damage)).toEqual([0, 0, 0]);
    } finally { random.mockRestore(); drill.dispose(); }
  });

  test("ranged attacks and harm autocast can still miss a stunned boss", () => {
    const drill = practice();
    const random = vi.spyOn(Random, "get").mockReturnValue(0.999999);
    try {
      drill.equip(new TwistedBow()).attack(drill.player, drill.boss, {});
      expect(drill.boss.incomingProjectiles.map((hit) => hit.damage)).toEqual([0]);
      drill.boss.incomingProjectiles = [];
      const staff = drill.equip(new HarmonisedNightmareStaff());
      AttackStylesController.controller.setWeaponAttackStyle(staff, AttackStyle.AUTOCAST);
      staff.attack(drill.player, drill.boss, {});
      expect(drill.boss.incomingProjectiles.map((hit) => hit.damage)).toEqual([0]);
    } finally { random.mockRestore(); drill.dispose(); }
  });

  test.each([{ name: "maul", WeaponClass: ElderMaul }, { name: "kisten", WeaponClass: CrimsonKisten }])("a $name special retains its native hit effect with guaranteed melee accuracy", ({ WeaponClass }) => {
    const drill = practice();
    const random = vi.spyOn(Random, "get").mockReturnValue(0.999999);
    try {
      const weapon = drill.equip(new WeaponClass());
      const defence = drill.boss.currentStats.defence;
      const before = drill.boss.currentStats.hitpoint;
      weapon.specialAttack(drill.player, drill.boss, {});
      expect(drill.boss.incomingProjectiles).toHaveLength(1);
      const damage = drill.boss.incomingProjectiles[0].damage;
      expect(damage).toBeGreaterThan(0);
      drill.tickTo(21);
      expect(drill.boss.currentStats.hitpoint).toBe(before - damage);
      expect(drill.boss.currentStats.defence).toBe(weapon instanceof ElderMaul ? defence - Math.floor(defence * 0.35) : defence);
    } finally { random.mockRestore(); drill.dispose(); }
  });
});
