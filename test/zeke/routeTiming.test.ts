import { Settings, TrainerInstance } from "osrs-sdk";
import { Zeke } from "../../src/content/zeke/Zeke";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import { ZEKE_ROUTE_SCENARIOS } from "../../src/content/zeke/ZekeRoutePlans";
import type { ZekeRouteScenario } from "../../src/content/zeke/ZekeRoutePlans";
import { ZEKE_RULES } from "../../src/content/zeke/ZekeRules";
import { span } from "../../src/sim/brands";

// Replay proposed click times with the real SDK. Preserve the ordered destinations,
// sword-center alignment, every auto, hazard avoidance and the home reset.
function trial(scenario: ZekeRouteScenario, clicks = scenario.clicks) {
  const region = new ZekeRegion({ seed: 1, routeDemo: scenario.id, invincible: true });
  const trainer = new TrainerInstance(region);
  trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const boss = region.primaryBoss;
  const player = region.players[0];
  if (!(boss instanceof Zeke)) throw new Error("Missing native boss.");
  const star = ZEKE_RULES.autos.openingStar.value;
  const flight = ZEKE_RULES.swords.chargeAfter.value;
  const reset = flight + ZEKE_RULES.autos.recoveryStar.value - 1;
  const arrivals: number[] = [];
  let safe = true;
  try {
    for (let at = 1; at <= star + reset; at++) {
      const offset = at - star;
      const click = clicks.find((entry) => entry.at === offset);
      if (click) player.moveTo(click.to.x, click.to.y, "run-setting");
      region.world.tickWorld();
      const row = boss.rows.at(-1);
      if (!row) throw new Error("Missing native tick.");
      if (boss.activeStepUnder || row.events.some((event) => event.kind === "star-hit" || event.kind === "sword-hit-player" || event.kind === "boss-heal" || event.kind === "swords-missed" || (event.kind === "auto" && event.style === "magic"))) {
        safe = false;
        break;
      }
      for (let index = 0; index < clicks.length; index++) {
        const goal = clicks[index];
        if (arrivals[index] === undefined && offset >= goal.at && player.location.x === goal.to.x && player.location.y === goal.to.y) arrivals[index] = offset;
        if (offset === (clicks[index + 1]?.at ?? reset + 1) - 1 && arrivals[index] === undefined) safe = false;
      }
      if (offset === flight) {
        const pattern = scenario.pattern;
        const center = { x: boss.location.x + 1, y: boss.location.y - 1 };
        switch (pattern.kind) {
          case "cross": safe &&= center.x === pattern.column && center.y === pattern.row; break;
          case "parallel": safe &&= (pattern.axis === "x" ? center.y : center.x) === ZEKE_RULES.swords.lanes.value[0]; break;
          case "two-rows": safe &&= ZEKE_RULES.swords.twoRows.value.includes(center.y); break;
          default: { const unhandled: never = pattern; throw new Error(String(unhandled)); }
        }
      }
      if (!safe) break;
    }
    const events = boss.rows.flatMap((row) => row.events);
    const bossHome = ZEKE_RULES.arena.bossSpawn.value;
    const tankHome = ZEKE_RULES.arena.playerSpawn.value;
    safe &&= boss.location.x === bossHome.x && boss.location.y === bossHome.y && player.location.x === tankHome.x && player.location.y === tankHome.y;
    safe &&= events.filter((event) => event.kind === "auto").length === ZEKE_RULES.autos.count.value * 3;
    safe &&= events.filter((event) => event.kind === "sword-hit-boss").length === scenario.expectedHits;
    return { safe, arrivals };
  } finally { trainer.dispose(); }
}

describe("route waypoint timing", () => {
  test.each(ZEKE_ROUTE_SCENARIOS)("$id has no earlier individual click that preserves the rules and arrival times", (scenario) => {
    Settings.readFromStorage();
    Settings.set({ playsAudio: false, playsAreaAudio: false, inputDelay: 0 });
    const baseline = trial(scenario);
    expect(baseline.safe).toBe(true);
    expect(baseline.arrivals).toHaveLength(scenario.clicks.length);
    for (let index = 0; index < scenario.clicks.length; index++) {
      const previous = scenario.clicks[index - 1]?.at ?? 0;
      for (let earlier = previous + 1; earlier < scenario.clicks[index].at; earlier++) {
        const candidate = scenario.clicks.map((click, candidateIndex) => candidateIndex === index ? { ...click, at: span(earlier) } : click);
        const result = trial(scenario, candidate);
        const delaysAnotherWaypoint = baseline.arrivals.some((arrival, goal) => result.arrivals[goal] === undefined || result.arrivals[goal] > arrival);
        expect(result.safe && !delaysAnotherWaypoint, `Click ${index + 1} could move from +${scenario.clicks[index].at} to +${earlier}`).toBe(false);
      }
    }
  });
});
