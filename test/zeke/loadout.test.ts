import { AttackStyle, Equipment, ItemName, Player, Random, SaradominBrew, ScytheOfVitur, Settings, SuperRestore, TestNpc, TestRegion, TrainerInstance } from "osrs-sdk";
import type { Item } from "osrs-sdk";
import { CrimsonKisten, ElderMaul, ZekeScythe } from "../../src/content/zeke/ZekeGear";
import { dressZekePlayer } from "../../src/content/zeke/loadout";

class GearRegion extends TestRegion {
  override initialiseRegion(): { player: Player } {
    const player = new Player(this, { x: 4, y: 5 });
    this.addPlayer(player);
    return { player };
  }
}

function drill(setup: "melee" | "ranged" = "melee") {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false });
  const region = new GearRegion(12, 12);
  const trainer = new TrainerInstance(region);
  const player = trainer.mount(document.createElement("canvas"), document.createElement("div"));
  dressZekePlayer(player, setup);
  const target = new TestNpc(region, { x: 5, y: 5 }, {});
  return { player, target, dispose: () => trainer.dispose() };
}

function equip(player: Player, matches: (item: Item) => boolean): void {
  const item = player.inventory.find((item) => item !== null && matches(item));
  if (!(item instanceof Equipment)) throw new Error("Missing gear switch");
  item.inventoryLeftClick(player);
}

it("arranges inventory in the reference's rows and preserves the equipped melee gear", () => {
  const { player, dispose } = drill();
  try {
    expect(player.inventory.slice(0, 16).map((item) => item?.itemName)).toEqual([
      ItemName.TWISTED_BOW, ItemName.MASORI_MASK_F, ItemName.MASORI_BODY_F, ItemName.MASORI_CHAPS_F,
      ItemName.ZARYTE_VAMBRACES, ItemName.NECKLACE_OF_RUPTURE, ItemName.DIZANAS_QUIVER, ItemName.VENATOR_RING,
      ItemName.CRIMSON_KISTEN, ItemName.ELDER_MAUL, ItemName.HARMONISED_NIGHTMARE_STAFF, ItemName.ANCESTRAL_ROBETOP,
      ItemName.BASTION_POTION, ItemName.SUPER_COMBAT_POTION, ItemName.OCCULT_NECKLACE, ItemName.ANCESTRAL_ROBEBOTTOM,
    ]);
    expect(player.inventory).toHaveLength(28);
    expect(player.inventory.slice(16, 22).every((item) => item instanceof SaradominBrew)).toBe(true);
    expect(player.inventory.slice(22).every((item) => item instanceof SuperRestore)).toBe(true);
    expect([player.equipment.helmet?.cacheItemId, player.equipment.chest?.cacheItemId, player.equipment.legs?.cacheItemId]).toEqual([24419, 24420, 24421]);
  } finally { dispose(); }
});

it.each(["melee", "ranged"] as const)("keeps the scythe on crush after switching away and back from %s setup", (setup) => {
  const { player, target, dispose } = drill(setup);
  try {
    if (setup === "ranged") equip(player, (item) => item instanceof ScytheOfVitur);
    expect(player.equipment.weapon?.attackStyle()).toBe(AttackStyle.AGGRESSIVECRUSH);
    equip(player, (item) => item instanceof CrimsonKisten);
    equip(player, (item) => item instanceof ScytheOfVitur);
    const weapon = player.equipment.weapon;
    if (!(weapon instanceof ZekeScythe)) throw new Error("Missing scythe");
    expect(weapon.attackStyle()).toBe(AttackStyle.AGGRESSIVECRUSH);
    weapon.attack(player, target);
    expect(target.incomingProjectiles.map((hit) => hit.attackStyle)).toEqual(["crush", "crush", "crush"]);
  } finally { dispose(); }
});

