import { Settings, TrainerInstance } from "osrs-sdk";
import { Zeke } from "../../src/content/zeke/Zeke";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import { ZEKE_ROUTE_SCENARIOS, zekeRouteForSwords } from "../../src/content/zeke/ZekeRoutePlans";
import type { SwordHazard } from "../../src/content/zeke/mechanics";

describe("live sword solves", () => {
  test.each(ZEKE_ROUTE_SCENARIOS)("$id matches while swords are visible, including during recovery", (scenario) => {
    Settings.readFromStorage();
    Settings.set({ playsAudio: false, playsAreaAudio: false });
    const region = new ZekeRegion({ routeDemo: scenario.id, routeAutoplay: true, invincible: true });
    const trainer = new TrainerInstance(region);
    trainer.mount(document.createElement("canvas"), document.createElement("div"));
    try {
      const boss = region.primaryBoss;
      if (!(boss instanceof Zeke)) throw new Error("Missing native boss");
      expect(zekeRouteForSwords(boss.encounter.swords)).toBeNull();
      let sawSwords = false;
      let sawRecoverySwords = false;
      let sawCleanup = false;
      for (let count = 0; count < 60 && !sawCleanup; count++) {
        region.world.tickWorld();
        const { swords, phase } = boss.encounter;
        if (swords.some((sword) => sword.status !== "spent")) {
          sawSwords = true;
          expect(zekeRouteForSwords(swords)).toBe(scenario);
          if (phase.kind === "recovery") sawRecoverySwords = true;
          if (scenario.pattern.kind === "parallel") {
            const reversed = swords.map((sword): SwordHazard => ({ ...sword, direction: -1 }));
            expect(zekeRouteForSwords(reversed)).toBeNull();
          }
        } else {
          expect(zekeRouteForSwords(swords)).toBeNull();
          if (sawSwords) sawCleanup = true;
        }
      }
      expect(sawSwords).toBe(true);
      expect(sawRecoverySwords).toBe(true);
      expect(sawCleanup).toBe(true);
    } finally { trainer.dispose(); }
  });
});
