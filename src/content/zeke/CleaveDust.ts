import { CacheRenderModel, CacheRenderReferences, CollisionType, Entity, LineOfSightMask } from "osrs-sdk";
import type { Model, Region } from "osrs-sdk";
import type { ClientCycles, Tile, WorldTick } from "../../sim/brands";
import { worldTick } from "../../sim/brands";
import { ZEKE_PRESENTATION } from "./assets";
import { ZEKE_RULES } from "./ZekeRules";

export class CleaveDust extends Entity {
  private readonly expiresAt: WorldTick;

  constructor(region: Region, at: Tile, private readonly delay: ClientCycles) {
    super(region, { ...at });
    this.expiresAt = worldTick(region.world.globalTickCounter + ZEKE_RULES.autos.cleaveDustLifetime.value);
  }

  override get collisionType(): CollisionType { return CollisionType.NONE; }
  override get lineOfSight(): LineOfSightMask { return LineOfSightMask.NONE; }
  override get drawOutline(): boolean { return false; }

  override tick(): void {
    if (this.region.world.globalTickCounter >= this.expiresAt) this.dying = 0;
  }

  override create3dModel(): Model {
    return CacheRenderModel.forRenderable(this, CacheRenderReferences.spotAnim([{ id: ZEKE_PRESENTATION.spotAnims.cleaveDust, delay: this.delay }]));
  }
}
