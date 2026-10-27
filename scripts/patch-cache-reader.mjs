import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const readerOption = args.indexOf("--reader-path");
const readerPath = readerOption >= 0 ? args[readerOption + 1] : process.env.OSRS_CACHE_READER;
if (!readerPath) throw new Error("Pass --reader-path <cache-reader checkout> or set OSRS_CACHE_READER");

// RuneLite's RegionLoader distinguishes named map archives from region/file pairs.
// https://github.com/runelite/runelite/blob/master/cache/src/main/java/net/runelite/cache/region/RegionLoader.java
const patches = [
  {
    file: "src/cacheReader/loaders/ObjectLoader.js",
    before: `        } else if (opcode == 7) {
            let length = dataview.readUint8();
            for (let index = 0; index < length; ++index) {`,
    after: `        } else if (opcode == 7) {
            let length = dataview.readUint8();
            def.objectTypes = null;
            for (let index = 0; index < length; ++index) {`,
  },
  {
    file: "src/cacheReader/loaders/SequenceLoader.js",
    before: "        return def;\n    }\n\n    handleOpcode(def, opcode, dataview)",
    after: `        // Cache 2746 references an absent synth at heal frame 49. Preserve
        // the other heal sounds without queuing an unavailable audio asset.
        if (id === 14688) {
            def.frameSounds = def.frameSounds.map((sounds) =>
                Array.isArray(sounds) ? sounds.filter((sound) => sound.id !== 12804) : sounds,
            );
        }
        return def;
    }

    handleOpcode(def, opcode, dataview)`,
  },
  {
    file: "src/cacheReader/CacheDefinitionLoader.js",
    before: "loadedDef = await this.loader.load(file.content, defId, rscache, this.options);",
    after: `loadedDef = await this.loader.load(file.content, defId, rscache, {
                ...this.options,
                archiveId: this.archive.id,
            });`,
  },
  {
    file: "src/cacheReader/RSCache.js",
    before: '    async #getMapDef(x, y, type) {\n',
    after: `    async #getMapDef(x, y, type) {
        // Unnamed map indexes store each region as one archive: terrain in
        // file 0 and locations in file 1 (RuneLite RegionLoader).
        if (!this.indicies[IndexType.MAPS.id].named) {
            return this.getDef(IndexType.MAPS, (x << 8) | y, type === "m" ? 0 : 1);
        }
`,
  },
  {
    file: "src/cacheReader/loaders/MapLoader.js",
    before: "    load(bytes, id, rscache) {\n        if (bytes == undefined) return new MapDefinition();\n",
    after: `    load(bytes, id, rscache, options = {}) {
        if (bytes == undefined) return new MapDefinition();
        if (!rscache.indicies[5].named) {
            const region = options.archiveId;
            const x = region >> 8;
            const y = region & 0xff;
            if (id === 0) return this.loadMapDef(bytes, region, x, y);
            if (id === 1) return this.loadLocationDef(bytes, region, x, y);
            return new EmptyMapDefinition();
        }
`,
  },
];

const changes = patches.map(({ file, before, after }) => {
  const path = resolve(readerPath, file);
  const current = readFileSync(path, "utf8");
  if (current.includes(after)) return { path, content: current, changed: false };
  if (!current.includes(before)) throw new Error(`Unsupported cache-reader version at ${file}; expected fix/decode-subop-dataview commit 8ba9131`);
  return { path, content: current.replace(before, after), changed: true };
});
for (const { path, content, changed } of changes) if (changed) writeFileSync(path, content);
console.log(`cache-reader: map and object compatibility and missing heal sound filter ready (${changes.filter(({ changed }) => changed).length} files patched)`);
