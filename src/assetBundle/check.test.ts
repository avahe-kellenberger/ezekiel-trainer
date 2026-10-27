import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");
const BUILD_TIMEOUT_MS = 180_000;
const SOUND_PACK = "cache-sound-effects.395d4c382804699fa1063dd293af2e8d1aa17f3a40be4d5bf830d7110e3cb85f.soundpack";
const REBUILD = "assets: rebuild it with npm run assets -- --cache-dir <openrs2 cache dir> --reader-path <osrscachereader checkout>, or scripts/verify.sh assets";
const EXPLOSION_PAYLOAD = "c6c8234a61a285ce01ef639678e5e18cd9167d4316cdda8c56d12cb30a90fa91.bin";
const DIRECTORY = Symbol("directory");
const LACKS = "assets: public/osrs-assets lacks what osrs-assets.config.ts configures:";

type Bundle =
  | "complete"
  | "beforeExplosion"
  | "otherCache"
  | "staleManifest"
  | "manifestFromOtherCache"
  | "manifestWithoutOcellus"
  | "manifestWithoutBrazierOrAhrimsTop"
  | "manifestWithoutPlayerAnimations"
  | "manifestWithoutExplosionAsset"
  | "manifestWithoutSoundPack"
  | "soundPackWithoutEquipBackpack";

let project = "";
let bundles: Readonly<Record<string, unknown>> = {};

beforeAll(() => {
  project = mkdtempSync(join(tmpdir(), "archive-ocellus-assets-"));
  const tree = spawnSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: ROOT, encoding: "utf8" }).stdout;
  for (const file of tree.split("\0").filter((path) => path !== "" && path !== "node_modules" && existsSync(join(ROOT, path)))) {
    mkdirSync(dirname(join(project, file)), { recursive: true });
    cpSync(join(ROOT, file), join(project, file));
  }
  symlinkSync(join(ROOT, "node_modules"), join(project, "node_modules"));
  const recorded = spawnSync("node_modules/.bin/tsx", ["test/assetBundles.mjs", SOUND_PACK], { cwd: project, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const parsed: unknown = recorded.status === 0 ? JSON.parse(recorded.stdout) : null;
  if (typeof parsed !== "object" || parsed === null) throw new Error(`could not record the bundle fixtures: ${recorded.stderr}`);
  bundles = Object.fromEntries(Object.entries(parsed));
});

afterAll(() => {
  if (project !== "") rmSync(project, { recursive: true, force: true });
});

type Replacement = string | null | typeof DIRECTORY;

function writeBundle(bundle: Bundle, replaced: Readonly<Record<string, Replacement>> = {}): void {
  const dir = join(project, "public/osrs-assets");
  for (const previous of [dir, join(project, "dist")]) rmSync(previous, { recursive: true, force: true });
  const encoded = bundles[bundle];
  const files = new Map<string, Replacement | Buffer>(
    Object.entries(typeof encoded === "object" && encoded !== null ? encoded : {}).map(([file, base64]: [string, unknown]) => [file, Buffer.from(String(base64), "base64")]),
  );
  for (const [file, content] of Object.entries(replaced)) files.set(file, content);
  for (const [file, content] of files) {
    if (content === null) continue;
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    if (content === DIRECTORY) mkdirSync(join(dir, file));
    else writeFileSync(join(dir, file), content);
  }
}

function build() {
  const { status, stdout, stderr } = spawnSync("npm", ["run", "build"], { cwd: project, encoding: "utf8" });
  const guardLines = (text: string) => text.split("\n").filter((line) => line.startsWith("assets:"));
  return { status, stdout: guardLines(stdout), stderr: guardLines(stderr), built: existsSync(join(project, "dist")) };
}

const rejected = (...gaps: readonly string[]) => ({ status: 1, stdout: [], stderr: [LACKS, ...gaps.map((gap) => `assets:   ${gap}`), REBUILD], built: false });

