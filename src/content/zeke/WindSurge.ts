import { AttackStyle, ItemName, MagicWeapon, Projectile, Sound, XpDrop, cacheSound } from "osrs-sdk";
import type { AttackBonuses, ProjectileOptions, Unit } from "osrs-sdk";
import { ZEKE_PRESENTATION } from "./assets";
import { ZekeSword } from "./hazards";
import { ZEKE_RULES } from "./ZekeRules";

declare module "osrs-sdk/lib/src/sdk/ItemName" {
  enum ItemName { WIND_SURGE = "Wind Surge" }
}
Object.assign(ItemName, { WIND_SURGE: "Wind Surge" });

const look = ZEKE_PRESENTATION.windSurge;

class WindSurgeProjectile extends Projectile {
  constructor(spell: WindSurge, from: Unit, private readonly target: Unit, options: ProjectileOptions, private readonly landed: boolean) {
    super(spell, target instanceof ZekeSword ? ZEKE_RULES.swords.windSurgeCharge.value : spell.damage, from, target, "magic", options);
  }

  override beforeHit(): void {
    super.beforeHit();
    this.target.addSpotAnim({ id: this.landed ? look.impact : look.splash, channel: "wind-surge-impact" });
  }
}

/** Standard spell damage scales with the highest surge unlocked, per the combat-spell rebalance. */
export class WindSurge extends MagicWeapon {
  override get itemName(): ItemName { return ItemName.WIND_SURGE; }
  override get attackRange(): number { return 10; }
  override get attackSpeed(): number { return 5; }
  override get attackAnimationId(): number { return look.cast; }
  override get attackSpotAnim() { return { id: look.casting, animation: look.cast }; }
  override attackStyle(): AttackStyle { return AttackStyle.AUTOCAST; }

  override _hitChance(from: Unit, to: Unit, bonuses: AttackBonuses): number {
    return to instanceof ZekeSword && to.canBeAttacked() ? 1 : super._hitChance(from, to, bonuses);
  }

  override cast(from: Unit, to: Unit): void {
    const level = from.currentStats.magic;
    if (level < 81) return;
    const baseDamage = level >= 95 ? 24 : level >= 90 ? 23 : level >= 85 ? 22 : 21;
    from.grantXp(new XpDrop("magic", 44.5));
    this.attack(from, to, { magicBaseSpellDamage: baseDamage, attackStyle: "magic" });
  }

  override registerProjectile(from: Unit, to: Unit, _bonuses: AttackBonuses, options: ProjectileOptions = {}): void {
    to.addProjectile(new WindSurgeProjectile(this, from, to, {
      ...options,
      sound: new Sound(cacheSound(look.castSound), 0.1),
      hitSound: new Sound(cacheSound(this.lastHitHit ? look.impactSound : look.splashSound), 0.1),
      visuals: { ...options.visuals, spotAnim: { id: look.travel } },
    }, this.lastHitHit));
  }
}
