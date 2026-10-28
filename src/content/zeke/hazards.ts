import type * as THREE from "three";
import { CacheRenderInstancedModel, CacheRenderModel, CacheRenderReferences, CacheRenderSceneModel, CollisionType, Entity, LineOfSightMask, Mob } from "osrs-sdk";
import type { Location3, Model, Projectile, Region, Renderable } from "osrs-sdk";
import type { ClientCycles, Tick, Tile } from "../../sim/brands";
import type { StarVisual } from "./mechanics";
import { ZEKE_PRESENTATION } from "./assets";
import { ZEKE_RULES } from "./ZekeRules";
import { SWORD_CHARGE_LOOK, SWORD_COUNTDOWN_LOOK } from "./presentation";

class Decoration extends Entity {
  override get collisionType(): CollisionType { return CollisionType.NONE; }
  override get lineOfSight(): LineOfSightMask { return LineOfSightMask.NONE; }
  override get drawOutline(): boolean { return false; }
}

export class ZekeArena extends Decoration {
  constructor(region: Region) { super(region, { x: 0, y: 0 }); }

  override create3dModel(): Model {
    return new CacheRenderSceneModel(`region:${ZEKE_PRESENTATION.region.id}`, { originOffset: ZEKE_PRESENTATION.region.sceneOffset, elevation: ZEKE_PRESENTATION.region.sceneElevation });
  }
}

class StarModel implements Model {
  private readonly effects: readonly CacheRenderInstancedModel[];

  constructor(renderable: Renderable, delay: ClientCycles) {
    this.effects = [
      { id: ZEKE_PRESENTATION.spotAnims.spawn, delay },
      { id: ZEKE_PRESENTATION.spotAnims.marker, delay: delay + ZEKE_RULES.star.visualMarkerAfter.value },
      { id: ZEKE_PRESENTATION.spotAnims.explosion, delay: delay + ZEKE_RULES.star.visualExplosionAfter.value },
    ].map((effect) => CacheRenderInstancedModel.forRenderable(renderable, CacheRenderReferences.spotAnim([effect])));
  }

  draw(scene: THREE.Scene, delta: number, percent: number, location: Location3, angle: number, pitch: number, visible: boolean, offsets: Location3[]): void {
    this.effects.forEach((effect) => effect.draw(scene, delta, percent, location, angle, pitch, visible, offsets));
  }

  destroy(scene: THREE.Scene): void { this.effects.forEach((effect) => effect.destroy(scene)); }
  getWorldPosition(): THREE.Vector3 { return this.effects[0].getWorldPosition(); }
  async preload(): Promise<void> { await Promise.all(this.effects.map((effect) => effect.preload())); }
}

export class ZekeStar extends Decoration {
  constructor(region: Region, at: Tile, private readonly visual: StarVisual) { super(region, { ...at }); }

  override create3dModel(): Model {
    const visual = this.visual;
    switch (visual.kind) {
      case "star":
        return new StarModel(this, visual.delay);
      case "lightning":
        return CacheRenderInstancedModel.forRenderable(this, CacheRenderReferences.spotAnim([{ id: ZEKE_PRESENTATION.finaleEffects.impactMedium }]));
      default: { const unhandled: never = visual; return unhandled; }
    }
  }
}

type DecorationLook = Readonly<{ model: number; drop: number; idle: number; telegraph: number }>;

export class FinaleBlade extends Decoration {
  constructor(region: Region, at: Tile, private readonly look: DecorationLook) {
    super(region, { ...at });
    this.playAnimation(look.drop);
  }

  tell(): void { this.playAnimation(this.look.telegraph); }
  override get animationIndex(): number { return this.look.idle; }
  override create3dModel(): Model { return CacheRenderModel.forRenderable(this, CacheRenderReferences.model(this.look.model)); }
}

export class FinaleFence extends Decoration {
  constructor(region: Region, at: Tile, private readonly ordinal: number) {
    super(region, { ...at });
    this.playAnimation(ZEKE_PRESENTATION.finaleFence.drop[ordinal]);
  }

  override get size(): number { return 3; }
  override get animationIndex(): number { return ZEKE_PRESENTATION.finaleFence.idle[this.ordinal]; }
  override create3dModel(): Model { return CacheRenderModel.forRenderable(this, CacheRenderReferences.npc(ZEKE_PRESENTATION.finaleFence.npc)); }
}

export class ZekeSword extends Mob {
  private previous: Readonly<{ x: number; y: number }>;
  private launched = false;
  private accumulated = 0;

