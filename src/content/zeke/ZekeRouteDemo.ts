import { span, tick } from "../../sim/brands";
import type { Tick, TickSpan, Tile } from "../../sim/brands";
import { ZEKE_RULES } from "./ZekeRules";
import { ZEKE_ROUTE_SCENARIOS } from "./ZekeRoutePlans";
import type { ZekeRouteClick, ZekeRouteId, ZekeRouteScenario } from "./ZekeRoutePlans";
import type { ZekeRow } from "./Zeke";

type RouteProgress = Readonly<{ scenario: ZekeRouteScenario; starOffset: TickSpan | null; lastClick: ZekeRouteClick | null; cycle: number }>;
export type ZekeRouteDemoStatus =
  | Readonly<{ kind: "disabled" }>
  | (RouteProgress & Readonly<{ kind: "practice" | "playing" }>)
  | (RouteProgress & Readonly<{ kind: "failed"; reason: string }>);

export class ZekeRouteDemo {
  private status: ZekeRouteDemoStatus;
  private starStarted: Tick | null = null;
  private bossSwordHits = 0;
  private meleeAutos = 0;
  private checkedReset = false;

  constructor(id: ZekeRouteId | null, autoplay: boolean) {
    const scenario = ZEKE_ROUTE_SCENARIOS.find((entry) => entry.id === id);
    this.status = scenario ? { kind: autoplay ? "playing" : "practice", scenario, starOffset: null, lastClick: null, cycle: 1 } : { kind: "disabled" };
  }

  snapshot(): ZekeRouteDemoStatus { return this.status; }

  get pattern() { return this.status.kind === "disabled" ? null : this.status.scenario.pattern; }

  beforeTick(at: Tick): ZekeRouteClick | null {
    if (this.status.kind === "disabled" || this.status.kind === "failed" || this.starStarted === null) return null;
    const starOffset = span(at - this.starStarted);
    const click = this.status.kind === "playing" ? this.status.scenario.clicks.find((candidate) => candidate.at === starOffset) ?? null : null;
    this.status = { ...this.status, starOffset, lastClick: click ?? this.status.lastClick };
    return click;
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
          const state = this.snapshot();
          if (state.kind === "disabled" || state.kind === "failed") break;
          const cycle: number = this.starStarted === null ? state.cycle : state.cycle + 1;
          this.starStarted = tick(row.tick);
          this.bossSwordHits = 0;
          this.meleeAutos = 0;
          this.checkedReset = false;
          this.status = { ...state, starOffset: span(0), lastClick: null, cycle };
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
    const state = this.snapshot();
    if (state.kind === "disabled" || state.kind === "failed" || this.starStarted === null) return false;
    const starOffset = span(row.tick - this.starStarted);
    this.status = { ...state, starOffset };
    const resetOffset = ZEKE_RULES.swords.chargeAfter.value + ZEKE_RULES.autos.recoveryStar.value - 1;
    if (state.kind === "practice" || starOffset < resetOffset || this.checkedReset) return replenish;
    this.checkedReset = true;
    const homeBoss = ZEKE_RULES.arena.bossSpawn.value;
    const homeTank = ZEKE_RULES.arena.playerSpawn.value;
    if (boss.x !== homeBoss.x || boss.y !== homeBoss.y || tank.x !== homeTank.x || tank.y !== homeTank.y) {
      this.fail("The boss and tank did not return to their starting tiles before the next star.");
    } else if (this.bossSwordHits !== state.scenario.expectedHits) {
      this.fail(`Expected ${state.scenario.expectedHits} boss sword hits; observed ${this.bossSwordHits}.`);
    } else if (this.meleeAutos !== ZEKE_RULES.autos.count.value * 2) {
      this.fail("The route did not contain all four melee attacks.");
    } else replenish = true;
    return replenish;
  }
}
