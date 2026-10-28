#!/usr/bin/env bash
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fail() {
  printf 'ASSERTION FAILED: %s\n' "$*"
  exit 1
}

ready() {
  printf 'ready %s\n' "$t"
}

seconds() {
  printf '{"seconds":{"rifts":230,"pathing":120,"cues":80,"seed":15,"walkway":20}}' >"$WORK/seconds.json"
}

shard() {
  node "$HERE/shard.mjs" "$WORK/seconds.json" "$1" 3 rifts pathing cues seed walkway new_unit
}

every_unit_lands_in_one_shard() {
  seconds
  ready
  { shard 1; shard 2; shard 3; } | sort >"$WORK/all.txt"
  [[ "$(tr '\n' ' ' <"$WORK/all.txt")" == "cues new_unit pathing rifts seed walkway " ]] || { cat "$WORK/all.txt"; fail "the shards do not hold every unit exactly once"; }
  [[ "$(shard 1 | tr '\n' ' ')" == "rifts " ]] || { shard 1; fail "the longest unit does not have the first shard to itself"; }
}

failed=0
for t in \
  every_unit_lands_in_one_shard; do
  if ("$t") >"$WORK/$t.log" 2>&1; then
    echo "PASS $t"
  else
    echo "FAIL $t"
    failed=1
  fi
  sed 's/^/  /' "$WORK/$t.log"
done
exit $failed
