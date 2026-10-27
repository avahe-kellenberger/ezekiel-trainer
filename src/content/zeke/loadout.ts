import {
  AmuletOfRancour, AncestralRobebottom, AncestralRobetop, AvernicTreadsMax, BastionPotion, DizanasQuiver, DragonArrows, FerociousGloves,
  InfernalCape, MasoriBodyF, MasoriChapsF, MasoriMaskF, NecklaceOfRupture, OccultNecklace, SaradominBrew, ScytheOfVitur,
  SuperCombatPotion, SuperRestore, TorvaFullhelm, TorvaPlatebody, TorvaPlatelegs, TwistedBow, UltorRing,
  VenatorRing, ZaryteVambraces,
} from "osrs-sdk";
import type { Item, Player, UnitEquipment } from "osrs-sdk";
import { HarmonisedNightmareStaff } from "./HarmonisedNightmareStaff";

function equipment(setup: "melee" | "ranged"): UnitEquipment {
  return setup === "melee" ? {
    weapon: new ScytheOfVitur(), helmet: new TorvaFullhelm(), chest: new TorvaPlatebody(), legs: new TorvaPlatelegs(),
    gloves: new FerociousGloves(), cape: new InfernalCape(), necklace: new AmuletOfRancour(), feet: new AvernicTreadsMax(),
    ring: new UltorRing(), ammo: new DragonArrows(),
  } : {
    weapon: new TwistedBow(), helmet: new MasoriMaskF(), chest: new MasoriBodyF(), legs: new MasoriChapsF(),
    gloves: new ZaryteVambraces(), cape: new DizanasQuiver(), necklace: new NecklaceOfRupture(), feet: new AvernicTreadsMax(),
    ring: new VenatorRing(), ammo: new DragonArrows(),
  };
}

export function dressZekePlayer(player: Player, setup: "melee" | "ranged"): void {
  player.equipment = equipment(setup);
  const switches = Object.values(equipment(setup === "melee" ? "ranged" : "melee"));
  const magic: Item[] = [new HarmonisedNightmareStaff(), new AncestralRobetop(), new AncestralRobebottom(), new OccultNecklace()];
  const supplies: Item[] = [new SuperCombatPotion(), new BastionPotion(), ...Array.from({ length: 6 }, () => new SaradominBrew()), ...Array.from({ length: 6 }, () => new SuperRestore())];
  [...switches, ...magic, ...supplies].slice(0, 28).forEach((item, index) => { player.inventory[index] = item; });
  player.equipmentChanged();
}
