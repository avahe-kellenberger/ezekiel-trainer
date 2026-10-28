import { AncientStaff, AncestralRobebottom, AncestralRobetop, AttackStyle, AttackStylesController, InputController, InventoryControls, OccultNecklace, Random, Settings, SoundCache, Trainer, TrainerInstance, cacheSound } from "osrs-sdk";
import type { Player } from "osrs-sdk";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import { ZekeSword } from "../../src/content/zeke/hazards";
import { WindSurge } from "../../src/content/zeke/WindSurge";
import { HarmonisedNightmareStaff } from "../../src/content/zeke/HarmonisedNightmareStaff";
import { WindSurgeControls } from "../../src/content/zeke/WindSurgeControls";
import { ZEKE_RULES } from "../../src/content/zeke/ZekeRules";
import { Zeke } from "../../src/content/zeke/Zeke";

function equipStaff(player: Player): void {
  const index = player.inventory.findIndex((item) => item instanceof HarmonisedNightmareStaff);
  expect(index).toBeGreaterThanOrEqual(0);
  const inventory = new InventoryControls();
  inventory.onWorldTick();
  const x = (36 + index % 4 * 43) * Settings.controlPanelScale;
  const y = (36 + Math.floor(index / 4) * 35) * Settings.controlPanelScale;
  inventory.panelClickDown(x, y);
  inventory.panelClickUp(x, y);
}

it.each([{ x: 1, landing: 31, accepted: true }, { x: 2, landing: 32, accepted: false }])("native harm projectiles landing on $landing respect the inclusive impact deadline", ({ x, landing, accepted }) => {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false, inputDelay: 0 });
  const region = new ZekeRegion({ seed: 1, invincible: true });
  const trainer = new TrainerInstance(region);
  const player = trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const boss = region.primaryBoss;
  if (!(boss instanceof Zeke)) throw new Error("No native boss spawned.");
  const random = vi.spyOn(Random, "get").mockReturnValue(0.999999);
  const tickTo = (at: number) => { while (boss.encounterTick < at) region.world.tickWorld(); };
  try {
    region.world.tickWorld(region.world.getReadyTimer - 1);
    equipStaff(player);
    tickTo(28);
    const sword = boss.swordTarget(0);
    if (!sword) throw new Error("No native first sword spawned.");
    expect(boss.swordTarget(-1)).toBeNull();
    expect(boss.swordTarget(4)).toBeNull();
    player.setLocation({ x, y: 5 });
    InputController.controller.queueAction(() => Trainer.clickController.playerAttackClick(sword));
    tickTo(29);
    const projectile = sword.incomingProjectiles.find((hit) => hit.from === player);
    if (!projectile) throw new Error("Harm staff did not cast.");
    expect(player.attackDelay).toBe(4);
    expect(projectile.totalDelay).toBe(landing - 29);
    expect(sword.chargeDamage).toBe(0);
    tickTo(30);
    expect(sword.canBeAttacked()).toBe(false);
    expect(boss.encounter.phase.kind).toBe("star");
    boss.setLocation({ x: 4, y: 6 });
    tickTo(31);
    const hit = boss.rows.at(-1)?.events.find((event) => event.kind === "sword-hit-boss" && event.swordId === boss.encounter.swords[0].id);
    expect(hit).toMatchObject({ chargeDamage: accepted ? 80 : 0 });
    expect(boss.encounter.phase).toMatchObject({ kind: "recovery", started: 31 });
    tickTo(landing);
    expect(sword.hitsThisTick).toContainEqual({ damage: projectile.damage, attackStyle: "magic", from: player });
    expect(projectile.damage).toBe(80);
    expect(sword.chargeDamage).toBe(accepted ? 80 : 0);
    tickTo(33);
    expect(boss.rows.flatMap((row) => row.events).filter((event) => event.kind === "sword-hit-boss")).toHaveLength(2);
  } finally { random.mockRestore(); trainer.dispose(); }
});

