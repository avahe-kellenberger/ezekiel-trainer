import { span, tick } from "../../sim/brands";
import type { Tick, TickSpan, Tile } from "../../sim/brands";
import { ZEKE_RULES } from "./ZekeRules";
import { ZEKE_ROUTE_SCENARIOS } from "./ZekeRoutePlans";
import type { ZekeRouteClick, ZekeRouteId, ZekeRouteScenario } from "./ZekeRoutePlans";
import type { ZekeRow } from "./Zeke";
import { nextStarAt } from "./mechanics";
import { validateZekeRouteActions } from "./ZekeRouteActions";
import type { ZekeIssuedRouteAction, ZekeRecordedRouteCombat, ZekeRouteAction, ZekeRouteCombatEvent } from "./ZekeRouteActions";

type RouteProgress = Readonly<{ scenario: ZekeRouteScenario; starOffset: TickSpan | null; cycle: number }>;
export type ZekeRouteAttackMode = "scythe" | "wind-surge";
type RouteState =
  | Readonly<{ kind: "disabled" }>
  | (RouteProgress & Readonly<{ kind: "practice" | "playing" }>)
  | (RouteProgress & Readonly<{ kind: "failed"; reason: string }>);

export type ZekeRouteDemoStatus =
  | Readonly<{ kind: "disabled"; attackMode: ZekeRouteAttackMode }>
  | (Exclude<RouteState, Readonly<{ kind: "disabled" }>> & Readonly<{ attackMode: ZekeRouteAttackMode; lastClick: ZekeRouteClick | null; issuedActions: readonly ZekeIssuedRouteAction[]; combat: readonly ZekeRecordedRouteCombat[] }>);

export class ZekeRouteDemo {
  private status: RouteState;
  private readonly issued: ZekeIssuedRouteAction[] = [];
  private readonly combat: ZekeRecordedRouteCombat[] = [];
  private dispatchedAt: Tick | null = null;
  private starStarted: Tick | null = null;
  private bossSwordHits = 0;
  private meleeAutos = 0;
  private checkedReset = false;

  constructor(id: ZekeRouteId | null, autoplay: boolean, readonly attackMode: ZekeRouteAttackMode = "scythe") {
    const scenario = ZEKE_ROUTE_SCENARIOS.find((entry) => entry.id === id);
    if (scenario) {
      validateZekeRouteActions(scenario.openingActions);
      validateZekeRouteActions(scenario.actions);
    }
    this.status = scenario ? { kind: autoplay ? "playing" : "practice", scenario, starOffset: null, cycle: 1 } : { kind: "disabled" };
  }

  private readState(): RouteState { return this.status; }

  snapshot(): ZekeRouteDemoStatus {
    if (this.status.kind === "disabled") return { ...this.status, attackMode: this.attackMode };
    const cycle = this.status.cycle;
    const lastMove = [...this.issued].reverse().find((entry) => entry.cycle === cycle && entry.starOffset !== null && entry.action.kind === "move");
    const lastClick: ZekeRouteClick | null = lastMove?.action.kind === "move" && lastMove.starOffset !== null ? { at: lastMove.starOffset, to: lastMove.action.to } : null;
    return { ...this.status, attackMode: this.attackMode, lastClick, issuedActions: this.issuedActions(), combat: [...this.combat] };
  }

  issuedActions(): readonly ZekeIssuedRouteAction[] { return [...this.issued]; }

  recordCombat(events: readonly ZekeRouteCombatEvent[]): void {
    if (this.status.kind !== "playing" || this.starStarted === null) return;
    for (const event of events) this.combat.push({ ...event, cycle: this.status.cycle, starOffset: span(event.tick - this.starStarted) });
  }

  recordIssued(at: Tick, action: ZekeRouteAction): void {
    if (this.status.kind !== "playing") return;
    if (this.issued.some((entry) => entry.tick === at)) throw new Error("A route issued more than one action on the same tick.");
    this.issued.push({ tick: at, cycle: this.status.cycle, starOffset: this.starStarted === null ? null : span(at - this.starStarted), action });
  }

  get pattern() { return this.status.kind === "disabled" ? null : this.status.scenario.pattern; }

  beforeTick(at: Tick): ZekeRouteAction | null {
    if (this.status.kind === "disabled" || this.status.kind === "failed") return null;
    const starOffset = this.starStarted === null ? null : span(at - this.starStarted);
    this.status = { ...this.status, starOffset };
    if (this.status.kind !== "playing" || this.dispatchedAt === at) return null;
    this.dispatchedAt = at;
    const actions = this.starStarted === null ? this.status.scenario.openingActions : this.status.scenario.actions;
    const offset = starOffset ?? span(at - 0);
    const action = actions.find((candidate) => candidate.at === offset)?.action ?? null;
    if (this.attackMode === "wind-surge") return action;
    if (action?.kind === "move" || action?.kind === "attack-boss") return action;
    return null;
  }

