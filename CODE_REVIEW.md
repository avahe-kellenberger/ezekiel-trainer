# Code review

Read this before you review a change to the trainer, whether you are a person or an agent. It lists the performance mistakes to look for and the check that proves them. Players have reported lag, so a review judges performance as well as correctness.

## Run the local checks

| Tier | Where and when | Command | Proves |
| --- | --- | --- | --- |
| T0 | the maker's laptop, every iteration | `scripts/verify.sh t0` | the asset bundle, build, types, Vitest with the headless perf budgets, and the seeded fights against the base, in under a minute |
| T1 | the maker's laptop, before handoff | `scripts/verify.sh plan`, then the command it prints | the browser units the change selects, each runnable alone with `--unit` |

A seeded fight that differs from the base fails T0 unless `scripts/verify-parity-expected.json` names that fight with the sha256 of its head result and a reason. The parity stage prints the fight, its first differing value and that sha256. The reviewer judges each entry as an intended change to the fight. An edit to `scripts/verify-impact.json` plans every unit, and the plan refuses a group or rule that selects no unit.

Verification runs locally. The author shares the evidence directory printed by `scripts/verify.sh`, and the reviewer reads its `summary.txt` and the selected units' `verdict.json` files. Reproduce a failed unit with `scripts/verify.sh browser --unit <id>`. Run `scripts/verify.sh` for the full asset, build, type, test, browser and production checks, and `scripts/verify.sh perfbudgets` for the performance budgets.

Before handoff, run the shell checks and review checks locally:

```sh
for check in scripts/*.test.sh scripts/verify/*.test.sh review-ratchet/checks/*.test.sh; do
  bash "$check" || exit 1
done
node review-ratchet/checks/shell-test-runs-entry.mjs .
node review-ratchet/checks/replay-controls.mjs --base "$(git merge-base origin/master HEAD)"
```

## Look for these performance red flags

Each flag below is a pattern that costs frame time or memory on a player's machine. A flag is a finding only when it comes with an executable proof: a measured regression from `scripts/verify.sh perfbudgets` or `scripts/verify.sh perf`, or a test or script that shows the growth or the extra work.

- Work per frame that could run once per tick. The world ticks every 600 ms and the browser draws up to 60 frames a second, so per-frame work runs about 36 times as often.
- Allocation inside a frame or tick loop, including new `THREE` geometries, textures, materials and canvases. Build them once and reuse them, as `VoidFloorModel` in `src/content/ocellus/js/entities/P4Views.ts` does for each void kind.
- A draw call per tile, per shard or per particle where one batched mesh would do. Each mesh is at least one draw call.
- A canvas larger than the viewport times `devicePixelRatio`.
- An entity, view, listener or timer that is never disposed. A model's `destroy` must dispose the geometries, materials and textures it owns, not only remove them from the scene.
- An array, map or log that grows without bound over a long run.
- A first-use asset fetch, image decode or shader compile in the middle of the fight. Load and warm these before P4 starts.
- A new entry in the `exceptions` list of `src/perf/perfGate.json`. Each entry lets a pull request raise one budget. The reviewer must justify it before approval: read the entry's reason and evidence, confirm the cost is worth what players get, and confirm no cheaper change removes the cost.

A change to rendering, the tick loop, entities, views or input states its performance effect in the pull request. When `scripts/verify.sh plan` selects `perf_timing` for it, the author runs `scripts/verify.sh perf` and reports the frame-time p95, the tick-gap p95 and the draw calls.

## Run the perf stage

```sh
nvm use
scripts/verify.sh assets perfbudgets          # assets once, then every budget that does not need timing pairs
scripts/verify.sh perf                        # those budgets plus the throttled base and head timing pairs
VERIFY_PERF_BASE=<rev> scripts/verify.sh perf # compare against a base other than the merge base with origin/main
```

`perfbudgets` builds only the head and runs only the unthrottled long run, which also covers the fight window, so it needs no base build and no throttle. `perf` adds the base build and the throttled pairs. Both read the base's `src/perf/perfGate.json` for budget raises.

The `perf` stage builds production bundles for the working tree (the head) and for the base, serves both on `VERIFY_PRODUCTION_PORT` (default 8003), and drives seeded passive fights in headless Chrome. `src/perf/observer.js` records every animation frame, every world tick with the world's mob, entity and projectile counts, each 3D render's draw calls, the renderer's geometry, texture and scene object counts, and the largest canvas the page allocates. `src/perf/check.ts` turns the captures into a verdict. Evidence lands in `<evidence>/perf/captures/` and `<evidence>/perf-checks.json`.

Every fight-window run is CPU throttled 4 times (`workload.cpuThrottleRate`), so a player on a slower machine than the one running the stage is represented. The long run is not throttled, because it counts resources rather than time, and on a throttled GitHub Actions runner the page was still loading models at P4 tick 220. `src/perf/devtools.ts throttle` sets the DevTools protocol's `Emulation.setCPUThrottlingRate` on the session's tab. Chrome ends the throttle when that DevTools session closes, so the process holds the session for the whole stage, and the stage fails a throttled run that ends after the process exits. The throttle slows the page's main thread only. On a GitHub Actions runner the software WebGL rasteriser runs in Chrome's GPU process and stays at full speed.