it("a normal sword click with the harmonised staff autocasts single-target Wind Surge every four ticks", () => {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false, inputDelay: 0 });
  const region = new ZekeRegion({ seed: 1, invincible: true });
  const trainer = new TrainerInstance(region);
  const player = trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const random = vi.spyOn(Random, "get").mockReturnValue(0.999999);
  const sounds = vi.spyOn(SoundCache, "play").mockImplementation(() => undefined);
  Settings.set({ playsAudio: true });
  const animations = vi.spyOn(player, "playAnimation");
  try {
    region.world.tickWorld(region.world.getReadyTimer - 1);
    equipStaff(player);
    for (let tick = 0; tick < ZEKE_RULES.autos.openingStar.value; tick++) region.world.tickWorld();
    expect(player.equipment.weapon).toBeInstanceOf(HarmonisedNightmareStaff);
    const swords = [...region.mobs, ...region.newMobs].filter((mob) => mob instanceof ZekeSword);
    const sword = swords[0];
    if (!(sword instanceof ZekeSword)) throw new Error("No native sword spawned");
    player.setLocation({ x: 5, y: 5 });
    expect(player.manualSpellCastSelection).toBeFalsy();
    InputController.controller.queueAction(() => Trainer.clickController.playerAttackClick(sword));
    region.world.tickWorld();
    expect(animations).toHaveBeenCalledWith(7855, expect.any(Boolean));
    expect(player.attackDelay).toBe(4);
    const incoming = sword.incomingProjectiles.filter((projectile) => projectile.from === player);
    expect(incoming).toHaveLength(1);
    expect(incoming[0]?.options.visuals.spotAnim).toEqual({ id: 1456 });
    expect(swords.filter((other) => other !== sword).flatMap((other) => other.incomingProjectiles.filter((projectile) => projectile.from === player))).toEqual([]);
    const firstCastCount = animations.mock.calls.filter(([id]) => id === 7855).length;
    for (let tick = 0; tick < 3; tick++) region.world.tickWorld();
    expect(animations.mock.calls.filter(([id]) => id === 7855)).toHaveLength(firstCastCount);
    expect(sounds.mock.calls.filter(([sound]) => sound.src === cacheSound(4028))).toHaveLength(1);
    region.world.tickWorld();
    expect(animations.mock.calls.filter(([id]) => id === 7855)).toHaveLength(firstCastCount + 1);
    expect(player.attackDelay).toBe(4);
    expect(sword.chargeDamage).toBe(80);
    for (const other of swords.filter((other) => other !== sword)) expect(other.chargeDamage).toBe(0);
    const played = sounds.mock.calls.map(([sound]) => sound.src);
    expect(played).not.toContain(cacheSound(106));
    expect(played).not.toContain(cacheSound(102));
    expect(played.filter((src) => src === cacheSound(4028))).toHaveLength(2);
    expect(played.filter((src) => src === cacheSound(4027))).toHaveLength(1);
    region.world.tickWorld(4);
    expect(sword.chargeDamage).toBe(100);
    expect(sword.canBeAttacked()).toBe(false);
    expect(sword.isDying()).toBe(false);
  } finally {
    Settings.set({ playsAudio: false });
    random.mockRestore(); sounds.mockRestore(); animations.mockRestore(); trainer.dispose();
  }
});

