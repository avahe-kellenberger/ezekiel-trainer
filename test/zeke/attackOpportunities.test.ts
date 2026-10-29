import { LineOfSight, ScytheOfVitur, Settings, TrainerInstance } from "osrs-sdk";
import { Zeke } from "../../src/content/zeke/Zeke";
import { ZekePlayer } from "../../src/content/zeke/ZekePlayer";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import { ZEKE_ROUTE_SCENARIOS } from "../../src/content/zeke/ZekeRoutePlans";
import { nextStarAt } from "../../src/content/zeke/mechanics";

const cases = ZEKE_ROUTE_SCENARIOS.flatMap((scenario) => (["scythe", "wind-surge"] as const).flatMap((attackMode) => [1, 17, 99].map((seed) => ({ scenario, attackMode, seed }))));

test.each(cases)("$scenario.id $attackMode seed $seed uses ready melee opportunities throughout continuous playback", ({ scenario, attackMode, seed }) => {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false, inputDelay: 0 });
  const region = new ZekeRegion({ seed, routeDemo: scenario.id, routeAutoplay: true, routeAttackMode: attackMode });
  const trainer = new TrainerInstance(region, { readyTimer: 0 });
  trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const boss = region.primaryBoss;
  const player = region.players[0];
  if (!(boss instanceof Zeke) || !(player instanceof ZekePlayer)) throw new Error("Missing native actors.");
  const loop = vi.spyOn(region.world, "startLoop").mockImplementation(() => {});
  const swings: number[] = [];
  const misses: { tick: number; stage: string }[] = [];
  const returns: number[] = [];
  const didAttack = player.didAttack.bind(player);
  const observe = vi.spyOn(player, "didAttack").mockImplementation(() => {
    if (player.aggro === boss && player.equipment.weapon instanceof ScytheOfVitur) {
      swings.push(boss.encounterTick);
      const status = region.routeDemoSnapshot();
      if (status.kind === "playing" && status.stage.kind !== "route") returns.push(status.cycle);
    }
    didAttack();
  });
  const attackStep = player.attackStep.bind(player);
  const opportunities = vi.spyOn(player, "attackStep").mockImplementation(() => {
    const at = boss.encounterTick;
    const nextStar = nextStarAt(boss.encounter.phase);
    const firstCast = scenario.actions.find(({ action }) => action.kind === "attack-sword");
    const reserveCast = attackMode === "wind-surge" && nextStar !== null && firstCast !== undefined && at + player.attackSpeed > nextStar + firstCast.at;
    const eligible = player.equipment.weapon instanceof ScytheOfVitur && player.attackDelay <= 0 && player.canAttack() && !reserveCast
      && LineOfSight.playerHasLineOfSightOfMob(region, player.location.x, player.location.y, boss, player.attackRange);
    const destination = player.destinationLocation === null ? null : { ...player.destinationLocation };
    attackStep();
    expect(player.destinationLocation).toEqual(destination);
    if (eligible && !swings.includes(at)) {
      const status = region.routeDemoSnapshot();
      misses.push({ tick: at, stage: status.kind === "playing" ? status.stage.kind : status.kind });
    }
  });
  let now = window.performance.now();
  const clock = vi.spyOn(window.performance, "now").mockImplementation(() => now);
  try {
    region.world.startTicking();
    let started = 0;
    for (let count = 0; count < 190 && started < 4; count++) {
      region.world.tickWorld();
      const status = region.routeDemoSnapshot();
      expect(status.kind).toBe("playing");
      if (status.kind !== "playing") throw new Error("Playback stopped.");
      started = status.cycle;
      for (let client = 0; client < 30; client++) { region.world.tickClient(client / 30, now); now += 20; }
    }
    expect(started).toBe(4);
    expect(misses).toEqual([]);
    for (const cycle of [1, 2, 3]) expect(returns).toContain(cycle);
    const status = region.routeDemoSnapshot();
    if (status.kind !== "playing") throw new Error("Playback stopped.");
    for (const cycle of [1, 2, 3]) {
      const casts = status.combat.filter((event) => event.cycle === cycle && event.kind === "cast");
      expect(casts).toHaveLength(attackMode === "wind-surge" ? scenario.expectedCasts : 0);
      if (attackMode === "wind-surge") expect(casts.map((event) => event.starOffset)).toEqual(scenario.actions.filter(({ action }) => action.kind === "attack-sword").map(({ at }) => at));
    }
  } finally { clock.mockRestore(); opportunities.mockRestore(); observe.mockRestore(); loop.mockRestore(); trainer.dispose(); }
});

test.each(["scythe", "wind-surge"] as const)("Lower Right keeps turning toward the boss after a return swing in %s", (attackMode) => {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false, inputDelay: 0 });
  const region = new ZekeRegion({ seed: 1, routeDemo: "cross-8-8", routeAutoplay: true, routeAttackMode: attackMode });
  const trainer = new TrainerInstance(region, { readyTimer: 0 });
  trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const boss = region.primaryBoss;
  const player = region.players[0];
  if (!(boss instanceof Zeke) || !(player instanceof ZekePlayer)) throw new Error("Missing native actors.");
  const loop = vi.spyOn(region.world, "startLoop").mockImplementation(() => {});
  let now = window.performance.now();
  const clock = vi.spyOn(window.performance, "now").mockImplementation(() => now);
  try {
    region.world.startTicking();
    for (let at = 1; at <= 47; at++) {
      region.world.tickWorld();
      for (let client = 0; client < 30; client++) { region.world.tickClient(client / 30, now); now += 20; }
      if (at < 46) continue;
      const from = player.getPerceivedLocation(0);
      const to = boss.getPerceivedLocation(0);
      const target = -Math.atan2(to.y - from.y - (boss.size - player.size) / 2, to.x - from.x + (boss.size - player.size) / 2);
      const facing = player.getPerceivedRotation(0);
      const error = Math.abs(Math.atan2(Math.sin(target - facing), Math.cos(target - facing)));
      expect(error, `Facing Zeke at tick ${at}`).toBeLessThan(0.25);
    }
  } finally { clock.mockRestore(); loop.mockRestore(); trainer.dispose(); }
});