Each run uses `?seed=1&invincible=on`, stands still, and runs from P4 tick 8 to P4 tick 80, so the void rifts that spawn at tick 67 are on screen for the last 13 ticks. The stage runs 5 pairs of base and head runs, alternating their order, then one long head run to P4 tick 400. The whole stage takes about 14 minutes, both on an M3 Max and on a GitHub Actions runner.

Run `scripts/verify.sh perfbudgets` before handoff. When the plan selects `perf_timing`, run `scripts/verify.sh perf` too. Changes to the SDK pin, the build, the shared encounter layer or `src/perf` select the timing pairs.

## Read the verdict

`src/perf/perfGate.json` holds every budget and the timing rule. The stage fails when any line fails.

The draw-call, resource and growth budgets do not depend on machine speed. The draw-call median and maximum, texture, mob, entity, projectile and scene object budgets are set to the measured value, which was the same on an M3 Max and on a GitHub Actions runner, so the stage passes on `main` and fails on any regression. The geometry and heap budgets have allowances, described below. The tick-gap budget compares the head with the base.

| Budget | What the stage measures |
| --- | --- |
| `drawCallsMedian3d` | The median draw calls per 3D render in the fight window of the unthrottled long run |
| `drawCallsMax3d` | The most draw calls in one 3D render in the same window |
| `trianglesMax3d` | The most triangles in one 3D render in the same window |
| `tickGapExcess3d` | The most that any head run's gap between two world ticks in the fight window exceeds the longest base gap ending at the same P4 tick, in milliseconds |
| `geometriesPerRetiredRift3d` | The renderer's geometry count gained between P4 ticks 220 and 400, which sit at the same point of the 60-tick cycle, divided by the rifts retired in between |
| `texturesPerRetiredRift3d` | The same for textures |
| `heapGrowthMiB3d` | The JS heap plus its array buffer storage gained between P4 ticks 220 and 400 of the long run, in MiB, each read after a forced garbage collection |
| `mobGrowth3d`, `entityGrowth3d`, `projectileGrowth3d` | The world's mobs, entities and projectiles gained between P4 ticks 220 and 400 |
| `sceneObjectGrowth3d` | The objects in the rendered 3D scene gained between P4 ticks 220 and 400 |
| `bundleKiB` | The production build's JavaScript, in KiB |
| `headless.viewAllocationsPerFrame` | The geometries, materials, textures, objects and canvases one trainer view constructs in a frame after its tick's first, in `src/perf/views.test.ts` without a browser |

The resource count starts at P4 tick 220 because the page loads models during its first cycles, and loads them more slowly when it draws fewer frames. At three frames a second the geometry count still grows from loading between ticks 160 and 220, and by tick 220 it has stopped.

From tick 220 the geometry and texture counts stay flat, on an M3 Max and on a GitHub Actions runner. Before the SDK disposed the models it replaces, 1 of 7 runner measurements counted one geometry more than the rifts explained, so a runner can still gain a lasting geometry at a random tick. The budget of 0.67 allows 4 of those extra geometries over the 6 rifts the window retires. A rift that leaks one geometry adds 6 over the window and fails. A smaller leak, such as one geometry every third rift, stays under the budget.

The renders in the fight window draw between 9 and 27 calls each, and their median is 14. The renders that draw 14 calls straddle the middle. On an M3 Max and on GitHub Actions runners, 42 to 44% of renders draw 13 calls or fewer, and 52 to 54% draw 14 or fewer. Removing the renders of any one 1500 ms span leaves the median at 14. The median budget is 14 with no allowance, so a head that adds calls only to the lighter renders fails it. If a run's median reaches 15 with no draw-call change, raise the budget to 15 with an exception that cites that run.

`src/perf/devtools.ts heap` reads the heap with the DevTools protocol's `Runtime.getHeapUsage`, after `HeapProfiler.collectGarbage`. It sums `usedSize` and `backingStorageSize` to the byte, because a retained `ArrayBuffer` or typed array lives in the backing storage and not in the JS heap's used size. On `main` the heap gained between -0.49 and +0.81 MiB over the window in 7 runs. The budget of 4 MiB is nearly 5 times the largest change. A leak of 1 MiB every 600 ms gains 180 MiB and fails. The mob, entity, projectile and scene object counts gained nothing on `main`, so their budgets are 0.

The tick-gap budget catches one long stall, which the p95 measure misses. The fight is seeded, so each P4 tick does the same work in the head and the base, and the stage compares each head gap with the longest base gap that ends at the same tick. A stall the base already has cancels out, and a new one shows its full length. The world loop repays a late tick on the next one, so a head gap is never compared with less than the base's median gap. Without that floor, a head that removes the base's stall at P4 tick 13 read 528 ms of excess at tick 14, where the base's repayment tick measured 97 ms. In 7 throttled runs whose base and head ship the same game code, 3 on an M3 Max and 4 on GitHub Actions runners, no head gap exceeded its base by more than 133 ms. The budget is 300 ms, half a world tick. One 1500 ms stall in the fight window exceeds the base by 1500 ms and fails.

