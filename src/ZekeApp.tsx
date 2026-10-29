import React, { useEffect, useRef, useState } from "react";
import { CacheRender, ControlPanelController, SETTINGS_STORAGE_KEY, Settings, SoundCache, TrainerInstance, Viewport } from "osrs-sdk";
import type { TrainerLoadingState } from "osrs-sdk";
import { GameOverlay, TrainerApp, TrainerLoadingSplash, useSettingsSnapshot, useTrainerSnapshot } from "osrs-sdk-react";
import { ZekeRegion } from "./content/zeke/ZekeRegion";
import type { ZekeRunResult } from "./content/zeke/ZekeRegion";
import { Zeke } from "./content/zeke/Zeke";
import { installWindSurgeControls, WindSurgeControls } from "./content/zeke/WindSurgeControls";
import { ZekeRoutePicker } from "./ZekeRoutePicker";
import { parseZekeRouteId } from "./content/zeke/ZekeRoutePlans";
import type { ZekeRouteId } from "./content/zeke/ZekeRoutePlans";
import { ZEKE_PRESENTATION } from "./content/zeke/assets";

const CREDIT_LINE = "Created using intellectual property belonging to Jagex Limited under the terms of Jagex's Fan Content Policy. This content is not endorsed by or affiliated with Jagex.";
const MUSIC_STORAGE_KEY = "zeke:music-volume";

type Setup = "melee" | "ranged";
type PracticeOptions = Readonly<{ seed: number; setup: Setup; invincible: boolean; phase: "full" | "finale"; routeDemo: ZekeRouteId | null }>;
type MusicState = "waiting" | "playing" | "paused" | "unavailable";

function practiceOptions(): PracticeOptions {
  const params = new URL(window.location.href).searchParams;
  const seed = Number(params.get("seed"));
  const routeDemo = parseZekeRouteId(params.get("route"));
  return {
    seed: params.has("seed") && Number.isSafeInteger(seed) && seed >= 0 ? seed : crypto.getRandomValues(new Uint32Array(1))[0],
    phase: routeDemo === null && params.get("phase") === "finale" ? "finale" : "full",
    routeDemo,
    setup: params.get("setup") === "ranged" ? "ranged" : "melee",
    invincible: params.get("invincible") === "on",
  };
}

function readSettings(): void {
  let saved: unknown = null;
  try {
    saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "null");
  } catch {}
  const values: unknown = typeof saved === "object" && saved !== null && "values" in saved ? saved.values : null;
  const sound = typeof values === "object" && values !== null && "playsAudio" in values && typeof values.playsAudio === "boolean" ? values.playsAudio : true;
  const areaSound = typeof values === "object" && values !== null && "playsAreaAudio" in values && typeof values.playsAreaAudio === "boolean" ? values.playsAreaAudio : true;
  Settings.readFromStorage();
  Settings.set({ use3dView: true, rotated: "north", trueTileEnabled: true, playsAudio: sound, playsAreaAudio: areaSound, displayBossHealthBar: true });
}

function openTrainer() {
  CacheRender.configure(new URL("osrs-assets/manifest.json", window.location.href).href);
  readSettings();
  const options = practiceOptions();
  const { routeDemo, ...encounterOptions } = options;
  const region = new ZekeRegion(routeDemo === null ? { ...encounterOptions, skipCountdown: true } : { ...encounterOptions, routeDemo, skipCountdown: true });
  const trainer = new TrainerInstance(region);
  installWindSurgeControls();
  if (process.env.NODE_ENV !== "production") window.__zekeProbe = {
    snapshot: () => {
      const fight = region.snapshot();
      if (!fight) return null;
      return {
      ...fight,
      ticking: !trainer.world.isPaused,
      destination: trainer.getSnapshot().player?.destinationLocation ?? null,
      panel: {
        tab: ControlPanelController.controller.selectedControl instanceof WindSurgeControls ? "STANDARDSPELLBOOK" : Object.entries(ControlPanelController.controls).find(([, control]) => control === ControlPanelController.controller.selectedControl)?.[0] ?? null,
        keys: { inventory: Settings.inventory_key, prayer: Settings.prayer_key, equipment: Settings.equipment_key, combat: Settings.combat_key, spellbook: Settings.spellbook_key },
      },
      menu: Viewport.viewport.contextMenu.isActive ? Viewport.viewport.contextMenu.menuOptions.map((option) => option.text.map((block) => `${block.text}`).join("")) : null,
      };
    },
    log: () => region.fightLog(),
    tileCentre: (at) => Viewport.viewport.projectTile(at, trainer.world),
  };
  return { trainer, region, options };
}

declare global {
  interface Window {
    __zekeProbe?: Readonly<{
      snapshot(): NonNullable<ReturnType<ZekeRegion["snapshot"]>> & Readonly<{
        ticking: boolean;
        destination: Readonly<{ x: number; y: number }> | null;
        panel: Readonly<{ tab: string | null; keys: Readonly<Record<string, string>> }>;
        menu: readonly string[] | null;
      }> | null;
      log(): ReturnType<ZekeRegion["fightLog"]>;
      tileCentre(at: Readonly<{ x: number; y: number }>): Readonly<{ x: number; y: number }> | null;
    }>;
  }
}

