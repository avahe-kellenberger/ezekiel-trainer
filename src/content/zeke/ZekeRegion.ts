import { CardinalDirection, InvisibleMovementBlocker, Region, SoundCache, cacheSound } from "osrs-sdk";
import type { Player } from "osrs-sdk";
import { tick, tile } from "../../sim/brands";
import type { Tick } from "../../sim/brands";
import { dressZekePlayer } from "./loadout";
import { ZEKE_PRESENTATION } from "./assets";
import { ZEKE_RULES } from "./ZekeRules";
import { Zeke } from "./Zeke";
import { ZekePlayer } from "./ZekePlayer";
import { ZekeArena } from "./hazards";
import { inDodgeWindow } from "./mechanics";
import { ZekeRouteDemo } from "./ZekeRouteDemo";
import type { ZekeRouteDemoStatus } from "./ZekeRouteDemo";
import type { ZekeRouteId } from "./ZekeRoutePlans";

export type ZekeConfig = Readonly<{ seed?: number; invincible?: boolean; setup?: "melee" | "ranged"; phase?: "full" | "finale"; routeDemo?: ZekeRouteId; routeAutoplay?: boolean; skipCountdown?: boolean }>;
type Mounted = Readonly<{ boss: Zeke; player: ZekePlayer }> | null;
export type ZekeRunResult = Readonly<{ kind: "victory" | "death"; tick: Tick; invincible: boolean }>;
type RunState =
  | Readonly<{ kind: "active" }>
  | Readonly<{ kind: "dying"; result: ZekeRunResult & Readonly<{ kind: "death" }> }>
  | Readonly<{ kind: "finished"; result: ZekeRunResult }>;

export class ZekeRegion extends Region {
  private mounted: Mounted = null;
  private runState: RunState = { kind: "active" };
  private routeDemo: ZekeRouteDemo;
  private selectedRoute: ZekeRouteId | null;
  private routeAutoplay: boolean;
  readonly seed: number;
  invincible: boolean;

  constructor(private readonly config: ZekeConfig = {}) {
    super();
    this.selectedRoute = config.routeDemo ?? null;
    this.routeAutoplay = config.routeAutoplay ?? false;
    this.routeDemo = new ZekeRouteDemo(this.selectedRoute, this.routeAutoplay);
    this.seed = config.seed ?? 1;
    this.invincible = config.invincible ?? false;
  }

  override getName(): string { return "Zeke"; }
  override get initialFacing(): CardinalDirection { return CardinalDirection.NORTH; }
  override get width(): number { return ZEKE_RULES.arena.width.value; }
  override get height(): number { return ZEKE_RULES.arena.width.value; }

  override reset(startWorld = true): { player: Player } {
    this.projectileGraphics = [];
    this.routeDemo = new ZekeRouteDemo(this.selectedRoute, this.routeAutoplay);
    this.runState = { kind: "active" };
    const result = super.reset(false);
    if (this.selectedRoute === null && this.config.phase === "finale" && this.mounted) this.mounted.boss.currentStats.hitpoint = Math.floor(this.mounted.boss.stats.hitpoint * ZEKE_RULES.enrage.threshold.value);
    if (this.selectedRoute !== null || this.config.skipCountdown) this.world.getReadyTimer = 0;
    if (startWorld) this.world.startTicking();
    return result;
  }

