import React, { useEffect, useRef, useState } from "react";
import { ZekeRouteOverlay } from "./ZekeRouteOverlay";
import type { TrainerInstance } from "osrs-sdk";
import type { ZekeRegion } from "./content/zeke/ZekeRegion";
import { ZEKE_ROUTE_SCENARIOS } from "./content/zeke/ZekeRoutePlans";
import type { ZekeRouteId, ZekeRouteScenario } from "./content/zeke/ZekeRoutePlans";
import type { ZekeRouteDemoStatus } from "./content/zeke/ZekeRouteDemo";
import type { SwordPattern } from "./content/zeke/mechanics";
import { nextStarAt } from "./content/zeke/mechanics";
import { ZEKE_RULES } from "./content/zeke/ZekeRules";

function swordPath(pattern: SwordPattern, x: number, y: number): boolean {
  const halfWidth = ZEKE_RULES.swords.halfWidth.value;
  switch (pattern.kind) {
    case "cross":
      return Math.abs(x - pattern.column) <= halfWidth || Math.abs(y - pattern.row) <= halfWidth;
    case "parallel":
      return ZEKE_RULES.swords.lanes.value.some((lane) => Math.abs((pattern.axis === "x" ? y : x) - lane) <= halfWidth);
    case "two-rows":
      return ZEKE_RULES.swords.twoRows.value.some((lane) => Math.abs(y - lane) <= halfWidth);
    default: {
      const unhandled: never = pattern;
      return unhandled;
    }
  }
}

function ScenarioIcon({ scenario }: Readonly<{ scenario: ZekeRouteScenario }>) {
  const tiles: React.ReactNode[] = [];
  for (let y = 1; y <= 9; y++) for (let x = 1; x <= 9; x++) {
    tiles.push(<rect key={`${x},${y}`} x={(x - 1) * 10} y={(y - 1) * 10} width="9" height="9" fill={swordPath(scenario.pattern, x, y) ? "#c65050" : "#777b80"} />);
  }
  const pattern = scenario.pattern;
  return (
    <svg className="route_scenario_icon" viewBox="0 0 89 89" aria-hidden="true" focusable="false">
      {tiles}
      {pattern.kind === "parallel" && ZEKE_RULES.swords.lanes.value.map((lane, index) => (
        <g key={lane} transform={pattern.axis === "x" ? `translate(0 ${(lane - 1) * 10 + 4.5})` : `translate(${(lane - 1) * 10 + 4.5} 0) rotate(90)`}>
          <path d="M 12 0 H 76 M 68 -5 L 76 0 L 68 5" fill="none" stroke="#fff" strokeWidth="2.5" />
          <text x="18" y="-2" fill="#fff" fontSize="9" fontWeight="bold">{index + 1}</text>
        </g>
      ))}
    </svg>
  );
}

function demoMessage(status: ZekeRouteDemoStatus): string {
  switch (status.kind) {
    case "disabled": return "Choose a scenario to practice.";
    case "practice": return "Manual practice · you control the tank";
    case "playing": return `${status.stage.kind === "returning" ? "Returning to start" : "Automatic demo"} · loop ${status.cycle} · game input locked`;
    case "complete": return "Scenario finished · restarting";
    case "failed": return `Route stopped: ${status.reason}`;
    default: {
      const unhandled: never = status;
      return unhandled;
    }
  }
}

