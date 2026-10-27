#!/usr/bin/env bash
set -euo pipefail

OSRS_SDK_REPO="${OSRS_SDK_REPO:-https://github.com/Julian-Dasilva/osrs-sdk.git}"
OSRS_SDK_COMMIT="${OSRS_SDK_COMMIT:-df1015c34141f61b7903ca3d616a81441efcc287}"
OSRS_SDK_PACKS="${OSRS_SDK_PACKS:-}"
PACKAGES=(osrs-sdk osrs-sdk-assets osrs-sdk-react)
PACKS=('osrs-sdk-[0-9]*.tgz' 'osrs-sdk-assets-*.tgz' 'osrs-sdk-react-*.tgz')

cd "$(dirname "$0")/.."

built_commit() {
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).gitHead ?? "unrecorded"))'
}

installed_commit() {
  local name
  for name in "${PACKAGES[@]}"; do
    if [[ -f "node_modules/${name}/package.json" ]]; then
      built_commit <"node_modules/${name}/package.json" 2>/dev/null || echo unreadable
    else
      echo missing
    fi
  done | sort -u | paste -sd ' ' -
}

check_installed() {
  local installed
  installed="$(installed_commit)"
  if [[ "${installed}" == "${OSRS_SDK_COMMIT}" ]]; then
    echo "install-beta-sdk: installed osrs-sdk commit ${installed} matches the pin"
    node scripts/patch-sdk-input.mjs node_modules/osrs-sdk --check
  else
    echo "install-beta-sdk: installed osrs-sdk commit ${installed} does not match the pin ${OSRS_SDK_COMMIT}"
    return 1
  fi
}

pack() {
  local matches=("$1"/$2)
  if [[ ${#matches[@]} -ne 1 || ! -f "${matches[0]}" ]]; then
    echo "install-beta-sdk: expected exactly one $1/$2" >&2
    exit 1
  fi
  echo "${matches[0]}"
}

packs_at_pin() {
  local glob file commit patch
  for glob in "${PACKS[@]}"; do
    file="$(pack "$1" "${glob}")" || exit 1
    commit="$(tar -xzOf "${file}" package/package.json | built_commit)"
    if [[ "${glob}" == 'osrs-sdk-[0-9]*.tgz' ]]; then
      patch="$(tar -xzOf "${file}" package/package.json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).zekeInputPatch ?? 0))')"
      if [[ "${patch}" != 4 ]]; then
        echo "install-beta-sdk: rebuilding packs missing Zeke input/render patch 4"
        return 1
      fi
    fi
    if [[ "${commit}" != "${OSRS_SDK_COMMIT}" ]]; then
      echo "install-beta-sdk: refusing ${file}, built from ${commit}, not the pin ${OSRS_SDK_COMMIT}"
      return 1
    fi
  done
}

if [[ "${1:-}" == --check ]]; then
  check_installed
  exit
fi

if [[ -n "${OSRS_SDK_PACKS}" ]] && packs_at_pin "${OSRS_SDK_PACKS}"; then
  packs="${OSRS_SDK_PACKS}"
  echo "install-beta-sdk: using prebuilt packs from ${packs}"
else
  work="$(mktemp -d)"
  packs="${work}/packs"
  mkdir -p "${packs}"
  echo "install-beta-sdk: building ${OSRS_SDK_REPO} at ${OSRS_SDK_COMMIT}"
  git init --quiet "${work}/osrs-sdk"
  git -C "${work}/osrs-sdk" fetch --quiet --depth 1 "${OSRS_SDK_REPO}" "${OSRS_SDK_COMMIT}"
  git -C "${work}/osrs-sdk" checkout --quiet FETCH_HEAD
  built="$(git -C "${work}/osrs-sdk" rev-parse HEAD)"
  node scripts/patch-sdk-input.mjs "${work}/osrs-sdk"
  (
    cd "${work}/osrs-sdk"
    npm ci --no-audit --no-fund
    npm run build
    npm pkg set "gitHead=${built}" --workspaces --include-workspace-root
    npm pack --pack-destination "${packs}" --silent
    npm pack --workspace osrs-sdk-assets --pack-destination "${packs}" --silent
    npm pack --workspace osrs-sdk-react --pack-destination "${packs}" --silent
  )
fi

files=()
for glob in "${PACKS[@]}"; do
  files+=("$(pack "${packs}" "${glob}")")
done
npm install --no-save --no-audit --no-fund "${files[@]}"
check_installed
