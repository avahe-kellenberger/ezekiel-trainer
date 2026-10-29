import { LineOfSight, ScytheOfVitur, Settings, TrainerInstance } from "osrs-sdk";
import { Zeke } from "../../src/content/zeke/Zeke";
import { ZekePlayer } from "../../src/content/zeke/ZekePlayer";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import type { ZekeRouteId } from "../../src/content/zeke/ZekeRoutePlans";

const limits: readonly Readonly<{ id: ZekeRouteId; steps: number; approach: number; homeAfterStun: number; firstScythe: number; firstSurgeScythe: number }>[] = [
  { id: "cross-2-2", steps: 21, approach: 3, homeAfterStun: 5, firstScythe: 32, firstSurgeScythe: 33 },
  { id: "cross-5-2", steps: 20, approach: 1, homeAfterStun: 4, firstScythe: 31, firstSurgeScythe: 33 },
  { id: "cross-8-2", steps: 24, approach: 2, homeAfterStun: 3, firstScythe: 34, firstSurgeScythe: 33 },
  { id: "cross-2-5", steps: 13, approach: 1, homeAfterStun: 3, firstScythe: 32, firstSurgeScythe: 33 },
  { id: "cross-8-5", steps: 15, approach: 1, homeAfterStun: 4, firstScythe: 31, firstSurgeScythe: 33 },
  { id: "cross-2-8", steps: 20, approach: 3, homeAfterStun: 3, firstScythe: 32, firstSurgeScythe: 33 },
  { id: "cross-5-8", steps: 18, approach: 1, homeAfterStun: 5, firstScythe: 32, firstSurgeScythe: 33 },
  { id: "cross-8-8", steps: 22, approach: 2, homeAfterStun: 4, firstScythe: 32, firstSurgeScythe: 33 },
  { id: "parallel-x", steps: 20, approach: 2, homeAfterStun: 3, firstScythe: 33, firstSurgeScythe: 34 },
  { id: "parallel-y", steps: 13, approach: 1, homeAfterStun: 3, firstScythe: 32, firstSurgeScythe: 31 },
  { id: "two-rows", steps: 8, approach: 0, homeAfterStun: 2, firstScythe: 32, firstSurgeScythe: 32 },
];
const modes = ["scythe", "wind-surge"] as const;
const cases = limits.flatMap((limit) => modes.flatMap((attackMode) => [1, 17, 99].map((seed) => ({ limit, attackMode, seed }))));

