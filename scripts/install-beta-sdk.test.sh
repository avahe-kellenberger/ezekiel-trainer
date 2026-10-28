#!/usr/bin/env bash
set -uo pipefail

SCRIPTS="$(cd "$(dirname "$0")" && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

PIN=1111111111111111111111111111111111111111
OTHER=2222222222222222222222222222222222222222
REAL_NPM="$(command -v npm)"
export REAL_NPM OSRS_SDK_COMMIT="$PIN" OSRS_SDK_REPO=https://example.invalid/osrs-sdk.git
export npm_config_offline=true npm_config_cache="$WORK/npm-cache"

fail() {
  printf 'ASSERTION FAILED: %s\n' "$*"
  exit 1
}

ready() {
  printf 'ready %s\n' "$t"
}

# The network and the SDK's own build are the external boundaries.
mkdir "$WORK/bin"
cat >"$WORK/bin/sdk-source" <<'EOF'
#!/usr/bin/env bash
mkdir -p "$1/packages/osrs-sdk-assets" "$1/packages/osrs-sdk-react"
echo '{"name":"osrs-sdk","version":"0.1.8","workspaces":["packages/osrs-sdk-assets","packages/osrs-sdk-react"]}' >"$1/package.json"
echo '{"name":"osrs-sdk-assets","version":"0.1.8"}' >"$1/packages/osrs-sdk-assets/package.json"
echo '{"name":"osrs-sdk-react","version":"0.1.0"}' >"$1/packages/osrs-sdk-react/package.json"
for dir in "$1" "$1/packages/osrs-sdk-assets" "$1/packages/osrs-sdk-react"; do echo 'module.exports = {};' >"$dir/index.js"; done
mkdir -p "$1/src/sdk/rendering"
cat >"$1/src/sdk/rendering/CacheRenderModel.ts" <<'SOURCE'
if (!this.mesh || this.meshGeneration !== this.modelGeneration || this.lastPose < 0) return;
SOURCE
cat >"$1/src/sdk/Player.ts" <<'SOURCE'
import { Pathing } from "./Pathing";
export class Player {
  getPerceivedRotation(tickPercent) {
  }
  moveTo(x: number, y: number, pace: MovePace = "run-setting") {
  }
}
SOURCE
cat >"$1/src/sdk/Unit.ts" <<'SOURCE'
export class Unit {
  private renderFromLocation: Location = { x: 0, y: 0 };
  private renderPositionTimestamp = 0;
}
SOURCE
cat >"$1/src/sdk/ClickController.ts" <<'SOURCE'
inputController.queueAction(() => this.playerWalkClick(location.x, location.y, pace));
InputController.controller.queueAction(() => this.playerWalkClick(x, y));
Trainer.player.moveTo(Math.floor(x), Math.floor(y), pace);
SOURCE
mkdir -p "$1/packages/osrs-sdk-assets/src"
cat >"$1/packages/osrs-sdk-assets/src/index.d.ts" <<'SOURCE'
export type SceneTouchups = {
SOURCE
mkdir -p "$1/packages/osrs-sdk-assets/src"
cat >"$1/packages/osrs-sdk-assets/src/scene-touchups.mts" <<'SOURCE'
      if (!["replacements", "rectangleReplacements", "removals"].includes(kind)
SOURCE
mkdir -p "$1/packages/osrs-sdk-assets/src"
cat >"$1/packages/osrs-sdk-assets/src/adapter.mts" <<'SOURCE'
          assetId,
          x: location.position.localX,
asset.id.endsWith("-terrain") ? "terrain" : asset.id.endsWith("-transparent") ? "transparent" : "opaque",
SOURCE
mkdir -p "$1/packages/osrs-sdk-assets/src"
cat >"$1/packages/osrs-sdk-assets/src/compile-scene.mts" <<'SOURCE'
width?: number; height?: number };
    opaque = new Map<string, Output>(),
chunk(terrain ? terrainOutput : transparentFace ? transparent : opaque, chunkX, chunkY)
[...terrainOutput.values(), ...opaque.values(), ...transparent.values()]
    ...(opaque.size ? [{ id: `${prefix}-opaque`, payload: payload(opaque) }] : []),
SOURCE
mkdir -p "$1/src/cache-render-format"
cat >"$1/src/cache-render-format/manifest.ts" <<'SOURCE'
  height?: number;
};
export type CacheRenderScene =
compiledAssets: { terrain?: string; opaque?: string; transparent?: string };
          (scene.compiledAssets.opaque === undefined
SOURCE
mkdir -p "$1/src/sdk/rendering"
cat >"$1/src/sdk/rendering/CacheRenderSceneModel.ts" <<'SOURCE'
      for (const [kind, assetId] of Object.entries(recipe.compiledAssets)) {
          this.root.add(new THREE.Mesh(geometry, material));
      }
    })();
    return this.ready;
