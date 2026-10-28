import { Random, Settings, TrainerInstance } from "osrs-sdk";
import { Zeke } from "../../src/content/zeke/Zeke";
import { ZekePlayer } from "../../src/content/zeke/ZekePlayer";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import { ZEKE_ROUTE_SCENARIOS } from "../../src/content/zeke/ZekeRoutePlans";
import type { ZekeRouteScenario } from "../../src/content/zeke/ZekeRoutePlans";

function nativeCross(scenario: ZekeRouteScenario, lateFinalAttack: boolean) {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false, inputDelay: 0 });
  const region = new ZekeRegion({ seed: 1, routeDemo: scenario.id, routeAutoplay: true, routeAttackMode: "wind-surge" });
  const trainer = new TrainerInstance(region, { readyTimer: 0 });
  trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const boss = region.primaryBoss;
  const player = region.players[0];
  if (!(boss instanceof Zeke) || !(player instanceof ZekePlayer)) throw new Error("Missing native actors.");
  let impactSwordIds: readonly number[] = [];
  const rolls = vi.spyOn(Random, "get").mockReturnValue(0.5);
  try {
    for (let at = 1; at <= 52; at++) {
      if (lateFinalAttack && at === 29) player.attackDelay = 2;
      region.world.tickWorld();
      if (at === 31) impactSwordIds = boss.encounter.swords.map((sword) => sword.id);
    }
    return { status: region.routeDemoSnapshot(), rows: boss.rows, impactSwordIds };
  } finally { rolls.mockRestore(); trainer.dispose(); }
}

describe("native sword deadline", () => {
  const crosses = ZEKE_ROUTE_SCENARIOS.filter((scenario) => scenario.pattern.kind === "cross");

  test.each(crosses)("$id applies its fourth native projectile on the sixteenth displayed sword tick", (scenario) => {
    const { status, rows, impactSwordIds } = nativeCross(scenario, false);
    expect(status.kind).toBe("complete");
    if (status.kind === "disabled") throw new Error("Native route was disabled.");
    const casts = status.combat.filter((event) => event.kind === "cast");
    expect(casts.map((event) => event.starOffset + 1)).toEqual([2, 6, 10, 14]);
    const final = casts.at(-1);
    if (!final) throw new Error("Missing fourth native cast.");
    expect(final.landingAt).toBe(31);
    expect(status.combat).toContainEqual(expect.objectContaining({ kind: "sword-hit", tick: 31, starOffset: 15, swordIndex: final.swordIndex }));
    expect(rows.find((row) => row.tick === 30)?.events).toContainEqual(expect.objectContaining({ kind: "sword-charge" }));
    const impacts = rows.find((row) => row.tick === 31)?.events.filter((event) => event.kind === "sword-hit-boss");
    expect(impacts).toHaveLength(4);
    expect(final.damage).toBeGreaterThan(0);
    expect(impacts).toContainEqual(expect.objectContaining({ swordId: impactSwordIds[final.swordIndex], chargeDamage: final.damage }));
  });

  test.each(crosses)("$id fails completion if the final native attack is delayed one tick", (scenario) => {
    const { status } = nativeCross(scenario, true);
    expect(status).toMatchObject({ kind: "failed", reason: expect.stringContaining("casts, landings, or return to scythe") });
    if (status.kind === "disabled") throw new Error("Native route was disabled.");
    expect(status.combat.filter((event) => event.kind === "cast")).toHaveLength(3);
    expect(status.combat.filter((event) => event.kind === "sword-hit")).toHaveLength(3);
  });
});
