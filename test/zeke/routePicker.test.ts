import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { Settings, TrainerInstance } from "osrs-sdk";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import { ZekeRoutePicker } from "../../src/ZekeRoutePicker";
import { Zeke } from "../../src/content/zeke/Zeke";

function picker(ready = true) {
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false });
  const region = new ZekeRegion();
  const trainer = new TrainerInstance(region);
  trainer.mount(document.createElement("canvas"), document.createElement("div"));
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(React.createElement(ZekeRoutePicker, { region, trainer, ready }));
  return { container, dispose: () => trainer.dispose() };
}

describe("watchable route scenario picker", () => {
  test("offers eleven full 9x9 scenario icons with red hazard tiles and gray other tiles", () => {
    const view = picker();
    try {
      expect(view.container.querySelector("#route_scenarios[hidden]")).not.toBeNull();
      expect(view.container.querySelector("#route_picker")?.textContent).toBe("Choose sword scenario");
      expect(view.container.querySelector("#route_picker")?.getAttribute("aria-expanded")).toBe("false");
      const buttons = view.container.querySelectorAll("button[data-scenario]");
      expect(buttons).toHaveLength(11);
      for (const button of buttons) {
        expect(button.querySelectorAll("rect")).toHaveLength(81);
        expect(button.querySelectorAll('rect[fill="#c65050"], rect[fill="#777b80"]')).toHaveLength(81);
      }
      const cross = view.container.querySelector('[data-scenario="cross-2-2"]');
      expect(cross?.querySelectorAll('rect[fill="#c65050"]')).toHaveLength(45);
      expect(cross?.querySelectorAll('rect[fill="#777b80"]')).toHaveLength(36);
      const rows = view.container.querySelector('[data-scenario="two-rows"]');
      expect(rows?.querySelectorAll('rect[fill="#c65050"]')).toHaveLength(54);
      expect(rows?.querySelectorAll('rect[fill="#777b80"]')).toHaveLength(27);
      for (const id of ["parallel-x", "parallel-y"]) {
        const sweep = view.container.querySelector(`[data-scenario="${id}"]`);
        expect(sweep?.querySelectorAll('rect[fill="#c65050"]')).toHaveLength(81);
        expect([...sweep?.querySelectorAll("text") ?? []].map((label) => label.textContent)).toEqual(["1", "2", "3"]);
      }
    } finally { view.dispose(); }
  });

  test("scenario selection waits until the native trainer is ready", () => {
    const view = picker(false);
    try {
      expect(view.container.querySelectorAll("button[data-scenario][disabled]")).toHaveLength(11);
      expect(view.container.querySelector("#route_picker[disabled]")).not.toBeNull();
    } finally { view.dispose(); }
  });
});