export function ZekeRoutePicker({ region, trainer, ready }: Readonly<{ region: ZekeRegion; trainer: TrainerInstance; ready: boolean }>) {
  const [visiblePanel, setVisiblePanel] = useState<"closed" | "scenarios" | "status">(() => region.routeDemoSnapshot().kind === "disabled" ? "closed" : "status");
  const open = visiblePanel === "scenarios";
  const [showPath, setShowPath] = useState(false);
  const [paused, setPaused] = useState(trainer.world.isPaused);
  const [status, setStatus] = useState(() => region.routeDemoSnapshot());
  const panel = useRef<HTMLElement>(null);
  const pickerButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const poll = window.setInterval(() => {
      const next = region.routeDemoSnapshot();
      const fight = next.kind === "practice" ? region.snapshot() : null;
      const nextStar = fight?.phase.kind === "recovery" ? nextStarAt(fight.phase) : null;
      const recoveryComplete = fight !== null && nextStar !== null && fight.tick >= nextStar - 1;
      if (next.kind === "complete" || (!trainer.world.isPaused && next.kind === "practice" && (recoveryComplete || region.result !== null))) {
        trainer.reset();
      }
      setStatus(region.routeDemoSnapshot());
      setPaused(trainer.world.isPaused);
    }, 100);
    return () => window.clearInterval(poll);
  }, [region, trainer]);
  useEffect(() => {
    const guard = (event: Event) => {
      if (region.routeDemoSnapshot().kind !== "playing") return;
      const target = event.target;
      const keyboard = event instanceof KeyboardEvent;
      if (keyboard) {
        if (["Tab", "Escape", "Enter", " "].includes(event.key) && target instanceof Element && target.closest("button, input, select, textarea, a, [contenteditable]")) return;
      } else {
        if (!(target instanceof HTMLCanvasElement)) return;
        // Keep middle-button camera rotation available while watching.
        if (event instanceof MouseEvent && event.button === 1) return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const events = ["pointerdown", "pointerup", "mousedown", "mouseup", "click", "contextmenu", "touchstart", "touchend", "keydown", "keyup"];
    events.forEach((name) => window.addEventListener(name, guard, { capture: true, passive: false }));
    return () => { events.forEach((name) => window.removeEventListener(name, guard, true)); };
  }, [region]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setVisiblePanel("closed");
        pickerButton.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  useEffect(() => {
    if (open) panel.current?.querySelector<HTMLButtonElement>("button[data-scenario]")?.focus();
  }, [open]);
  const choose = (id: ZekeRouteId | null) => {
    region.selectRouteScenario(id);
    trainer.reset();
    const url = new URL(window.location.href);
    if (id === null) url.searchParams.delete("route");
    else url.searchParams.set("route", id);
    window.history.replaceState(null, "", url);
    setStatus(region.routeDemoSnapshot());
    setPaused(trainer.world.isPaused);
    setVisiblePanel(id === null ? "closed" : "status");
  };
  const play = () => {
    if (status.kind === "playing") region.takeRouteControl();
    else region.playRoute();
    trainer.reset();
    setStatus(region.routeDemoSnapshot());
    setPaused(trainer.world.isPaused);
  };
  const togglePause = () => {
    if (trainer.world.isPaused) trainer.start();
    else trainer.stop();
    setPaused(trainer.world.isPaused);
  };
  const closeStatus = () => {
    setVisiblePanel("closed");
    pickerButton.current?.focus();
  };
  const changeAttackMode = (windSurge: boolean) => {
    region.setRouteAttackMode(windSurge ? "wind-surge" : "scythe");
    trainer.reset();
    setStatus(region.routeDemoSnapshot());
    setPaused(trainer.world.isPaused);
  };
  return (
    <>
      {showPath && ready && status.kind !== "disabled" && <ZekeRouteOverlay trainer={trainer} scenario={status.scenario} />}
      {status.kind !== "disabled" && visiblePanel === "status" && <section id="route_demo_status" aria-label="Scenario practice">
        <div className="route_scenarios_heading"><strong>{status.scenario.label}</strong><button id="route_close" type="button" onClick={closeStatus} aria-label="Close scenario box">Close</button></div>
        <span role="status" data-kind={status.kind}>{paused ? "Paused · " : ""}{demoMessage(status)}</span>
        <span id="route_casts">{status.attackMode === "wind-surge" ? `Wind Surge casts: ${status.combat.filter((event) => event.cycle === status.cycle && event.kind === "cast").length}/${status.scenario.expectedCasts}` : "Scythe attacks"}{status.starOffset === null ? " · Opening attacks" : ` · Tick ${status.starOffset + 1}`}</span>
        <label className="route_path_toggle"><input id="route_wind_surge" type="checkbox" disabled={!ready} checked={status.attackMode === "wind-surge"} onChange={(event) => changeAttackMode(event.target.checked)} /> Use Wind Surge in automatic demo</label>
        <label className="route_path_toggle"><input id="route_show_path" type="checkbox" disabled={!ready} checked={showPath} onChange={(event) => setShowPath(event.target.checked)} /> Show path and numbered clicks</label>
        <div>
          <button id="route_play" type="button" disabled={!ready} onClick={play}>{status.kind === "playing" ? "Practice manually" : "Watch automatic demo"}</button>{" "}
          <button id="route_pause" type="button" disabled={!ready || status.kind === "failed"} onClick={togglePause}>{paused ? "Resume" : "Pause"}</button>{" "}
          <button id="route_replay" type="button" disabled={!ready} onClick={() => trainer.reset()}>Restart</button>{" "}
          <button type="button" onClick={() => setVisiblePanel("scenarios")}>Change scenario</button>{" "}
          <button id="route_manual" type="button" onClick={() => choose(null)}>Exit scenarios</button>
        </div>
        <small>{status.attackMode === "wind-surge" ? `Harm staff: ${status.scenario.expectedCasts} Wind Surge ${status.scenario.expectedCasts === 1 ? "cast" : "casts"}, then scythe.` : "Scythe the boss whenever the route allows."} Keep attacking through the stun, return to start, then restart. At most one input per tick. Changing attack mode restarts the scenario.</small>
        <small>Charge can land through tick {ZEKE_RULES.swords.impactAfter.value + 1}, counting spawn as tick 1. Provisional timing.</small>
      </section>}
      <section ref={panel} id="route_scenarios" aria-labelledby="route_scenarios_title" hidden={!open}>
        <div className="route_scenarios_heading"><h2 id="route_scenarios_title">Choose a scenario</h2><button type="button" onClick={() => setVisiblePanel(status.kind === "disabled" ? "closed" : "status")} aria-label="Close scenarios">Close</button></div>
        <p>Practice one pattern on repeat. Show the path or choose Watch automatic demo to watch the simulator control the tank.</p>
        <div className="route_scenario_grid">
          {ZEKE_ROUTE_SCENARIOS.map((scenario) => <button type="button" key={scenario.id} data-scenario={scenario.id} aria-label={`Select ${scenario.label}`} aria-pressed={status.kind !== "disabled" && status.scenario.id === scenario.id} disabled={!ready} onClick={() => choose(scenario.id)}>
            <ScenarioIcon scenario={scenario} />
            <span>{scenario.label}</span>
          </button>)}
        </div>
        <p className="route_legend"><span /> Red tiles show sword paths. Sweeps cover the lanes in numbered order.</p>
      </section>
      <button ref={pickerButton} id="route_picker" type="button" disabled={!ready} aria-controls={status.kind === "disabled" || open ? "route_scenarios" : "route_demo_status"} aria-expanded={visiblePanel !== "closed"} onClick={() => setVisiblePanel(visiblePanel !== "closed" ? "closed" : status.kind === "disabled" ? "scenarios" : "status")}>{status.kind === "disabled" ? "Choose sword scenario" : visiblePanel === "closed" ? "Show scenario" : "Hide scenario"}</button>
    </>
  );
}
