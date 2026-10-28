import { InvisibleMovementBlocker, MeleeWeapon, Mob, Pathing, Projectile, Settings, Sound, SoundCache, cacheSound } from "osrs-sdk";
import type { IncomingAttackRoll, IncomingAttackRollModifiers, Model, Region, Unit } from "osrs-sdk";
import { clientCycles, seed, tick, tile } from "../../sim/brands";
import type { ClientCycles, Tick } from "../../sim/brands";
import { ZEKE_RULES } from "./ZekeRules";
import { ZEKE_PRESENTATION } from "./assets";
import { advanceEncounter, cleaveDustTiles, createEncounter, resolveAfterMovement } from "./mechanics";
import type { BossMovement, EncounterEvent, EncounterState, SwordPattern } from "./mechanics";
import { ZekePlayer } from "./ZekePlayer";
import { ZekeModel } from "./ZekeModel";
import { FinaleBlade, FinaleFence, ZekeStar, ZekeSword } from "./hazards";
import { ZEKE_DIALOGUE, ZEKE_SOUND_VOLUME } from "./presentation";
import { CleaveDust } from "./CleaveDust";

type HitStyle = "melee" | "magic" | "hazard";
type NonSwordHitEvent = Exclude<EncounterEvent, Readonly<{ kind: "sword-hit-boss" | "sword-hit-player" }>>;

class ZekeHit extends Projectile {
  constructor(from: Unit, private readonly target: ZekePlayer, private readonly hitStyle: HitStyle, private readonly rolled: number, private readonly protectedRoll: number) {
    super(null, rolled, from, target, hitStyle === "melee" ? "slash" : hitStyle === "magic" ? "magic" : "typeless", {
      setDelay: 1,
      visuals: hitStyle === "magic" ? { spotAnim: { id: ZEKE_PRESENTATION.spotAnims.magic }, verticalOffset: 2 } : { hidden: true },
    });
  }

  override beforeHit(): void {
    super.beforeHit();
    const protectedByPrayer = this.hitStyle !== "hazard" && this.target.prayerController.matchFeature(this.hitStyle);
    this.damage = Math.min(this.target.currentStats.hitpoint, protectedByPrayer ? this.protectedRoll : this.rolled);
  }
}

export type ZekeRow = Readonly<{ tick: number; phase: EncounterState["phase"]; boss: Readonly<{ x: number; y: number; hp: number }>; players: readonly Readonly<{ id: string; x: number; y: number; hp: number }>[]; events: readonly EncounterEvent[] }>;

export class Zeke extends Mob {
  encounter: EncounterState;
  readonly rows: ZekeRow[] = [];
  private elapsed = 0;
  private activeStepUnderThisTick = false;
  private motion: BossMovement = { kind: "hold" };
  private readonly stars = new Map<number, ZekeStar>();
  private readonly swords = new Map<number, ZekeSword>();
  private randomState: number;
  private recentEvents: readonly EncounterEvent[] = [];
  private swordHits: Readonly<{ tick: number; hits: Unit["hitsThisTick"] }> = { tick: -1, hits: [] };
  private finaleBlades: readonly FinaleBlade[] = [];
  private finaleScenery: readonly FinaleFence[] = [];
  private dialogueIndex = 0;
  private speechEndsAt = clientCycles(0);
  private readonly soundTicks = new Map<number, Tick>();

  constructor(region: Region, private readonly tank: ZekePlayer, seedValue: number, private readonly patternOverride: SwordPattern | null = null) {
    super(region, { ...ZEKE_RULES.arena.bossSpawn.value });
    this.encounter = createEncounter(seed(seedValue));
    this.randomState = seedValue ^ 0x5eed0c0b;
    this.dialogueIndex = seedValue;
    this.setAggro(tank);
  }

  override setStats(): void {
    const boss = ZEKE_RULES.boss;
    this.stats = { attack: boss.attack.value, strength: boss.strength.value, defence: boss.defence.value, magic: boss.magic.value, range: boss.ranged.value, hitpoint: boss.hitpoints.value };
    this.currentStats = { ...this.stats };
  }

