import { AttackStyle, AttackStylesController, Random, Settings, TestRegion, TrainerInstance } from "osrs-sdk";
import { HarmonisedNightmareStaff } from "../../src/content/zeke/HarmonisedNightmareStaff";
import { Zeke } from "../../src/content/zeke/Zeke";
import { ZekeScythe } from "../../src/content/zeke/ZekeGear";
import { ZekePlayer } from "../../src/content/zeke/ZekePlayer";
import { dressZekePlayer } from "../../src/content/zeke/loadout";
import { ZEKE_PRESENTATION } from "../../src/content/zeke/assets";

class ChargedStunRegion extends TestRegion {
  override initialiseRegion(): { player: ZekePlayer } {
    const player = new ZekePlayer(this, { x: 4, y: 7 }, "tank", () => true);
    dressZekePlayer(player, "melee");
    this.addPlayer(player);
    const boss = new Zeke(this, player, 1, { kind: "cross", row: 5, column: 2 });
    this.addMob(boss);
    this.setBoss(boss);
    return { player };
  }

  override postTick(): void {
    if (this.primaryBoss instanceof Zeke) this.primaryBoss.recordTick();
  }
}

function practice(casts: 1 | 2, swordTargets: 1 | 2) {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false });
  const region = new ChargedStunRegion(12, 12);
  const trainer = new TrainerInstance(region);
  const player = trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const boss = region.primaryBoss;
  if (!(player instanceof ZekePlayer) || !(boss instanceof Zeke)) throw new Error("Expected native Zeke actors.");
  const starts: { tick: number; id: number }[] = [];
  const playAnimation = boss.playAnimation.bind(boss);
  vi.spyOn(boss, "playAnimation").mockImplementation((id, blend) => {
    starts.push({ tick: boss.encounterTick, id });
    return playAnimation(id, blend);
  });
  const tickTo = (at: number) => {
    for (let attempts = 0; boss.encounterTick < at; attempts++) {
      if (attempts > at + 10) throw new Error("Native charged-stun encounter did not advance.");
      region.world.tickWorld();
    }
  };
  const dispose = () => { vi.restoreAllMocks(); trainer.dispose(); };
  try {
    region.world.tickWorld(region.world.getReadyTimer - 1);
    tickTo(16);
    const blade = boss.swordTarget(0);
    if (!blade) throw new Error("Expected a native horizontal blade.");
    expect(boss.encounter.swords[0]).toMatchObject({ axis: "x", lane: 5 });
    const staff = player.inventory.find((item) => item instanceof HarmonisedNightmareStaff);
    if (!(staff instanceof HarmonisedNightmareStaff)) throw new Error("Expected harm staff switch.");
    staff.inventoryLeftClick(player);
    AttackStylesController.controller.setWeaponAttackStyle(staff, AttackStyle.AUTOCAST);
    for (let target = 0; target < swordTargets; target++) {
      const sword = boss.swordTarget(target);
      if (!sword) throw new Error("Expected an opposite horizontal blade.");
      if (target === 1) {
        player.setLocation({ x: 9, y: 5 });
        player.setAggro(null);
        player.destinationLocation = { ...player.location };
      }
      for (let cast = 0; cast < casts; cast++) {
        tickTo(17 + (target * casts + cast) * 4);
        expect(staff.attack(player, sword, {})).toBe(true);
      }
    }
    tickTo(29);
    expect(blade.chargeDamage).toBe(casts === 1 ? 80 : 100);
    player.setLocation({ x: 4, y: 7 });
    player.setAggro(null);
    player.destinationLocation = { ...player.location };
    boss.setLocation({ x: 4, y: 6 });
    tickTo(31);
    expect(boss.rows.at(-1)?.events).toContainEqual({ kind: "sword-hit-boss", swordId: boss.encounter.swords[0].id, charged: casts === 2, chargeDamage: casts === 1 ? 80 : 100 });
    if (swordTargets === 2) expect(boss.rows.at(-1)?.events.filter((event) => event.kind === "sword-hit-boss" && event.charged)).toHaveLength(2);
    expect(boss.encounter.phase).toMatchObject({ kind: "recovery", recovery: "weaken", started: 31 });
    return { region, player, boss, starts, tickTo, dispose, impact: 31 };
  } catch (error) { dispose(); throw error; }
}

