declare const brand: unique symbol;
export type Brand<B extends string> = number & { readonly [brand]: B };
export type Unbranded = number & { readonly [brand]?: never };

/** A tick of the encounter's own clock, counted from the tick its schedule calls 0. */
export type Tick = Brand<"Tick">;
export type TickSpan = Brand<"TickSpan">;
export type ClientCycles = Brand<"ClientCycles">;
export type WorldTick = Brand<"WorldTick">;
export type Cycle = Brand<"Cycle">;
export type Seed = Brand<"Seed">;
export type TileX = Brand<"TileX">;
export type TileY = Brand<"TileY">;
export type SoundId = Brand<"SoundId">;
export type HpFraction = Brand<"HpFraction">;
export type Tile = Readonly<{ x: TileX; y: TileY }>;

export const isCount = (n: number): boolean => Number.isInteger(n) && n >= 0;
const isTick = (n: Unbranded): n is Unbranded & Tick => isCount(n);
const isTickSpan = (n: Unbranded): n is Unbranded & TickSpan => isCount(n);
const isClientCycles = (n: Unbranded): n is Unbranded & ClientCycles => isCount(n);
const isWorldTick = (n: Unbranded): n is Unbranded & WorldTick => isCount(n);
const isCycle = (n: Unbranded): n is Unbranded & Cycle => isCount(n) && n >= 1;
const isSeed = (n: Unbranded): n is Unbranded & Seed => isCount(n) && n <= 0xffffffff;
const isTileX = (n: Unbranded): n is Unbranded & TileX => Number.isInteger(n);
const isTileY = (n: Unbranded): n is Unbranded & TileY => Number.isInteger(n);
const isSoundId = (n: Unbranded): n is Unbranded & SoundId => isCount(n) && n <= 0xffff;
const isHpFraction = (n: Unbranded): n is Unbranded & HpFraction => n > 0 && n < 1;

export function tick(n: Unbranded): Tick {
  if (!isTick(n)) throw new RangeError(`not a tick: ${n}`);
  return n;
}
export function span(n: Unbranded): TickSpan {
  if (!isTickSpan(n)) throw new RangeError(`not a tick span: ${n}`);
  return n;
}
export function clientCycles(n: Unbranded): ClientCycles {
  if (!isClientCycles(n)) throw new RangeError(`not a client cycle count: ${n}`);
  return n;
}
export function worldTick(n: Unbranded): WorldTick {
  if (!isWorldTick(n)) throw new RangeError(`not a world tick: ${n}`);
  return n;
}
export function cycle(n: Unbranded): Cycle {
  if (!isCycle(n)) throw new RangeError(`not a cycle: ${n}`);
  return n;
}
export function seed(n: Unbranded): Seed {
  if (!isSeed(n)) throw new RangeError(`not a 32-bit seed: ${n}`);
  return n;
}
export function tile(x: Unbranded, y: Unbranded): Tile {
  if (!isTileX(x) || !isTileY(y)) throw new RangeError(`not a tile: ${x}, ${y}`);
  return { x, y };
}
export function soundId(n: Unbranded): SoundId {
  if (!isSoundId(n)) throw new RangeError(`not a cache sound id: ${n}`);
  return n;
}
export function hpFraction(n: Unbranded): HpFraction {
  if (!isHpFraction(n)) throw new RangeError(`not a fraction of max HP strictly between 0 and 1: ${n}`);
  return n;
}
export function after(start: Tick, offset: TickSpan): Tick {
  return tick(start + offset);
}