  override mobName(): string { return "Ezekiel"; }
  override get combatLevel(): number { return ZEKE_RULES.boss.combatLevel.value; }
  override get size(): number { return ZEKE_RULES.boss.size.value; }
  override get drawOutline(): boolean { return false; }
  override get drawTrueTile(): boolean { return true; }
  override get attackRange(): number { return 1; }
  override get attackSpeed(): number { return ZEKE_RULES.autos.interval.value; }
  override get idlePoseId(): number {
    if (this.encounter?.phase.kind === "enrage") return ZEKE_PRESENTATION.finaleLoop;
    const phase = this.encounter?.phase;
    return phase?.kind === "recovery" && phase.recovery === "weaken" && this.elapsed < phase.stunnedUntil - ZEKE_RULES.swords.wakeBeforeStunEnds.value ? ZEKE_PRESENTATION.weaken : ZEKE_PRESENTATION.idle;
  }
  override get walkingPoseId(): number { return ZEKE_PRESENTATION.walk; }
  override get deathAnimationId(): number { return this.encounter?.phase.kind === "enrage" || this.finaleBlades.length > 0 ? ZEKE_PRESENTATION.finaleDeath : ZEKE_PRESENTATION.death; }
  override create3dModel(): Model { return new ZekeModel(this); }

  override incomingAttackRollModifiers(attack: IncomingAttackRoll): IncomingAttackRollModifiers {
    const inherited = super.incomingAttackRollModifiers(attack);
    const phase = this.encounter.phase;
    return attack.weapon instanceof MeleeWeapon && phase.kind === "recovery" && phase.recovery === "weaken" && this.encounter.tick < phase.stunnedUntil - ZEKE_RULES.swords.wakeBeforeStunEnds.value
      ? { ...inherited, guaranteedHit: ZEKE_RULES.swords.stunnedMeleeAccuracy.value === 1 }
      : inherited;
  }

  override drawOverheadText(context: OffscreenCanvasRenderingContext2D, scale: number, alignCenter = true, prefix = ""): void {
    // Mob already projects to head height; cancel Unit's additional tile-size offset.
    context.save();
    context.translate(0, (this.size / 2) * scale);
    super.drawOverheadText(context, scale, alignCenter, prefix);
    context.restore();
  }

  override clientTick(tickPercent: number, timestamp = window.performance.now()): void {
    super.clientTick(tickPercent, timestamp);
    if (this.region.world.clientTickCounter >= this.speechEndsAt) this.overheadText = null;
  }

  override queueStep(): void {
    super.queueStep();
    if (this.tank.currentStats.hitpoint <= 0) return;
    this.elapsed++;
    if (this.elapsed === ZEKE_RULES.dialogue.engageAfter.value && this.encounter.phase.kind === "opening") this.speak(this.nextLine(ZEKE_DIALOGUE.engage));
    const result = advanceEncounter(this.encounter, this.observe(), this.patternOverride);
    this.encounter = result.state;
    this.motion = result.movement;
    this.recentEvents = result.events;
    const phase = this.encounter.phase;
    if (phase.kind === "recovery" && phase.recovery === "weaken" && this.elapsed === phase.stunnedUntil - ZEKE_RULES.swords.wakeBeforeStunEnds.value) this.playAnimation(ZEKE_PRESENTATION.weakenEnd);
    this.syncHazards();
    this.applyEvents(result.events);
  }

  private observe() {
    return {
      tick: tick(this.elapsed), boss: tile(this.location.x, this.location.y), tank: tile(this.tank.location.x, this.tank.location.y),
      party: this.participants().map((player) => ({ id: player.participantId, tile: tile(player.location.x, player.location.y) })),
      dodgeLandings: this.participants().flatMap((player) => {
        const landing = player.dodgeLanding(tick(this.elapsed));
        return landing ? [{ id: player.participantId, tile: tile(landing.x, landing.y) }] : [];
      }),
      bossAlive: this.currentStats.hitpoint > 0, bossHp: this.currentStats.hitpoint, maxHp: this.stats.hitpoint,
      swordCharges: [...this.swords].map(([id, sword]) => ({ id, damage: sword.chargeDamage })),
    };
  }

  swordTarget(index: number): ZekeSword | null {
    const sword = this.encounter.swords[index];
    return sword ? this.swords.get(sword.id) ?? null : null;
  }

  override attackIfPossible(): void {}

