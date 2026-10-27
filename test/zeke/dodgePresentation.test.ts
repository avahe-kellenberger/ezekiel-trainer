import { InputController, Settings, Trainer, TrainerInstance } from "osrs-sdk";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import type { ZekeConfig } from "../../src/content/zeke/ZekeRegion";
import { Zeke } from "../../src/content/zeke/Zeke";
import { ZekePlayer } from "../../src/content/zeke/ZekePlayer";
import { ZEKE_PRESENTATION } from "../../src/content/zeke/assets";
import { tick } from "../../src/sim/brands";

function practice(config: ZekeConfig = {}) {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false });
  const region = new ZekeRegion({ seed: 1, ...config });
  const trainer = new TrainerInstance(region);
  const player = trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const boss = region.primaryBoss;
  if (!(boss instanceof Zeke) || !(player instanceof ZekePlayer)) throw new Error("Zeke's native actors were not mounted.");
  region.world.tickWorld(region.world.getReadyTimer - 1);
  const tickTo = (at: number) => {
    for (let tries = 0; boss.encounterTick < at; tries++) {
      if (tries > at + 10) throw new Error("Encounter did not advance.");
      region.world.tickWorld();
    }
  };
  return { region, trainer, player, boss, tickTo, dispose: () => trainer.dispose() };
}

describe("native dodge presentation", () => {
  test.each([
    { name: "east roll", to: { x: 6, y: 5 }, facing: 0 },
    { name: "west roll", to: { x: 2, y: 5 }, facing: -Math.PI },
    { name: "east backward hop", to: { x: 5, y: 5 }, facing: -Math.PI + Math.PI / 256 },
    { name: "diagonal roll", to: { x: 6, y: 4 }, facing: 152 * Math.PI / 1024 },
  ])("$name keeps its heading until the resolution tick then faces its exact move", ({ to, facing }) => {
    const drill = practice({ invincible: true });
    try {
      drill.tickTo(29);
      drill.player.setLocation({ x: 4, y: 5 });
      drill.player.setRotationImmediate(1.2);
      Trainer.clickController.playerWalkClick(to.x, to.y);
      InputController.controller.onClientTick();
      expect(drill.player.lastDodge).not.toBeNull();
      expect(drill.player.getPerceivedRotation(0)).toBeCloseTo(1.2);
      drill.tickTo(30);
      expect(drill.player.getPerceivedRotation(0)).toBeCloseTo(facing);
      for (let cycle = 0; cycle < 25; cycle++) drill.region.world.tickClient(0);
      expect(drill.player.getPerceivedRotation(0)).toBeCloseTo(facing);
    } finally { drill.dispose(); }
  });

  test("a diagonal roll interpolates the exact-move endpoints without a corner", () => {
    const drill = practice({ invincible: true });
    try {
      drill.tickTo(29);
      drill.player.setLocation({ x: 4, y: 5 });
      drill.player.moveTo(6, 4);
      expect(drill.player.lastDodge?.to).toEqual({ x: 6, y: 4 });
      drill.tickTo(30);
      for (let cycle = 0; cycle < 6; cycle++) drill.region.world.tickClient(0);
      expect(drill.player.perceivedLocation.x).toBeCloseTo(4 + 2 / 3);
      expect(drill.player.perceivedLocation.y).toBeCloseTo(5 - 1 / 3);
      expect(drill.player.location).toEqual({ x: 6, y: 4 });
    } finally { drill.dispose(); }
  });

  test("each finale click waits for its own resolution tick before presenting the dodge", () => {
    const drill = practice({ phase: "finale", invincible: true });
    const animations = vi.spyOn(drill.player, "playAnimation");
    try {
      drill.tickTo(16);
      for (const [clickTick, x] of [[16, 4], [17, 5], [18, 4]]) {
        const from = { ...drill.player.perceivedLocation };
        Trainer.clickController.playerWalkClick(x, 5);
        InputController.controller.onClientTick();
        const previousCount = clickTick - 16;
        expect(animations.mock.calls.filter(([id]) => id === ZEKE_PRESENTATION.strafe)).toHaveLength(previousCount);
        for (let cycle = 0; cycle < 30; cycle++) drill.region.world.tickClient(0);
        expect(drill.player.perceivedLocation).toEqual(from);
        drill.tickTo(clickTick + 1);
        expect(animations.mock.calls.filter(([id]) => id === ZEKE_PRESENTATION.strafe)).toHaveLength(previousCount + 1);
        expect(drill.player.perceivedLocation).toEqual(from);
        for (let cycle = 0; cycle <= 8; cycle++) drill.region.world.tickClient(0);
        expect(drill.player.perceivedLocation).toEqual({ x, y: 5 });
      }
    } finally { drill.dispose(); }
  });

  test("a next-tick click does not interrupt the dodge already being presented", () => {
    const drill = practice({ phase: "finale", invincible: true });
    const animations = vi.spyOn(drill.player, "playAnimation");
    try {
      drill.tickTo(16);
      Trainer.clickController.playerWalkClick(4, 5);
      InputController.controller.onClientTick();
      drill.tickTo(17);
      for (let cycle = 0; cycle < 4; cycle++) drill.region.world.tickClient(0);
      Trainer.clickController.playerWalkClick(5, 5);
      InputController.controller.onClientTick();
      expect(animations.mock.calls.filter(([id]) => id === ZEKE_PRESENTATION.strafe)).toHaveLength(1);
      for (let cycle = 0; cycle < 6; cycle++) drill.region.world.tickClient(0);
      expect(drill.player.perceivedLocation).toEqual({ x: 4, y: 5 });
      drill.tickTo(18);
      expect(animations.mock.calls.filter(([id]) => id === ZEKE_PRESENTATION.strafe)).toHaveLength(2);
      expect(drill.player.perceivedLocation).toEqual({ x: 4, y: 5 });
      for (let cycle = 0; cycle <= 8; cycle++) drill.region.world.tickClient(0);
      expect(drill.player.perceivedLocation).toEqual({ x: 5, y: 5 });
    } finally { drill.dispose(); }
  });

  test.each(["teleport", "stale", "death"])("%s cancels an accepted dodge before its presentation starts", (reason) => {
    const drill = practice({ phase: "finale" });
    const animations = vi.spyOn(drill.player, "playAnimation");
    try {
      drill.tickTo(16);
      Trainer.clickController.playerWalkClick(4, 5);
      InputController.controller.onClientTick();
      if (reason === "teleport") drill.player.setLocation({ x: 5, y: 5 });
      else if (reason === "stale") drill.player.beginEncounterTick(tick(18));
      else drill.player.currentStats.hitpoint = 0;
      drill.region.world.tickWorld();
      expect(animations.mock.calls.filter(([id]) => id === ZEKE_PRESENTATION.strafe || id === ZEKE_PRESENTATION.roll)).toEqual([]);
    } finally { drill.dispose(); }
  });

});
