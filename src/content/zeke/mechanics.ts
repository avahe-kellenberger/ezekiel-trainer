import type { ClientCycles, Seed, Tick, Tile } from "../../sim/brands";
import { clientCycles, seed, tick, tile } from "../../sim/brands";
import { ZEKE_RULES } from "./ZekeRules";

export type AutoOrdinal = 1 | 2;
export type EnrageSafe = "north" | "south" | "west";
export type SwordPattern =
  | Readonly<{ kind: "cross"; row: number; column: number }>
  | Readonly<{ kind: "parallel"; axis: "x" | "y"; direction: -1 | 1 }>
  | Readonly<{ kind: "two-rows" }>;

export type EncounterPhase =
  | Readonly<{ kind: "opening"; started: Tick }>
  | Readonly<{ kind: "star"; started: Tick; pattern: SwordPattern }>
  | Readonly<{ kind: "recovery"; started: Tick; stunnedUntil: Tick; recovery: "weaken" | "heal" | "miss" }>
  | Readonly<{ kind: "enrage"; started: Tick; volley: number; pattern: EnrageSafe; order: number }>
  | Readonly<{ kind: "ended"; reason: "boss-dead" }>;

export type StarVisual = Readonly<{ kind: "star"; delay: ClientCycles }> | Readonly<{ kind: "lightning" }>;
export type StarHazard = Readonly<{ id: number; tile: Tile; activeFrom: Tick; expiresAt: Tick; visual: StarVisual }>;
export type SwordHazard = Readonly<{
  id: number;
  tile: Tile;
  axis: "x" | "y";
  direction: -1 | 1;
  lane: number;
  spawnedAt: Tick;
  chargeAt: Tick;
  status: "charging" | "flying" | "spent";
  chargeDamage: number;
  charged: boolean;
  hitBoss: boolean;
  hitPlayers: readonly string[];
}>;

export type EncounterState = Readonly<{
  tick: Tick;
  phase: EncounterPhase;
  rng: Seed;
  autos: 0 | 1 | 2;
  stars: readonly StarHazard[];
  swords: readonly SwordHazard[];
  nextHazardId: number;
  pendingHeal: Tick | null;
}>;

export type Participant = Readonly<{ id: string; tile: Tile }>;
export type EncounterObservation = Readonly<{
  tick: Tick;
  boss: Tile;
  tank: Tile;
  party: readonly Participant[];
  dodgeLandings: readonly Participant[];
  bossAlive: boolean;
  bossHp: number;
  maxHp: number;
  swordCharges: readonly Readonly<{ id: number; damage: number }>[];
}>;

export type EncounterEvent =
  | Readonly<{ kind: "auto"; style: "melee" | "magic"; targets: readonly string[]; ordinal: AutoOrdinal }>
  | Readonly<{ kind: "star-tell"; pattern: SwordPattern }>
  | Readonly<{ kind: "star-burst" }>
  | Readonly<{ kind: "star-expire" }>
  | Readonly<{ kind: "star-hit"; target: string }>
  | Readonly<{ kind: "sword-charge"; swordId: number }>
  | Readonly<{ kind: "sword-hit-boss"; swordId: number; charged: boolean; chargeDamage: number }>
  | Readonly<{ kind: "sword-hit-player"; swordId: number; target: string; chargeDamage: number }>
  | Readonly<{ kind: "swords-missed" }>
  | Readonly<{ kind: "boss-heal"; fraction: number }>
  | Readonly<{ kind: "enrage-start"; boss: Tile; player: Tile }>
  | Readonly<{ kind: "enrage-cage"; player: Tile }>
  | Readonly<{ kind: "enrage-tell"; safe: EnrageSafe; volley: number }>
  | Readonly<{ kind: "enrage-dodge-cue" }>
  | Readonly<{ kind: "enrage-hit"; target: string }>
  | Readonly<{ kind: "successful-dodge"; target: string; tick: Tick }>
  | Readonly<{ kind: "enrage-reset" }>
  | Readonly<{ kind: "ended" }>;

export type BossMovement =
  | Readonly<{ kind: "hold" }>
  | Readonly<{ kind: "follow" }>
  | Readonly<{ kind: "walk-under"; dx: number; dy: number }>;

export type EncounterStep = Readonly<{
  state: EncounterState;
  events: readonly EncounterEvent[];
  movement: BossMovement;
}>;

export function createEncounter(initialSeed: Seed): EncounterState {
  return { tick: tick(0), phase: { kind: "opening", started: tick(0) }, rng: initialSeed, autos: 0, stars: [], swords: [], nextHazardId: 0, pendingHeal: null };
}

