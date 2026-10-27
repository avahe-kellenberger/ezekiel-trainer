import { PlayerAnimationIndices, Projectile, Settings, TrainerInstance } from "osrs-sdk";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import { ZekePlayer } from "../../src/content/zeke/ZekePlayer";
import { Zeke } from "../../src/content/zeke/Zeke";

function practice() {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false });
  const region = new ZekeRegion({ seed: 1 });
  const trainer = new TrainerInstance(region);
  const player = trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const boss = region.primaryBoss;
  if (!(player instanceof ZekePlayer) || !(boss instanceof Zeke)) throw new Error("Expected encounter actors.");
  region.world.tickWorld(region.world.getReadyTimer - 1);
  region.world.startTicking();
  const lethalHit = () => {
    player.currentStats.hitpoint = 1;
    const hit = new Projectile(null, 1, boss, player, "typeless", { setDelay: 1 });
    player.addProjectile(hit);
    region.world.tickWorld();
    return hit;
  };
  return { region, trainer, player, boss, lethalHit, dispose: () => trainer.dispose() };
}

describe("native player death presentation", () => {
  test("shows the death sequence before publishing the result, retaining the lethal encounter tick", () => {
    const drill = practice();
    const play = vi.spyOn(drill.player, "playAnimation").mockResolvedValue();
    try {
      drill.lethalHit();
      const lethalTick = drill.boss.encounterTick;
      expect(drill.player.dying).toBe(4);
      expect(drill.region.world.isPaused).toBe(false);
      expect(drill.region.result).toBeNull();
      expect(play).not.toHaveBeenCalledWith(PlayerAnimationIndices.Dying, false);
      drill.region.world.tickWorld();
      expect(play).toHaveBeenCalledWith(PlayerAnimationIndices.Dying, false);
      expect(drill.region.result).toBeNull();
      drill.region.world.tickWorld(2);
      expect(drill.player.dying).toBe(1);
      expect(drill.region.world.isPaused).toBe(false);
      expect(drill.region.result).toBeNull();
      drill.region.world.tickWorld();
      expect(drill.region.world.isPaused).toBe(true);
      expect(drill.region.result).toEqual({ kind: "death", tick: lethalTick, invincible: false });
      expect(drill.region.snapshot()?.tick).toBe(lethalTick);
    } finally { play.mockRestore(); drill.dispose(); }
  });

  test("retains the finishing hitsplat while cancelling future damage and boss actions", () => {
    const drill = practice();
    try {
      drill.player.setLocation({ x: drill.boss.location.x + 1, y: drill.boss.location.y - 1 });
      const future = new Projectile(null, 50, drill.boss, drill.player, "typeless", { setDelay: 3 });
      drill.player.addProjectile(future);
      const futureBossHit = new Projectile(null, 50, drill.player, drill.boss, "magic", { setDelay: 3 });
      drill.boss.addProjectile(futureBossHit);
      const lethal = drill.lethalHit();
      expect(drill.player.incomingProjectiles).toContain(lethal);
      const paint = { save: vi.fn(), restore: vi.fn(), translate: vi.fn(), rotate: vi.fn(), drawImage: vi.fn(), fillText: vi.fn() };
      const context = paint as unknown as OffscreenCanvasRenderingContext2D;
      drill.player.drawUILayer(0, { visible: true, logicalHeight: 1, atHeight: () => ({ x: 10, y: 10 }) }, context, 1);
      expect(paint.drawImage).toHaveBeenCalledTimes(1);
      expect(paint.fillText).toHaveBeenCalledWith("1", expect.any(Number), expect.any(Number));
      expect(drill.player.incomingProjectiles).not.toContain(future);
      expect(drill.boss.incomingProjectiles).not.toContain(futureBossHit);
      const bossTile = { ...drill.boss.location };
      const bossHp = drill.boss.currentStats.hitpoint;
      const encounter = drill.boss.encounter;
      const rows = [...drill.boss.rows];
      drill.region.world.tickWorld(4);
      expect(drill.boss.location).toEqual(bossTile);
      expect(drill.boss.currentStats.hitpoint).toBe(bossHp);
      expect(drill.boss.encounter).toEqual(encounter);
      expect(drill.boss.rows).toEqual(rows);
    } finally { drill.dispose(); }
  });

  test("restart during the death sequence clears the old outcome and delayed animation", () => {
    const drill = practice();
    const play = vi.spyOn(drill.player, "playAnimation").mockResolvedValue();
    try {
      drill.lethalHit();
      const reset = drill.region.reset(false);
      expect(reset.player).not.toBe(drill.player);
      expect(drill.region.result).toBeNull();
      drill.region.world.startTicking();
      drill.region.world.tickWorld(6);
      expect(reset.player.currentStats.hitpoint).toBeGreaterThan(0);
      expect(drill.region.result).toBeNull();
      expect(play).not.toHaveBeenCalledWith(PlayerAnimationIndices.Dying, false);
    } finally { play.mockRestore(); drill.dispose(); }
  });
});
