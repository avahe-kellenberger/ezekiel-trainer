# Ezekiel Trainer

A free browser trainer for Ezekiel in The Fractured Archive, built with the same [osrs-sdk](https://github.com/OldSchoolSDK/osrs-sdk) engine as the Inferno and Colosseum trainers. This checkout extends [Archive Ocellus Trainer](https://github.com/Julian-Dasilva/ArchiveOcellusTrainer).

The default page opens the Ezekiel encounter. The original Ocellus trainer remains available at `?encounter=ocellus` for regression checks.

## Run the trainer

Use Node 22.22.2 or later in the 22.x line. With nvm, run `nvm install` and `nvm use` to select the version in `.nvmrc`. Install dependencies and the pinned SDK together. The SDK packages are not saved in `package.json`, so running `npm ci` again requires rerunning the SDK installer.

```sh
npm ci
scripts/install-beta-sdk.sh
```

The SDK installer applies `scripts/patch-sdk-input.mjs` before building. This records special dodge clicks during their exact input tick, then starts the native dodge animation and travel on the next game update. It also fixes native player rotation and ground-effect animation. The scene compiler separates the configured floor objects from solid scenery; the renderer clears floor depth before drawing actors so animated boots remain visible. `scripts/install-beta-sdk.sh --check` verifies the pinned commit, patch revision, and built API; rerun the installer if any check fails. Prebuilt SDK packs without the patch are rebuilt automatically.

Clone the compatible cache reader and install its dependencies. The extraction command downloads pinned [OpenRS2 cache 2746](https://archive.openrs2.org/caches/runescape/2746) into `.osrs-cache/2746/cache/` automatically.

```sh
git clone --branch fix/decode-subop-dataview https://github.com/Julian-Dasilva/osrscachereader.git ../cache-reader
npm --prefix ../cache-reader ci
npm run assets -- --cache-dir .osrs-cache --reader-path ../cache-reader
npm start
```

Open `http://127.0.0.1:8002`. Left-click to move or attack, right-click for the game menu, drag the middle mouse button to rotate the camera, and scroll to zoom. Use the inventory, equipment, prayer, and combat tabs as in game. The spellbook includes Wind Surge for charging swords, with its actual spell icon, cast animation, projectile and impact. Select the spell, then click a sword. Practice supplies unlimited runes.

If installation policy skipped native scripts and extraction reports a missing `canvas.node`, install the published Canvas N-API binary under Node 22, then rerun asset extraction.

```sh
(cd ../cache-reader/node_modules/canvas && node ../prebuild-install/bin.js -r napi)
```

**Settings** selects the melee or ranged loadout, pattern seed, invincibility, sound effects, and music volume. The encounter is always solo. Apply encounter options with **Apply & restart**. **Restart** retries the current setup and seed. **Game settings & keybinds** opens the SDK's settings tab.

**Choose sword scenario** opens all eleven sword patterns as 9×9 previews. Selecting a pattern starts manual practice without a countdown, with Protect from Melee and Piety enabled. **Show path and numbered clicks** adds the tank route and its movement destinations to the arena. **Watch automatic demo** controls movement, weapon switches and target clicks, with at most one action per tick. It uses the harm staff to cast Wind Surge once on each of the four crossing swords, once on a parallel sweep, or twice on Split rows, one sword from each pair. It then switches to scythe and attacks the boss. The cast counter records executed spells. Each Wind Surge gives a sword 80% charge and 80 impact damage. Charge caps at 100%, with one damage per charge point. Sword impacts have no additional base damage.

The automatic examples repeat from the same starting tiles. They check actual spell casts and landings, scythe hits, melee attacks, hazards, boss sword hits, and the home reset. With spawn labelled **tick 1**, crossing casts execute on **ticks 2, 6, 10 and 14**. The final adjacent projectile lands on **tick 16**. This inclusive charge deadline is a provisional user assumption in `ZekeRules.ts`, not an established live-game timing. Launch remains tick 15; impact and recovery begin on tick 16. **Pause / Resume** holds or continues the attempt, and **Practise manually** returns control. Open `?route=cross-2-2` for a direct scenario link.

Music starts after the first click or key press. The track is *Blade of Forgotten Justice*, composed by Julian Surma. The trainer pauses when its tab is hidden.

Ezekiel's ground overlay follows his true position each tick. The full 3×3 footprint uses the true-tile colour (cyan by default), with his southwest anchor tile outlined in yellow. These replace his interpolated model outline.

Recorded dialogue appears over Ezekiel in the game font. Each sword has a shrinking red flight timer above its charge bar. During the special dodge window, a floor click queues up to four tiles of travel. The dodge animation and travel begin on the next game update, alongside the sword's movement.

Each special follows two auto attacks. Sword hits normally stun Ezekiel for 10 ticks. Each 100% charged sword that hits him adds four ticks, provisionally. The sword raise as Ezekiel recovers from a stun is a stand-up animation and causes no damage. Melee attacks have 100% accuracy while he is down, with ordinary damage rolls. Normal accuracy returns when he starts standing up, two ticks before movement resumes. Star explosions leave the boss's initial footprint visually clear but damage players underneath on both explosion ticks.

## Rebuild game assets

`npm run assets` extracts models, animation sequences, frame sounds, scenery, effects, player equipment, and UI sprites from cache 2746. It downloads the encounter music from the wiki and records its source and SHA256 in `public/osrs-assets/music/provenance.json`. Generated assets stay in `public/osrs-assets/` and are never committed.

The extraction command first runs `scripts/patch-cache-reader.mjs`. The patch adds the unnamed map archive format used by this cache, following [RuneLite's RegionLoader](https://github.com/runelite/runelite/blob/master/cache/src/main/java/net/runelite/cache/region/RegionLoader.java). It is idempotent and rejects unfamiliar source versions before writing. The patch is required to extract the real arena in region 16214. It also fixes opcode 7 object decoding so scenery includes the actual Guthix floor symbol, object 62861. The patch removes the missing sound 12804 reference at Ezekiel heal animation 14688, frame 49. Cache 2746 lacks that sound; the three other heal frame sounds remain. That one audio cue is unavailable in this cache.

If only the music is missing, run `node scripts/extract-zeke-music.mjs`. If assets or dependencies change, rerun the relevant installation or extraction command before starting the server. `npm start` and `npm run build` check the asset manifest before bundling.

## Validate changes

```sh
npm run typecheck
npm test
npm run build
```

Browser tests must run muted. `scripts/verify.sh` sets Chromium's `--mute-audio` launch flag. For manual verification, use `scripts/agent-browser-muted.sh --session zeke-muted ...`. Set `AGENT_BROWSER_BIN` to the agent-browser executable when it is not on `PATH`. Set `AGENT_BROWSER_EXECUTABLE_PATH` if you use a system Chromium. Close any earlier unmuted test session before launching the muted session, because launch flags do not change an already running browser. The page's audio still runs, so tests can check music playback and sound events without audible output.

The repository's verification workflow is [verify-archive-ocellus](.claude/skills/verify-archive-ocellus/SKILL.md). Its original browser units target Ocellus. Zeke needs its own real-browser evidence for movement, combat, prayer and inventory controls, rendering, sound, and music. A passing Ocellus test suite does not establish Zeke's encounter accuracy.

Encounter timing and damage remain under calibration. `src/content/zeke/ZekeRules.ts` owns provisional timings. User-confirmed walk-under behavior chooses a fresh random escape direction each active tick. Targeted magic hits every arena participant, including the tank underneath Ezekiel, and consumes one of his two autos before the star.

Star visuals use finite native ground effects with staggered spawn, marker, and explosion sequences. Sword recovery starts the wake-up animation at impact +8 ticks, releases movement at +10, and attacks at +12/+17, consistent with the supplied recording.

## Known limitations

- Auto-attack targeting checks positions before the current tick's movement, so a same-tick step can differ from the live game.
- Damage, prayer mitigation, and elemental weakness remain provisional. Boss defence uses 130; cache 2746 reports 200, and the discrepancy with the wiki and encounter scaling is unresolved.
- Finale practice uses a fixed east-facing encounter orientation.
- Sword burn damage is not implemented.
- The spellbook supports Wind Surge only, with unlimited practice runes.

## Keep local configuration private

Keep deployment notes, hostnames, server paths, and private configuration in `.local/`. Git ignores this directory, environment files, credential files, and local hosting state. Use placeholders in any configuration examples you commit. Keep generated game assets in the ignored `public/osrs-assets/` directory.

Before publishing, review `git diff --cached` and the full Git history for private data. Ignore rules do not remove files that Git already tracks or data in earlier commits. For a shallow clone, fetch the missing history before reviewing older commits.

## Credits and licence

The original Archive Ocellus Trainer was made by Julian Dasilva / Moarhots, with help from [Alessandro Rodi](https://github.com/alessandrorodi). Its structure follows [ColosseumTrainer](https://github.com/Supalosa/ColosseumTrainer). The item-icon renderer derives from RuneLite's cache tool under its BSD 2-clause licence.

Created using intellectual property belonging to Jagex Limited under the terms of Jagex's Fan Content Policy. This content is not endorsed by or affiliated with Jagex.

The trainer is free and contains no ads, donations, or paid features. The Zeke page does not initialize analytics. Game assets are generated or downloaded at build time and are not stored in this repository.

GPL-3.0. See [LICENSE](LICENSE).
