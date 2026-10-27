import { AttackStyle, AttackStylesController, AttackStyleTypes, Chest, Helmet, ImageLoader, ItemName, Legs, MeleeWeapon, Projectile, Random, ScytheOfVitur, Unit, PlayerAnimationIndices } from "osrs-sdk";
import type { AttackBonuses, ProjectileOptions, UnitEquipment } from "osrs-sdk";
import { ZEKE_GEAR } from "./ZekeGearData";
import { itemIconFile } from "../../servedAssets";

declare module "osrs-sdk/lib/src/sdk/ItemName" {
  enum ItemName {
    ZEKE_INQUISITORS_GREAT_HELM = "Inquisitor's great helm",
    ZEKE_INQUISITORS_HAUBERK = "Inquisitor's hauberk",
    ZEKE_INQUISITORS_PLATESKIRT = "Inquisitor's plateskirt",
    ELDER_MAUL = "Elder maul",
    CRIMSON_KISTEN = "Crimson kisten",
  }
}
Object.assign(ItemName, {
  ZEKE_INQUISITORS_GREAT_HELM: "Inquisitor's great helm", ZEKE_INQUISITORS_HAUBERK: "Inquisitor's hauberk", ZEKE_INQUISITORS_PLATESKIRT: "Inquisitor's plateskirt",
  ELDER_MAUL: "Elder maul", CRIMSON_KISTEN: "Crimson kisten",
});


declare module "osrs-sdk/lib/src/sdk/rendering/GLTFAnimationConstants" {
  enum PlayerAnimationIndices { ZekeElderMaulIdle, ZekeElderMaulWalk, ZekeElderMaulRun, ZekeCrimsonKistenIdle, ZekeCrimsonKistenWalk, ZekeCrimsonKistenRun }
}
Object.assign(PlayerAnimationIndices, {
  ZekeElderMaulIdle: ZEKE_GEAR.elderMaul.idle, ZekeElderMaulWalk: ZEKE_GEAR.elderMaul.walk, ZekeElderMaulRun: ZEKE_GEAR.elderMaul.run,
  ZekeCrimsonKistenIdle: ZEKE_GEAR.crimsonKisten.idle, ZekeCrimsonKistenWalk: ZEKE_GEAR.crimsonKisten.walk, ZekeCrimsonKistenRun: ZEKE_GEAR.crimsonKisten.run,
});

const staffStyles = AttackStylesController.attackStyleImageMap[AttackStyleTypes.STAFF];
const crushStyles = {
  [AttackStyle.REAP]: staffStyles[AttackStyle.ACCURATE],
  [AttackStyle.AGGRESSIVECRUSH]: staffStyles[AttackStyle.AGGRESSIVECRUSH],
  [AttackStyle.DEFENSIVE]: staffStyles[AttackStyle.DEFENSIVE],
};
AttackStylesController.attackStyleImageMap[AttackStyleTypes.BLUNT] = crushStyles;
AttackStylesController.attackStyleImageMap[AttackStyleTypes.SPIKEDWEAPON] = {
  ...crushStyles, [AttackStyle.CONTROLLED]: AttackStylesController.attackStyleImageMap[AttackStyleTypes.SLASHSWORD][AttackStyle.STAB],
};

function icon(id: number): HTMLImageElement { return ImageLoader.createImage(`osrs-assets/${itemIconFile(id)}`); }

export class InquisitorsGreatHelm extends Helmet {
  override inventorySprite = icon(this.cacheItemId);
  override get cacheItemId(): number { return ZEKE_GEAR.inquisitorsGreatHelm.id; }
  override get itemName(): ItemName { return ItemName.ZEKE_INQUISITORS_GREAT_HELM; }
  override setStats(): void { this.bonuses = ZEKE_GEAR.inquisitorsGreatHelm.bonuses; }
}
export class InquisitorsHauberk extends Chest {
  override inventorySprite = icon(this.cacheItemId);
  override get cacheItemId(): number { return ZEKE_GEAR.inquisitorsHauberk.id; }
  override get itemName(): ItemName { return ItemName.ZEKE_INQUISITORS_HAUBERK; }
  override setStats(): void { this.bonuses = ZEKE_GEAR.inquisitorsHauberk.bonuses; }
}
export class InquisitorsPlateskirt extends Legs {
  override inventorySprite = icon(this.cacheItemId);
  override get cacheItemId(): number { return ZEKE_GEAR.inquisitorsPlateskirt.id; }
  override get itemName(): ItemName { return ItemName.ZEKE_INQUISITORS_PLATESKIRT; }
  override setStats(): void { this.bonuses = ZEKE_GEAR.inquisitorsPlateskirt.bonuses; }
}

