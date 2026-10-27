#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

export const INPUT_PATCH = 4;
const groundEffectGuard = '(this.lastPose < 0 && this.reference.kind !== "spotAnim")';
const playerRotationMarker = "this._angle = rotation;";
const root = path.resolve(process.argv[2]);
const packageFile = path.join(root, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageFile, "utf8"));

if (process.argv[3] === "--check") {
  const declaration = fs.readFileSync(path.join(root, "lib/src/sdk/Player.d.ts"), "utf8");
  const bundle = fs.readFileSync(path.join(root, "_bundles/main.js"), "utf8");
  if (packageJson.zekeInputPatch !== INPUT_PATCH || !declaration.includes("queueMovement(") || !bundle.includes("queueMovement(") || !bundle.includes(groundEffectGuard) || !declaration.includes("setRotationImmediate(") || !bundle.includes(playerRotationMarker) || !bundle.includes("renderer.clearDepth()") || !bundle.includes("recipe.compiledAssets.ground")) {
    throw new Error(`Installed SDK is missing Zeke input/render patch ${INPUT_PATCH}; run scripts/install-beta-sdk.sh.`);
  }
  console.log(`SDK Zeke input/render patch ${INPUT_PATCH} verified.`);
} else if (packageJson.zekeInputPatch !== INPUT_PATCH) {
  function replace(file, before, after) {
    const target = path.join(root, file);
    const source = fs.readFileSync(target, "utf8");
    if (source.split(before).length !== 2) throw new Error(`Cannot apply Zeke input patch to ${file}.`);
    fs.writeFileSync(target, source.replace(before, after));
  }
  if ((packageJson.zekeInputPatch ?? 0) < 1) {
    replace("src/sdk/Player.ts", 'import { Pathing }', 'import { InputController } from "./Input";\nimport { Pathing }');
    replace("src/sdk/Player.ts", '  moveTo(x: number, y: number, pace: MovePace = "run-setting") {',
      '  queueMovement(x: number, y: number, pace: MovePace = "run-setting") {\n    InputController.controller.queueAction(() => this.moveTo(x, y, pace));\n  }\n\n  moveTo(x: number, y: number, pace: MovePace = "run-setting") {');
    replace("src/sdk/ClickController.ts", 'inputController.queueAction(() => this.playerWalkClick(location.x, location.y, pace));', 'this.playerWalkClick(location.x, location.y, pace);');
    replace("src/sdk/ClickController.ts", 'InputController.controller.queueAction(() => this.playerWalkClick(x, y));', 'this.playerWalkClick(x, y);');
    replace("src/sdk/ClickController.ts", 'Trainer.player.moveTo(Math.floor(x), Math.floor(y), pace);', 'Trainer.player.queueMovement(Math.floor(x), Math.floor(y), pace);');
    replace("src/sdk/Unit.ts", '  private renderFromLocation:', '  protected renderFromLocation:');
    replace("src/sdk/Unit.ts", '  private renderPositionTimestamp =', '  protected renderPositionTimestamp =');
  }
  if ((packageJson.zekeInputPatch ?? 0) < 2) replace("src/sdk/rendering/CacheRenderModel.ts",
    'if (!this.mesh || this.meshGeneration !== this.modelGeneration || this.lastPose < 0) return;',
    `if (!this.mesh || this.meshGeneration !== this.modelGeneration || ${groundEffectGuard}) return;`);
  if ((packageJson.zekeInputPatch ?? 0) < 3) replace("src/sdk/Player.ts", '  getPerceivedRotation(tickPercent) {', `  override setRotationImmediate(rotation: number) {
    super.setRotationImmediate(rotation);
    this._angle = rotation;
    this.nextAngle = rotation;
    this.restingAngle = rotation;
    this.lastTravelAngle = rotation;
    this.rotationFromAngle = rotation;
    this.rotationTimestamp = window.performance.now();
  }

  getPerceivedRotation(tickPercent) {`);
  if ((packageJson.zekeInputPatch ?? 0) < 4) {
    replace("packages/osrs-sdk-assets/src/index.d.ts", "export type SceneTouchups = {", "export type SceneTouchups = {\n  /** Static floor objects rendered before scenery and actors. */\n  groundObjectIds?: number[];");
    replace("packages/osrs-sdk-assets/src/scene-touchups.mts", "      if (![\"replacements\", \"rectangleReplacements\", \"removals\"].includes(kind)", "      if (kind === \"groundObjectIds\") {\n        if (!Array.isArray(entries) || entries.some((id) => !Number.isSafeInteger(id) || id < 0))\n          throw new Error(`Invalid ground object IDs for scene ${region}`);\n        continue;\n      }\n      if (![\"replacements\", \"rectangleReplacements\", \"removals\"].includes(kind)");
    replace("packages/osrs-sdk-assets/src/adapter.mts", "          assetId,\n          x: location.position.localX,", "          assetId,\n          ground: (scenes[regionId]?.groundObjectIds ?? []).includes(location.id),\n          x: location.position.localX,");
    replace("packages/osrs-sdk-assets/src/adapter.mts", "asset.id.endsWith(\"-terrain\") ? \"terrain\" : asset.id.endsWith(\"-transparent\") ? \"transparent\" : \"opaque\",", "asset.id.endsWith(\"-terrain\") ? \"terrain\" : asset.id.endsWith(\"-ground\") ? \"ground\" : asset.id.endsWith(\"-transparent\") ? \"transparent\" : \"opaque\",");
    replace("packages/osrs-sdk-assets/src/compile-scene.mts", "width?: number; height?: number };", "width?: number; height?: number; ground?: boolean };");
    replace("packages/osrs-sdk-assets/src/compile-scene.mts", "    opaque = new Map<string, Output>(),", "    ground = new Map<string, Output>(),\n    opaque = new Map<string, Output>(),");
    replace("packages/osrs-sdk-assets/src/compile-scene.mts", "chunk(terrain ? terrainOutput : transparentFace ? transparent : opaque, chunkX, chunkY)", "chunk(terrain ? terrainOutput : placement.ground ? ground : transparentFace ? transparent : opaque, chunkX, chunkY)");
    replace("packages/osrs-sdk-assets/src/compile-scene.mts", "[...terrainOutput.values(), ...opaque.values(), ...transparent.values()]", "[...terrainOutput.values(), ...ground.values(), ...opaque.values(), ...transparent.values()]");
    replace("packages/osrs-sdk-assets/src/compile-scene.mts", "    ...(opaque.size ? [{ id: `${prefix}-opaque`, payload: payload(opaque) }] : []),", "    ...(ground.size ? [{ id: `${prefix}-ground`, payload: payload(ground) }] : []),\n    ...(opaque.size ? [{ id: `${prefix}-opaque`, payload: payload(opaque) }] : []),");
    replace("src/cache-render-format/manifest.ts", "  height?: number;\n};\nexport type CacheRenderScene =", "  height?: number;\n  ground?: boolean;\n};\nexport type CacheRenderScene =");
    replace("src/cache-render-format/manifest.ts", "compiledAssets: { terrain?: string; opaque?: string; transparent?: string };", "compiledAssets: { terrain?: string; ground?: string; opaque?: string; transparent?: string };");
    replace("src/cache-render-format/manifest.ts", "          (scene.compiledAssets.opaque === undefined", "          (scene.compiledAssets.ground === undefined || typeof scene.compiledAssets.ground === \"string\") &&\n          (scene.compiledAssets.opaque === undefined");
    replace("src/sdk/rendering/CacheRenderSceneModel.ts", "      for (const [kind, assetId] of Object.entries(recipe.compiledAssets)) {", "      const floorMeshes: THREE.Mesh[] = [];\n      for (const [kind, assetId] of Object.entries(recipe.compiledAssets)) {");
    replace("src/sdk/rendering/CacheRenderSceneModel.ts", "          this.root.add(new THREE.Mesh(geometry, material));", "          const mesh = new THREE.Mesh(geometry, material);\n          if (recipe.compiledAssets.ground && (kind === \"terrain\" || kind === \"ground\")) {\n            mesh.renderOrder = -2;\n            floorMeshes.push(mesh);\n          }\n          this.root.add(mesh);");
    replace("src/sdk/rendering/CacheRenderSceneModel.ts", "      }\n    })();\n    return this.ready;", "      }\n      const lastFloor = floorMeshes[floorMeshes.length - 1];\n      if (lastFloor) {\n        // Floor surfaces still occlude each other, but native actor animation\n        // vertices may pass beneath them. Retain ordinary scenery/actor depth.\n        lastFloor.renderOrder = -1;\n        lastFloor.frustumCulled = false;\n        lastFloor.onAfterRender = (renderer) => renderer.clearDepth();\n      }\n    })();\n    return this.ready;");
  }
  packageJson.zekeInputPatch = INPUT_PATCH;
  fs.writeFileSync(packageFile, `${JSON.stringify(packageJson, null, 2)}\n`);
  console.log(`Applied SDK Zeke input/render patch ${INPUT_PATCH}.`);
}
