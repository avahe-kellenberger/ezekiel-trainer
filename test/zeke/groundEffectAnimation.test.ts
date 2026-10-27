import * as THREE from "three";
import { TextDecoder, TextEncoder } from "node:util";
import { CacheRender, CacheRenderModel, CacheRenderReferences, Entity, Settings } from "osrs-sdk";
import type { CacheRenderBundle } from "osrs-sdk";
import { ZekeRegion } from "../../src/content/zeke/ZekeRegion";

test("a standalone ground effect with no actor pose moves and fades through its finite cache sequence", async () => {
  vi.stubGlobal("TextDecoder", TextDecoder);
  Settings.set({ smoothCacheAnimations: false });
  const payload = {
    version: 2,
    positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], indices: [0, 1, 2],
    colors: [0xffffff, 0xffffff, 0xffffff],
    sourceVertices: [0, 1, 2], vertexGroups: [[0, 1, 2]],
    alphas: [0, 0, 0], alphaGroups: [[0, 1, 2]],
    spotAnim: { id: 4394, animationId: 9647 },
    animations: { 9647: {
      frames: [], lengths: [4, 4, 4],
      rawFrames: [0, 1, 2].map((frame) => ({
        types: [1, 5], maps: [[0], [0]], indexFrameIds: [0, 1],
        x: [frame * 128, frame * 8], y: [0, 0], z: [0, 0],
      })),
    } },
  };
  const json = new TextEncoder().encode(JSON.stringify(payload));
  const bytes = new Uint8Array(8 + json.length);
  bytes.set([79, 83, 82, 66]);
  new DataView(bytes.buffer).setUint32(4, json.length, true);
  bytes.set(json, 8);
  vi.spyOn(CacheRender, "bundle").mockResolvedValue({
    manifest: { bundleVersion: "ground-effect-animation-regression" },
    assetIds: () => [], sharedAssetIds: () => [], allSpotAnimIds: () => [],
    spotAnimIds: () => ["spotanim-4394"], fetchAsset: async () => bytes.buffer,
  } as unknown as CacheRenderBundle);
  const entity = new Entity(new ZekeRegion(), { x: 4, y: 6 });
  const model = CacheRenderModel.forRenderable(entity, CacheRenderReferences.spotAnim([{ id: 4394, delay: 5 }]));
  const scene = new THREE.Scene();
  const positions = new Set<number>();
  const opacity = new Set<number>();
  const visibleCycles: number[] = [];
  try {
    expect(entity.animationIndex).toBe(-1);
    await model.preload();
    for (let cycle = 0; cycle < 23; cycle++) {
      model.clientTick();
      model.draw(scene, 0.02, 0, { x: 4, y: 6, z: 0 }, 0, 0, true, [], 0);
      scene.traverse((object) => {
        if (object.type !== "Mesh" || object.userData.spotAnimId !== 4394 || !object.visible) return;
        const mesh = object as THREE.Mesh;
        visibleCycles.push(cycle);
        positions.add(mesh.geometry.getAttribute("position").getX(0));
        opacity.add(mesh.geometry.getAttribute("color").getW(0));
      });
    }
    expect([...positions]).toEqual([0, 1, 2]);
    expect(opacity.size).toBe(3);
    expect(Math.max(...opacity)).toBe(1);
    expect(Math.min(...opacity)).toBeCloseTo(1 - 128 / 255);
    expect(Math.min(...visibleCycles)).toBe(5);
    expect(Math.max(...visibleCycles)).toBe(16);
  } finally {
    model.destroy(scene);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Settings.set({ smoothCacheAnimations: true });
  }
});
