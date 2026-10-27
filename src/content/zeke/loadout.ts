import {
  AmuletOfRancour, AncestralRobebottom, AncestralRobetop, AvernicTreadsMax, BastionPotion, DizanasQuiver, DragonArrows, FerociousGloves,
  InfernalCape, MasoriBodyF, MasoriChapsF, MasoriMaskF, NecklaceOfRupture, OccultNecklace, SaradominBrew, ScytheOfVitur,
  AttackStyle, AttackStylesController, SuperCombatPotion, SuperRestore, TwistedBow, UltorRing, VenatorRing, ZaryteVambraces,
} from "osrs-sdk";
import type { Item, Player, UnitEquipment } from "osrs-sdk";
import { HarmonisedNightmareStaff } from "./HarmonisedNightmareStaff";
import { CrimsonKisten, ElderMaul, InquisitorsGreatHelm, InquisitorsHauberk, InquisitorsPlateskirt, ZekeScythe } from "./ZekeGear";

function equipment(setup: "melee" | "ranged") {
  return setup === "melee" ? {
    weapon: new ZekeScythe(), helmet: new InquisitorsGreatHelm(), chest: new InquisitorsHauberk(), legs: new InquisitorsPlateskirt(),
    gloves: new FerociousGloves(), cape: new InfernalCape(), necklace: new AmuletOfRancour(), feet: new AvernicTreadsMax(),
    ring: new UltorRing(), ammo: new DragonArrows(),
  } : {
    weapon: new TwistedBow(), helmet: new MasoriMaskF(), chest: new MasoriBodyF(), legs: new MasoriChapsF(),
    gloves: new ZaryteVambraces(), cape: new DizanasQuiver(), necklace: new NecklaceOfRupture(), feet: new AvernicTreadsMax(),
    ring: new VenatorRing(), ammo: new DragonArrows(),
  } satisfies UnitEquipment;
}

export function dressZekePlayer(player: Player, setup: "melee" | "ranged"): void {
  player.equipment = equipment(setup);
  const switches = equipment(setup === "melee" ? "ranged" : "melee");
  const scythe = player.equipment.weapon instanceof ScytheOfVitur ? player.equipment.weapon : switches.weapon;
  if (scythe instanceof ScytheOfVitur) AttackStylesController.controller.setWeaponAttackStyle(scythe, AttackStyle.AGGRESSIVECRUSH);
  const inventory: Item[] = [
    switches.weapon, switches.helmet, switches.chest, switches.legs,
    switches.gloves, switches.necklace, switches.cape, switches.ring,
    new OccultNecklace(), new AncestralRobebottom(), new HarmonisedNightmareStaff(), new AncestralRobetop(),
    new CrimsonKisten(), new ElderMaul(), new SuperCombatPotion(), new BastionPotion(),
    new SaradominBrew(), new SaradominBrew(), new SaradominBrew(), new SaradominBrew(),
    new SaradominBrew(), new SaradominBrew(), new SuperRestore(), new SuperRestore(),
    new SuperRestore(), new SuperRestore(), new SuperRestore(), new SuperRestore(),
  ];
  inventory.forEach((item, index) => { player.inventory[index] = item; });
  player.equipmentChanged();
}
