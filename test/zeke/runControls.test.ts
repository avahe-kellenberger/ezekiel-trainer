import { Settings, TrainerInstance, Viewport } from "osrs-sdk";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import { nextSeed, restartZekeRun } from "../../src/ZekeRunControls";
import { seed } from "../../src/sim/brands";

function practice() {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false });
  const region = new ZekeRegion({ seed: 42, setup: "ranged", invincible: true, routeDemo: "two-rows", skipCountdown: true });
  const trainer = new TrainerInstance(region);
  const loop = vi.spyOn(trainer.world, "startLoop").mockImplementation(() => {});
  trainer.mount(document.createElement("canvas"), document.createElement("div"));
  return { region, trainer, dispose: () => { trainer.dispose(); loop.mockRestore(); window.history.replaceState(null, "", "/"); } };
}

test("a seed restart updates the URL and native player while retaining the world and viewport", () => {
  window.history.replaceState(null, "", "/?seed=42&setup=ranged&phase=full&route=two-rows&invincible=on&allies=old#arena");
  const view = practice();
  try {
    const world = view.trainer.world;
    const viewport = Viewport.viewport;
    const previousPlayer = view.trainer.getSnapshot().player;
    restartZekeRun(view.trainer, view.region, { ...view.region.runOptions, seed: seed(43) });
    expect(view.trainer.world).toBe(world);
    expect(Viewport.viewport).toBe(viewport);
    expect(view.trainer.getSnapshot().player).not.toBe(previousPlayer);
    expect(view.region.fightLog()).toEqual({ seed: 43, rows: [] });
    expect(view.region.routeDemoSnapshot()).toMatchObject({ kind: "practice", scenario: { id: "two-rows" } });
    const url = new URL(window.location.href);
    expect(url.hash).toBe("#arena");
    expect(Object.fromEntries(url.searchParams)).toEqual({ seed: "43", setup: "ranged", phase: "full", route: "two-rows", invincible: "on" });
    restartZekeRun(view.trainer, view.region, { ...view.region.runOptions, seed: seed(44) });
    view.trainer.reset();
    expect(view.region.seed).toBe(44);
    expect(new URL(window.location.href).searchParams.get("seed")).toBe("44");
  } finally { view.dispose(); }
});

test("applying run settings updates the live encounter and shareable URL", () => {
  window.history.replaceState(null, "", "/?seed=42&route=two-rows&invincible=on");
  const view = practice();
  try {
    restartZekeRun(view.trainer, view.region, { seed: seed(100), setup: "melee", phase: "finale", invincible: false });
    expect(view.region.runOptions).toEqual({ seed: 100, setup: "melee", phase: "finale", invincible: false });
    expect(view.region.routeDemoSnapshot().kind).toBe("disabled");
    expect(Object.fromEntries(new URL(window.location.href).searchParams)).toEqual({ seed: "100", setup: "melee", phase: "finale" });
  } finally { view.dispose(); }
});

test("choosing a scenario after finale keeps it through the next seed restart", () => {
  const view = practice();
  try {
    restartZekeRun(view.trainer, view.region, { ...view.region.runOptions, phase: "finale" });
    view.region.selectRouteScenario("cross-2-2", true);
    view.trainer.reset();
    expect(view.region.runOptions.phase).toBe("full");
    restartZekeRun(view.trainer, view.region, { ...view.region.runOptions, seed: seed(50) });
    expect(view.region.routeDemoSnapshot()).toMatchObject({ kind: "playing", scenario: { id: "cross-2-2" } });
  } finally { view.dispose(); }
});

test.each([42, 0xffffffff])("a new seed changes even when the random value repeats %s", (current) => {
  const random = vi.spyOn(crypto, "getRandomValues").mockImplementation((array) => {
    if (array instanceof Uint32Array) array.fill(current);
    return array;
  });
  try {
    expect(nextSeed(seed(current))).toBe(current === 0xffffffff ? 0 : current + 1);
  } finally { random.mockRestore(); }
});