describe("npm run build", () => {
  test.each<readonly [string, Bundle, Readonly<Record<string, Replacement>>, ReturnType<typeof rejected>]>([
    [
      "a bundle extracted before the explosion spotanim and the ocellus attack animations",
      "beforeExplosion",
      {},
      rejected(
        "missing assets.npcs.ocellus.animations.swing = 14842",
        "missing assets.npcs.ocellus.animations.panic = 14851",
        "missing assets.npcs.ocellus.animations.shadowSlash = 14846",
        "missing assets.spotAnims.explosion.id = 4339",
        "manifest.json has no spotAnims.explosion (4339)",
      ),
    ],
    [
      "a bundle from another cache with a sprite missing",
      "otherCache",
      { "sprites/440-15.png": null },
      rejected("built from openrs2:2745, configured openrs2:2746", "manifest.json is from openrs2:2745, configured openrs2:2746", "missing sprites/440-15.png"),
    ],
    ["an asset directory with no build-info.json", "complete", { "build-info.json": null }, rejected("build-info.json is missing or unreadable")],
    ["a valid build-info.json beside no manifest.json", "complete", { "manifest.json": null }, rejected("manifest.json is missing or unreadable")],
    ["an empty manifest.json", "complete", { "manifest.json": "" }, rejected("manifest.json is missing or unreadable")],
    ["a manifest.json of {}", "complete", { "manifest.json": "{}" }, rejected("manifest.json is not a cache render bundle manifest")],
    ["a stale manifest.json without the explosion spotanim", "staleManifest", {}, rejected("manifest.json has no spotAnims.explosion (4339)")],
    ["a manifest.json from another cache", "manifestFromOtherCache", {}, rejected("manifest.json is from openrs2:2745, configured openrs2:2746")],
    ["a manifest.json without the ocellus npc", "manifestWithoutOcellus", {}, rejected("manifest.json has no npcs.ocellus (16677)")],
    ["a manifest.json without the brazier model or a player item", "manifestWithoutBrazierOrAhrimsTop", {}, rejected("manifest.json has no models.brazier (62440)", "manifest.json has no items.ahrimsRobeTop (4712)")],
    [
      "a manifest.json without the player animations",
      "manifestWithoutPlayerAnimations",
      {},
      rejected(
        "manifest.json has no playerAnimations.idle (808)",
        "manifest.json has no playerAnimations.walk (819)",
        "manifest.json has no playerAnimations.run (824)",
        "manifest.json has no playerAnimations.walkBack (820)",
        "manifest.json has no playerAnimations.strafeLeft (822)",
        "manifest.json has no playerAnimations.strafeRight (821)",
        "manifest.json has no playerAnimations.fireBow (426)",
        "manifest.json has no playerAnimations.fireBlowpipe (5061)",
        "manifest.json has no playerAnimations.throwChinchompa (7618)",
        "manifest.json has no playerAnimations.scytheIdle (8057)",
        "manifest.json has no playerAnimations.scytheSwing (8056)",
        "manifest.json has no playerAnimations.swordSlash (390)",
        "manifest.json has no playerAnimations.eat (829)",
        "manifest.json has no playerAnimations.dying (836)",
        "manifest.json has no playerAnimations.castSpell (711)",
        "manifest.json has no playerAnimations.dragonClawsAttack (7514)",
        "manifest.json has no playerAnimations.tumekensShadowIdle (9494)",
        "manifest.json has no playerAnimations.tumekensShadowWalk (1703)",
        "manifest.json has no playerAnimations.tumekensShadowRun (1707)",
        "manifest.json has no playerAnimations.tumekensShadowAttack (9493)",
        "manifest.json has no playerAnimations.venatorBowIdle (9857)",
        "manifest.json has no playerAnimations.venatorBowWalk (9859)",
        "manifest.json has no playerAnimations.venatorBowRun (9860)",
        "manifest.json has no playerAnimations.venatorBowAttack (9858)",
        "manifest.json has no playerAnimations.zombieAxeSlash (7004)",
        "manifest.json has no playerAnimations.zombieAxeCrush (3852)",
        "manifest.json has no playerAnimations.windSurge (7855)",
        "manifest.json has no playerAnimations.ezekielRoll (14705)",
        "manifest.json has no playerAnimations.ezekielStrafe (14706)",
      ),
    ],
    ["a manifest.json that maps the explosion to an asset it does not list", "manifestWithoutExplosionAsset", {}, rejected("manifest.json lists no asset spotanim-4339 for spotAnims.explosion (4339)")],
    ["a payload file the manifest names missing", "complete", { "f7283bd7ba8dae5bc8341a85afe1d04cae1543ee6c77e4a5f061fdca37aba6f2.bin": null }, rejected("missing f7283bd7ba8dae5bc8341a85afe1d04cae1543ee6c77e4a5f061fdca37aba6f2.bin, manifest.json's npc-16677")],
    ["an empty explosion payload", "complete", { [EXPLOSION_PAYLOAD]: "" }, rejected(`${EXPLOSION_PAYLOAD} is empty, manifest.json's spotanim-4339`)],
    ["a directory in place of the explosion payload", "complete", { [EXPLOSION_PAYLOAD]: DIRECTORY }, rejected(`${EXPLOSION_PAYLOAD} is not a file, manifest.json's spotanim-4339`)],
    ["an empty sprite", "complete", { "sprites/440-15.png": "" }, rejected("sprites/440-15.png is empty")],
    ["a manifest.json that names no sound pack", "manifestWithoutSoundPack", {}, rejected("manifest.json names no sound pack")],
    ["a missing sound pack", "complete", { [SOUND_PACK]: null }, rejected(`missing ${SOUND_PACK}, manifest.json's sound pack`)],
    ["an empty sound pack", "complete", { [SOUND_PACK]: "" }, rejected(`${SOUND_PACK} is empty, manifest.json's sound pack`)],
    ["a directory in place of the sound pack", "complete", { [SOUND_PACK]: DIRECTORY }, rejected(`${SOUND_PACK} is not a file, manifest.json's sound pack`)],
    ["a sound pack without a configured sound", "soundPackWithoutEquipBackpack", {}, rejected(`${SOUND_PACK} has no sounds.equipBackpack (3284)`)],
  ])("stops before webpack on %s, naming each gap and the fix", (_, bundle, replaced, expected) => {
    writeBundle(bundle, replaced);

    expect(build()).toEqual(expected);
  }, BUILD_TIMEOUT_MS);

  test("builds a complete bundle, its manifest and sound pack included", () => {
    writeBundle("complete");

    expect({
      ...build(),
      manifest: existsSync(join(project, "dist/osrs-assets/manifest.json")),
      explosion: readFileSync(join(project, "dist/osrs-assets", EXPLOSION_PAYLOAD), "utf8"),
      soundPack: existsSync(join(project, "dist/osrs-assets", SOUND_PACK)),
    }).toEqual({
      status: 0,
      stdout: ["assets: public/osrs-assets has every asset osrs-assets.config.ts configures, from openrs2:2746"],
      stderr: [],
      built: true,
      manifest: true,
      explosion: "payload",
      soundPack: true,
    });
  }, BUILD_TIMEOUT_MS * 2);
});