it.each([
  { gear: "melee", roll: 0 }, { gear: "melee", roll: 0.999999 },
  { gear: "magic", roll: 0 }, { gear: "magic", roll: 0.999999 },
])("Wind Surge adds eighty percent charge with $gear gear and damage roll $roll", ({ gear, roll }) => {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false, inputDelay: 0 });
  const region = new ZekeRegion({ seed: 1, invincible: true });
  const trainer = new TrainerInstance(region);
  const player = trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const random = vi.spyOn(Random, "get").mockReturnValue(roll);
  try {
    region.world.tickWorld(region.world.getReadyTimer - 1);
    for (let tick = 0; tick < ZEKE_RULES.autos.openingStar.value; tick++) region.world.tickWorld();
    const sword = [...region.mobs, ...region.newMobs].find((mob) => mob instanceof ZekeSword);
    if (!(sword instanceof ZekeSword)) throw new Error("No native sword spawned");
    if (gear === "magic") {
      const inventory = new InventoryControls();
      inventory.onWorldTick();
      const switches = player.inventory.filter((item) => item instanceof AncientStaff || item instanceof AncestralRobetop || item instanceof AncestralRobebottom || item instanceof OccultNecklace);
      expect(switches).toHaveLength(4);
      for (const item of switches) {
        const index = player.inventory.indexOf(item);
        const x = (36 + index % 4 * 43) * Settings.controlPanelScale;
        const y = (36 + Math.floor(index / 4) * 35) * Settings.controlPanelScale;
        inventory.panelClickDown(x, y);
        inventory.panelClickUp(x, y);
      }
      region.world.tickWorld();
      expect(player.equipment.weapon).toBeInstanceOf(AncientStaff);
      expect(player.equipment.chest).toBeInstanceOf(AncestralRobetop);
      expect(player.equipment.legs).toBeInstanceOf(AncestralRobebottom);
      expect(player.equipment.necklace).toBeInstanceOf(OccultNecklace);
    }
    player.setLocation({ x: 5, y: 5 });
    new WindSurgeControls().panelClickDown(80 * Settings.controlPanelScale, 60 * Settings.controlPanelScale);
    expect(player.manualSpellCastSelection).toBeInstanceOf(WindSurge);
    InputController.controller.queueAction(() => Trainer.clickController.playerAttackClick(sword));
    region.world.tickWorld();
    expect(player.manualSpellCastSelection).toBeNull();
    expect(player.attackDelay).toBe(5);
    for (let tick = 0; tick < 5; tick++) region.world.tickWorld();
    expect(sword.chargeDamage).toBe(80);
    expect(sword.isDying()).toBe(false);
  } finally {
    random.mockRestore();
    trainer.dispose();
  }
});

it("explains insufficient Magic on the spell row and allows casting once restored", () => {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false });
  const trainer = new TrainerInstance(new ZekeRegion({ seed: 1, invincible: true }));
  const player = trainer.mount(document.createElement("canvas"), document.createElement("div"));
  try {
    const control = new WindSurgeControls();
    const x = 80 * Settings.controlPanelScale;
    const y = 60 * Settings.controlPanelScale;
    player.currentStats.magic = 75;
    control.panelClickDown(x, y);
    expect(player.manualSpellCastSelection).toBeFalsy();
    expect(control.hoverAction(x, y)?.map((part) => part.text).join("")).toMatch(/81.*75/);
    player.currentStats.magic = 81;
    control.panelClickDown(x, y);
    expect(player.manualSpellCastSelection).toBeInstanceOf(WindSurge);
    expect(control.hoverAction(x, y)?.map((part) => part.text).join("")).toBe("Cast Wind Surge");
  } finally { trainer.dispose(); }
});