export function bossContains(boss: Tile, point: Tile): boolean {
  const size = ZEKE_RULES.boss.size.value;
  return point.x >= boss.x && point.x < boss.x + size && point.y <= boss.y && point.y > boss.y - size;
}

export function besideBoss(boss: Tile, point: Tile): boolean {
  const last = ZEKE_RULES.boss.size.value - 1;
  const dx = Math.max(boss.x - point.x, point.x - boss.x - last, 0);
  const dy = Math.max(boss.y - last - point.y, point.y - boss.y, 0);
  return dx + dy === 1;
}

export function bossCenter(boss: Tile): Tile {
  const half = Math.floor(ZEKE_RULES.boss.size.value / 2);
  return tile(boss.x + half, boss.y - half);
}

function draw(rng: Seed, choices: number): Readonly<{ rng: Seed; index: number }> {
  const next = seed((Math.imul(rng, 1664525) + 1013904223) >>> 0);
  return { rng: next, index: Math.floor((next / 4294967296) * choices) };
}

function choosePattern(rng: Seed, first: boolean): Readonly<{ rng: Seed; pattern: SwordPattern }> {
  if (first) {
    const choice = draw(rng, ZEKE_RULES.swords.firstCrosses.value.length);
    return { rng: choice.rng, pattern: { kind: "cross", ...ZEKE_RULES.swords.firstCrosses.value[choice.index] } };
  }
  const choice = draw(rng, ZEKE_RULES.swords.layoutWeights.value.length);
  const layout = ZEKE_RULES.swords.layoutWeights.value[choice.index];
  if (layout === "rows") return { rng: choice.rng, pattern: { kind: "parallel", axis: "x", direction: 1 } };
  if (layout === "columns") return { rng: choice.rng, pattern: { kind: "parallel", axis: "y", direction: 1 } };
  if (layout === "two-rows") return { rng: choice.rng, pattern: { kind: "two-rows" } };
  const cross = draw(choice.rng, ZEKE_RULES.swords.crosses.value.length);
  return { rng: cross.rng, pattern: { kind: "cross", ...ZEKE_RULES.swords.crosses.value[cross.index] } };
}

function starTiles(boss: Tile, at: Tick, firstId: number): readonly StarHazard[] {
  const center = bossCenter(boss);
  const half = Math.floor(ZEKE_RULES.boss.size.value / 2);
  const ring = half + 1;
  const stars: StarHazard[] = [];
  for (let x = ZEKE_RULES.arena.min.value; x <= ZEKE_RULES.arena.max.value; x++) {
    for (let y = ZEKE_RULES.arena.min.value; y <= ZEKE_RULES.arena.max.value; y++) {
      const dx = Math.abs(x - center.x);
      const dy = Math.abs(y - center.y);
      const onRing = Math.max(dx, dy) === ring;
      const broadArm = (dx === ring + 1 && dy <= half) || (dy === ring + 1 && dx <= half);
      const tip = (dy === 0 && dx > ring + 1 && dx <= ring + ZEKE_RULES.star.outerArm.value) || (dx === 0 && dy > ring + 1 && dy <= ring + ZEKE_RULES.star.outerArm.value);
      if (onRing || broadArm || tip) stars.push({
        id: firstId + stars.length, tile: tile(x, y), activeFrom: tick(at + ZEKE_RULES.star.activeAfter.value), expiresAt: tick(at + ZEKE_RULES.star.expiresAfter.value),
        visual: { kind: "star", delay: clientCycles(ZEKE_RULES.star.visualSpawnDelay.value + (Math.max(dx, dy) - ring) * ZEKE_RULES.star.visualArmDelay.value) },
      });
    }
  }
  return stars;
}

