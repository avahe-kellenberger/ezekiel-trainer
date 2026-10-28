import { ScytheOfVitur, Settings, TestNpc, TestRegion, TrainerInstance } from "osrs-sdk";
import { span, tick, tile } from "../../src/sim/brands";
import { HarmonisedNightmareStaff } from "../../src/content/zeke/HarmonisedNightmareStaff";
import { Zeke } from "../../src/content/zeke/Zeke";
import { ZekePlayer } from "../../src/content/zeke/ZekePlayer";
import { executeZekeRouteAction, validateZekeRouteActions } from "../../src/content/zeke/ZekeRouteActions";
import { ZekeRouteDemo } from "../../src/content/zeke/ZekeRouteDemo";
import { dressZekePlayer } from "../../src/content/zeke/loadout";

class ActionRegion extends TestRegion {
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

function drill() {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false, inputDelay: 0 });
  const region = new ActionRegion(12, 12);
  const trainer = new TrainerInstance(region, { readyTimer: 0 });
  const player = trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const boss = region.primaryBoss;
  if (!(boss instanceof Zeke)) throw new Error("Missing native boss");
  region.world.tickWorld(region.world.getReadyTimer - 1);
  return { region, trainer, player, boss };
}

it("equipment commands apply native combat interruption, retain cooldown, and require a carried weapon", () => {
  const { region, trainer, player, boss } = drill();
  try {
    const target = new TestNpc(region, { x: 5, y: 7 }, {});
    player.setAggro(target);
    player.attackDelay = 3;
    expect(executeZekeRouteAction({ kind: "equip", weapon: "harm" }, player, boss)).toEqual({ kind: "issued" });
    expect(player.equipment.weapon).toBeInstanceOf(HarmonisedNightmareStaff);
    expect(player.aggro).toBeNull();
    expect(player.attackDelay).toBe(3);
    expect(target.incomingProjectiles).toHaveLength(0);
    expect(executeZekeRouteAction({ kind: "equip", weapon: "scythe" }, player, boss)).toEqual({ kind: "issued" });
    expect(player.equipment.weapon).toBeInstanceOf(ScytheOfVitur);
    player.inventory.splice(0, player.inventory.length);
    expect(executeZekeRouteAction({ kind: "equip", weapon: "harm" }, player, boss)).toMatchObject({ kind: "failed" });
    expect(player.equipment.weapon).toBeInstanceOf(ScytheOfVitur);
  } finally { trainer.dispose(); }
});

it("sword targeting uses the live native sword and leaves spell execution to autocast", () => {
  const { region, trainer, player, boss } = drill();
  try {
    expect(executeZekeRouteAction({ kind: "attack-sword", index: 0 }, player, boss)).toMatchObject({ kind: "failed" });
    for (let at = 0; boss.encounterTick < 16; at++) {
      if (at > 32) throw new Error("Native encounter did not advance");
      region.world.tickWorld();
    }
    const sword = boss.swordTarget(0);
    if (!sword) throw new Error("Missing native sword");
    executeZekeRouteAction({ kind: "equip", weapon: "harm" }, player, boss);
    expect(executeZekeRouteAction({ kind: "attack-sword", index: 0 }, player, boss)).toEqual({ kind: "issued" });
    expect(player.aggro).toBe(sword);
    expect(sword.incomingProjectiles).toHaveLength(0);
    expect(player.manualSpellCastSelection).toBeFalsy();
    region.world.tickWorld();
    expect(player.attackDelay).toBe(4);
    expect(sword.incomingProjectiles.filter((projectile) => projectile.from === player)).toHaveLength(1);
    expect(executeZekeRouteAction({ kind: "attack-boss" }, player, boss)).toEqual({ kind: "issued" });
    expect(player.aggro).toBe(boss);
    expect(player.attackDelay).toBe(4);
  } finally { trainer.dispose(); }
});

it("a move command applies native pathing without issuing an attack", () => {
  const { trainer, player, boss } = drill();
  try {
    executeZekeRouteAction({ kind: "attack-boss" }, player, boss);
    expect(executeZekeRouteAction({ kind: "move", to: tile(2, 7) }, player, boss)).toEqual({ kind: "issued" });
    expect(player.aggro).toBeNull();
    expect(player.location).toEqual({ x: 4, y: 7 });
    expect(boss.incomingProjectiles).toHaveLength(0);
  } finally { trainer.dispose(); }
});

it("timeline validation rejects two inputs sharing an execution tick", () => {
  expect(() => validateZekeRouteActions([
    { at: span(1), action: { kind: "equip", weapon: "harm" } },
    { at: span(1), action: { kind: "attack-sword", index: 0 } },
  ])).toThrow(/unique/);
  expect(() => validateZekeRouteActions([
    { at: span(1), action: { kind: "equip", weapon: "harm" } },
    { at: span(2), action: { kind: "attack-sword", index: 0 } },
  ])).not.toThrow();
});

it("the issued ledger records actual actions and rejects a second command on the same tick", () => {
  const demo = new ZekeRouteDemo("cross-2-2", true);
  expect(demo.issuedActions()).toEqual([]);
  const action = { kind: "equip", weapon: "harm" } as const;
  demo.recordIssued(tick(1), action);
  expect(demo.issuedActions()).toEqual([{ tick: 1, cycle: 1, starOffset: null, action }]);
  expect(() => demo.recordIssued(tick(1), { kind: "attack-boss" })).toThrow(/one action/);
});

it("opening inputs dispatch once per tick and remain absent from the issued ledger until applied", () => {
  const demo = new ZekeRouteDemo("cross-2-2", true);
  expect(demo.beforeTick(tick(1))).toEqual({ kind: "attack-boss" });
  expect(demo.beforeTick(tick(1))).toBeNull();
  expect(demo.issuedActions()).toEqual([]);
  expect(demo.beforeTick(tick(14))).toEqual({ kind: "move", to: tile(4, 7) });
  expect(demo.beforeTick(tick(15))).toEqual({ kind: "equip", weapon: "harm" });
});
