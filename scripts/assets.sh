#!/usr/bin/env bash
set -euo pipefail

node scripts/patch-cache-reader.mjs "$@"
osrs-sdk-assets build "$@"
npm run --silent item-icons -- "$@"
node scripts/extract-sprites.mjs "$@"
node scripts/extract-zeke-music.mjs