function spawnSwords(pattern: SwordPattern, at: Tick, firstId: number): readonly SwordHazard[] {
  const create = (axis: "x" | "y", lane: number, direction: -1 | 1, id: number, delay = 0): SwordHazard => {
    const edge = direction === 1 ? ZEKE_RULES.swords.edgeLow.value : ZEKE_RULES.swords.edgeHigh.value;
    return {
      id, tile: axis === "x" ? tile(edge, lane) : tile(lane, edge), axis, direction, lane, spawnedAt: at,
      chargeAt: tick(at + ZEKE_RULES.swords.chargeAfter.value + delay), status: "charging", chargeDamage: 0, charged: false, hitBoss: false, hitPlayers: [],
    };
  };
  switch (pattern.kind) {
    case "cross":
      return [create("x", pattern.row, 1, firstId), create("x", pattern.row, -1, firstId + 1), create("y", pattern.column, 1, firstId + 2), create("y", pattern.column, -1, firstId + 3)];
    case "parallel":
      return ZEKE_RULES.swords.lanes.value.map((lane, index) => create(pattern.axis, lane, pattern.direction, firstId + index, index * ZEKE_RULES.swords.parallelInterval.value));
    case "two-rows":
      return ZEKE_RULES.swords.twoRows.value.flatMap((lane, index) => [create("x", lane, 1, firstId + index * 2), create("x", lane, -1, firstId + index * 2 + 1)]);
    default: {
      const unhandled: never = pattern;
      return unhandled;
    }
  }
}

function startStar(state: EncounterState, observation: EncounterObservation, patternOverride: SwordPattern | null): EncounterState {
  const choice = choosePattern(state.rng, state.nextHazardId === 0);
  const stars = starTiles(observation.boss, observation.tick, state.nextHazardId);
  const pattern = patternOverride ?? choice.pattern;
  const swords = spawnSwords(pattern, observation.tick, state.nextHazardId + stars.length);
  return { ...state, rng: choice.rng, phase: { kind: "star", started: observation.tick, pattern }, autos: 0, stars, swords, nextHazardId: state.nextHazardId + stars.length + swords.length };
}

function starIsDue(state: EncounterState, at: Tick): boolean {
  if (state.autos !== ZEKE_RULES.autos.count.value) return false;
  const phase = state.phase;
  switch (phase.kind) {
    case "opening":
      return at - phase.started >= ZEKE_RULES.autos.openingStar.value;
    case "recovery":
      return at - phase.started >= (phase.recovery === "weaken" ? ZEKE_RULES.autos.recoveryStar.value : ZEKE_RULES.autos.healedStar.value);
    case "star":
    case "enrage":
    case "ended":
      return false;
    default: {
      const unhandled: never = phase;
      return unhandled;
    }
  }
}

function firstAutoAt(phase: EncounterPhase): Tick | null {
  switch (phase.kind) {
    case "opening":
      return tick(phase.started + ZEKE_RULES.autos.openingFirst.value);
    case "star":
      return tick(phase.started + ZEKE_RULES.autos.starFirst.value);
    case "recovery":
      return tick(phase.started + (phase.recovery === "weaken" ? ZEKE_RULES.autos.recoveryFirst.value : ZEKE_RULES.autos.healedFirst.value));
    case "enrage":
    case "ended":
      return null;
    default: {
      const unhandled: never = phase;
      return unhandled;
    }
  }
}

function allParticipants(observation: EncounterObservation): readonly Participant[] {
  return [{ id: "tank", tile: observation.tank }, ...observation.party.filter((member) => member.id !== "tank")];
}

function hazardParticipants(observation: EncounterObservation): readonly Participant[] {
  return allParticipants(observation).map((member) => observation.dodgeLandings.find((landing) => landing.id === member.id) ?? member);
}

function confirmSuccessfulDodges(observation: EncounterObservation, events: EncounterEvent[]): void {
  for (const landing of observation.dodgeLandings) {
    const hit = events.some((event) => (event.kind === "sword-hit-player" || event.kind === "enrage-hit") && event.target === landing.id);
    if (!hit) events.push({ kind: "successful-dodge", target: landing.id, tick: observation.tick });
  }
}

function swordCrosses(sword: SwordHazard, destination: Tile, point: Tile, halfWidth: number): boolean {
  const start = sword.axis === "x" ? sword.tile.x : sword.tile.y;
  const end = sword.axis === "x" ? destination.x : destination.y;
  const along = sword.axis === "x" ? point.x : point.y;
  const across = sword.axis === "x" ? point.y : point.x;
  return Math.abs(across - sword.lane) <= halfWidth && along >= Math.min(start, end) && along <= Math.max(start, end);
}