SOURCE
EOF
cat >"$WORK/bin/sdk-build" <<'EOF'
#!/usr/bin/env bash
mkdir -p "$1/lib/src/sdk" "$1/_bundles"
if grep -q 'queueMovement(' "$1/src/sdk/Player.ts"; then
  echo 'queueMovement(x: number, y: number, pace?: MovePace): void;' >"$1/lib/src/sdk/Player.d.ts"
  echo 'queueMovement(x, y, pace) {}' >"$1/_bundles/main.js"
else
  echo 'moveTo(x: number, y: number, pace?: MovePace): void;' >"$1/lib/src/sdk/Player.d.ts"
  echo 'moveTo(x, y, pace) {}' >"$1/_bundles/main.js"
fi
if grep -q 'setRotationImmediate(rotation' "$1/src/sdk/Player.ts"; then
  echo 'setRotationImmediate(rotation: number): void;' >>"$1/lib/src/sdk/Player.d.ts"
  echo 'this._angle = rotation;' >>"$1/_bundles/main.js"
fi
cat "$1/src/sdk/rendering/CacheRenderModel.ts" "$1/src/sdk/rendering/CacheRenderSceneModel.ts" >>"$1/_bundles/main.js"
EOF
cat >"$WORK/bin/git" <<'EOF'
#!/usr/bin/env bash
case "$1" in
  init) mkdir -p "$3" ;;
  -C)
    case "$3" in
      fetch) echo "${@: -1}" >>"$T/fetches" ;;
      checkout) sdk-source "$2" ;;
      rev-parse) tail -n 1 "$T/fetches" ;;
    esac
    ;;
esac
EOF
cat >"$WORK/bin/npm" <<'EOF'
#!/usr/bin/env bash
case "$PWD:$1" in
  "$APP:ci") echo ci >>"$T/registry-installs"; rm -rf node_modules ;;
  */osrs-sdk:ci) ;;
  */osrs-sdk:run) sdk-build "$PWD" ;;
  *) exec "$REAL_NPM" "$@" ;;
esac
EOF
chmod +x "$WORK/bin/sdk-source" "$WORK/bin/sdk-build" "$WORK/bin/git" "$WORK/bin/npm"
export PATH="$WORK/bin:$PATH"

setup() {
  T="$(mktemp -d "$WORK/case.XXXXXX")"
  APP="$T/app"
  export T APP VERIFY_DIR="$T/verify"
  mkdir -p "$APP/scripts"
  cp "$SCRIPTS/install-beta-sdk.sh" "$SCRIPTS/patch-sdk-input.mjs" "$SCRIPTS/verify.sh" "$APP/scripts/"
  echo '{"name":"app","version":"0.0.0","private":true,"scripts":{"build":"node build.js"}}' >"$APP/package.json"
  echo 'for (const name of ["osrs-sdk", "osrs-sdk-assets", "osrs-sdk-react"]) require(name);' >"$APP/build.js"
  : >"$T/fetches"
  : >"$T/registry-installs"
}

packs() {
  local dir="$1" commit="$2" patched="${3:-yes}" src
  src="$(mktemp -d "$T/src.XXXXXX")"
  sdk-source "$src"
  if [[ "$patched" == yes ]]; then node "$APP/scripts/patch-sdk-input.mjs" "$src" >/dev/null || return 1; fi
  sdk-build "$src"
  mkdir -p "$dir"
  (
    cd "$src" || exit 1
    [[ -z "$commit" ]] || "$REAL_NPM" pkg set "gitHead=$commit" --workspaces --include-workspace-root
    "$REAL_NPM" pack --pack-destination "$dir" --silent
    "$REAL_NPM" pack --workspace osrs-sdk-assets --pack-destination "$dir" --silent
    "$REAL_NPM" pack --workspace osrs-sdk-react --pack-destination "$dir" --silent
  ) >/dev/null || return 1
}