test.each(cases)("$limit.id $attackMode seed $seed approaches melee directly and returns without excess travel over three cycles", ({ limit, attackMode, seed }) => {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false, inputDelay: 0 });
  const region = new ZekeRegion({ seed, routeDemo: limit.id, routeAutoplay: true, routeAttackMode: attackMode });
  const trainer = new TrainerInstance(region, { readyTimer: 0 });
  trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const boss = region.primaryBoss;
  const player = region.players[0];
  if (!(boss instanceof Zeke) || !(player instanceof ZekePlayer)) throw new Error("Missing native actors.");
  const loop = vi.spyOn(region.world, "startLoop").mockImplementation(() => {});
  const swings: number[] = [];
  const missed: number[] = [];
  const didAttack = player.didAttack.bind(player);
  const attackStep = player.attackStep.bind(player);
  const observe = vi.spyOn(player, "didAttack").mockImplementation(() => {
    if (player.aggro === boss && player.equipment.weapon instanceof ScytheOfVitur) swings.push(boss.encounterTick);
    didAttack();
  });
  const opportunities = vi.spyOn(player, "attackStep").mockImplementation(() => {
    const phase = boss.encounter.phase;
    const eligible = phase.kind === "recovery" && phase.recovery === "weaken" && boss.encounterTick < phase.stunnedUntil
      && boss.encounter.swords.every((sword) => sword.status === "impacted" || sword.status === "spent")
      && player.equipment.weapon instanceof ScytheOfVitur && player.attackDelay <= 0
      && LineOfSight.playerHasLineOfSightOfMob(region, player.location.x, player.location.y, boss, player.attackRange);
    attackStep();
    if (!eligible || swings.includes(boss.encounterTick)) return;
    const status = region.routeDemoSnapshot();
    const equipped = status.kind !== "disabled" && status.issuedActions.some((entry) => entry.tick === boss.encounterTick && entry.action.kind === "equip" && entry.action.weapon === "scythe");
    if (!equipped) missed.push(boss.encounterTick);
  });
  let now = window.performance.now();
  const clock = vi.spyOn(window.performance, "now").mockImplementation(() => now);
  const cycles: { start: number; steps: number; approach: number; impact: number | null; until: number | null; home: number | null; visible: boolean }[] = [];
  try {
    region.world.startTicking();
    for (let count = 0; count < 180 && cycles.length < 4; count++) {
      const before = { ...player.location };
      region.world.tickWorld();
      const status = region.routeDemoSnapshot();
      expect(status.kind).toBe("playing");
      if (status.kind !== "playing") throw new Error("Route stopped before the fourth swords.");
      const row = boss.rows.at(-1);
      if (!row) throw new Error("Missing fight row.");
      if (row.events.some((event) => event.kind === "star-tell")) cycles.push({ start: boss.encounterTick, steps: 0, approach: 0, impact: null, until: null, home: null, visible: false });
      if (cycles.length === 4) break;
      const cycle = cycles.at(-1);
      const phase = boss.encounter.phase;
      const step = Math.max(Math.abs(player.location.x - before.x), Math.abs(player.location.y - before.y));
      if (cycle) {
        cycle.steps += step;
        if (boss.encounter.swords.length > 0 && boss.encounter.swords.every((sword) => sword.status === "impacted" || sword.status === "spent")) cycle.impact ??= boss.encounterTick;
        if (phase.kind === "recovery" && phase.recovery === "weaken") {
          cycle.until = phase.stunnedUntil;
          if (cycle.impact !== null && boss.encounterTick >= cycle.impact && boss.encounterTick < phase.stunnedUntil - 1) {
            expect(status.issuedActions.filter((entry) => entry.tick === boss.encounterTick && entry.action.kind === "move")).toEqual([]);
          }
          if (cycle.impact !== null && boss.encounterTick >= cycle.impact && boss.encounterTick < phase.stunnedUntil - 1) cycle.approach += step;
          if (boss.encounterTick >= phase.stunnedUntil && player.location.x === 4 && player.location.y === 7 && boss.location.x === 4 && boss.location.y === 6) cycle.home ??= boss.encounterTick;
        }
      }
      for (let client = 0; client < 30; client++) { region.world.tickClient(client / 30, now); now += 20; }
      if (cycle && status.stage.kind === "awaiting-star" && player.visualPath.length === 0 && boss.visualPath.length === 0) {
        expect(player.getPerceivedLocation(0)).toMatchObject({ x: 4, y: 7 });
        expect(boss.getPerceivedLocation(0)).toMatchObject({ x: 4, y: 6 });
        cycle.visible = true;
      }
    }
    expect(cycles).toHaveLength(4);
    for (const cycle of cycles.slice(0, 3)) {
      expect(cycle.steps).toBeLessThanOrEqual(limit.steps);
      expect(cycle.approach).toBeLessThanOrEqual(limit.approach);
      expect(cycle.visible).toBe(true);
      if (cycle.until === null || cycle.home === null || cycle.impact === null) throw new Error("Cycle did not return home.");
      expect(cycle.home - cycle.until).toBeLessThanOrEqual(limit.homeAfterStun);
      const impact = cycle.impact;
      const until = cycle.until;
      const stunSwings = swings.filter((at) => at >= impact && at < until);
      const stunned = limit.id === "parallel-y" ? swings.filter((at) => at >= impact - 2 && at < until) : stunSwings;
      expect(stunned).toHaveLength(2);
      expect(stunned[1] - stunned[0]).toBe(5);
    }
    const first = cycles[0];
    if (!first || first.impact === null || first.until === null) throw new Error("Missing first sword impact.");
    const firstImpact = first.impact;
    expect(swings.find((at) => at >= (limit.id === "parallel-y" ? firstImpact - 2 : firstImpact))).toBe(attackMode === "scythe" ? limit.firstScythe : limit.firstSurgeScythe);
    expect(missed).toEqual([]);
    expect(region.players[0]).toBe(player);
    expect(region.primaryBoss).toBe(boss);
  } finally { clock.mockRestore(); opportunities.mockRestore(); observe.mockRestore(); loop.mockRestore(); trainer.dispose(); }
});