function moveSwords(state: EncounterState, observation: EncounterObservation, events: EncounterEvent[]): EncounterState {
  if (state.swords.length === 0 || state.swords.every((sword) => sword.status === "spent")) return state;
  const participants = hazardParticipants(observation);
  const boss = bossCenter(observation.boss);
  let newlyHitBoss = false;
  const swords = state.swords.map((sword): SwordHazard => {
    if (sword.status === "spent" || observation.tick < sword.chargeAt) return sword;
    if (sword.status === "flying") return { ...sword, status: observation.tick >= sword.chargeAt + ZEKE_RULES.swords.despawnAfter.value ? "spent" : "flying" };
    events.push({ kind: "sword-charge", swordId: sword.id });
    const distance = sword.direction * ZEKE_RULES.swords.speed.value;
    const destination = sword.axis === "x" ? tile(sword.tile.x + distance, sword.tile.y + 0) : tile(sword.tile.x + 0, sword.tile.y + distance);
    const hitBoss = swordCrosses(sword, destination, boss, 0);
    if (hitBoss) {
      events.push({ kind: "sword-hit-boss", swordId: sword.id, charged: sword.charged, chargeDamage: sword.chargeDamage });
      newlyHitBoss = true;
    }
    const hitPlayers = participants.filter((player) => swordCrosses(sword, destination, player.tile, ZEKE_RULES.swords.halfWidth.value));
    for (const player of hitPlayers) events.push({ kind: "sword-hit-player", swordId: sword.id, target: player.id, chargeDamage: sword.chargeDamage });
    return { ...sword, tile: destination, status: "flying", hitBoss, hitPlayers: hitPlayers.map((player) => player.id) };
  });
  if (newlyHitBoss && state.phase.kind === "star") {
    return { ...state, swords, phase: { kind: "recovery", recovery: "weaken", started: observation.tick, stunnedUntil: tick(observation.tick + ZEKE_RULES.swords.stun.value) }, autos: 0 };
  }
  if (swords.every((sword) => sword.status === "spent") && swords.every((sword) => !sword.hitBoss) && state.phase.kind === "star") {
    const heals = state.phase.pattern.kind !== "parallel";
    if (heals) events.push({ kind: "swords-missed" });
    return { ...state, swords, pendingHeal: heals ? tick(state.phase.started + ZEKE_RULES.swords.chargeAfter.value + ZEKE_RULES.swords.healHitAfter.value) : null,
      phase: { kind: "recovery", recovery: heals ? "heal" : "miss", started: observation.tick, stunnedUntil: observation.tick }, autos: 0 };
  }
  return { ...state, swords };
}

export function resolveAfterMovement(state: EncounterState, observation: EncounterObservation): Readonly<{ state: EncounterState; events: readonly EncounterEvent[] }> {
  if (state.phase.kind === "enrage" || state.phase.kind === "ended") return { state, events: [] };
  const events: EncounterEvent[] = [];
  const first = firstAutoAt(state.phase);
  if (first !== null && state.autos < ZEKE_RULES.autos.count.value && observation.tick >= first + state.autos * ZEKE_RULES.autos.interval.value) {
    const ordinal: AutoOrdinal = state.autos === 0 ? 1 : 2;
    const style = besideBoss(observation.boss, observation.tank) ? "melee" : "magic";
    events.push({ kind: "auto", style, ordinal, targets: allParticipants(observation).filter((member) => style === "magic" || member.id === "tank" || cleaveHits(observation.boss, observation.tank, member.tile)).map((member) => member.id) });
    state = { ...state, autos: ordinal };
  }
  const resolved = moveSwords(state, observation, events);
  if (events.some((event) => event.kind === "sword-charge")) confirmSuccessfulDodges(observation, events);
  return { state: resolved, events };
}

function movementAllowed(phase: EncounterPhase, at: Tick): boolean {
  switch (phase.kind) {
    case "opening":
      return true;
    case "star":
      return at - phase.started >= ZEKE_RULES.star.followAfter.value;
    case "recovery":
      return at >= phase.stunnedUntil;
    case "enrage":
    case "ended":
      return false;
    default: {
      const unhandled: never = phase;
      return unhandled;
    }
  }
}