An absolute limit does not work on the runners, because their speed changes from run to run. The gap that ends at P4 tick 13 measured 719, 1025 and 1430 ms in base runs on three runners, while the M3 Max measured 617 ms. On the runner, the page draws one long frame there while the renderer's geometry count rises from 29 to 50. That stall exists on `main` today, and a change that removes it lowers the base's gap, not the budget.

Frame-time p95 and tick-gap p95 depend on the machine and its load. The stage compares them against the base build on the same machine at the same seed. For each pair it divides the head's value by the base's value, and it fails when the median of those ratios exceeds `timing.medianRatioLimit`, which is 1.25.

The limit rests on 7 throttled runs whose base and head ship the same game code, 3 on an M3 Max with its GPU and 4 on GitHub Actions runners with software WebGL. Every median ratio fell between 0.991 and 1.003. Every per-pair ratio fell between 0.976 and 1.031 except three on the runners, where one 3D run drew its frames one refresh slower or faster than its pair, a ratio of 1.198 or 0.858, and the median of 5 pairs absorbed each. The median is why one slow run cannot fail the stage. A limit of 1.25 sits 28 times above the medians' largest deviation, 0.009, and leaves room for a busy machine, while a 300 ms stall in every frame raises the frame-time ratio to about 20. Frame times move in whole display refreshes of 16.7 ms, so the frame-time measure moves only when a frame misses a refresh. Under the throttle the M3 Max still draws every frame in one refresh, and the runners draw 3D frames in 83 to 117 ms. The hard budgets catch slower costs, such as extra draw calls, on any machine.

## Which check covers each budget

| Budget | Check | Runs |
| --- | --- | --- |
| `drawCallsMedian3d`, `drawCallsMax3d`, `trianglesMax3d` | the long run's fight window in `perfbudgets` and `perf` | local performance verification |
| `geometriesPerRetiredRift3d`, `texturesPerRetiredRift3d`, `heapGrowthMiB3d`, `sceneObjectGrowth3d` | the long run in `perfbudgets` and `perf` | local performance verification |
| `mobGrowth3d`, `entityGrowth3d`, `projectileGrowth3d` | the long run, and `src/perf/views.test.ts` without a browser | local performance verification; the Vitest file also in every T0 |
| `bundleKiB` | the head build in `perfbudgets` and `perf` | local performance verification |
| `headless.viewAllocationsPerFrame` | `src/perf/views.test.ts` | every T0 |
| `tickGapExcess3d`, `frameP95` and `tickGapP95` against `timing.medianRatioLimit` | the throttled pairs in `perf` | when the plan selects `perf_timing` |

The draw-call budgets used to read the throttled head runs. The long run draws the same renders unthrottled. In a laptop run on `main` at 99868bc, the five throttled head runs and the long run's window all measured a median of 14 calls and a maximum of 27. The long run sits a little closer to the median's edge: 51.6% of its renders draw 14 calls or fewer, against 52.3 to 52.7% for the head runs.

The most triangles in one render of the window is 15,962, drawn in 37 renders at P4 ticks 61 and 62, and `trianglesMax3d` is that value. The triangle median is not a budget. The counts cluster at 13,102, 13,574, 13,768, 14,768, 15,064 and 15,237 by which effects are on screen, so a change in frame pacing alone moves the median from one cluster to the next.

`src/perf/views.test.ts` plays the perf workload's seeded passive fight without a browser from P4 tick 8 to 400. It draws every trainer view ten times a tick, the way the SDK's viewport keeps one model per entity, and counts what each draw constructs from THREE's own id counters and from `document.createElement("canvas")`. A view may build in its tick's first frame. A geometry built in every frame of the walkway fails it, and so does an explosion view that is never retired, through the entity growth test.

## Change a budget

When a change lowers a measured value, lower its budget in `src/perf/perfGate.json` to the new value in the same pull request.

A raised budget hides the next regression of the same size, so the stage refuses one by default. `src/perf/check.ts` reads `src/perf/perfGate.json` at the base revision and compares each budget and `timing.medianRatioLimit` with the head's file. Any increase fails the stage unless the same pull request adds an entry to the `exceptions` list for exactly that raise:

```json
"exceptions": [
  { "budget": "drawCallsMax3d", "from": 27, "to": 51, "reason": "the new floor glow draws one mesh per lit tile", "evidence": "<shared perf evidence location>" }
]
```

`from` and `to` must equal the base and head values. An entry that the base already has does not allow a new raise. The stage prints each allowed raise with its reason and evidence, so the reviewer sees it in the verdict as well as in the diff.

The stage compares only the budgets that the head's `src/perf/gate.ts` still defines, so a removed budget prints no line. The reviewer judges a removal from the diff of `src/perf/gate.ts` and `src/perf/perfGate.json`.
