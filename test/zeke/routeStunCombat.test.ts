import { ScytheOfVitur, Settings, TestNpc, TrainerInstance } from "osrs-sdk";
import { Zeke } from "../../src/content/zeke/Zeke";
import { ZekePlayer } from "../../src/content/zeke/ZekePlayer";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import { WindSurge } from "../../src/content/zeke/WindSurge";

const recoveryCases = [false, true].flatMap((extraCharge) => [
  { extraCharge, scenario: "cross-2-2", attackMode: "wind-surge" },
  { extraCharge, scenario: "cross-2-8", attackMode: "wind-surge" },
  { extraCharge, scenario: "cross-2-8", attackMode: "scythe" },
] as const);

test.each(recoveryCases)("$scenario in $attackMode follows the actual stun and return with extra charge $extraCharge", ({ extraCharge, scenario, attackMode }) => {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false, inputDelay: 0 });
  const region = new ZekeRegion({ routeDemo: scenario, routeAutoplay: true, routeAttackMode: attackMode });
  const trainer = new TrainerInstance(region, { readyTimer: 0 });
  trainer.mount(document.createElement("canvas"), document.createElement("div"));
  vi.spyOn(region.world, "startLoop").mockImplementation(() => {});
  region.world.startTicking();
  const boss = region.primaryBoss;
  const player = region.players[0];
  if (!(boss instanceof Zeke) || !(player instanceof ZekePlayer)) throw new Error("Missing native actors.");
  const swings: number[] = [];
  const didAttack = player.didAttack.bind(player);
  const observe = vi.spyOn(player, "didAttack").mockImplementation(() => {
    if (player.aggro === boss && player.equipment.weapon instanceof ScytheOfVitur) swings.push(boss.encounterTick);
    didAttack();
  });
  try {
    for (let at = 1; at <= 31; at++) {
      if (extraCharge && at === 22) {
        const sword = boss.swordTarget(1);
        if (!sword) throw new Error("Missing native charge target.");
        const caster = new TestNpc(region, { x: sword.location.x, y: sword.location.y - 1 }, {});
        caster.setStats();
        caster.currentStats.magic = 99;
        new WindSurge().cast(caster, sword);
        if (attackMode === "scythe") new WindSurge().cast(caster, sword);
      }
      region.world.tickWorld();
    }
    const phase = boss.encounter.phase;
    if (phase.kind !== "recovery" || phase.recovery !== "weaken") throw new Error("Missing boss stun.");
    expect(phase.stunnedUntil).toBe(extraCharge ? 45 : 41);
    for (let at = 32; at <= phase.stunnedUntil; at++) {
      expect(region.routeDemoSnapshot().kind).toBe("playing");
      region.world.tickWorld();
    }
    const stunnedSwings = swings.filter((at) => at >= phase.started);
    expect(stunnedSwings.length).toBeGreaterThanOrEqual(2);
    expect(stunnedSwings[0]).toBeLessThanOrEqual(phase.started + player.attackSpeed);
    expect(stunnedSwings.every((at, index) => index === 0 || at - (stunnedSwings[index - 1] ?? at) === 5)).toBe(true);
    expect(stunnedSwings.every((at) => at < phase.stunnedUntil)).toBe(true);
    if (scenario === "cross-2-8") expect(stunnedSwings).toEqual(attackMode === "scythe" ? extraCharge ? [32, 37, 42] : [32, 37] : extraCharge ? [33, 38, 43] : [33, 38]);
    expect(region.routeDemoSnapshot()).toMatchObject({ kind: "playing", stage: { kind: "returning", stunnedUntil: phase.stunnedUntil } });
    while (boss.encounterTick < phase.stunnedUntil + 11) {
      const status = region.routeDemoSnapshot();
      if (status.kind !== "playing" || status.stage.kind === "awaiting-star") break;
      region.world.tickWorld();
    }
    expect(region.routeDemoSnapshot()).toMatchObject({ kind: "playing", stage: { kind: "awaiting-star" } });
    expect(boss.encounterTick).toBeGreaterThan(phase.stunnedUntil);
    expect(boss.encounterTick).toBeLessThan(phase.stunnedUntil + 12);
    expect(swings.some((at) => at >= phase.stunnedUntil)).toBe(true);
    expect(player.location).toEqual({ x: 4, y: 7 });
    expect(boss.location).toEqual({ x: 4, y: 6 });
    expect(region.world.isPaused).toBe(false);
  } finally { observe.mockRestore(); trainer.dispose(); }
});