  override initialiseRegion(): { player: Player } {
    const player = new ZekePlayer(this, { ...ZEKE_RULES.arena.playerSpawn.value }, "tank", () => this.invincible, (location) => {
      const state = this.mounted?.boss.encounter;
      if (!state) return null;
      const at = tick(state.tick + 1);
      return inDodgeWindow(state, at, tile(location.x, location.y)) ? at : null;
    });
    dressZekePlayer(player, this.config.setup ?? "melee");
    if (this.selectedRoute !== null) {
      player.prayerController.findPrayerByName("Protect from Melee").toggle(player);
      player.prayerController.findPrayerByName("Piety").toggle(player);
    }
    this.addPlayer(player);
    const boss = new Zeke(this, player, this.seed, this.routeDemo.pattern);
    this.addMob(boss);
    this.setBoss(boss);
    this.addEntity(new ZekeArena(this));
    for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
      const { min, max } = ZEKE_RULES.arena;
      const boundary = x < min.value || x > max.value || y < min.value || y > max.value;
      if (boundary) this.addEntity(new InvisibleMovementBlocker(this, { x, y }));
    }
    Object.values(ZEKE_PRESENTATION.sounds).forEach((id) => SoundCache.preload(cacheSound(id)));
    this.mounted = { boss, player };
    return { player };
  }

  override drawWorldBackground(context: OffscreenCanvasRenderingContext2D, scale: number): void {
    context.clearRect(0, 0, this.width * scale, this.height * scale);
  }

  override drawDefaultFloor(): boolean {
    // The cache arena supplies the floor; the transparent fallback still writes depth.
    return false;
  }

  get result(): ZekeRunResult | null {
    return this.runState.kind === "finished" ? this.runState.result : null;
  }

  override postTick(): void {
    if (!this.mounted) return;
    const { boss, player } = this.mounted;
    boss.recordTick();
    const row = boss.rows[boss.rows.length - 1];
    if (row && this.routeDemo.afterTick(row, tile(boss.location.x, boss.location.y), tile(player.location.x, player.location.y), boss.activeStepUnder)) {
      boss.currentStats = { ...boss.stats };
      player.currentStats = { ...player.stats };
    }
    const demoStatus = this.routeDemo.snapshot();
    if (demoStatus.kind === "failed") this.world.stopTicking();
    const state = this.runState;
    switch (state.kind) {
      case "active":
        if (player.currentStats.hitpoint <= 0) {
          this.runState = { kind: "dying", result: { kind: "death", tick: tick(boss.encounterTick), invincible: this.invincible } };
          for (const unit of [...this.players, ...this.mobs, ...this.newMobs]) {
            unit.incomingProjectiles = unit.incomingProjectiles.filter((projectile) => projectile.remainingDelay <= 0);
            unit.setAggro(null);
          }
          this.projectiles = this.projectiles.filter((projectile) => projectile.remainingDelay <= 0);
        } else if (boss.encounter.phase.kind === "ended") {
          this.runState = { kind: "finished", result: { kind: "victory", tick: tick(boss.encounterTick), invincible: this.invincible } };
        }
        break;
      case "dying":
        if (player.dying === 0) this.runState = { kind: "finished", result: state.result };
        break;
      case "finished":
        break;
      default: {
        const unhandled: never = state;
        return unhandled;
      }
    }
    if (this.runState.kind === "finished") this.world.stopTicking();
  }

  selectRouteScenario(id: ZekeRouteId | null, autoplay = false): void {
    this.selectedRoute = id;
    this.routeAutoplay = autoplay;
  }

  playRoute(): void { this.routeAutoplay = true; }
  takeRouteControl(): void { this.routeAutoplay = false; }
  routeDemoSnapshot(): ZekeRouteDemoStatus { return this.routeDemo.snapshot(); }

  override beforeNpcTurns(): void {
    if (!this.mounted) return;
    const state = this.mounted.boss.encounter;
    const at = tick(state.tick + 1);
    this.players.forEach((player) => {
      if (player instanceof ZekePlayer) player.beginEncounterTick(at);
    });
    const click = this.routeDemo.beforeTick(at);
    if (click) this.mounted.player.moveTo(click.to.x, click.to.y, "run-setting");
  }

  snapshot() {
    if (!this.mounted) return null;
    const { boss, player } = this.mounted;
    return {
      tick: boss.encounterTick,
      phase: boss.encounter.phase,
      result: this.result,
      boss: { hp: boss.currentStats.hitpoint, maxHp: boss.stats.hitpoint, defence: boss.currentStats.defence, tile: { ...boss.location } },
      player: {
        hp: player.currentStats.hitpoint, dying: player.dying, tile: { ...player.location },
        perceivedTile: player.getPerceivedLocation(0), dodge: player.lastDodge,
        dodgeAnimation: player.getAnimationMetadata(ZEKE_PRESENTATION.roll),
        specialEnergy: player.currentStats.specialAttack,
        specialSelected: player.useSpecialAttack,
        attackingBoss: player.aggro === boss,
        equipped: Object.fromEntries(Object.entries(player.equipment).map(([slot, item]) => [slot, item?.cacheItemId ?? null])),
        inventory: player.inventory.map((item) => item?.cacheItemId ?? null),
        attackStyle: player.equipment.weapon?.attackStyle() ?? null,
      },
      party: this.players.filter((participant): participant is ZekePlayer => participant instanceof ZekePlayer).map((participant) => ({ id: participant.participantId, hp: participant.currentStats.hitpoint, tile: { ...participant.location } })),
      autos: boss.rows.flatMap((row) => row.events).filter((event) => event.kind === "auto").length,
      stars: boss.encounter.stars,
      swords: boss.encounter.swords,
    };
  }

  fightLog() { return { seed: this.seed, rows: this.mounted?.boss.rows ?? [] }; }

  chat(): readonly string[] {
    return this.fightLog().rows.flatMap((row) => row.events.flatMap((event) => {
      switch (event.kind) {
        case "auto": return event.style === "magic" ? ["Ezekiel unleashes magic at everyone in the arena!"] : [];
        case "sword-charge": return ["Ezekiel's blades charge!"];
        case "sword-hit-boss": return ["A blade strikes Ezekiel, weakening him."];
        case "swords-missed": return ["Ezekiel absorbs the blades and heals."];
        default: return [];
      }
    }));
  }
}
