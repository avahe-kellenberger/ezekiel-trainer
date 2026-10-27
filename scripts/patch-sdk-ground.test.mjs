// Run against the patched SDK source before packing:
// OSRS_SDK_SOURCE=/path/to/osrs-sdk node --import tsx --test scripts/patch-sdk-ground.test.mjs
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const source = process.env.OSRS_SDK_SOURCE;
if (!source) throw new Error("OSRS_SDK_SOURCE must identify the patched SDK checkout");
const moduleAt = (file) => import(pathToFileURL(path.join(source, file)).href);
const { compileScene } = await moduleAt("packages/osrs-sdk-assets/src/compile-scene.mts");
const { validateScenes, applySceneTouchups } = await moduleAt("packages/osrs-sdk-assets/src/scene-touchups.mts");
const triangle = (alpha = 0) => ({
  version: 1,
  positions: [0, 0, 0, 1, 0, 0, 0, 0, 1],
  indices: [0, 1, 2],
  colors: [0x112233, 0x445566, 0x778899],
  alphas: [alpha, alpha, alpha],
  animations: {},
});
const placement = (assetId, ground) => ({ assetId, x: 4, y: 5, plane: 2, ...(ground === undefined ? {} : { ground }) });

test("declared floor geometry gets its own complete layer while props keep their layers", () => {
  const assets = [
    { id: "scene-1-terrain", payload: triangle() },
    { id: "floor", payload: triangle() },
    { id: "wall", payload: triangle() },
    { id: "glass", payload: triangle(50) },
  ];
  const result = compileScene({ regionId: 1, placements: assets.map(({ id }) => placement(id, id === "floor")) }, assets);
  assert.deepEqual(result.map(({ id }) => id), ["scene-1-compiled-terrain", "scene-1-compiled-ground", "scene-1-compiled-opaque", "scene-1-compiled-transparent"]);
  const floor = result.find(({ id }) => id.endsWith("-ground")).payload.chunks[0];
  assert.deepEqual(floor.positions, [4, 2, 5, 5, 2, 5, 4, 2, 6]);
  assert.deepEqual(floor.colors, triangle().colors);
  assert.equal(floor.indices.length, 3);
  assert.equal(result.find(({ id }) => id.endsWith("-opaque")).payload.chunks[0].indices.length, 3);
  assert.equal(result.find(({ id }) => id.endsWith("-transparent")).payload.chunks[0].alphas[0], 50);
});

test("unconfigured scenery retains its original compiled layers and payload", () => {
  const assets = [{ id: "scene-1-terrain", payload: triangle() }, { id: "floor", payload: triangle() }];
  const original = compileScene({ regionId: 1, placements: assets.map(({ id }) => placement(id)) }, assets);
  const explicitFalse = compileScene({ regionId: 1, placements: assets.map(({ id }) => placement(id, false)) }, assets);
  assert.deepEqual(original, explicitFalse);
  assert.deepEqual(original.map(({ id }) => id), ["scene-1-compiled-terrain", "scene-1-compiled-opaque"]);
});

test("ground object IDs validate without changing object placement", () => {
  const rules = { 16214: { groundObjectIds: [62857, 62858, 62859, 62860, 62861] } };
  assert.doesNotThrow(() => validateScenes(rules));
  const location = { id: 62857, orientation: 1, position: { localX: 27, localY: 27, height: 0 } };
  assert.equal(applySceneTouchups(16214, location, rules), location);
  for (const invalid of [null, "62857", [null], ["62857"], [-1], [1.5], [Number.MAX_SAFE_INTEGER + 1]]) {
    assert.throws(() => validateScenes({ 16214: { groundObjectIds: invalid } }), /Invalid ground object IDs/);
  }
});
