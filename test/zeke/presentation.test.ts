import { Projectile, Settings, TrainerInstance } from "osrs-sdk";
import { Zeke } from "../../src/content/zeke/Zeke";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import { ZekeSword } from "../../src/content/zeke/hazards";
import { ZEKE_DIALOGUE } from "../../src/content/zeke/presentation";
import { tick, tile } from "../../src/sim/brands";

function practice() {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false });
  const region = new ZekeRegion({ seed: 1, invincible: true });
  const trainer = new TrainerInstance(region);
  trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const boss = region.primaryBoss;
  if (!(boss instanceof Zeke)) throw new Error("Zeke was not mounted.");
  region.world.tickWorld(region.world.getReadyTimer - 1);
  const tickTo = (at: number) => {
    while (boss.encounterTick < at) region.world.tickWorld();
  };
  return { region, trainer, boss, tickTo };
}

test("the boss speaks recorded engage and star lines and clears them on the client clock", () => {
  const drill = practice();
  try {
    drill.tickTo(2);
    expect(ZEKE_DIALOGUE.engage).toContain(drill.boss.overheadText);
    for (let cycle = 0; cycle <= 100; cycle++) drill.region.world.tickClient(0);
    expect(drill.boss.overheadText).toBeNull();
    drill.tickTo(16);
    expect(ZEKE_DIALOGUE.star).toContain(drill.boss.overheadText);
    drill.tickTo(31);
    expect(drill.boss.overheadText).toBe("Agh!");
  } finally { drill.trainer.dispose(); }
});

test("swords show only a countdown until charged, with the yellow charge above it until flight", () => {
  const drill = practice();
  let now = tick(16);
  const sword = new ZekeSword(drill.region, tile(-1, 5), { axis: "x", direction: 1, chargeAt: tick(32), impactAt: tick(33) }, () => now);
  const rectangles: { color: string; x: number; y: number; width: number; height: number }[] = [];
  const drawing = {
    fillStyle: "",
    fillRect(x: number, y: number, width: number, height: number) { rectangles.push({ color: this.fillStyle, x, y, width, height }); },
  };
  const context = drawing as unknown as OffscreenCanvasRenderingContext2D;
  const render = () => {
    rectangles.length = 0;
    sword.drawHPBar(context, 32, 0);
    return rectangles.filter((rectangle) => rectangle.color === "#780b0b").map((rectangle) => rectangle.width);
  };
  try {
    drill.region.world.tickPercent = 0;
    expect(render()).toEqual([]);
    expect(rectangles).toEqual([]);
    now = tick(18);
    expect(render()).toEqual([45]);
    expect(rectangles).toHaveLength(2);
    const player = drill.region.players[0];
    sword.addProjectile(new Projectile(null, 80, player, sword, "magic", { setDelay: 1 }));
    sword.queueStep();
    render();
    expect(rectangles).toContainEqual({ color: "#dbd300", x: -35, y: -14, width: 56, height: 5 });
    expect(rectangles).toContainEqual({ color: "#2d2b00", x: -35, y: -14, width: 70, height: 5 });
    expect(rectangles).toContainEqual({ color: "#780b0b", x: -22.5, y: -7, width: 45, height: 5 });
    sword.addProjectile(new Projectile(null, 50, player, sword, "magic", { setDelay: 1 }));
    sword.queueStep();
    render();
    expect(rectangles).toContainEqual({ color: "#dbd300", x: -35, y: -14, width: 70, height: 5 });
    now = tick(24);
    drill.region.world.tickPercent = 0.5;
    expect(render()).toEqual([22]);
    now = tick(30);
    drill.region.world.tickPercent = 0.99;
    render();
    expect(rectangles).toContainEqual({ color: "#140101", x: -22.5, y: -7, width: 45, height: 5 });
    now = tick(31);
    drill.region.world.tickPercent = 0;
    expect(render()).toEqual([]);
    expect(rectangles.some((rectangle) => rectangle.color === "#140101")).toBe(false);
    expect(rectangles).toContainEqual({ color: "#dbd300", x: -35, y: -14, width: 70, height: 5 });
    sword.move(tile(11, 5), true);
    expect(render()).toEqual([]);
    expect(rectangles).toEqual([]);
  } finally { drill.trainer.dispose(); }
});