it("the elder maul spends 50 special energy and drains current Defence when its delayed hit lands", () => {
  const { player, target, dispose } = drill();
  const random = vi.spyOn(Random, "get").mockReturnValue(0);
  try {
    equip(player, (item) => item instanceof ElderMaul);
    player.equipment = { weapon: player.equipment.weapon };
    player.equipmentChanged();
    player.currentStats.attack = 99;
    player.currentStats.strength = 99;
    player.currentStats.specialAttack = 100;
    player.setAggro(target);
    player.useSpecialAttack = true;
    random.mockReturnValueOnce(0).mockReturnValueOnce(0.5);
    expect(player.attack()).toBe(true);
    expect(player.currentStats.specialAttack).toBe(50);
    expect(target.currentStats.defence).toBe(60);
    expect(target.incomingProjectiles).toHaveLength(1);
    expect(target.incomingProjectiles[0]?.attackStyle).toBe("crush");
    target.processIncomingAttacks();
    expect(target.currentStats.defence).toBe(60);
    target.processIncomingAttacks();
    expect(target.currentStats.defence).toBe(39);
    expect(target.currentStats.hitpoint).toBeLessThan(125);
  } finally { random.mockRestore(); dispose(); }
});

it("an elder maul special that misses spends energy without draining Defence", () => {
  const { player, target, dispose } = drill();
  const random = vi.spyOn(Random, "get").mockReturnValue(0.999999);
  try {
    equip(player, (item) => item instanceof ElderMaul);
    player.currentStats.specialAttack = 100;
    player.setAggro(target);
    player.useSpecialAttack = true;
    expect(player.attack()).toBe(true);
    expect(player.currentStats.specialAttack).toBe(50);
    target.processIncomingAttacks(); target.processIncomingAttacks();
    expect(target.currentStats.defence).toBe(60);
    expect(target.currentStats.hitpoint).toBe(125);
  } finally { random.mockRestore(); dispose(); }
});

it("the elder maul's 25% special accuracy bonus hits where its normal attack misses", () => {
  const { player, target, dispose } = drill();
  const random = vi.spyOn(Random, "get").mockReturnValue(0.91);
  try {
    equip(player, (item) => item instanceof ElderMaul);
    player.equipment = { weapon: player.equipment.weapon };
    player.equipmentChanged();
    player.currentStats.attack = 99;
    player.currentStats.strength = 99;
    player.currentStats.specialAttack = 100;
    player.setAggro(target);
    expect(player.attack()).toBe(true);
    target.processIncomingAttacks();
    expect(target.currentStats.hitpoint).toBe(125);
    player.useSpecialAttack = true;
    expect(player.attack()).toBe(true);
    target.processIncomingAttacks(); target.processIncomingAttacks();
    expect(target.currentStats.hitpoint).toBeLessThan(125);
    expect(target.currentStats.defence).toBe(39);
  } finally { random.mockRestore(); dispose(); }
});

it.each([
  [0, 0, 0], [1, 0, 14], [2, 0, 18], [3, 0, 23], [4, 0, 27],
  [1, 0.999999, 23], [2, 0.999999, 27], [3, 0.999999, 31], [4, 0.999999, 35],
])("the kisten special with %i successful accuracy rolls and damage roll %f deals %i in one crush hit", (successes, damageRoll, damage) => {
  const { player, target, dispose } = drill();
  const random = vi.spyOn(Random, "get");
  try {
    equip(player, (item) => item instanceof CrimsonKisten);
    player.equipment = { weapon: player.equipment.weapon };
    player.equipmentChanged();
    player.currentStats.attack = 99;
    player.currentStats.strength = 99;
    player.currentStats.specialAttack = 100;
    player.setAggro(target);
    player.useSpecialAttack = true;
    random.mockReturnValue(damageRoll);
    for (let roll = 0; roll < 4; roll++) random.mockReturnValueOnce(roll < successes ? 0 : 0.999999);
    expect(player.attack()).toBe(true);
    expect(player.currentStats.specialAttack).toBe(50);
    expect(target.incomingProjectiles).toHaveLength(1);
    expect(target.incomingProjectiles[0]?.attackStyle).toBe("crush");
    target.processIncomingAttacks();
    expect(target.currentStats.hitpoint).toBe(125 - damage);
  } finally { random.mockRestore(); dispose(); }
});

it("a guaranteed kisten hit uses all four successes and its maximum damage modifier", () => {
  const { player, target, dispose } = drill();
  try {
    equip(player, (item) => item instanceof CrimsonKisten);
    player.equipment = { weapon: player.equipment.weapon };
    player.equipmentChanged();
    player.currentStats.strength = 99;
    target.grantMaxDamageRollsOnNextIncomingAttack();
    player.currentStats.specialAttack = 100;
    player.setAggro(target);
    player.useSpecialAttack = true;
    expect(player.attack()).toBe(true);
    target.processIncomingAttacks();
    expect(target.currentStats.hitpoint).toBe(90);
  } finally { dispose(); }
});
