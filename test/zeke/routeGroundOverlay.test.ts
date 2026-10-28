import { CollisionType, Settings, TrainerInstance } from "osrs-sdk";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import { Zeke } from "../../src/content/zeke/Zeke";
import { ZEKE_ROUTE_SCENARIOS } from "../../src/content/zeke/ZekeRoutePlans";
import { routeGroundOverlay } from "../../src/content/zeke/RouteGroundOverlay";

describe("route markings on the arena floor", () => {
  test.each(ZEKE_ROUTE_SCENARIOS)("$id remains safe with markings enabled", (scenario) => {
    Settings.readFromStorage();
    Settings.set({ playsAudio: false, playsAreaAudio: false });
    const region = new ZekeRegion({ seed: 1, routeDemo: scenario.id, routeAutoplay: true, routeAttackMode: "wind-surge" });
    const trainer = new TrainerInstance(region);
    trainer.mount(document.createElement("canvas"), document.createElement("div"));
    try {
      const boss = region.primaryBoss;
      if (!(boss instanceof Zeke)) throw new Error("Missing native boss");
      const markers = routeGroundOverlay(region, scenario);
      for (const marker of markers) {
        expect(marker.collisionType).toBe(CollisionType.NONE);
        expect(marker.selectable).toBe(false);
        region.addEntity(marker);
      }
      for (let at = 1; at <= 41; at++) region.world.tickWorld();
      expect(region.routeDemoSnapshot()).toMatchObject({ kind: "complete", cycle: 1 });
      const events = boss.rows.flatMap((row) => row.events);
      expect(events.filter((event) => event.kind === "sword-hit-boss")).toHaveLength(scenario.expectedHits);
      expect(events.filter((event) => event.kind === "auto")).toHaveLength(4);
      expect(events.some((event) => event.kind === "star-hit" || event.kind === "sword-hit-player" || (event.kind === "auto" && event.style === "magic"))).toBe(false);
      markers.forEach((marker) => region.removeEntity(marker));
      expect(region.entities.some((entity) => markers.includes(entity))).toBe(false);
    } finally { trainer.dispose(); }
  });
});