  override attackStep(): void {
    if (this.tank.currentStats.hitpoint <= 0) {
      super.attackStep();
      return;
    }
    const result = resolveAfterMovement(this.encounter, this.observe());
    this.encounter = result.state;
    this.recentEvents = [...this.recentEvents, ...result.events];
    this.syncHazards();
    this.applyEvents(result.events);
    super.attackStep();
  }

  override canMove(): boolean {
    return this.tank.currentStats.hitpoint > 0 && this.motion.kind !== "hold" && (this.motion.kind === "walk-under" || !this.hasLOS) && this.currentStats.hitpoint > 0 && !this.isFrozen() && !this.isDying();
  }

  override movementStep(): void {
    this.activeStepUnderThisTick = false;
    if (this.tank.currentStats.hitpoint <= 0 || this.motion.kind === "hold" || this.currentStats.hitpoint <= 0 || this.isFrozen() || this.isDying()) {
      if (this.visualPath.length === 0) this.visualMovementActive = false;
      return;
    }
    if (this.motion.kind === "follow") {
      super.movementStep();
      return;
    }
    this.activeStepUnderThisTick = this.canMove();
    const next = { x: this.location.x + this.motion.dx, y: this.location.y + this.motion.dy };
    this.region.clearTileCollisionFlags(this.location.x, this.location.y, this.size);
    const clear = Pathing.canTileBePathedTo(this.region, next.x, next.y, this.size, true);
    if (clear) {
      this.location = next;
      this.visualPath.push({ ...next, run: false });
      this.visualMovementActive = true;
    } else if (this.visualPath.length === 0) this.visualMovementActive = false;
    this.region.setTileCollisionFlags(this.location.x, this.location.y, this.size);
  }

  recordTick(): void {
    if (this.elapsed < 0 || this.rows[this.rows.length - 1]?.tick === this.elapsed) return;
    this.rows.push({ tick: this.elapsed, phase: this.encounter.phase, boss: { ...this.location, hp: this.currentStats.hitpoint }, players: this.participants().map((player) => ({ id: player.participantId, ...player.location, hp: player.currentStats.hitpoint })), events: this.recentEvents });
  }

  get encounterTick(): number { return this.elapsed; }
  get activeStepUnder(): boolean { return this.activeStepUnderThisTick; }

  override get hitsThisTick(): Unit["hitsThisTick"] {
    return this.swordHits.tick === this.region.world.globalTickCounter ? [...super.hitsThisTick, ...this.swordHits.hits] : super.hitsThisTick;
  }

  private receiveSwordHit(damage: number): void {
    // Collision occurs after this NPC's queueStep. Resolve only this hit;
    // draining its queue again would advance unrelated attacks twice.
    const hit = new Projectile(null, damage, this.tank, this, "typeless", { setDelay: 1, visuals: { hidden: true } });
    hit.onTick();
    hit.beforeHit();
    this.currentStats.hitpoint = Math.max(0, this.currentStats.hitpoint - hit.damage);
    this.addProjectile(hit);
    const at = this.region.world.globalTickCounter;
    const previous = this.swordHits.tick === at ? this.swordHits.hits : [];
    this.swordHits = { tick: at, hits: [...previous, { damage: hit.damage, attackStyle: hit.attackStyle, from: hit.from }] };
    this.damageTaken();
    this.lastHitAgo = 0;
    this.postAttacksEvent();
  }

  private participants(): ZekePlayer[] {
    return this.region.players.filter((player): player is ZekePlayer => player instanceof ZekePlayer && player.currentStats.hitpoint > 0);
  }

  private roll(maximum: number): number {
    this.randomState = (Math.imul(this.randomState, 1664525) + 1013904223) >>> 0;
    return Math.floor((this.randomState / 4294967296) * (maximum + 1));
  }

  private hit(id: string, style: HitStyle, maximum: number, protectedMaximum = 0): void {
    const player = this.participants().find((candidate) => candidate.participantId === id);
    if (player) player.addProjectile(new ZekeHit(this, player, style, style === "hazard" ? maximum : this.roll(maximum), this.roll(protectedMaximum)));
  }

