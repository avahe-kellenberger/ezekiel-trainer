import type { TrainerInstance } from "osrs-sdk";
import type { ZekeRegion, ZekeRunOptions } from "./content/zeke/ZekeRegion";
import { seed } from "./sim/brands";
import type { Seed } from "./sim/brands";

export function nextSeed(currentSeed: Seed): Seed {
  const candidate = crypto.getRandomValues(new Uint32Array(1))[0];
  return seed(candidate === currentSeed ? (candidate + 1) >>> 0 : candidate);
}

export function restartZekeRun(trainer: TrainerInstance, region: ZekeRegion, options: ZekeRunOptions): void {
  const url = new URL(window.location.href);
  url.searchParams.set("seed", String(options.seed));
  url.searchParams.set("setup", options.setup);
  url.searchParams.set("phase", options.phase);
  url.searchParams.delete("allies");
  if (options.phase === "finale") url.searchParams.delete("route");
  if (options.invincible) url.searchParams.set("invincible", "on");
  else url.searchParams.delete("invincible");
  region.configureRun(options);
  trainer.reset();
  window.history.replaceState(null, "", url);
}
