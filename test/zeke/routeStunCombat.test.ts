import { ScytheOfVitur, Settings, TestNpc, TrainerInstance } from "osrs-sdk";
import { Zeke } from "../../src/content/zeke/Zeke";
import { ZekePlayer } from "../../src/content/zeke/ZekePlayer";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import { WindSurge } from "../../src/content/zeke/WindSurge";

test.each([false, true])("native autoplay follows the actual boss stun through completion with extra charge %s", (extraCharge) => {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false, inputDelay: 0 });
  const region = new ZekeRegion({ routeDemo: "cross-2-2", routeAutoplay: true, routeAttackMode: "wind-surge" });
  const trainer = new TrainerInstance(region, { readyTimer: 0 });
  trainer.mount(document.createElement("canvas"), document.createElement("div"));
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
    expect(stunnedSwings[0]).toBeLessThanOrEqual(phase.started + 2);
    expect(stunnedSwings.every((at, index) => index === 0 || at - (stunnedSwings[index - 1] ?? at) === 5)).toBe(true);
    expect(stunnedSwings.every((at) => at < phase.stunnedUntil)).toBe(true);
    expect(region.routeDemoSnapshot()).toMatchObject({ kind: "complete", control: "playing" });
    expect(boss.encounterTick).toBe(phase.stunnedUntil);
    expect(region.world.isPaused).toBe(true);
  } finally { observe.mockRestore(); trainer.dispose(); }
});