  private sound(id: number, delay: ClientCycles = clientCycles(0)): void {
    const at = tick(this.elapsed);
    if (this.soundTicks.get(id) === at) return;
    this.soundTicks.set(id, at);
    SoundCache.play(new Sound(cacheSound(id), ZEKE_SOUND_VOLUME, delay * Settings.tickMs / 30, { location: this.location, range: 20, retain: 1 }));
  }

  private speak(text: string): void {
    this.setOverheadText(text);
    this.speechEndsAt = clientCycles(this.region.world.clientTickCounter + ZEKE_RULES.dialogue.lifetime.value);
  }

  private nextLine(lines: readonly string[]): string {
    const line = lines[this.dialogueIndex % lines.length];
    this.dialogueIndex++;
    return line;
  }

  private applyEvents(events: readonly EncounterEvent[]): void {
    let bossDamage: number | null = null;
    const playerDamage = new Map<string, number>();
    for (const event of events) {
      if (event.kind === "sword-hit-boss") bossDamage = (bossDamage ?? 0) + event.chargeDamage;
      else if (event.kind === "sword-hit-player") playerDamage.set(event.target, (playerDamage.get(event.target) ?? 0) + event.chargeDamage);
      else this.apply(event);
    }
    if (bossDamage !== null) {
      this.speak(ZEKE_DIALOGUE.weakened);
      this.receiveSwordHit(bossDamage);
      this.playAnimation(ZEKE_PRESENTATION.weakenStart);
      this.sound(ZEKE_PRESENTATION.sounds.swordImpact);
    }
    for (const [target, damage] of playerDamage) this.hit(target, "hazard", damage);
  }