  canIssueScythe(at: Tick): boolean {
    return this.status.kind === "playing" && this.attackMode === "scythe" && !this.issued.some((entry) => entry.tick === at);
  }

  fail(reason: string): void {
    if (this.status.kind !== "playing") return;
    this.status = { ...this.status, kind: "failed", reason };
  }

  afterTick(row: ZekeRow, boss: Tile, tank: Tile, activeStepUnder: boolean): boolean {
    if (this.status.kind === "disabled" || this.status.kind === "failed") return false;
    let replenish = false;
    if (activeStepUnder) this.fail("Tank stepped under the boss while he could move.");
    for (const event of row.events) {
      switch (event.kind) {
        case "auto":
          if (event.style === "magic") this.fail("The boss used a room-wide magic attack.");
          else this.meleeAutos++;
          break;
        case "star-tell": {
          const state = this.readState();
          if (state.kind === "disabled" || state.kind === "failed") break;
          const cycle: number = this.starStarted === null ? state.cycle : state.cycle + 1;
          this.starStarted = tick(row.tick);
          this.bossSwordHits = 0;
          this.meleeAutos = 0;
          this.checkedReset = false;
          this.status = { ...state, starOffset: span(0), cycle };
          replenish = true;
          break;
        }
        case "sword-hit-boss": this.bossSwordHits++; break;
        case "star-hit": case "sword-hit-player": this.fail("The tank was hit by a star or sword."); break;
        case "swords-missed": case "boss-heal": this.fail("The boss missed the swords or healed."); break;
        case "enrage-start": case "ended": this.fail("The encounter left sword practice."); break;
        case "star-burst": case "star-expire": case "sword-charge": case "enrage-cage": case "enrage-tell": case "enrage-dodge-cue": case "enrage-hit": case "successful-dodge": case "enrage-reset": break;
        default: { const unhandled: never = event; return unhandled; }
      }
    }
    const state = this.readState();
    if (state.kind === "disabled" || state.kind === "failed" || this.starStarted === null) return false;
    const starOffset = span(row.tick - this.starStarted);
    this.status = { ...state, starOffset };
    const nextStar = row.phase.kind === "recovery" ? nextStarAt(row.phase) : null;
    if (state.kind === "practice" || nextStar === null || row.tick < nextStar - 1 || this.checkedReset) return replenish;
    this.checkedReset = true;
    const homeBoss = ZEKE_RULES.arena.bossSpawn.value;
    const homeTank = ZEKE_RULES.arena.playerSpawn.value;
    if (boss.x !== homeBoss.x || boss.y !== homeBoss.y || tank.x !== homeTank.x || tank.y !== homeTank.y) {
      this.fail("The boss and tank did not return to their starting tiles before the next star.");
    } else if (this.bossSwordHits !== state.scenario.expectedHits) {
      this.fail(`Expected ${state.scenario.expectedHits} boss sword hits; observed ${this.bossSwordHits}.`);
    } else if (this.meleeAutos !== ZEKE_RULES.autos.count.value * 2) {
      this.fail("The route did not contain all four melee attacks.");
    } else if (!this.combatComplete(state.scenario, state.cycle)) {
      this.fail(this.attackMode === "wind-surge" ? "The scheduled sword casts, landings, or return to scythe did not complete." : "The scythe route did not land an attack on the boss.");
    } else replenish = true;
    return replenish;
  }

  private combatComplete(scenario: ZekeRouteScenario, cycle: number): boolean {
    const events = this.combat.filter((event) => event.cycle === cycle);
    if (this.attackMode === "scythe") return events.some((event) => event.kind === "scythe-hit") && events.every((event) => event.kind === "scythe-hit");
    const casts = events.filter((event) => event.kind === "cast");
    const targets = scenario.actions.flatMap(({ action }) => action.kind === "attack-sword" ? [action.index] : []);
    const landed = events.filter((event) => event.kind === "sword-hit");
    return casts.length === scenario.expectedCasts && new Set(casts.map((event) => event.swordIndex)).size === targets.length
      && targets.every((index) => casts.some((event) => event.swordIndex === index) && landed.some((event) => event.swordIndex === index))
      && events.some((event) => event.kind === "scythe-hit");
  }
}