export function advanceEncounter(previous: EncounterState, observation: EncounterObservation, patternOverride: SwordPattern | null = null): EncounterStep {
  if (observation.tick !== previous.tick + 1) throw new RangeError("Advance the encounter by one tick at a time.");
  let state: EncounterState = { ...previous, tick: observation.tick };
  const events: EncounterEvent[] = [];
  if (state.phase.kind === "ended") return { state, events, movement: { kind: "hold" } };
  if (!observation.bossAlive) {
    return { state: { ...state, phase: { kind: "ended", reason: "boss-dead" }, stars: [], swords: [] }, events: [{ kind: "ended" }], movement: { kind: "hold" } };
  }
  if (state.phase.kind === "enrage") return advanceEnrage(state, observation);
  if (observation.bossHp <= observation.maxHp * ZEKE_RULES.enrage.threshold.value) {
    const choice = draw(state.rng, ZEKE_RULES.enrage.startOrders.value.length);
    return { state: { ...state, rng: choice.rng, phase: { kind: "enrage", started: observation.tick, volley: 0, pattern: "west", order: ZEKE_RULES.enrage.startOrders.value[choice.index] }, pendingHeal: null, stars: [], swords: [] }, events: [{ kind: "enrage-start", boss: ZEKE_RULES.enrage.bossAnchor.value, player: ZEKE_RULES.enrage.playerSpawn.value }], movement: { kind: "hold" } };
  }
  state = chargeSwords(state, observation);
  if (state.pendingHeal !== null && observation.tick >= state.pendingHeal) {
    events.push({ kind: "boss-heal", fraction: ZEKE_RULES.swords.missedHeal.value });
    state = { ...state, pendingHeal: null };
  }
  if (starIsDue(state, observation.tick)) {
    state = startStar(state, observation, patternOverride);
    if (state.phase.kind === "star") events.push({ kind: "star-tell", pattern: state.phase.pattern });
  }
  const starAge = state.phase.kind === "star" ? observation.tick - state.phase.started : null;
  const firstBeat = starAge === ZEKE_RULES.star.activeAfter.value;
  const secondBeat = starAge === ZEKE_RULES.star.secondBeat.value;
  if (firstBeat || secondBeat) {
    events.push({ kind: "star-burst" });
    for (const member of hazardParticipants(observation)) {
      if (state.stars.some((star) => star.tile.x === member.tile.x && star.tile.y === member.tile.y) || (secondBeat && bossContains(observation.boss, member.tile))) events.push({ kind: "star-hit", target: member.id });
    }
  }
  if (state.stars.some((star) => star.expiresAt === observation.tick)) events.push({ kind: "star-expire" });
  state = { ...state, stars: state.stars.filter((star) => observation.tick < star.expiresAt) };
  if (!movementAllowed(state.phase, observation.tick)) return { state, events, movement: { kind: "hold" } };
  if (!bossContains(observation.boss, observation.tank)) return { state, events, movement: { kind: "follow" } };
  const choice = draw(state.rng, ZEKE_RULES.walkUnder.directions.value.length);
  const direction = ZEKE_RULES.walkUnder.directions.value[choice.index];
  return { state: { ...state, rng: choice.rng }, events, movement: { kind: "walk-under", ...direction } };
}

function chargeSwords(state: EncounterState, observation: EncounterObservation): EncounterState {
  const swords = state.swords.map((sword): SwordHazard => {
    if (sword.status !== "charging" || sword.charged) return sword;
    const reported = observation.swordCharges.find(({ id }) => id === sword.id)?.damage ?? sword.chargeDamage;
    const chargeDamage = Math.max(sword.chargeDamage, reported);
    if (chargeDamage === sword.chargeDamage) return sword;
    return { ...sword, chargeDamage: Math.min(chargeDamage, ZEKE_RULES.swords.chargeThreshold.value), charged: chargeDamage >= ZEKE_RULES.swords.chargeThreshold.value };
  });
  return { ...state, swords };
}

export function safeFromEnrage(point: Tile, safe: EnrageSafe): boolean {
  const { min, max } = ZEKE_RULES.enrage;
  if (point.x < min.value || point.x > max.value || point.y < min.value || point.y > max.value) return false;
  switch (safe) {
    case "north":
      return point.y === min.value && point.x < max.value;
    case "south":
      return point.y === max.value && point.x < max.value;
    case "west":
      return point.x === min.value;
    default: {
      const unhandled: never = safe;
      return unhandled;
    }
  }
}

function enrageStars(state: EncounterState, at: Tick, safe: EnrageSafe): readonly StarHazard[] {
  const stars: StarHazard[] = [];
  for (let x = ZEKE_RULES.enrage.min.value; x <= ZEKE_RULES.enrage.max.value; x++) {
    for (let y = ZEKE_RULES.enrage.min.value; y <= ZEKE_RULES.enrage.max.value; y++) {
      const atTile = tile(x, y);
      if (!safeFromEnrage(atTile, safe)) stars.push({ id: state.nextHazardId + stars.length, tile: atTile, activeFrom: at, expiresAt: tick(at + ZEKE_RULES.enrage.lightningLifetime.value), visual: { kind: "lightning" } });
    }
  }
  return stars;
}

