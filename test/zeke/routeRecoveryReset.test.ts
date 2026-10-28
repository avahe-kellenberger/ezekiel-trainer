import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Settings, TrainerInstance } from "osrs-sdk";
import { ZekeRoutePicker } from "../../src/ZekeRoutePicker";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import { tick } from "../../src/sim/brands";

test.each([
  { charge: 80, until: 41, before: 51, resetAt: 52 },
  { charge: 100, until: 45, before: 52, resetAt: 56 },
])("manual practice respects the actual recovery deadline for $charge% charge", ({ until, before, resetAt }) => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  Settings.readFromStorage();
  Settings.set({ playsAudio: false, playsAreaAudio: false });
  const region = new ZekeRegion({ routeDemo: "cross-2-2" });
  const trainer = new TrainerInstance(region);
  const loop = vi.spyOn(trainer.world, "startLoop").mockImplementation(() => {});
  const player = trainer.mount(document.createElement("canvas"), document.createElement("div"));
  trainer.world.startTicking();
  const snapshot = region.snapshot();
  if (snapshot === null) throw new Error("Expected mounted practice.");
  let at = before;
  const observe = vi.spyOn(region, "snapshot").mockImplementation(() => ({ ...snapshot, tick: at, phase: { kind: "recovery", recovery: "weaken", started: tick(31), stunnedUntil: tick(until) } }));
  const reset = vi.spyOn(trainer, "reset").mockImplementation(() => player);
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    act(() => root.render(React.createElement(ZekeRoutePicker, { region, trainer, ready: true })));
    act(() => vi.advanceTimersByTime(100));
    expect(reset).not.toHaveBeenCalled();
    at = resetAt;
    act(() => vi.advanceTimersByTime(100));
    expect(reset).toHaveBeenCalledOnce();
  } finally {
    act(() => root.unmount());
    observe.mockRestore();
    reset.mockRestore();
    loop.mockRestore();
    trainer.dispose();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});
