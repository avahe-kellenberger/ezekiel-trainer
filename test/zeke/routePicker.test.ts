import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Settings, TrainerInstance } from "osrs-sdk";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";
import { ZekeRoutePicker } from "../../src/ZekeRoutePicker";

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