describe("native sword charge controls the full recovery clock", () => {
  test.each([
    { casts: 1, charge: 80, swordTargets: 1, duration: 10 },
    { casts: 2, charge: 100, swordTargets: 1, duration: 14 },
    { casts: 2, charge: 100, swordTargets: 2, duration: 18 },
  ] satisfies readonly { casts: 1 | 2; charge: number; swordTargets: 1 | 2; duration: number }[])("$swordTargets sword targets at $charge percent charge produce a $duration tick recovery", ({ casts, swordTargets, duration }) => {
    const drill = practice(casts, swordTargets);
    const random = vi.spyOn(Random, "get").mockReturnValue(0.999999);
    try {
      const end = drill.impact + duration;
      expect.soft(drill.boss.encounter.phase).toMatchObject({ stunnedUntil: end });
      drill.player.setLocation({ ...drill.boss.location });
      drill.player.setAggro(null);
      drill.player.destinationLocation = { ...drill.player.location };
      const held = { ...drill.boss.location };
      drill.tickTo(end - 3);
      expect.soft(drill.boss.idlePoseId).toBe(ZEKE_PRESENTATION.weaken);
      const scythe = new ZekeScythe();
      drill.player.equipment.weapon = scythe;
      drill.player.equipmentChanged();
      scythe.attack(drill.player, drill.boss, {});
      expect.soft(drill.boss.incomingProjectiles.map((hit) => hit.damage)).toHaveLength(3);
      expect.soft(drill.boss.incomingProjectiles.every((hit) => hit.damage > 0)).toBe(true);
      drill.boss.incomingProjectiles = [];
      drill.tickTo(end - 2);
      expect.soft(drill.starts.filter((start) => start.id === ZEKE_PRESENTATION.weakenEnd)).toEqual([{ tick: end - 2, id: ZEKE_PRESENTATION.weakenEnd }]);
      scythe.attack(drill.player, drill.boss, {});
      expect.soft(drill.boss.incomingProjectiles.map((hit) => hit.damage)).toEqual([0, 0, 0]);
      drill.boss.incomingProjectiles = [];
      drill.tickTo(end - 1);
      expect.soft(drill.boss.location).toEqual(held);
      expect.soft(drill.boss.rows.filter((row) => row.tick > drill.impact && row.tick < end).every((row) => row.boss.x === held.x && row.boss.y === held.y)).toBe(true);
      scythe.attack(drill.player, drill.boss, {});
      expect.soft(drill.boss.incomingProjectiles.map((hit) => hit.damage)).toEqual([0, 0, 0]);
      drill.boss.incomingProjectiles = [];
      drill.tickTo(end);
      expect.soft(Math.abs(drill.boss.location.x - held.x) + Math.abs(drill.boss.location.y - held.y)).toBe(1);
      scythe.attack(drill.player, drill.boss, {});
      expect.soft(drill.boss.incomingProjectiles.map((hit) => hit.damage)).toEqual([0, 0, 0]);
      drill.boss.incomingProjectiles = [];
      drill.tickTo(end + 12);
      const autos = drill.boss.rows.filter((row) => row.tick > drill.impact && row.tick <= end + 12 && row.events.some((event) => event.kind === "auto")).map((row) => row.tick);
      expect.soft(autos).toEqual([end + 2, end + 7]);
      const specials = drill.boss.rows.filter((row) => row.tick > drill.impact && row.tick <= end + 12 && row.events.some((event) => event.kind === "star-tell")).map((row) => row.tick);
      expect.soft(specials).toEqual([end + 12]);
    } finally { random.mockRestore(); drill.dispose(); }
  });
});
