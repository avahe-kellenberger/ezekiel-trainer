import { InputController, Settings, Trainer, TrainerInstance } from "osrs-sdk";
import { CleaveDust } from "../../src/content/zeke/CleaveDust";
import { Zeke } from "../../src/content/zeke/Zeke";
import { ZekePlayer } from "../../src/content/zeke/ZekePlayer";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import { cleaveDustTiles } from "../../src/content/zeke/mechanics";
import { tile } from "../../src/sim/brands";

function practice() {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false, inputDelay: 0 });
  const region = new ZekeRegion({ seed: 1, invincible: true });
  const trainer = new TrainerInstance(region);
  const player = trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const boss = region.primaryBoss;
  if (!(boss instanceof Zeke) || !(player instanceof ZekePlayer)) throw new Error("Native actors did not mount.");
  region.world.tickWorld(region.world.getReadyTimer - 1);
  const tickTo = (at: number) => {
    while (boss.encounterTick < at) region.world.tickWorld();
  };
  const dust = () => region.entities.filter((entity) => entity instanceof CleaveDust);
  return { region, trainer, player, boss, tickTo, dust };
}

describe("Melee cleave ground dust", () => {
  test.each([
    { tank: tile(3, 5), safe: [tile(7, 4), tile(7, 5), tile(7, 6)] },
    { tank: tile(7, 5), safe: [tile(3, 4), tile(3, 5), tile(3, 6)] },
    { tank: tile(5, 3), safe: [tile(4, 7), tile(5, 7), tile(6, 7)] },
    { tank: tile(5, 7), safe: [tile(4, 3), tile(5, 3), tile(6, 3)] },
  ])("leaves the three opposite tiles clear for tank $tank", ({ tank, safe }) => {
    const dust = cleaveDustTiles(tile(4, 6), tank);
    expect(dust).toHaveLength(13);
    for (const point of safe) expect(dust).not.toContainEqual(point);
    expect(dust.every((point) => Math.max(Math.abs(point.x - 5), Math.abs(point.y - 5)) === 2)).toBe(true);
    expect(dust).toContainEqual(tank);
  });

  test("a melee creates thirteen floor effects at the boss's post-movement position and removes them before the next auto", () => {
    const drill = practice();
    try {
      drill.tickTo(3);
      Trainer.clickController.playerWalkClick(4, 9);
      InputController.controller.onClientTick();
      drill.tickTo(5);
      expect(drill.dust()).toHaveLength(0);
      expect(drill.boss.location).toEqual({ x: 4, y: 7 });
      drill.tickTo(6);
      expect(drill.boss.location).toEqual({ x: 4, y: 8 });
      expect(drill.dust().map((effect) => effect.location)).toEqual(cleaveDustTiles(tile(4, 8), tile(4, 9)));
      expect(drill.dust()).toHaveLength(13);
      drill.tickTo(7);
      expect(drill.dust()).toHaveLength(13);
      drill.tickTo(9);
      expect(drill.dust()).toHaveLength(0);
      drill.tickTo(11);
      expect(drill.dust()).toHaveLength(13);
    } finally { drill.trainer.dispose(); }
  });

  test("room lightning does not create melee dust", () => {
    const drill = practice();
    try {
      drill.tickTo(5);
      drill.player.setLocation({ x: drill.boss.location.x + 1, y: drill.boss.location.y - 1 });
      drill.tickTo(6);
      expect(drill.boss.rows.at(-1)?.events).toContainEqual({ kind: "auto", style: "magic", ordinal: 1, targets: ["tank"] });
      expect(drill.dust()).toHaveLength(0);
    } finally { drill.trainer.dispose(); }
  });
});
