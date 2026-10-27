import { Settings, SoundCache, TrainerInstance } from "osrs-sdk";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import { Zeke } from "../../src/content/zeke/Zeke";

function finaleSounds(until: number, killAt: number | null = null) {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false });
  const region = new ZekeRegion({ seed: 1, phase: "finale", invincible: true });
  const trainer = new TrainerInstance(region);
  trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const boss = region.primaryBoss;
  if (!(boss instanceof Zeke)) throw new Error("The finale boss was not mounted.");
  const play = vi.spyOn(SoundCache, "play");
  const sounds: { tick: number; source: string; delayMs: number }[] = [];
  try {
    region.world.tickWorld(region.world.getReadyTimer - 1);
    for (let tick = 1; tick <= until; tick++) {
      if (tick === killAt) boss.currentStats.hitpoint = 0;
      const before = play.mock.calls.length;
      region.world.tickWorld();
      sounds.push(...play.mock.calls.slice(before).map(([sound]) => ({ tick, source: sound.src, delayMs: sound.delayMs })));
    }
    return sounds.filter(({ source }) => ["cache-sound:12417", "cache-sound:11757", "cache-sound:12407", "cache-sound:12416"].includes(source));
  } finally {
    play.mockRestore();
    trainer.dispose();
  }
}

describe("finale audio cues", () => {
  test("the three sword cues lead into the dodge whoosh, damage strikes and later reset", () => {
    expect(finaleSounds(33)).toEqual([
      { tick: 13, source: "cache-sound:12417", delayMs: 0 },
      { tick: 14, source: "cache-sound:12417", delayMs: 0 },
      { tick: 15, source: "cache-sound:12417", delayMs: 0 },
      { tick: 16, source: "cache-sound:11757", delayMs: 0 },
      { tick: 17, source: "cache-sound:12407", delayMs: 0 },
      { tick: 18, source: "cache-sound:12407", delayMs: 0 },
      { tick: 19, source: "cache-sound:12407", delayMs: 0 },
      { tick: 20, source: "cache-sound:12416", delayMs: 300 },
      { tick: 24, source: "cache-sound:12417", delayMs: 0 },
      { tick: 25, source: "cache-sound:12417", delayMs: 0 },
      { tick: 26, source: "cache-sound:12417", delayMs: 0 },
      { tick: 27, source: "cache-sound:11757", delayMs: 0 },
      { tick: 28, source: "cache-sound:12407", delayMs: 0 },
      { tick: 29, source: "cache-sound:12407", delayMs: 0 },
      { tick: 30, source: "cache-sound:12407", delayMs: 0 },
      { tick: 31, source: "cache-sound:12416", delayMs: 300 },
    ]);
  });

  test("killing the boss after the third sword cue cancels the dodge whoosh", () => {
    expect(finaleSounds(33, 16).filter(({ source }) => source === "cache-sound:11757")).toEqual([]);
  });

  test("killing the boss after the third thunder cancels the remaining cue", () => {
    expect(finaleSounds(33, 20).filter(({ source }) => source === "cache-sound:12416")).toEqual([]);
  });
});
