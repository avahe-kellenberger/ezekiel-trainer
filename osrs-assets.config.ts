import { defineConfig } from "osrs-sdk-assets";
import { ARCHIVE_OCELLUS_ASSETS, ARCHIVE_OCELLUS_OVERRIDES } from "./src/assets";
import { ZEKE_ASSETS } from "./src/content/zeke/assets";

export default defineConfig({
  cache: { openrs2: 2746 },
  assets: {
    npcs: { ...ARCHIVE_OCELLUS_ASSETS.npcs, ...ZEKE_ASSETS.npcs },
    models: { ...ARCHIVE_OCELLUS_ASSETS.models, ...ZEKE_ASSETS.models },
    items: { ...ARCHIVE_OCELLUS_ASSETS.items, ...ZEKE_ASSETS.items },
    spotAnims: { ...ARCHIVE_OCELLUS_ASSETS.spotAnims, ...ZEKE_ASSETS.spotAnims },
    sounds: { ...ARCHIVE_OCELLUS_ASSETS.sounds, ...ZEKE_ASSETS.sounds },
    regions: ZEKE_ASSETS.regions,
    playerAnimations: ZEKE_ASSETS.playerAnimations,
  },
  overrides: ARCHIVE_OCELLUS_OVERRIDES,
  scenes: {
    // Cache floor-kit objects, including the raised tiles and Guthix emblem.
    // Draw their depth separately so native actor poses can reach below the floor.
    16214: { groundObjectIds: [62857, 62858, 62859, 62860, 62861] },
  },
  outDir: "./public/osrs-assets",
});