installed_from_packs() {
  packs "$T/old-packs" "$1" || return 1
  (cd "$APP" && "$REAL_NPM" install --no-save --no-audit --no-fund "$T"/old-packs/*.tgz >/dev/null)
}

installed_commits() {
  (cd "$APP" && node -p '["osrs-sdk", "osrs-sdk-assets", "osrs-sdk-react"].map((name) => require(`./node_modules/${name}/package.json`).gitHead).join(" ")')
}

count() {
  wc -l <"$1" | tr -d ' '
}

run_verify() {
  bash "$APP/scripts/verify.sh" build >"$T/out.txt" 2>&1 || { cat "$T/out.txt"; fail "verify.sh build failed"; }
}

install_sdk() {
  bash "$APP/scripts/install-beta-sdk.sh" >"$T/out.txt" 2>&1 || { cat "$T/out.txt"; fail "install-beta-sdk.sh failed"; }
}

expect_reinstalled_at_the_pin() {
  [[ "$(count "$T/registry-installs")" == 1 ]] || { cat "$T/out.txt"; fail "verify ran npm ci $(count "$T/registry-installs") times, expected 1"; }
  [[ "$(count "$T/fetches")" == 1 ]] || { cat "$T/out.txt"; fail "verify fetched the SDK $(count "$T/fetches") times, expected 1"; }
  [[ "$(installed_commits)" == "$PIN $PIN $PIN" ]] || fail "node_modules holds SDK packages from: $(installed_commits)"
}

expect_built_at_the_pin() {
  [[ "$(cat "$T/fetches")" == "$PIN" ]] || { cat "$T/out.txt"; fail "fetched '$(cat "$T/fetches")', expected the pin alone"; }
  [[ "$(installed_commits)" == "$PIN $PIN $PIN" ]] || fail "node_modules holds SDK packages from: $(installed_commits)"
}

install_at_the_pin_is_reused() {
  setup
  bash "$APP/scripts/install-beta-sdk.sh" >"$T/first-install.txt" 2>&1 || { cat "$T/first-install.txt"; return 1; }
  ready
  run_verify
  [[ "$(count "$T/fetches")" == 1 ]] || fail "verify fetched the SDK again"
  [[ "$(count "$T/registry-installs")" == 0 ]] || fail "verify ran npm ci over an install at the pin"
  grep -qxF "install-beta-sdk: installed osrs-sdk commit $PIN matches the pin" "$T/out.txt" || { cat "$T/out.txt"; fail "verify did not name the SDK commit it runs on"; }
}

unrecorded_install_is_replaced() {
  setup
  installed_from_packs "" || return 1
  ready
  run_verify
  expect_reinstalled_at_the_pin
}

install_from_another_commit_is_replaced() {
  setup
  installed_from_packs "$OTHER" || return 1
  ready
  run_verify
  expect_reinstalled_at_the_pin
}

unreadable_installed_manifest_is_replaced() {
  setup
  installed_from_packs "$PIN" || return 1
  echo '{' >"$APP/node_modules/osrs-sdk-assets/package.json"
  ready
  bash "$APP/scripts/verify.sh" build >"$T/out.txt" 2>&1
  local status=$?
  expect_reinstalled_at_the_pin
  [[ $status == 0 ]] || { cat "$T/out.txt"; fail "verify.sh build failed"; }
}

unrecorded_packs_are_refused() {
  setup
  packs "$T/prebuilt" "" || return 1
  ready
  OSRS_SDK_PACKS="$T/prebuilt" install_sdk
  expect_built_at_the_pin
}

packs_from_another_commit_are_refused() {
  setup
  packs "$T/prebuilt" "$OTHER" || return 1
  ready
  OSRS_SDK_PACKS="$T/prebuilt" install_sdk
  expect_built_at_the_pin
}

packs_at_the_pin_are_used() {
  setup
  packs "$T/prebuilt" "$PIN" || return 1
  ready
  OSRS_SDK_PACKS="$T/prebuilt" install_sdk
  [[ "$(count "$T/fetches")" == 0 ]] || fail "built the SDK although the packs are at the pin"
  grep -qxF "install-beta-sdk: installed osrs-sdk commit $PIN matches the pin" "$T/out.txt" || { cat "$T/out.txt"; fail "the install did not name the SDK commit it installed"; }
}

packs_without_the_input_patch_are_rebuilt() {
  setup
  packs "$T/prebuilt" "$PIN" no || return 1
  ready
  OSRS_SDK_PACKS="$T/prebuilt" install_sdk
  expect_built_at_the_pin
  node "$APP/scripts/patch-sdk-input.mjs" "$APP/node_modules/osrs-sdk" --check || fail "rebuilt SDK lacks the input hook"
}

installed_sdk_without_the_input_patch_is_replaced() {
  setup
  installed_from_packs "$PIN" || return 1
  node -e 'const fs=require("node:fs"),p=process.argv[1],v=JSON.parse(fs.readFileSync(p));delete v.zekeInputPatch;fs.writeFileSync(p,JSON.stringify(v));' "$APP/node_modules/osrs-sdk/package.json"
  ready
  run_verify
  expect_reinstalled_at_the_pin
}

installed_sdk_with_missing_built_api_is_replaced() {
  setup
  installed_from_packs "$PIN" || return 1
  echo 'module.exports = {};' >"$APP/node_modules/osrs-sdk/_bundles/main.js"
  ready
  run_verify
  expect_reinstalled_at_the_pin
}

installed_sdk_with_missing_declared_api_is_replaced() {
  setup
  installed_from_packs "$PIN" || return 1
  echo 'export {};' >"$APP/node_modules/osrs-sdk/lib/src/sdk/Player.d.ts"
  ready
  run_verify
  expect_reinstalled_at_the_pin
}

installed_sdk_without_ground_animation_fix_is_replaced() {
  setup
  installed_from_packs "$PIN" || return 1
  echo 'queueMovement(x, y, pace) {}' >"$APP/node_modules/osrs-sdk/_bundles/main.js"
  ready
  run_verify
  expect_reinstalled_at_the_pin
}

installed_sdk_without_player_rotation_fix_is_replaced() {
  setup
  installed_from_packs "$PIN" || return 1
  sed -i '/this._angle = rotation;/d' "$APP/node_modules/osrs-sdk/_bundles/main.js"
  ready
  run_verify
  expect_reinstalled_at_the_pin
}

installed_sdk_without_ground_depth_pass_is_replaced() {
  setup
  installed_from_packs "$PIN" || return 1
  sed -i '/renderer.clearDepth()/d' "$APP/node_modules/osrs-sdk/_bundles/main.js"
  ready
  run_verify
  expect_reinstalled_at_the_pin
}

patch_three_upgrades_without_reapplying_rotation() {
  setup
  local src="$T/upgrade"
  sdk-source "$src"
  node "$APP/scripts/patch-sdk-input.mjs" "$src" >/dev/null || return 1
  # Recreate revision 3 by undoing only the newly introduced source changes.
  node --input-type=module - "$src" "$APP/scripts/patch-sdk-input.mjs" <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
const [root, patchFile] = process.argv.slice(2);
const patch = fs.readFileSync(patchFile, 'utf8').split('if ((packageJson.zekeInputPatch ?? 0) < 4) {')[1].split('  packageJson.zekeInputPatch')[0];
const changes = [...patch.matchAll(/replace\(("(?:[^"\\]|\\.)*"), ("(?:[^"\\]|\\.)*"), ("(?:[^"\\]|\\.)*")\);/g)];
if (changes.length < 10) throw new Error('Missing ground patch fixture changes');
for (const match of changes.reverse()) {
  const [file,before,after] = match.slice(1).map(JSON.parse);
  const target=path.join(root,file); fs.writeFileSync(target,fs.readFileSync(target,'utf8').replace(after,before));
}
const file=path.join(root,'package.json'), pkg=JSON.parse(fs.readFileSync(file));pkg.zekeInputPatch=3;fs.writeFileSync(file,JSON.stringify(pkg));
NODE
  node "$APP/scripts/patch-sdk-input.mjs" "$src" >/dev/null || return 1
  sdk-build "$src"
  node "$APP/scripts/patch-sdk-input.mjs" "$src" --check || return 1
  [[ "$(grep -c 'override setRotationImmediate' "$src/src/sdk/Player.ts")" == 1 ]] || fail "rotation patch reapplied"
  ready
}

failed=0
for t in \
  installed_sdk_without_ground_depth_pass_is_replaced \
  patch_three_upgrades_without_reapplying_rotation \
  install_at_the_pin_is_reused \
  unrecorded_install_is_replaced \
  install_from_another_commit_is_replaced \
  unreadable_installed_manifest_is_replaced \
  unrecorded_packs_are_refused \
  packs_from_another_commit_are_refused \
  packs_at_the_pin_are_used \
  packs_without_the_input_patch_are_rebuilt \
  installed_sdk_without_the_input_patch_is_replaced \
  installed_sdk_with_missing_built_api_is_replaced \
  installed_sdk_with_missing_declared_api_is_replaced \
  installed_sdk_without_player_rotation_fix_is_replaced \
  installed_sdk_without_ground_animation_fix_is_replaced; do
  if ("$t") >"$WORK/$t.log" 2>&1; then
    echo "PASS $t"
  else
    echo "FAIL $t"
    failed=1
  fi
  sed 's/^/  /' "$WORK/$t.log"
done
exit $failed
