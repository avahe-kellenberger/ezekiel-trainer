import { ScytheOfVitur } from "osrs-sdk";
import type { Player } from "osrs-sdk";
import type { Tick, TickSpan, Tile } from "../../sim/brands";
import { HarmonisedNightmareStaff } from "./HarmonisedNightmareStaff";
import type { Zeke } from "./Zeke";

export type ZekeRouteAction =
  | Readonly<{ kind: "move"; to: Tile }>
  | Readonly<{ kind: "equip"; weapon: "harm" | "scythe" }>
  | Readonly<{ kind: "attack-sword"; index: number }>
  | Readonly<{ kind: "attack-boss" }>
  | Readonly<{ kind: "stop-attacking" }>;

export type ZekeTimedRouteAction = Readonly<{ at: TickSpan; action: ZekeRouteAction }>;
export type ZekeIssuedRouteAction = Readonly<{ tick: Tick; cycle: number; starOffset: TickSpan | null; action: ZekeRouteAction }>;
export type ZekeRouteCombatEvent =
  | Readonly<{ kind: "cast"; tick: Tick; swordIndex: number; landingAt: Tick; distance: number; damage: number }>
  | Readonly<{ kind: "sword-hit"; tick: Tick; swordIndex: number; damage: number }>
  | Readonly<{ kind: "scythe-hit"; tick: Tick; damage: number }>;
export type ZekeRecordedRouteCombat = ZekeRouteCombatEvent & Readonly<{ cycle: number; starOffset: TickSpan }>;
export type ZekeRouteActionResult = Readonly<{ kind: "issued" }> | Readonly<{ kind: "failed"; reason: string }>;

export function validateZekeRouteActions(actions: readonly ZekeTimedRouteAction[]): void {
  let previous = -1;
  for (const entry of actions) {
    if (entry.at <= previous) throw new Error("Route actions must have unique, increasing execution ticks.");
    previous = entry.at;
  }
}

export function executeZekeRouteAction(action: ZekeRouteAction, player: Player, boss: Zeke): ZekeRouteActionResult {
  switch (action.kind) {
    case "move":
      player.moveTo(action.to.x, action.to.y, "run-setting");
      break;
    case "equip": {
      const item = player.inventory.find((candidate) => action.weapon === "harm" ? candidate instanceof HarmonisedNightmareStaff : candidate instanceof ScytheOfVitur);
      if (!item) return { kind: "failed", reason: `The ${action.weapon} weapon switch is missing from the inventory.` };
      item.inventoryLeftClick(player);
      break;
    }
    case "attack-sword": {
      if (!(player.equipment.weapon instanceof HarmonisedNightmareStaff)) return { kind: "failed", reason: "The harm staff is not equipped for the scheduled cast." };
      const sword = boss.swordTarget(action.index);
      if (!sword || !sword.canBeAttacked()) return { kind: "failed", reason: `Sword ${action.index + 1} is unavailable for the scheduled cast.` };
      player.setAggro(sword);
      break;
    }
    case "attack-boss":
      player.setAggro(boss);
      break;
    case "stop-attacking":
      player.setAggro(null);
      break;
    default: {
      const unhandled: never = action;
      return unhandled;
    }
  }
  return { kind: "issued" };
}
