import React, { useCallback, useEffect, useSyncExternalStore } from "react";
import { Settings } from "osrs-sdk";
import type { TrainerInstance } from "osrs-sdk";
import type { ZekeRegion } from "./content/zeke/ZekeRegion";

function playbackState(trainer: TrainerInstance, region: ZekeRegion): "playing" | "paused" | "finished" {
  if (region.result !== null || region.routeDemoSnapshot().kind === "failed") return "finished";
  return trainer.world.isPaused ? "paused" : "playing";
}

export function usePauseShortcut(trainer: TrainerInstance, region: ZekeRegion, enabled: boolean): void {
  useEffect(() => {
    const toggle = (event: KeyboardEvent) => {
      const target = event.target;
      if (!enabled || playbackState(trainer, region) === "finished" || event.defaultPrevented || event.repeat || event.ctrlKey || event.altKey || event.metaKey || Settings.is_keybinding || event.key.toLowerCase() !== "p") return;
      if (target instanceof Element && target.closest("input, select, textarea, [contenteditable]:not([contenteditable='false'])")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (trainer.world.isPaused) trainer.start();
      else trainer.stop();
    };
    window.addEventListener("keydown", toggle, true);
    return () => window.removeEventListener("keydown", toggle, true);
  }, [trainer, region, enabled]);
}

export function PauseButton({ trainer, region, disabled, id }: Readonly<{ trainer: TrainerInstance; region: ZekeRegion; disabled: boolean; id: string }>) {
  const subscribe = useCallback((notify: () => void) => {
    const unsubscribe = trainer.subscribe(notify);
    const poll = window.setInterval(notify, 100);
    return () => { unsubscribe(); window.clearInterval(poll); };
  }, [trainer]);
  const state = useSyncExternalStore(subscribe, () => playbackState(trainer, region), () => playbackState(trainer, region));
  const label = state === "playing" ? "Pause" : "Play";
  const toggle = () => {
    if (playbackState(trainer, region) === "finished") return;
    if (trainer.world.isPaused) trainer.start();
    else trainer.stop();
  };
  return (
    <button id={id} className="icon_button" type="button" disabled={disabled || state === "finished"} aria-label={label} title={`${label} (P)`} aria-keyshortcuts="P" onClick={toggle}>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" fill="currentColor">
        {state === "playing" ? <path d="M5 3h5v18H5zm9 0h5v18h-5z" /> : <path d="M7 3v18l14-9z" />}
      </svg>
    </button>
  );
}
