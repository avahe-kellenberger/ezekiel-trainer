import { AncientStaff, AttackStyle, ImageLoader, ItemName } from "osrs-sdk";
import type { AttackBonuses, Unit } from "osrs-sdk";
import { itemIconFile } from "../../servedAssets";
import { WindSurge } from "./WindSurge";

declare module "osrs-sdk/lib/src/sdk/ItemName" {
  enum ItemName { HARMONISED_NIGHTMARE_STAFF = "Harmonised Nightmare staff" }
}
Object.assign(ItemName, { HARMONISED_NIGHTMARE_STAFF: "Harmonised Nightmare staff" });

export class HarmonisedNightmareStaff extends AncientStaff {
  private readonly windSurge = new WindSurge();
  override inventorySprite = ImageLoader.createImage(this.inventoryImage);

  constructor() {
    super();
    this.bonuses = {
      attack: { stab: 0, slash: 0, crush: 0, magic: 16, range: 0 },
      defence: { stab: 0, slash: 0, crush: 0, magic: 14, range: 0 },
      other: { meleeStrength: 0, rangedStrength: 0, magicDamage: 0.15, prayer: 0 },
      targetSpecific: { undead: 0, slayer: 0 },
    };
  }

  override get itemName(): ItemName { return ItemName.HARMONISED_NIGHTMARE_STAFF; }
  override get cacheItemId(): number { return 24423; }
  override get inventoryImage(): string { return `osrs-assets/${itemIconFile(this.cacheItemId)}`; }
  override get weight(): number { return 1.6; }
  override get attackSpeed(): number { return this.attackStyle() === AttackStyle.AUTOCAST ? 4 : 5; }

  override get attackAnimationId(): number | null {
    return this.attackStyle() === AttackStyle.AUTOCAST ? this.windSurge.attackAnimationId : super.attackAnimationId;
  }

  override attack(from: Unit, to: Unit, bonuses: AttackBonuses = {}): boolean {
    if (this.attackStyle() !== AttackStyle.AUTOCAST || !from.isPlayer) return super.attack(from, to, bonuses);
    if (from.currentStats.magic < 81) return false;
    this.windSurge.cast(from, to);
    return true;
  }
}