  constructor(region: Region, at: Tile, private readonly direction: Readonly<{ axis: "x" | "y"; direction: 1 | -1; chargeAt: Tick; impactAt: Tick }>, private readonly encounterTick: () => Tick) {
    super(region, { x: at.x - 1, y: at.y + 1 });
    this.previous = { ...this.location };
    this.autoRetaliate = false;
  }

  move(at: Tile, launched: boolean): void {
    this.previous = { ...this.location };
    this.location = { x: at.x - 1, y: at.y + 1 };
    this.launched = launched;
  }

  override setStats(): void {
    this.stats = { attack: 1, strength: 1, defence: ZEKE_RULES.swords.defence.value, magic: ZEKE_RULES.swords.magic.value, range: 1, hitpoint: ZEKE_RULES.swords.chargeMaximum.value };
    this.currentStats = { ...this.stats };
  }

  override mobName(): string { return "Ezekiel's blade"; }
  override get size(): number { return 3; }
  override get consumesSpace(): boolean { return false; }
  override get collisionType(): CollisionType { return CollisionType.NONE; }
  override get lineOfSight(): LineOfSightMask { return LineOfSightMask.NONE; }
  override canBeAttacked(): boolean { return !this.launched && this.accumulated < ZEKE_RULES.swords.chargeMaximum.value; }
  override drawHitsplat(): boolean { return false; }
  override movementStep(): void {}
  override attackStep(): void {}
  override queueStep(): void {
    const before = this.currentStats.hitpoint;
    super.queueStep();
    const damage = before - this.currentStats.hitpoint;
    // Swords queue before the boss advances its encounter clock for this tick.
    if (damage > 0 && this.encounterTick() < this.direction.impactAt) {
      this.accumulated = Math.min(ZEKE_RULES.swords.chargeMaximum.value, this.accumulated + damage);
    }
    this.currentStats.hitpoint = this.stats.hitpoint;
  }

  get chargeDamage(): number { return this.accumulated; }

  override addProjectile(projectile: Projectile): void {
    if (projectile.attackStyle !== "magic") projectile.damage = 0;
    super.addProjectile(projectile);
  }

  override getPerceivedLocation(tickPercent: number): Location3 {
    return { x: this.previous.x + (this.location.x - this.previous.x) * tickPercent, y: this.previous.y + (this.location.y - this.previous.y) * tickPercent, z: 0 };
  }

  override getPerceivedRotation(): number {
    return this.direction.axis === "x" ? (this.direction.direction === 1 ? Math.PI : 0) : (this.direction.direction === 1 ? Math.PI / 2 : -Math.PI / 2);
  }

  override get animationIndex(): number { return ZEKE_PRESENTATION.swordSpin; }

  override drawHPBar(context: OffscreenCanvasRenderingContext2D, scale: number, verticalOffset = -scale): void {
    if (this.launched) return;
    const look = SWORD_COUNTDOWN_LOOK;
    const y = verticalOffset - look.height - look.gap;
    if (this.accumulated > 0) {
      const charge = SWORD_CHARGE_LOOK;
      const chargeY = y - charge.height - charge.gap;
      context.fillStyle = charge.background;
      context.fillRect(-charge.width / 2, chargeY, charge.width, charge.height);
      context.fillStyle = charge.foreground;
      context.fillRect(-charge.width / 2, chargeY, Math.floor(charge.width * this.accumulated / ZEKE_RULES.swords.chargeMaximum.value), charge.height);
    }
    const elapsed = this.encounterTick() + this.region.world.tickPercent - (this.direction.chargeAt - ZEKE_RULES.swords.chargeAfter.value);
    if (elapsed < 0 || elapsed >= ZEKE_RULES.swords.countdownDuration.value) return;
    const remaining = Math.max(0, 1 - elapsed / ZEKE_RULES.swords.countdownDuration.value);
    context.fillStyle = look.background;
    context.fillRect(-look.width / 2, y, look.width, look.height);
    context.fillStyle = look.foreground;
    context.fillRect(-look.width / 2, y, Math.floor(look.width * remaining), look.height);
  }

  override create3dModel(): Model {
    const models = [62645, 62646, 62647, 62648];
    const variant = (this.direction.axis === "x" ? 0 : 2) + (this.direction.direction === 1 ? 0 : 1);
    return CacheRenderModel.forRenderable(this, CacheRenderReferences.model(models[variant]));
  }
}