describe("automatic demo controls", () => {
  test.each([
    { attackMode: "scythe", control: "playing", route: "cross-2-2" },
    { attackMode: "wind-surge", control: "playing", route: "cross-2-2" },
    { attackMode: "scythe", control: "practice", route: "cross-5-2" },
  ] as const)("$attackMode $control restarts after its full stun through the trainer while its box is hidden", ({ attackMode, control, route }) => {
    vi.useFakeTimers();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    Settings.readFromStorage();
    Settings.set({ playsAudio: false, playsAreaAudio: false });
    const region = new ZekeRegion({ routeDemo: route, routeAutoplay: control === "playing", routeAttackMode: attackMode, invincible: true });
    const trainer = new TrainerInstance(region);
    const container = document.createElement("div");
    document.body.append(container);
    const startLoop = vi.spyOn(trainer.world, "startLoop").mockImplementation(() => {});
    trainer.mount(document.createElement("canvas"), container);
    const root = createRoot(container);
    try {
      act(() => root.render(React.createElement(ZekeRoutePicker, { region, trainer, ready: true })));
      const close = container.querySelector("#route_close");
      if (!(close instanceof HTMLButtonElement)) throw new Error("Missing scenario close button");
      act(() => close.click());
      const originalPlayer = trainer.getSnapshot().player;
      const boss = region.primaryBoss;
      if (!(boss instanceof Zeke)) throw new Error("Missing native boss");
      let stunEnd: number | null = null;
      for (let count = 0; count < 90 && region.routeDemoSnapshot().kind !== "complete"; count++) {
        region.world.tickWorld();
        const phase = boss.encounter.phase;
        if (phase.kind === "recovery" && phase.recovery === "weaken") {
          stunEnd = phase.stunnedUntil;
          if (boss.encounterTick < stunEnd) expect(region.routeDemoSnapshot().kind).toBe(control);
        }
      }
      expect(stunEnd).not.toBeNull();
      expect(boss.encounterTick).toBe(stunEnd);
      expect(region.routeDemoSnapshot()).toMatchObject({ kind: "complete", attackMode });
      expect(trainer.world.isPaused).toBe(true);
      expect(trainer.getSnapshot().player).toBe(originalPlayer);
      act(() => vi.advanceTimersByTime(100));
      expect(trainer.getSnapshot().player).not.toBe(originalPlayer);
      expect(trainer.getSnapshot().player).toBe(region.players[0]);
      expect(region.routeDemoSnapshot()).toMatchObject({ kind: control, attackMode, cycle: 2, starOffset: null });
      expect(region.snapshot()?.tick).toBe(0);
      expect(trainer.world.isPaused).toBe(false);
      expect(container.querySelector("#route_demo_status")).toBeNull();
      expect(container.querySelector("#route_picker")?.textContent).toBe("Show scenario");
      const restartedPlayer = trainer.getSnapshot().player;
      act(() => vi.advanceTimersByTime(500));
      expect(trainer.getSnapshot().player).toBe(restartedPlayer);
    } finally {
      act(() => root.unmount());
      trainer.dispose();
      container.remove();
      startLoop.mockRestore();
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  test("defaults to scythe, restarts when Wind Surge changes, and hides the box without interrupting playback", () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    Settings.readFromStorage();
    Settings.set({ playsAudio: false, playsAreaAudio: false });
    const region = new ZekeRegion({ routeDemo: "cross-2-2", routeAutoplay: true });
    const trainer = new TrainerInstance(region);
    const container = document.createElement("div");
    document.body.append(container);
    const startLoop = vi.spyOn(trainer.world, "startLoop").mockImplementation(() => {});
    trainer.mount(document.createElement("canvas"), container);
    const root = createRoot(container);
    const click = (selector: string) => {
      const control = container.querySelector(selector);
      if (!(control instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
      act(() => control.click());
    };
    const windSurge = () => {
      const control = container.querySelector("#route_wind_surge");
      if (!(control instanceof HTMLInputElement)) throw new Error("Missing Wind Surge checkbox");
      return control;
    };
    try {
      act(() => root.render(React.createElement(ZekeRoutePicker, { region, trainer, ready: true })));
      expect(windSurge().checked).toBe(false);
      expect(region.routeDemoSnapshot()).toMatchObject({ kind: "playing", attackMode: "scythe" });
      const original = trainer.getSnapshot().player;
      click("#route_wind_surge");
      expect(windSurge().checked).toBe(true);
      expect(region.routeDemoSnapshot()).toMatchObject({ kind: "playing", attackMode: "wind-surge", starOffset: null });
      expect(trainer.getSnapshot().player).not.toBe(original);
      click("#route_replay");
      expect(windSurge().checked).toBe(true);
      expect(region.routeDemoSnapshot()).toMatchObject({ attackMode: "wind-surge" });
      click("#route_wind_surge");
      expect(windSurge().checked).toBe(false);
      expect(region.routeDemoSnapshot()).toMatchObject({ attackMode: "scythe" });
      const beforeClose = region.routeDemoSnapshot();
      const player = trainer.getSnapshot().player;
      click("#route_close");
      expect(container.querySelector("#route_demo_status")).toBeNull();
      expect(container.querySelector("#route_picker")?.textContent).toBe("Show scenario");
      expect(document.activeElement?.id).toBe("route_picker");
      expect(region.routeDemoSnapshot()).toEqual(beforeClose);
      expect(trainer.getSnapshot().player).toBe(player);
      expect(trainer.world.isPaused).toBe(false);
      click("#route_picker");
      expect(container.querySelector("#route_demo_status")).not.toBeNull();
      expect(windSurge().checked).toBe(false);
      expect(region.routeDemoSnapshot()).toEqual(beforeClose);
      windSurge().focus();
      act(() => windSurge().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })));
      expect(container.querySelector("#route_demo_status")).toBeNull();
      expect(document.activeElement?.id).toBe("route_picker");
      const tab = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
      document.activeElement?.dispatchEvent(tab);
      expect(tab.defaultPrevented).toBe(false);
    } finally {
      act(() => root.unmount());
      trainer.dispose();
      container.remove();
      startLoop.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  test("locks game input during the demo, pauses without resetting, and restores manual control", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    Settings.readFromStorage();
    Settings.set({ playsAudio: false, playsAreaAudio: false });
    const region = new ZekeRegion({ routeDemo: "cross-2-2" });
    const trainer = new TrainerInstance(region);
    const canvas = document.createElement("canvas");
    const container = document.createElement("div");
    document.body.append(canvas, container);
    const startLoop = vi.spyOn(trainer.world, "startLoop").mockImplementation(() => {});
    trainer.mount(document.createElement("canvas"), container);
    const root = createRoot(container);
    const gameClick = vi.fn();
    const gameKey = vi.fn();
    canvas.addEventListener("mousedown", gameClick);
    document.addEventListener("keydown", gameKey);
    const click = (selector: string) => {
      const button = container.querySelector(selector);
      if (!(button instanceof HTMLButtonElement)) throw new Error(`Missing ${selector}`);
      act(() => button.click());
    };
    const mouse = () => canvas.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    try {
      act(() => root.render(React.createElement(ZekeRoutePicker, { region, trainer, ready: true })));
      expect(container.querySelector("#route_play")?.textContent).toBe("Watch automatic demo");
      mouse();
      expect(gameClick).toHaveBeenCalledTimes(1);
      click("#route_play");
      expect(region.routeDemoSnapshot().kind).toBe("playing");
      expect(mouse()).toBe(false);
      document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "F3", bubbles: true, cancelable: true }));
      expect(gameClick).toHaveBeenCalledTimes(1);
      expect(gameKey).not.toHaveBeenCalled();
      expect(container.querySelector("#route_pause")?.nextElementSibling?.id).toBe("route_replay");
      const player = trainer.getSnapshot().player;
      const progress = region.routeDemoSnapshot();
      click("#route_pause");
      expect(trainer.world.isPaused).toBe(true);
      expect(container.querySelector("#route_pause")?.textContent).toBe("Resume");
      expect(trainer.getSnapshot().player).toBe(player);
      expect(region.routeDemoSnapshot()).toEqual(progress);
      expect(mouse()).toBe(false);
      click("#route_pause");
      expect(trainer.world.isPaused).toBe(false);
      expect(trainer.getSnapshot().player).toBe(player);
      click("#route_play");
      expect(region.routeDemoSnapshot().kind).toBe("practice");
      expect(mouse()).toBe(true);
      expect(gameClick).toHaveBeenCalledTimes(2);
      document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "F3", bubbles: true }));
      expect(gameKey).toHaveBeenCalledTimes(1);
    } finally {
      act(() => root.unmount());
      document.removeEventListener("keydown", gameKey);
      trainer.dispose();
      canvas.remove();
      container.remove();
      startLoop.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