function crushBonuses(equipment: UnitEquipment, bonuses: AttackBonuses): AttackBonuses {
  const boost = 1 + (equipment.helmet instanceof InquisitorsGreatHelm ? ZEKE_GEAR.inquisitorsGreatHelm.crushBonus : 0)
    + (equipment.chest instanceof InquisitorsHauberk ? ZEKE_GEAR.inquisitorsHauberk.crushBonus : 0)
    + (equipment.legs instanceof InquisitorsPlateskirt ? ZEKE_GEAR.inquisitorsPlateskirt.crushBonus : 0);
  return { ...bonuses, attackStyle: "crush", gearMeleeMultiplier: (bonuses.gearMeleeMultiplier ?? 1) * boost };
}

export class ZekeScythe extends ScytheOfVitur {
  override defaultStyle(): AttackStyle { return AttackStyle.AGGRESSIVECRUSH; }
  override attack(from: Unit, to: Unit, bonuses: AttackBonuses = {}): boolean {
    return super.attack(from, to, this.attackStyle() === AttackStyle.AGGRESSIVECRUSH ? crushBonuses(from.equipment, bonuses) : bonuses);
  }
}

class PulverizeHit extends Projectile {
  override beforeHit(): void {
    super.beforeHit();
    if (this.to instanceof Unit && this.damage > 0) {
      this.to.currentStats.defence -= Math.floor(this.to.currentStats.defence * ZEKE_GEAR.elderMaul.defenceDrain);
      this.to.addSpotAnim({ id: ZEKE_GEAR.elderMaul.specialImpact });
    }
  }
}

export class ElderMaul extends MeleeWeapon {
  override inventorySprite = icon(this.cacheItemId);
  override get cacheItemId(): number { return ZEKE_GEAR.elderMaul.id; }
  override get itemName(): ItemName { return ItemName.ELDER_MAUL; }
  override setStats(): void { this.bonuses = ZEKE_GEAR.elderMaul.bonuses; }
  override attackStyles(): AttackStyle[] { return [AttackStyle.REAP, AttackStyle.AGGRESSIVECRUSH, AttackStyle.DEFENSIVE]; }
  override attackStyleCategory(): AttackStyleTypes { return AttackStyleTypes.BLUNT; }
  override defaultStyle(): AttackStyle { return AttackStyle.AGGRESSIVECRUSH; }
  override get isTwoHander(): boolean { return true; }
  override get attackRange(): number { return 1; }
  override get attackSpeed(): number { return ZEKE_GEAR.elderMaul.speed; }
  override get attackAnimationId(): number { return ZEKE_GEAR.elderMaul.attack; }
  override get idleAnimationId(): PlayerAnimationIndices { return PlayerAnimationIndices.ZekeElderMaulIdle; }
  override get walkAnimationId(): PlayerAnimationIndices { return PlayerAnimationIndices.ZekeElderMaulWalk; }
  override get runAnimationId(): PlayerAnimationIndices { return PlayerAnimationIndices.ZekeElderMaulRun; }
  override get specialAttackAnimationId(): number { return ZEKE_GEAR.elderMaul.special; }
  override hasSpecialAttack(): boolean { return true; }
  override specialAttackDrain(): number { return ZEKE_GEAR.elderMaul.specialEnergy; }
  override attack(from: Unit, to: Unit, bonuses: AttackBonuses = {}, options: ProjectileOptions = {}): boolean {
    return super.attack(from, to, crushBonuses(from.equipment, bonuses), options);
  }
  override _attackRoll(from: Unit, to: Unit, bonuses: AttackBonuses): number {
    return Math.floor(super._attackRoll(from, to, bonuses) * (bonuses.isSpecialAttack ? ZEKE_GEAR.elderMaul.specialAccuracy : 1));
  }
  override specialAttack(from: Unit, to: Unit, bonuses: AttackBonuses = {}, options: ProjectileOptions = {}): boolean {
    const attacked = this.attack(from, to, { ...bonuses, isSpecialAttack: true }, options);
    if (attacked) from.addSpotAnim({ id: ZEKE_GEAR.elderMaul.specialGlow });
    return attacked;
  }
  override registerProjectile(from: Unit, to: Unit, bonuses: AttackBonuses, options: ProjectileOptions = {}): void {
    if (!bonuses.isSpecialAttack) { super.registerProjectile(from, to, bonuses, options); return; }
    to.addProjectile(new PulverizeHit(this, this.damage, from, to, "crush", { ...options, setDelay: 2, visuals: { hidden: true } }));
  }
}

