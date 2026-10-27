#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
export AGENT_BROWSER_ARGS="${AGENT_BROWSER_ARGS:+${AGENT_BROWSER_ARGS},}--mute-audio"
exec "${AGENT_BROWSER_BIN:-agent-browser}" --config "$script_dir/browser-muted.json" "$@"