  private apply(event: NonSwordHitEvent): void {
    switch (event.kind) {
      case "auto": {
        const magic = event.style === "magic";
        this.playAnimation(magic ? ZEKE_PRESENTATION.magic : ZEKE_PRESENTATION.melee);
        if (magic) { this.sound(ZEKE_PRESENTATION.sounds.magic); this.addSpotAnim({ id: ZEKE_PRESENTATION.spotAnims.magic, channel: "zeke-magic" }); }
        else {
          const delays = ZEKE_RULES.autos.cleaveDustDelays.value;
          for (const at of cleaveDustTiles(tile(this.location.x, this.location.y), tile(this.tank.location.x, this.tank.location.y))) {
            const delay = delays[(at.x + at.y + this.elapsed) % delays.length];
            this.region.addEntity(new CleaveDust(this.region, at, delay));
          }
        }
        event.targets.forEach((id) => this.hit(id, event.style, magic ? ZEKE_RULES.autos.magicMax.value : ZEKE_RULES.autos.meleeMax.value, magic ? ZEKE_RULES.autos.protectedMagicMax.value : ZEKE_RULES.autos.protectedMeleeMax.value));
        return;
      }
      case "star-tell":
        this.speak(this.nextLine(ZEKE_DIALOGUE.star));
        this.playAnimation(ZEKE_PRESENTATION.special);
        this.addSpotAnim({ id: ZEKE_PRESENTATION.spotAnims.crack, channel: "zeke-special" });
        this.sound(ZEKE_PRESENTATION.sounds.starStart);
        return;
      case "star-burst":
        this.sound(this.encounter.phase.kind === "enrage" ? ZEKE_PRESENTATION.sounds.finaleStrike : ZEKE_PRESENTATION.sounds.starBeat);
        return;
      case "star-expire": return;
      case "star-hit": this.hit(event.target, "hazard", ZEKE_RULES.star.damageMin.value + this.roll(ZEKE_RULES.star.damage.value - ZEKE_RULES.star.damageMin.value)); return;
      case "sword-charge": this.sound(ZEKE_PRESENTATION.sounds.swordFlight1); return;
      case "swords-missed":
        this.speak(ZEKE_DIALOGUE.heal);
        this.playAnimation(ZEKE_PRESENTATION.heal);
        this.addSpotAnim({ id: ZEKE_PRESENTATION.spotAnims.healGlow, channel: "zeke-heal-glow" });
        this.addSpotAnim({ id: ZEKE_PRESENTATION.spotAnims.heal, channel: "zeke-heal" });
        return;
      case "boss-heal":
        this.currentStats.hitpoint = Math.min(this.stats.hitpoint, this.currentStats.hitpoint + Math.floor(this.stats.hitpoint * event.fraction));
        return;
      case "enrage-start": {
        this.setLocation({ ...event.boss });
        this.playAnimation(ZEKE_PRESENTATION.finale);
        this.addSpotAnim({ id: ZEKE_PRESENTATION.finaleGlow, channel: "zeke-finale-glow" });
        this.addSpotAnim({ id: ZEKE_PRESENTATION.finaleEffects.cast, channel: "zeke-finale-cast" });
        return;
      }
      case "enrage-cage": {
        this.participants().forEach((player) => { player.setLocation({ ...event.player }); player.moveTo(event.player.x, event.player.y); });
        const { min, max } = ZEKE_RULES.enrage;
        for (let y = min.value - 1; y <= max.value + 1; y++) for (let x = min.value - 1; x <= max.value + 1; x++) {
          if (x < min.value || x > max.value || y < min.value || y > max.value) this.region.addEntity(new InvisibleMovementBlocker(this.region, { x, y }));
        }
        const fenceTiles = [tile(1, 3), tile(4, 3), tile(7, 3), tile(1, 6), tile(1, 9), tile(4, 9), tile(7, 9)];
        this.finaleScenery = fenceTiles.map((at, index) => new FinaleFence(this.region, at, index));
        this.finaleScenery.forEach((view) => this.region.addEntity(view));
        const bladeTiles = [tile(7, 5), tile(8, 4), tile(8, 6)];
        this.finaleBlades = ZEKE_PRESENTATION.finaleBlades.map((look, index) => new FinaleBlade(this.region, bladeTiles[index], look));
        this.finaleBlades.forEach((view) => this.region.addEntity(view));
        this.sound(ZEKE_PRESENTATION.sounds.finaleDrop);
        return;
      }
      case "enrage-tell":
        this.finaleBlades.forEach((blade, index) => {
          const lit = event.safe === "west" ? index !== 0 : event.safe === "north" ? index !== 1 : index !== 2;
          if (lit) blade.tell();
        });
        this.sound(ZEKE_PRESENTATION.sounds.finaleFront);
        return;
      case "enrage-dodge-cue": this.sound(ZEKE_PRESENTATION.sounds.finaleDodgeCue); return;
      case "enrage-hit": this.hit(event.target, "hazard", ZEKE_RULES.enrage.damageMin.value + this.roll(ZEKE_RULES.enrage.damage.value - ZEKE_RULES.enrage.damageMin.value)); return;
      case "successful-dodge":
        this.participants().find((player) => player.participantId === event.target)?.confirmSuccessfulDodge(event.tick);
        return;
      case "enrage-reset": this.sound(ZEKE_PRESENTATION.sounds.finaleReset, ZEKE_RULES.enrage.resetSoundDelay.value); return;
      case "ended":
        this.speak(ZEKE_DIALOGUE.death);
        this.motion = { kind: "hold" };
        this.playAnimation(this.deathAnimationId);
        this.finaleBlades.forEach((view) => { view.dying = 0; });
        this.finaleScenery.forEach((view) => { view.dying = 0; });
        return;
      default: { const unhandled: never = event; return unhandled; }
    }
  }

  private syncHazards(): void {
    const liveStars = new Set(this.encounter.stars.filter((star) => star.visual !== null).map((star) => star.id));
    for (const [id, view] of this.stars) if (!liveStars.has(id)) { view.dying = 0; this.stars.delete(id); }
    for (const star of this.encounter.stars) if (star.visual !== null && !this.stars.has(star.id)) {
      const view = new ZekeStar(this.region, star.tile, star.visual);
      this.region.addEntity(view);
      this.stars.set(star.id, view);
    }
    const liveSwords = new Set(this.encounter.swords.filter((sword) => sword.status !== "spent").map((sword) => sword.id));
    for (const [id, view] of this.swords) if (!liveSwords.has(id)) { view.dying = 0; this.swords.delete(id); }
    for (const sword of this.encounter.swords) if (sword.status !== "spent") {
      const view = this.swords.get(sword.id);
      if (view) view.move(sword.tile, sword.status !== "charging");
      else {
        const created = new ZekeSword(this.region, sword.tile, sword, () => this.encounter.tick);
        this.region.addMob(created);
        this.swords.set(sword.id, created);
      }
    }
  }
}