function savedMusicVolume(): number {
  try {
    const saved = localStorage.getItem(MUSIC_STORAGE_KEY);
    const volume = Number(saved);
    return saved !== null && Number.isFinite(volume) && volume >= 0 && volume <= 1 ? volume : 0.35;
  } catch {
    return 0.35;
  }
}

function Music({ ready }: Readonly<{ ready: boolean }>) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = useState(savedMusicVolume);
  const [state, setState] = useState<MusicState>("waiting");
  const paused = useTrainerSnapshot(({ world }) => world.isPaused);
  const hasInteracted = useRef(false);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    const play = () => {
      if (ready && !paused && volume > 0 && hasInteracted.current) {
        void audio.play().catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "NotAllowedError") setState("waiting");
          else if (error instanceof DOMException && error.name === "NotSupportedError") setState("unavailable");
        });
      } else audio.pause();
    };
    const interact = () => {
      hasInteracted.current = true;
      void SoundCache.context?.resume();
      play();
    };
    window.addEventListener("pointerdown", interact, true);
    window.addEventListener("keydown", interact, true);
    play();
    return () => {
      window.removeEventListener("pointerdown", interact, true);
      window.removeEventListener("keydown", interact, true);
      audio.pause();
    };
  }, [ready, paused, volume]);
  const changeVolume = (next: number) => {
    setVolume(next);
    try { localStorage.setItem(MUSIC_STORAGE_KEY, String(next)); } catch {}
  };
  return (
    <div id="zeke_music">
      <audio ref={audioRef} src={ZEKE_PRESENTATION.region.musicPath} preload="auto" loop onPlaying={() => setState("playing")} onPause={() => setState("paused")} onError={() => setState("unavailable")} />
      <label>Music <input aria-label="Music volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => changeVolume(Number(event.target.value))} /></label>
      <span id="music_status" role="status" data-state={state}>{state === "unavailable" ? "Encounter music could not load." : "Blade of Forgotten Justice"}</span>
    </div>
  );
}

function PracticeControls({ trainer, region, options, ready }: ReturnType<typeof openTrainer> & Readonly<{ ready: boolean }>) {
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [phase, setPhase] = useState(options.phase);
  const [setup, setSetup] = useState(options.setup);
  const [invincible, setInvincible] = useState(options.invincible);
  const [seed, setSeed] = useState(String(options.seed));
  const { playsAudio, playsAreaAudio } = useSettingsSnapshot();
  const paused = useTrainerSnapshot(({ world }) => world.isPaused);
  const demoKind = region.routeDemoSnapshot().kind;
  const demoFinished = demoKind === "failed";
  const apply = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("setup", setup);
    url.searchParams.set("phase", phase);
    if (phase === "finale") url.searchParams.delete("route");
    url.searchParams.set("seed", seed);
    url.searchParams.delete("allies");
    if (invincible) url.searchParams.set("invincible", "on");
    else url.searchParams.delete("invincible");
    window.location.assign(url.href);
  };
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); setHelp(false); }
    };
    window.addEventListener("keydown", close, true);
    return () => window.removeEventListener("keydown", close, true);
  }, []);
  return (
    <form id="drill_controls" onSubmit={(event) => { event.preventDefault(); apply(); }}>
      <div id="settings_menu" hidden={!open}>
        <label>Encounter <select value={phase} onChange={(event) => setPhase(event.target.value === "finale" ? "finale" : "full")}><option value="full">Full encounter</option><option value="finale">Finale practice</option></select></label>
        <label>Loadout <select id="setup" value={setup} onChange={(event) => setSetup(event.target.value === "ranged" ? "ranged" : "melee")}><option value="melee">Melee</option><option value="ranged">Ranged</option></select></label>
        <label>Pattern seed <input id="seed" value={seed} inputMode="numeric" pattern="[0-9]+" onChange={(event) => setSeed(event.target.value)} onKeyDown={(event) => event.stopPropagation()} /></label>
        <label>Invincible <input id="invincible" type="checkbox" checked={invincible} onChange={(event) => setInvincible(event.target.checked)} /></label>
        <button type="submit">Apply &amp; restart</button>
        <hr />
        <label>Sound effects <input id="sound" type="checkbox" checked={playsAudio} onChange={(event) => Settings.set({ playsAudio: event.target.checked })} /></label>
        <label>Area sounds <input id="area_sound" type="checkbox" checked={playsAreaAudio} onChange={(event) => Settings.set({ playsAreaAudio: event.target.checked })} /></label>
        <Music ready={ready} />
        <button id="keybinds" type="button" disabled={!ready} onClick={() => { ControlPanelController.controller.setActiveControl("SETTINGS"); setOpen(false); }}>Game settings &amp; keybinds</button>
      </div>
      <section id="zeke_help" hidden={!help}>
        <h2>Ezekiel practice</h2>
        <p>Left-click to move or attack. Right-click for the game menu. Drag with the middle mouse button to rotate the camera and scroll to zoom.</p>
        <p>Use the game tabs for prayers, equipment, inventory and combat styles. You are the tank. Align Ezekiel's center with the sword lanes.</p>
        <p>Under Ezekiel, he tries a new escape direction each tick. Stay in melee range when he attacks; otherwise his magic hits the whole team.</p>
        <p>Show solves draws a reference path and numbered movement clicks for each sword wave. Routes start at tile (4, 7) and do not adapt to your current position. You control movement and attacks.</p>
        <p>Encounter timing and damage remain under calibration.</p>
        <button type="button" onClick={() => setHelp(false)}>Close</button>
      </section>
      <button id="settings" type="button" aria-expanded={open} onClick={() => { setOpen(!open); setHelp(false); }}>Settings</button>
      <button id="restart" type="button" disabled={!ready} onClick={() => trainer.reset()}>Restart</button>
      <button id="pause" type="button" disabled={!ready || demoFinished} onClick={() => paused ? trainer.start() : trainer.stop()}>{paused ? "Resume" : "Pause"}</button>
      <ZekeRoutePicker region={region} trainer={trainer} ready={ready} />
      <button type="button" aria-expanded={help} onClick={() => { setHelp(!help); setOpen(false); }}>Help</button>
    </form>
  );
}