function advanceEnrage(state: EncounterState, observation: EncounterObservation): EncounterStep {
  const phase = state.phase;
  if (phase.kind !== "enrage") throw new Error("An enrage turn needs an enrage phase.");
  const events: EncounterEvent[] = [];
  if (observation.tick - phase.started === ZEKE_RULES.enrage.cageAfter.value) events.push({ kind: "enrage-cage", player: ZEKE_RULES.enrage.playerSpawn.value });
  const elapsed = observation.tick - phase.started - ZEKE_RULES.enrage.firstVolley.value;
  if (elapsed < 0) return { state, events, movement: { kind: "hold" } };
  const volleyIndex = Math.floor(elapsed / ZEKE_RULES.enrage.volleyInterval.value);
  const within = elapsed % ZEKE_RULES.enrage.volleyInterval.value;
  const orderIndex = (phase.order + volleyIndex) % ZEKE_RULES.enrage.orders.value.length;
  const order = ZEKE_RULES.enrage.orders.value[orderIndex];
  let stars: readonly StarHazard[] = state.stars.filter((star) => star.expiresAt > observation.tick);
  let pattern = phase.pattern;
  if (within < ZEKE_RULES.enrage.volleys.value) {
    pattern = order[within];
    events.push({ kind: "enrage-tell", safe: pattern, volley: within + 1 });
  }
  const strike = within - ZEKE_RULES.enrage.strikeAfter.value;
  if (within === ZEKE_RULES.enrage.dodgeCueAfter.value) events.push({ kind: "enrage-dodge-cue" });
  if (within === ZEKE_RULES.enrage.resetAfter.value) events.push({ kind: "enrage-reset" });
  if (strike >= 0 && strike < ZEKE_RULES.enrage.volleys.value) {
    pattern = order[strike];
    stars = enrageStars(state, observation.tick, pattern);
    events.push({ kind: "star-burst" });
    for (const player of hazardParticipants(observation)) if (!safeFromEnrage(player.tile, pattern)) events.push({ kind: "enrage-hit", target: player.id });
    confirmSuccessfulDodges(observation, events);
  }
  if (state.stars.length > 0 && stars.length === 0) events.push({ kind: "star-expire" });
  return { state: { ...state, stars, phase: { ...phase, volley: volleyIndex + 1, pattern }, nextHazardId: state.nextHazardId + stars.length }, events, movement: { kind: "hold" } };
}

export function inDodgeWindow(state: EncounterState, at: Tick, point: Tile): boolean {
  if (state.phase.kind === "ended") return false;
  if (state.phase.kind === "enrage") {
    const elapsed = at - state.phase.started - ZEKE_RULES.enrage.firstVolley.value;
    const strike = elapsed % ZEKE_RULES.enrage.volleyInterval.value - ZEKE_RULES.enrage.strikeAfter.value;
    return elapsed >= 0 && strike >= 0 && strike < ZEKE_RULES.enrage.volleys.value;
  }
  return state.swords.some((sword) => {
    if (sword.status !== "charging" || sword.chargeAt !== at) return false;
    const distance = sword.direction * ZEKE_RULES.swords.speed.value;
    const to = sword.axis === "x" ? tile(sword.tile.x + distance, sword.tile.y + 0) : tile(sword.tile.x + 0, sword.tile.y + distance);
    return swordCrosses(sword, to, point, ZEKE_RULES.swords.halfWidth.value);
  });
}

export function cleaveHits(boss: Tile, tank: Tile, point: Tile): boolean {
  if (bossContains(boss, point)) return true;
  const center = bossCenter(boss);
  const ring = Math.floor(ZEKE_RULES.boss.size.value / 2) + 1;
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) return false;
  const tx = tank.x - center.x;
  const ty = tank.y - center.y;
  const safe = Math.abs(tx) === ring ? dx === -tx && Math.abs(dy + ty) <= 1 : dy === -ty && Math.abs(dx + tx) <= 1;
  return !safe;
}

export function cleaveDustTiles(boss: Tile, tank: Tile): readonly Tile[] {
  const center = bossCenter(boss);
  const ring = Math.floor(ZEKE_RULES.boss.size.value / 2) + 1;
  const tiles: Tile[] = [];
  for (let dx = -ring; dx <= ring; dx++) {
    for (let dy = -ring; dy <= ring; dy++) {
      const point = tile(center.x + dx, center.y + dy);
      if (Math.max(Math.abs(dx), Math.abs(dy)) === ring && cleaveHits(boss, tank, point)) tiles.push(point);
    }
  }
  return tiles;
}
