import { InputController, Pathing, Player, Settings } from "osrs-sdk";
import type { Location, MovePace, Region, Unit } from "osrs-sdk";
import { clientCycles } from "../../sim/brands";
import type { ClientCycles, Tick } from "../../sim/brands";
import { ZEKE_RULES } from "./ZekeRules";
import { ZEKE_PRESENTATION } from "./assets";

export class ZekePlayer extends Player {
  private pendingDodge: Readonly<{ tick: Tick; to: Location; steps: number; successful: boolean }> | null = null;
  private awaitingDodgeConfirmation: Tick | null = null;
  private dodgeTravel: Readonly<{ from: Location; to: Location; startedAt: ClientCycles; duration: ClientCycles }> | null = null;
  private castPose: number | null = null;
  private castSpeed: number | null = null;
  private visualInteractionTarget: Unit | null = null;
  lastDodge: Readonly<{ tick: Tick; from: Location; to: Location; steps: number }> | null = null;
  constructor(
    region: Region,
    location: Location,
    readonly participantId: string,
    private readonly invincible: () => boolean,
    private readonly dodgeTick: (location: Location) => Tick | null = () => null,
    private readonly opportunisticAttackTarget: (player: ZekePlayer) => Unit | null = () => null,
  ) {
    super(region, location);
  }

  override dead(): void {
    this.pendingDodge = null;
    this.awaitingDodgeConfirmation = null;
    this.dodgeTravel = null;
    this.visualInteractionTarget = null;
    super.dead();
  }

  override setAggro(target: Unit | null): void {
    this.visualInteractionTarget = null;
    super.setAggro(target);
  }

  override drawUILayer(tickPercent: number, projector: Parameters<Player["drawUILayer"]>[1], context: OffscreenCanvasRenderingContext2D, scale: number): void {
    if (this.dying < 0) {
      super.drawUILayer(tickPercent, projector, context, scale);
      return;
    }
    if (!projector.visible) return;
    const position = projector.atHeight(projector.logicalHeight * 0.5);
    context.save();
    context.translate(position.x, position.y);
    if (Settings.rotated === "south") context.rotate(Math.PI);
    this.drawHitsplats(context, scale);
    context.restore();
  }

  override postAttacksEvent(): void {
    super.postAttacksEvent();
    if (this.invincible() && this.currentStats.hitpoint <= 0) this.currentStats.hitpoint = this.stats.hitpoint;
  }

  override queueMovement(x: number, y: number, pace: MovePace = "run-setting"): void {
    const at = this.dodgeTick(this.location);
    const walk = () => super.moveTo(x, y, pace);
    if (at === null) InputController.controller.queueAction(walk);
    else InputController.controller.queueClientAction(() => {
      if (this.dodgeTick(this.location) === at) this.moveTo(x, y, pace);
      else InputController.controller.queueAction(walk);
    });
  }

  override moveTo(x: number, y: number, pace: MovePace = "run-setting"): void {
    super.moveTo(x, y, pace);
    const destination = this.destinationLocation;
    const at = this.dodgeTick(this.location);
    if (!destination || at === null || this.lastDodge?.tick === at || this.currentStats.hitpoint <= 0) return;
    const route = [...Pathing.constructPaths(this.region, this.location, [destination]).path].reverse().slice(1, ZEKE_RULES.dodge.maxSteps.value + 1);
    const landing = route[route.length - 1];
    if (!landing) return;
    const from = { ...this.location };
    this.pendingDodge = { tick: at, to: { ...landing }, steps: route.length, successful: false };
    this.lastDodge = { tick: at, from, to: { ...landing }, steps: route.length };
  }

  dodgeLanding(at: Tick): Location | null {
    return this.pendingDodge?.tick === at ? { ...this.pendingDodge.to } : null;
  }

  confirmSuccessfulDodge(at: Tick): void {
    if (this.pendingDodge?.tick === at) this.pendingDodge = { ...this.pendingDodge, successful: true };
    else if (this.awaitingDodgeConfirmation === at) {
      this.awaitingDodgeConfirmation = null;
      this.restoreDodgeSpecial();
    }
  }

  private restoreDodgeSpecial(): void {
    if (this.currentStats.hitpoint > 0 && this.dying < 0) this.currentStats.specialAttack = Math.min(this.stats.specialAttack, this.currentStats.specialAttack + ZEKE_RULES.dodge.specialRestore.value);
  }

