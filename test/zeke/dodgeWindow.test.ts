import { InputController, Settings, Trainer, TrainerInstance } from "osrs-sdk";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import { Zeke } from "../../src/content/zeke/Zeke";
import { ZekePlayer } from "../../src/content/zeke/ZekePlayer";

function finale() {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false, inputDelay: 0 });
  const region = new ZekeRegion({ seed: 1, phase: "finale", invincible: true });
  const trainer = new TrainerInstance(region);
  const player = trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const boss = region.primaryBoss;
  if (!(boss instanceof Zeke) || !(player instanceof ZekePlayer)) throw new Error("The finale actors were not mounted.");
  region.world.tickWorld(region.world.getReadyTimer - 1);
  const tickTo = (at: number) => {
    while (boss.encounterTick < at) region.world.tickWorld();
  };
  return { region, trainer, player, boss, tickTo, dispose: () => trainer.dispose() };
}

describe("finale dodge click boundaries", () => {
  test.each([
    { click: 15, dodge: null },
    { click: 16, dodge: 17 },
    { click: 17, dodge: 18 },
    { click: 18, dodge: 19 },
    { click: 19, dodge: null },
    { click: 26, dodge: null },
    { click: 27, dodge: 28 },
    { click: 28, dodge: 29 },
    { click: 29, dodge: 30 },
    { click: 30, dodge: null },
  ])("clicking at encounter tick $click only dodges in its own input window", ({ click, dodge }) => {
    const drill = finale();
    try {
      drill.tickTo(click);
      const tells = drill.boss.rows.flatMap((row) => row.events.filter((event) => event.kind === "enrage-tell").map(() => row.tick));
      expect(tells).toEqual([13, 14, 15, 24, 25, 26].filter((at) => at <= click));
      drill.player.setLocation({ x: 5, y: 5 });
      Trainer.clickController.playerWalkClick(4, 5);
      InputController.controller.onClientTick();
      expect(drill.player.lastDodge?.tick ?? null).toBe(dodge);
      drill.tickTo(click + 1);
      expect(drill.player.lastDodge?.tick ?? null).toBe(dodge);
    } finally { drill.dispose(); }
  });

  test("a delayed ordinary click before the first dodge window never becomes a dodge", () => {
    const drill = finale();
    const clock = vi.spyOn(performance, "now");
    try {
      clock.mockReturnValue(10000);
      drill.tickTo(15);
      Settings.set({ inputDelay: 600 });
      Trainer.clickController.playerWalkClick(4, 5);
      InputController.controller.onClientTick();
      clock.mockReturnValue(10100);
      drill.tickTo(16);
      expect(drill.player.lastDodge).toBeNull();
      clock.mockReturnValue(10700);
      drill.tickTo(17);
      expect(drill.player.lastDodge).toBeNull();
      expect(drill.player.location).toEqual({ x: 4, y: 5 });
    } finally { clock.mockRestore(); Settings.set({ inputDelay: 0 }); drill.dispose(); }
  });

  test("a client action that misses its input tick cannot dodge in the following window", () => {
    const drill = finale();
    try {
      drill.tickTo(16);
      Trainer.clickController.playerWalkClick(4, 5);
      drill.tickTo(17);
      InputController.controller.onClientTick();
      expect(drill.player.lastDodge).toBeNull();
      drill.tickTo(18);
      expect(drill.player.lastDodge).toBeNull();
    } finally { drill.dispose(); }
  });
});
