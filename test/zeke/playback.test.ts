import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Settings, TrainerInstance } from "osrs-sdk";
import { TrainerProvider } from "osrs-sdk-react";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import { PauseButton, usePauseShortcut } from "../../src/ZekePlayback";
import { ZekeRoutePicker } from "../../src/ZekeRoutePicker";
import { tick } from "../../src/sim/brands";

function Playback({ trainer, region, enabled }: Readonly<{ trainer: TrainerInstance; region: ZekeRegion; enabled: boolean }>) {
  usePauseShortcut(trainer, region, enabled);
  return React.createElement(PauseButton, { trainer, region, disabled: !enabled, id: "pause" });
}

function controls(demo: boolean) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false });
  const region = new ZekeRegion(demo ? { routeDemo: "cross-2-2", routeAutoplay: true } : {});
  const trainer = new TrainerInstance(region);
  const loop = vi.spyOn(trainer.world, "startLoop").mockImplementation(() => {});
  trainer.mount(document.createElement("canvas"), document.createElement("div"));
  trainer.start();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const render = (enabled: boolean) => act(() => root.render(React.createElement(TrainerProvider, { trainer, children: [
    React.createElement(Playback, { key: "playback", trainer, region, enabled }),
    React.createElement(ZekeRoutePicker, { key: "picker", region, trainer, ready: true }),
  ] })));
  render(true);
  const press = (init: KeyboardEventInit, target: EventTarget = document.body) => {
    const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
    act(() => { target.dispatchEvent(event); });
    return event;
  };
  const button = container.querySelector("#pause");
  if (!(button instanceof HTMLButtonElement)) throw new Error("Missing pause button");
  return { trainer, region, container, button, press, render, dispose: () => {
    act(() => root.unmount());
    trainer.dispose();
    container.remove();
    loop.mockRestore();
    vi.unstubAllGlobals();
  } };
}

test.each([false, true])("P and the icon button share pause state without resetting the fight, demo=%s", (demo) => {
  const view = controls(demo);
  try {
    const player = view.trainer.getSnapshot().player;
    const progress = view.region.routeDemoSnapshot();
    const pauseIcon = view.button.querySelector("path")?.getAttribute("d");
    expect(view.button.textContent).toBe("");
    expect(view.button.getAttribute("aria-label")).toBe("Pause");
    expect(view.press({ key: "p" }).defaultPrevented).toBe(true);
    expect(view.trainer.world.isPaused).toBe(true);
    expect(view.button.getAttribute("aria-label")).toBe("Play");
    expect(view.button.querySelector("path")?.getAttribute("d")).not.toBe(pauseIcon);
    if (demo) expect(view.container.querySelector("#route_pause")?.getAttribute("aria-label")).toBe("Play");
    act(() => view.button.click());
    expect(view.trainer.world.isPaused).toBe(false);
    expect(view.button.querySelector("path")?.getAttribute("d")).toBe(pauseIcon);
    view.press({ key: "P", shiftKey: true });
    expect(view.trainer.world.isPaused).toBe(true);
    expect(view.trainer.getSnapshot().player).toBe(player);
    expect(view.region.routeDemoSnapshot()).toEqual(progress);
  } finally { view.dispose(); }
});

test("P ignores typing, repeats, modified shortcuts, keybinding edits, and disabled controls", () => {
  const view = controls(false);
  try {
    for (const init of [{ key: "p", repeat: true }, { key: "p", ctrlKey: true }, { key: "p", metaKey: true }, { key: "p", altKey: true }, { key: "F4" }]) view.press(init);
    for (const tag of ["input", "textarea", "select"]) {
      const input = document.createElement(tag);
      view.container.append(input);
      expect(view.press({ key: "p" }, input).defaultPrevented).toBe(false);
    }
    const editor = document.createElement("div");
    editor.setAttribute("contenteditable", "true");
    view.container.append(editor);
    view.press({ key: "p" }, editor);
    Settings.is_keybinding = true;
    view.press({ key: "p" });
    Settings.is_keybinding = false;
    expect(view.trainer.world.isPaused).toBe(false);
    view.render(false);
    view.press({ key: "p" });
    act(() => view.button.click());
    expect(view.trainer.world.isPaused).toBe(false);
  } finally { Settings.is_keybinding = false; view.dispose(); }
});

test("automatic encounter stops update the icon and cannot be resumed by P or a click", () => {
  vi.useFakeTimers();
  const view = controls(false);
  const result = vi.spyOn(view.region, "result", "get").mockReturnValue({ kind: "death", tick: tick(10), invincible: false });
  try {
    view.trainer.world.stopTicking();
    view.press({ key: "p" });
    act(() => view.button.click());
    expect(view.trainer.world.isPaused).toBe(true);
    act(() => vi.advanceTimersByTime(100));
    expect(view.button.disabled).toBe(true);
    expect(view.button.getAttribute("aria-label")).toBe("Play");
  } finally { result.mockRestore(); view.dispose(); vi.useRealTimers(); }
});
