import { Settings, TrainerInstance } from "osrs-sdk";
import { Zeke } from "../../src/content/zeke/Zeke";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import { ZekeStar } from "../../src/content/zeke/hazards";
import { bossContains } from "../../src/content/zeke/mechanics";
import { tile } from "../../src/sim/brands";

test("the native star leaves the boss footprint visually clear while damaging a player underneath on both beats", () => {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false });
  const region = new ZekeRegion({ seed: 1, invincible: true });
  const trainer = new TrainerInstance(region);
  const player = trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const boss = region.primaryBoss;
  if (!(boss instanceof Zeke)) throw new Error("Zeke was not mounted.");
  const tickTo = (at: number) => {
    while (boss.encounterTick < at) region.world.tickWorld();
  };
  try {
    tickTo(16);
    const anchor = tile(boss.location.x, boss.location.y);
    const effects = region.entities.filter((entity) => entity instanceof ZekeStar);
    expect(effects).toHaveLength(boss.encounter.stars.length - 9);
    expect(effects.some((effect) => bossContains(anchor, tile(effect.location.x, effect.location.y)))).toBe(false);
    expect(effects.map((effect) => effect.location)).toEqual(boss.encounter.stars.filter((star) => star.visual !== null).map((star) => star.tile));
    tickTo(18);
    player.setLocation({ x: anchor.x + 1, y: anchor.y - 1 });
    player.currentStats.hitpoint = player.stats.hitpoint;
    const before = player.currentStats.hitpoint;
    tickTo(19);
    expect(player.currentStats.hitpoint).toBeLessThan(before);
    const afterFirst = player.currentStats.hitpoint;
    tickTo(20);
    expect(player.currentStats.hitpoint).toBe(afterFirst);
    tickTo(21);
    expect(player.currentStats.hitpoint).toBeLessThan(afterFirst);
    expect(boss.rows.filter((row) => row.events.some((event) => event.kind === "star-hit")).map((row) => row.tick)).toEqual([19, 21]);
  } finally { trainer.dispose(); }
});