export class CrimsonKisten extends MeleeWeapon {
  override inventorySprite = icon(this.cacheItemId);
  override get cacheItemId(): number { return ZEKE_GEAR.crimsonKisten.id; }
  override get itemName(): ItemName { return ItemName.CRIMSON_KISTEN; }
  override setStats(): void { this.bonuses = ZEKE_GEAR.crimsonKisten.bonuses; }
  override attackStyles(): AttackStyle[] { return [AttackStyle.REAP, AttackStyle.AGGRESSIVECRUSH, AttackStyle.CONTROLLED, AttackStyle.DEFENSIVE]; }
  override attackStyleCategory(): AttackStyleTypes { return AttackStyleTypes.SPIKEDWEAPON; }
  override defaultStyle(): AttackStyle { return AttackStyle.AGGRESSIVECRUSH; }
  override get isTwoHander(): boolean { return true; }
  override get attackRange(): number { return 1; }
  override get attackSpeed(): number { return ZEKE_GEAR.crimsonKisten.speed; }
  override get attackAnimationId(): number { return this.attackStyle() === AttackStyle.CONTROLLED ? ZEKE_GEAR.crimsonKisten.stab : ZEKE_GEAR.crimsonKisten.attack; }
  override get idleAnimationId(): PlayerAnimationIndices { return PlayerAnimationIndices.ZekeCrimsonKistenIdle; }
  override get walkAnimationId(): PlayerAnimationIndices { return PlayerAnimationIndices.ZekeCrimsonKistenWalk; }
  override get runAnimationId(): PlayerAnimationIndices { return PlayerAnimationIndices.ZekeCrimsonKistenRun; }
  override get specialAttackAnimationId(): number { return ZEKE_GEAR.crimsonKisten.special; }
  override hasSpecialAttack(): boolean { return true; }
  override specialAttackDrain(): number { return ZEKE_GEAR.crimsonKisten.specialEnergy; }
  override attack(from: Unit, to: Unit, bonuses: AttackBonuses = {}, options: ProjectileOptions = {}): boolean {
    return super.attack(from, to, this.attackStyle() === AttackStyle.CONTROLLED && !bonuses.isSpecialAttack ? { ...bonuses, attackStyle: "stab" } : crushBonuses(from.equipment, bonuses), options);
  }
  override specialAttack(from: Unit, to: Unit, bonuses: AttackBonuses = {}, options: ProjectileOptions = {}): boolean {
    const attacked = this.attack(from, to, { ...bonuses, isSpecialAttack: true }, options);
    if (attacked) from.addSpotAnim({ id: ZEKE_GEAR.crimsonKisten.specialGlow });
    return attacked;
  }
  override _rollAttack(from: Unit, to: Unit, bonuses: AttackBonuses): number {
    if (!bonuses.isSpecialAttack) return super._rollAttack(from, to, bonuses);
    const spec = ZEKE_GEAR.crimsonKisten;
    const modifiers = to.incomingAttackRollModifiers({ attacker: from, weapon: this, bonuses });
    let successes = 0;
    for (let roll = 0; roll < spec.accuracyRolls; roll++) if (modifiers.guaranteedHit || Random.get() <= this._hitChance(from, to, bonuses)) successes++;
    this.lastHitHit = successes > 0;
    if (successes === 0) return 0;
    const extra = (successes - 1) * spec.additionalHit;
    const max = this._maxHit(from, to, bonuses);
    const minimum = Math.floor(max * (spec.minimumHit + extra));
    const maximum = Math.floor(max * (spec.maximumHit + extra));
    return modifiers.maxDamage ? maximum : minimum + Math.floor(Random.get() * (maximum - minimum + 1));
  }
}
