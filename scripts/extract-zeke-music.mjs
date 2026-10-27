import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const directory = resolve(project, "public/osrs-assets/music");
const destination = resolve(directory, "890.ogg");
const pending = resolve(directory, "890.ogg.part");
const source = "https://oldschool.runescape.wiki/w/Special:Redirect/file/Blade_of_Forgotten_Justice.ogg";
mkdirSync(directory, { recursive: true });
execFileSync("curl", ["--fail-with-body", "--location", "--retry", "2", "--max-time", "120", "--silent", "--show-error", source, "--output", pending], { stdio: "inherit" });
const bytes = readFileSync(pending);
if (bytes.subarray(0, 4).toString("ascii") !== "OggS") throw new Error("Encounter music download is not an Ogg audio file");
renameSync(pending, destination);
writeFileSync(resolve(directory, "provenance.json"), JSON.stringify({
  title: "Blade of Forgotten Justice",
  composer: "Julian Surma",
  rightsHolder: "Jagex Limited",
  cacheMusicId: 890,
  source,
  article: "https://oldschool.runescape.wiki/w/Blade_of_Forgotten_Justice",
  retrievedAt: new Date().toISOString(),
  sha256: createHash("sha256").update(bytes).digest("hex"),
}, null, 2) + "\n");
console.log(`music: extracted Blade of Forgotten Justice to ${destination} (${bytes.length} bytes)`);
