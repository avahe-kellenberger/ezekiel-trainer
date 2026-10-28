import { Settings, SoundCache, TrainerInstance } from "osrs-sdk";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import { Zeke } from "../../src/content/zeke/Zeke";

function fightAudio() {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false });
  const region = new ZekeRegion({ seed: 1, invincible: true });
  const trainer = new TrainerInstance(region);
  trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const boss = region.primaryBoss;
  if (!(boss instanceof Zeke)) throw new Error("Ezekiel was not mounted.");
  const play = vi.spyOn(SoundCache, "play");
  const sounds: { tick: number; source: string; volume: number }[] = [];
  try {
    region.world.tickWorld(region.world.getReadyTimer - 1);
    for (let tick = 1; tick <= 31; tick++) {
      const before = play.mock.calls.length;
      region.world.tickWorld();
      sounds.push(...play.mock.calls.slice(before).map(([sound]) => ({ tick, source: sound.src, volume: sound.volume })));
    }
    return { sounds, rows: boss.rows };
  } finally {
    play.mockRestore();
    trainer.dispose();
  }
}

describe("encounter audio mix", () => {
  test("simultaneous swords share their flight and impact cues without dropping their hits", () => {
    const { sounds, rows } = fightAudio();
    const volley = rows.find((row) => row.tick === 30);
    expect(volley?.events.filter((event) => event.kind === "sword-charge")).toHaveLength(4);
    expect(volley?.events.filter((event) => event.kind === "sword-hit-boss")).toHaveLength(0);
    expect(rows.find((row) => row.tick === 31)?.events.filter((event) => event.kind === "sword-hit-boss")).toHaveLength(2);
    expect(sounds.filter((sound) => sound.tick === 30)).toEqual([
      { tick: 30, source: "cache-sound:12458", volume: 0.1 },
    ]);
    expect(sounds.filter((sound) => sound.tick === 31)).toEqual([{ tick: 31, source: "cache-sound:7115", volume: 0.1 }]);
  });

  test("separate star beats remain audible at the same level as cache animation sounds", () => {
    expect(fightAudio().sounds.filter((sound) => sound.source === "cache-sound:12441")).toEqual([
      { tick: 19, source: "cache-sound:12441", volume: 0.1 },
      { tick: 21, source: "cache-sound:12441", volume: 0.1 },
    ]);
  });
});