function GameChat({ region }: Readonly<{ region: ZekeRegion }>) {
  const [lines, setLines] = useState<readonly string[]>([]);
  useEffect(() => {
    const poll = window.setInterval(() => setLines([...region.chat()]), 300);
    return () => window.clearInterval(poll);
  }, [region]);
  return <ol id="game_chat">{lines.slice(-5).map((line, index) => <li key={index}>{line}</li>)}</ol>;
}

const VISUAL_TICKS: readonly number[] = [1, 2, 3, 4, 5];

function VisualTicks({ region }: Readonly<{ region: ZekeRegion }>) {
  const [encounterTick, setEncounterTick] = useState(0);
  useEffect(() => {
    let displayedTick = 0;
    const sample = () => {
      const boss = region.primaryBoss;
      const nextTick = boss instanceof Zeke ? boss.encounterTick : 0;
      if (nextTick !== displayedTick) {
        displayedTick = nextTick;
        setEncounterTick(nextTick);
      }
      frame = window.requestAnimationFrame(sample);
    };
    let frame = window.requestAnimationFrame(sample);
    return () => window.cancelAnimationFrame(frame);
  }, [region]);
  const active = encounterTick > 0 ? (encounterTick - 1) % VISUAL_TICKS.length + 1 : 0;
  return (
    <div id="visual_ticks" role="img" aria-label={`Tick ${active} of ${VISUAL_TICKS.length}`} data-tick={encounterTick}>
      {VISUAL_TICKS.map((position) => <span key={position} data-active={position === active} />)}
    </div>
  );
}

function RunResultPanel({ trainer, region }: Readonly<{ trainer: TrainerInstance; region: ZekeRegion }>) {
  const [result, setResult] = useState<ZekeRunResult | null>(null);
  useEffect(() => {
    const poll = window.setInterval(() => setResult(region.result), 200);
    return () => window.clearInterval(poll);
  }, [region]);
  if (!result) return null;
  const seconds = result.tick * 0.6;
  const time = `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, "0")}`;
  const retry = () => { setResult(null); trainer.reset(); };
  const restart = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("seed");
    window.location.assign(url.href);
  };
  return (
    <section id="run_result" role="dialog" aria-labelledby="run_result_title" aria-describedby="run_result_detail">
      <h2 id="run_result_title">{result.kind === "victory" ? "Ezekiel defeated" : "You died"}</h2>
      <p id="run_result_detail">{time} · {result.tick} ticks{result.invincible ? " · Invincible practice" : ""}</p>
      <button id="result_restart" type="button" onClick={restart}>Restart with new pattern</button>{" "}
      <button id="result_retry" type="button" onClick={retry}>Retry this pattern</button>
    </section>
  );
}

export function ZekeApp() {
  const [opened] = useState(openTrainer);
  const [loading, setLoading] = useState<TrainerLoadingState>();
  const ready = loading?.status === "ready";
  return (
    <TrainerApp trainer={opened.trainer} onLoadingStateChange={setLoading} aria-label="Ezekiel trainer">
      <GameOverlay>
        <TrainerLoadingSplash state={loading} />
        <div id="hud_corner">
          <GameChat region={opened.region} />
          <VisualTicks region={opened.region} />
          <PracticeControls {...opened} ready={ready} />
          <footer id="credits">
            <p id="maker_credit">Ezekiel Trainer · Built with <a href="https://github.com/OldSchoolSDK/osrs-sdk" target="_blank" rel="noopener noreferrer">osrs-sdk</a> and <a href="https://github.com/Julian-Dasilva/ArchiveOcellusTrainer" target="_blank" rel="noopener noreferrer">Archive Ocellus Trainer</a>.</p>
            <p id="credit_line">{CREDIT_LINE}</p>
          </footer>
        </div>
        <RunResultPanel trainer={opened.trainer} region={opened.region} />
      </GameOverlay>
    </TrainerApp>
  );
}