it.each(["manual", "staff"])("Wind Surge through %s casting keeps normal accuracy against the boss", (casting) => {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false, inputDelay: 0 });
  const region = new ZekeRegion({ seed: 1, invincible: true });
  const trainer = new TrainerInstance(region);
  const player = trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const random = vi.spyOn(Random, "get").mockReturnValue(0.999999);
  const sounds = vi.spyOn(SoundCache, "play").mockImplementation(() => undefined);
  Settings.set({ playsAudio: true });
  try {
    region.world.tickWorld(region.world.getReadyTimer - 1);
    if (casting === "staff") {
      equipStaff(player);
      region.world.tickWorld();
    }
    const boss = region.primaryBoss;
    if (!boss) throw new Error("No native boss spawned");
    const health = boss.currentStats.hitpoint;
    if (casting === "manual") {
      new WindSurgeControls().panelClickDown(80 * Settings.controlPanelScale, 60 * Settings.controlPanelScale);
      expect(player.manualSpellCastSelection).toBeInstanceOf(WindSurge);
    }
    InputController.controller.queueAction(() => Trainer.clickController.playerAttackClick(boss));
    const hits: number[] = [];
    for (let tick = 0; tick < 5; tick++) {
      region.world.tickWorld();
      hits.push(...boss.hitsThisTick.map((hit) => hit.damage));
    }
    expect(player.manualSpellCastSelection).toBeFalsy();
    expect(hits).toEqual([0]);
    expect(boss.currentStats.hitpoint).toBe(health);
    expect(sounds.mock.calls.map(([sound]) => sound.src)).toContain(cacheSound(227));
  } finally { Settings.set({ playsAudio: false }); sounds.mockRestore(); random.mockRestore(); trainer.dispose(); }
});

it("staff autocasting waits for 81 Magic before firing or consuming an attack", () => {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false, inputDelay: 0 });
  const region = new ZekeRegion({ seed: 1, invincible: true });
  const trainer = new TrainerInstance(region);
  const player = trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const animations = vi.spyOn(player, "playAnimation");
  try {
    region.world.tickWorld(region.world.getReadyTimer - 1);
    equipStaff(player);
    region.world.tickWorld();
    const boss = region.primaryBoss;
    if (!boss) throw new Error("No native boss spawned");
    player.currentStats.magic = 80;
    InputController.controller.queueAction(() => Trainer.clickController.playerAttackClick(boss));
    region.world.tickWorld();
    expect(boss.incomingProjectiles.filter((projectile) => projectile.from === player)).toEqual([]);
    expect(player.attackDelay).toBeLessThanOrEqual(0);
    expect(animations).not.toHaveBeenCalledWith(7855, expect.any(Boolean));
    player.currentStats.magic = 81;
    region.world.tickWorld();
    expect(boss.incomingProjectiles.filter((projectile) => projectile.from === player)).toHaveLength(1);
    expect(player.attackDelay).toBe(4);
    expect(animations).toHaveBeenCalledWith(7855, expect.any(Boolean));
  } finally { animations.mockRestore(); trainer.dispose(); }
});

it.each([AttackStyle.ACCURATE, AttackStyle.AGGRESSIVECRUSH, AttackStyle.DEFENSIVE])("staff %s attacks retain native melee behavior", (style) => {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false, inputDelay: 0 });
  const region = new ZekeRegion({ seed: 1, invincible: true });
  const trainer = new TrainerInstance(region);
  const player = trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const animations = vi.spyOn(player, "playAnimation");
  try {
    region.world.tickWorld(region.world.getReadyTimer - 1);
    equipStaff(player);
    region.world.tickWorld();
    const boss = region.primaryBoss;
    const staff = player.equipment.weapon;
    if (!boss || !staff) throw new Error("Native encounter not mounted");
    AttackStylesController.controller.setWeaponAttackStyle(staff, style);
    player.setLocation({ x: boss.location.x - 1, y: boss.location.y });
    player.currentStats.magic = 1;
    InputController.controller.queueAction(() => Trainer.clickController.playerAttackClick(boss));
    region.world.tickWorld();
    expect(player.attackDelay).toBe(5);
    const hits = boss.incomingProjectiles.filter((projectile) => projectile.from === player);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.attackStyle).not.toBe("magic");
    expect(hits[0]?.options.visuals.spotAnim).toBeUndefined();
    expect(animations).not.toHaveBeenCalledWith(7855, expect.any(Boolean));
  } finally {
    if (player.equipment.weapon) AttackStylesController.controller.setWeaponAttackStyle(player.equipment.weapon, AttackStyle.AUTOCAST);
    animations.mockRestore(); trainer.dispose();
  }
});
