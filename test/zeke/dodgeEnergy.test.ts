import { InputController, InvisibleMovementBlocker, Settings, Trainer, TrainerInstance } from "osrs-sdk";
import { Zeke } from "../../src/content/zeke/Zeke";
import { ZekePlayer } from "../../src/content/zeke/ZekePlayer";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import type { ZekeConfig } from "../../src/content/zeke/ZekeRegion";
import { ZEKE_RULES } from "../../src/content/zeke/ZekeRules";
import { tick } from "../../src/sim/brands";

function practice(config: ZekeConfig = {}) {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false, inputDelay: 0 });
  const region = new ZekeRegion({ seed: 1, invincible: true, ...config });
  const trainer = new TrainerInstance(region);
  const player = trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const boss = region.primaryBoss;
  if (!(boss instanceof Zeke) || !(player instanceof ZekePlayer)) throw new Error("The dodge actors were not mounted.");
  region.world.tickWorld(region.world.getReadyTimer - 1);
  const tickTo = (at: number) => {
    for (let tries = 0; boss.encounterTick < at; tries++) {
      if (tries > at + 10) throw new Error("Encounter did not advance.");
      region.world.tickWorld();
    }
  };
  const click = (x: number, y: number) => {
    Trainer.clickController.playerWalkClick(x, y);
    InputController.controller.onClientTick();
  };
  return { region, player, boss, tickTo, click, dispose: () => trainer.dispose() };
}

describe("successful dodge special energy", () => {
  test("a safe finale landing restores energy once before the same tick's player attack", () => {
    const drill = practice({ phase: "finale" });
    try {
      drill.tickTo(16);
      drill.player.currentStats.specialAttack = 47;
      drill.click(4, 5);
      drill.click(4, 6);
      expect(drill.player.currentStats.specialAttack).toBe(47);
      const energyAtAttack: number[] = [];
      const attackStep = drill.player.attackStep.bind(drill.player);
      const attacks = vi.spyOn(drill.player, "attackStep").mockImplementation(() => {
        energyAtAttack.push(drill.player.currentStats.specialAttack);
        attackStep();
      });
      drill.tickTo(17);
      expect(energyAtAttack).toEqual([50]);
      expect(drill.player.location).toEqual({ x: 4, y: 5 });
      expect(drill.boss.rows.at(-1)?.events).toContainEqual({ kind: "successful-dodge", target: "tank", tick: 17 });
      for (let cycle = 0; cycle < 30; cycle++) drill.region.world.tickClient(0);
      drill.tickTo(18);
      expect(drill.player.currentStats.specialAttack).toBe(50);
      attacks.mockRestore();
    } finally { drill.dispose(); }
  });

  test.each([{ before: 98, after: 100 }, { before: 100, after: 100 }])("restoration caps $before at $after", ({ before, after }) => {
    const drill = practice({ phase: "finale" });
    try {
      drill.tickTo(16);
      drill.player.currentStats.specialAttack = before;
      drill.click(4, 5);
      drill.tickTo(17);
      expect(drill.player.currentStats.specialAttack).toBe(after);
    } finally { drill.dispose(); }
  });

  test("each consecutive safe finale dodge restores another three points", () => {
    const drill = practice({ phase: "finale" });
    try {
      drill.tickTo(16);
      drill.player.currentStats.specialAttack = 40;
      for (const [at, x, y, energy] of [[17, 4, 5, 43], [18, 4, 6, 46], [19, 4, 4, 49]]) {
        drill.click(x, y);
        drill.tickTo(at);
        expect(drill.player.currentStats.specialAttack).toBe(energy);
      }
    } finally { drill.dispose(); }
  });

  test("a dodge into finale damage earns nothing even with invincibility", () => {
    const drill = practice({ phase: "finale" });
    try {
      drill.tickTo(16);
      drill.player.currentStats.specialAttack = 40;
      drill.click(6, 5);
      drill.tickTo(17);
      expect(drill.player.location).toEqual({ x: 6, y: 5 });
      expect(drill.boss.rows.at(-1)?.events).toContainEqual({ kind: "enrage-hit", target: "tank" });
      expect(drill.player.currentStats.specialAttack).toBe(40);
    } finally { drill.dispose(); }
  });

  test.each(["teleport", "stale", "death"])("%s cancellation earns no energy", (reason) => {
    const drill = practice({ phase: "finale", invincible: false });
    try {
      drill.tickTo(16);
      drill.player.currentStats.specialAttack = 40;
      drill.click(4, 5);
      if (reason === "teleport") drill.player.setLocation({ x: 5, y: 5 });
      else if (reason === "stale") drill.player.beginEncounterTick(tick(18));
      else drill.player.currentStats.hitpoint = 0;
      drill.region.world.tickWorld();
      expect(drill.player.currentStats.specialAttack).toBe(40);
    } finally { drill.dispose(); }
  });

  test.each(["ordinary", "same tile", "blocked"])("a %s click earns no energy", (kind) => {
    const drill = practice({ phase: "finale" });
    try {
      drill.tickTo(kind === "ordinary" ? 15 : 16);
      drill.player.currentStats.specialAttack = 40;
      if (kind === "same tile") drill.click(5, 5);
      else if (kind === "blocked") {
        for (let x = 4; x <= 6; x++) for (let y = 4; y <= 6; y++) {
          if (x !== 5 || y !== 5) drill.region.addEntity(new InvisibleMovementBlocker(drill.region, { x, y }));
        }
        drill.click(3, 5);
      }
      else drill.click(4, 5);
      drill.region.world.tickWorld();
      expect(drill.player.lastDodge).toBeNull();
      expect(drill.player.currentStats.specialAttack).toBe(40);
    } finally { drill.dispose(); }
  });

  test.each([true, false])("a sword landing restores energy only when safe: %s", (safe) => {
    const drill = practice();
    try {
      const flight = ZEKE_RULES.autos.openingStar.value + ZEKE_RULES.swords.chargeAfter.value;
      drill.tickTo(flight - 1);
      const sword = drill.boss.encounter.swords[0];
      if (!sword) throw new Error("The first sword volley was not spawned.");
      const from = sword.axis === "x" ? { x: 5, y: sword.lane } : { x: sword.lane, y: 5 };
      const to = safe
        ? sword.axis === "x" ? { x: 5, y: sword.lane <= 5 ? sword.lane + 4 : sword.lane - 4 } : { x: sword.lane <= 5 ? sword.lane + 4 : sword.lane - 4, y: 5 }
        : sword.axis === "x" ? { x: 6, y: sword.lane } : { x: sword.lane, y: 6 };
      drill.player.setLocation(from);
      drill.player.currentStats.specialAttack = 40;
      drill.click(to.x, to.y);
      expect(drill.player.currentStats.specialAttack).toBe(40);
      drill.tickTo(flight);
      expect(drill.player.location).toEqual(to);
      const events = drill.boss.rows.at(-1)?.events ?? [];
      expect(events.some((event) => event.kind === "sword-hit-player" && event.target === "tank")).toBe(!safe);
      expect(drill.player.currentStats.specialAttack).toBe(safe ? 43 : 40);
    } finally { drill.dispose(); }
  });
});