  override clientTick(tickPercent: number, tickTimestamp = window.performance.now()): void {
    const travel = this.dodgeTravel;
    if (!travel) {
      const target = this.visualInteractionTarget;
      if (target === null) {
        super.clientTick(tickPercent, tickTimestamp);
        return;
      }
      const previousTarget = this.aggro ?? null;
      super.setAggro(target);
      try {
        super.clientTick(tickPercent, tickTimestamp);
      } finally {
        super.setAggro(previousTarget);
      }
      return;
    }
    const progress = Math.min(1, (this.region.world.clientTickCounter - travel.startedAt) / travel.duration);
    this.renderFromLocation = { ...this.perceivedLocation };
    this.perceivedLocation = {
      x: travel.from.x + (travel.to.x - travel.from.x) * progress,
      y: travel.from.y + (travel.to.y - travel.from.y) * progress,
    };
    this.renderPositionTimestamp = tickTimestamp;
    if (progress === 1) {
      this.dodgeTravel = null;
      this.visualMovementActive = false;
    }
  }

  override setLocation(location: Location): void {
    this.pendingDodge = null;
    this.awaitingDodgeConfirmation = null;
    this.dodgeTravel = null;
    this.visualInteractionTarget = null;
    super.setLocation(location);
  }

  beginEncounterTick(at: Tick): void {
    if (this.pendingDodge && this.pendingDodge.tick !== at) this.setLocation(this.location);
    if (this.awaitingDodgeConfirmation !== null && at > this.awaitingDodgeConfirmation + ZEKE_RULES.swords.impactAfter.value - ZEKE_RULES.swords.chargeAfter.value) this.awaitingDodgeConfirmation = null;
  }

  override movementStep(): void {
    const dodge = this.pendingDodge;
    if (!dodge) {
      super.movementStep();
      return;
    }
    this.pendingDodge = null;
    if (this.currentStats.hitpoint <= 0 || this.dying >= 0) {
      this.setLocation(this.location);
      return;
    }
    this.dodgeTravel = {
      from: this.getPerceivedLocation(0),
      to: { ...dodge.to },
      startedAt: clientCycles(this.region.world.clientTickCounter),
      duration: dodge.steps === 1 ? ZEKE_RULES.dodge.strafeCycles.value : ZEKE_RULES.dodge.rollCycles.value,
    };
    const nativeAngle = Math.trunc(Math.atan2(this.location.x - dodge.to.x, this.location.y - dodge.to.y) * 1024 / Math.PI);
    const facing = (nativeAngle + (dodge.steps === 1 ? ZEKE_RULES.dodge.strafeAngleOffset.value : 0) + 2048) % 2048;
    this.setRotationImmediate((facing - 1536) * Math.PI / 1024);
    this.visualPath = [];
    this.visualMovementActive = true;
    this.playAnimation(dodge.steps === 1 ? ZEKE_PRESENTATION.strafe : ZEKE_PRESENTATION.roll);
    this.region.clearTileCollisionFlags(this.location.x, this.location.y, this.size);
    this.location = { ...dodge.to };
    this.region.setTileCollisionFlags(this.location.x, this.location.y, this.size);
    this.region.refreshUnitChunk(this);
    if (dodge.successful) this.restoreDodgeSpecial();
    else this.awaitingDodgeConfirmation = dodge.tick;
  }

  override attack(): boolean {
    const spell = this.manualSpellCastSelection;
    this.castPose = spell?.attackAnimationId ?? null;
    this.castSpeed = spell?.attackSpeed ?? null;
    const attacked = super.attack();
    if (!attacked) { this.castPose = null; this.castSpeed = null; }
    return attacked;
  }

  override attackStep(): void {
    const target = this.opportunisticAttackTarget(this);
    if (target === null) {
      super.attackStep();
      return;
    }
    const previousTarget = this.aggro ?? null;
    const previousDelay = this.attackDelay;
    super.setAggro(target);
    try {
      super.attackStep();
    } finally {
      super.setAggro(previousTarget);
    }
    if (this.attackDelay > previousDelay) this.visualInteractionTarget = target;
  }

  override get attackAnimationId(): number { return this.castPose ?? super.attackAnimationId; }
  override get attackSpeed(): number { return this.castSpeed ?? super.attackSpeed; }

  override didAttack(): void {
    super.didAttack();
    this.castPose = null;
    this.castSpeed = null;
  }
}
