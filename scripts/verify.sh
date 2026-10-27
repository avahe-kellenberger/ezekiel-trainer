#!/usr/bin/env bash
set -uo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"
export AGENT_BROWSER_ARGS="${AGENT_BROWSER_ARGS:+${AGENT_BROWSER_ARGS},}--mute-audio"

set -a
OSRS_CACHE_DIR="${OSRS_CACHE_DIR:-$HOME/osrs-sims/cache/openrs2}"
OSRS_CACHE_READER="${OSRS_CACHE_READER:-$HOME/osrs-sims/osrscachereader}"
VERIFY_PORT="${VERIFY_PORT:-8002}"
VERIFY_DIR="${VERIFY_DIR:-$ROOT/.verify/$(date -u +%Y%m%dT%H%M%SZ)}"
STATE_FILE="$ROOT/.verify/current-server"
MANIFEST="$ROOT/public/osrs-assets/manifest.json"
PARITY_EXPECTED="scripts/verify-parity-expected.json"
URL="http://127.0.0.1:${VERIFY_PORT}/"
DRILL_QUERY="?seed=1&specialSelection=replay-v2"
BOSS_NPC=16677
SPAWN_TILE='{"x":5,"y":1}'
WALK_CLICK_LEFT_PX=160
WALK_CLICK_UP_PX=50
WALK_TARGET_TILE='{"x":8,"y":3}'
EDGE_CLICK_DOWN_PX=160
EDGE_ORDER_TILE='{"x":8,"y":0}'
EDGE_STOP_TILE='{"x":8,"y":1}'
EDGE_HOLD_TICKS=3
CYCLE_LAST_HIDDEN_TICK=3
BOSS_BAR_AT_ENTRY="1312 / 5250 (25.0%)"
CYCLE_RING_TICK=39
CYCLE_LAST_TICK=70
CYCLE_STAGE_ENTRIES='[[0,"lead-in"],[8,"inner-void"],[30,"after-inner"],[39,"outer-void"],[59,"after-outer"],[68,"inner-void"]]'
CYCLE_OVERHEAD_SWITCHES='[[8,"deflect-melee"],[33,"soul-split"],[38,null],[39,"deflect-range"],[61,"soul-split"],[67,null],[68,"deflect-melee"]]'
CYCLE_SPECIAL_HITS='[[37,"vortex"],[65,"spike-disk"]]'
FOCUS_DRILL="transition-attacks"
FOCUS_LAST_TICK=40
FOCUS_EXPECTED='{"start":27,"beats":["boss-landing-starts","soul-split-heal","special-hit","special-sound","special-tell"]}'
FOCUS_ENTRY_TICKS='[27,29]'
BOSS_POSE_SOUND_SAMPLES='{"rise":39690,"hover":44100}'
LOADOUT_QUERY="?seed=6&setup=ranged"
LOADOUT_RANGED_WORN='{"weapon":20997,"offhand":null,"helmet":27235,"chest":27238,"legs":27241,"gloves":26235,"cape":28951,"necklace":33639,"feet":31097,"ring":28310,"ammo":11212}'
LOADOUT_MELEE_WORN='{"weapon":22325,"offhand":null,"helmet":24419,"chest":24420,"legs":24421,"gloves":22981,"cape":21295,"necklace":29801,"feet":31097,"ring":25485,"ammo":11212}'
LOADOUT_INVENTORY_TAB_X=1164
LOADOUT_INVENTORY_TAB_Y=745
LOADOUT_SLOT_X=1125
LOADOUT_SLOT_Y=508
LOADOUT_SLOT_DX=39
LOADOUT_SLOT_DY=32
LOADOUT_SPECIAL_SLOT=0
LOADOUT_SWITCHES=8
LOADOUT_SPECIAL_ORB_X=1140
LOADOUT_SPECIAL_ORB_Y=157
RISEN_BOSS_CLICK_RIGHT_PX=-10
RISEN_BOSS_CLICK_DOWN_PX=-160
LOADOUT_DIVISION_DRAIN=37
LOADOUT_EQUIPMENT_TAB_X=1197
LOADOUT_EQUIPMENT_TAB_Y=745
LOADOUT_TRAINER_ICONS='{"24419":"27x30","24420":"32x24","24421":"16x31","26235":"30x22","27235":"19x27","27238":"30x23","27241":"13x26","28922":"31x28"}'
DEFENCE_FLOOR_QUERY="?seed=20&setup=ranged"
DEFENCE_FLOOR_STEPS="[250,176,150]"
SUPPLY_QUERY="?seed=1&setup=ranged"
SUPPLY_INVENTORY='[28922,22325,24419,24420,24421,22981,21295,29801,25485,12695,22461,6685,3024,12695,22461,6685,3024,6685,6685,6685,3024,6685,6685,6685,3024,6685,6685,3024]'
SUPPLY_NAMED_SLOT=0
SUPPLY_NAMED_MENU='["Equip Tonalztics of Ralos","Drop Tonalztics of Ralos","Examine Tonalztics of Ralos"]'
SUPPLY_BREW_SLOT=11
SUPPLY_HP_AFTER_BREW=115
SUPPLY_HOVER_NAME_PIXEL="#ff911f"
KEYBIND_INVENTORY_BUTTON_X=1130
KEYBIND_INVENTORY_BUTTON_Y=650
KEYBIND_DEFAULT_KEY=F4
KEYBIND_NEW_KEY=F6
WALKWAY_QUERY="?seed=1&focus=${FOCUS_DRILL}"
WALKWAY_ORDER_TILE='{"x":13,"y":2}'
WALKWAY_STOP_TILE='{"x":11,"y":2}'
WALKWAY_PIXEL="#6b6c40"
WALKWAY_MIN_SHARE=1
WALKWAY_RUN_END_TILE='{"x":11,"y":3}'
WALKWAY_RUN_TILES='[{"x":7,"y":1},{"x":9,"y":1},{"x":11,"y":2}]'
CONTROL_MODIFIER=2
CORRECTION_FIRST_TILE='{"x":8,"y":3}'
CORRECTION_LAST_TILE='{"x":3,"y":2}'
CORRECTION_FIRST_MS=150
CORRECTION_LATE_MS=500
CORRECTION_ATTEMPTS=3
CORRECTION_EXPECTED='{"orders":[{"x":8,"y":3},{"x":3,"y":2}],"tiles":[{"x":3,"y":2},{"x":3,"y":2},{"x":3,"y":2}]}'
CONTROL_WALK_TILES='[{"x":6,"y":1},{"x":7,"y":1},{"x":8,"y":1},{"x":9,"y":1},{"x":10,"y":1},{"x":11,"y":2}]'
BACK_WALL_START_TILE='{"x":10,"y":3}'
BACK_WALL_END_TILE='{"x":7,"y":6}'
BACK_WALL_TOWARD_TILES='[{"x":9,"y":4},{"x":8,"y":5},{"x":7,"y":6}]'
BACK_WALL_BACK_TILES='[{"x":8,"y":5},{"x":9,"y":4},{"x":10,"y":3}]'
BACK_WALL_TOP_DOWN_DRAG_PX=720
CAMERA_SETTLE_MS=1200
CORNER_QUERY="?seed=2&focus=${FOCUS_DRILL}"
CORNER_HOLE_TILE='{"x":3,"y":8}'
CORNER_NUB_TILE='{"x":4,"y":9}'
CORNER_VIEW_TILE='{"x":2,"y":2}'
CORNER_VIEW_DRAG_LEFT_PX=95
PATHING_QUERY="?seed=1&focus=${FOCUS_DRILL}&drillStart=cycle-start"
PATHING_WEST_TILE='{"x":3,"y":5}'
PATHING_EAST_TILE='{"x":7,"y":5}'
PATHING_BACK_TILE='{"x":4,"y":3}'
PATHING_UNDER_TICK=30
PATHING_AROUND_TICK=40
PATHING_LAST_TICK=46
PATHING_EXPECTED='[["after-inner",[{"x":5,"y":5},{"x":7,"y":5}]],["outer-void",[{"x":7,"y":3},{"x":5,"y":3},{"x":4,"y":3}]]]'
PATHING_EDGE_TILE='{"x":5,"y":4}'
PATHING_REROUTE_TICK=38
PATHING_REROUTE_EXPECTED='[[{"x":5,"y":4}],[39],[["outer-void",[{"x":5,"y":3}]]]]'
PATHING_CONTROL_EXPECTED='[[{"x":5,"y":4}],["walk"],[39],[["outer-void",[{"x":5,"y":2},{"x":5,"y":3}]]]]'
PATHING_UNDER_TILE='{"x":5,"y":5}'
PATHING_OUT_TILE='{"x":5,"y":3}'
PATHING_OUT_TICK=40
PATHING_OUT_EXPECTED='[[{"x":5,"y":5},{"x":5,"y":3}],[41],[["lead-in",[{"x":5,"y":3},{"x":5,"y":5}]],["outer-void",[{"x":5,"y":3}]]]]'
HOLES_QUERY="?seed=1&focus=floor-holes"
HOLE_LAYOUT='{"key":"corner-stack","tiles":[{"x":11,"y":1},{"x":11,"y":2},{"x":11,"y":3}]}'
HOLE_PIXELS='[[{"x":11,"y":1},-332,20],[{"x":11,"y":2},-309,-15],[{"x":11,"y":3},-290,-45]]'
HOLE_FREE_PIXELS='[[{"x":10,"y":2},-268,-15],[{"x":10,"y":1},-292,20]]'
HOLE_BOX_HALF_PX=8
HOLE_MIN_DARK_SHARE=30
HOLE_MAX_DARK_SHARE=5
HOLE_FLOOD_SHOT_TICK=45
HOLE_TILE='{"x":11,"y":2}'
HOLE_HITS=3
HOLE_DAMAGE='{"min":9,"max":11}'
PROJECTED_TILE_CLICKS=18
ORB_HOLES_QUERY="?seed=86&floorHoleLayout=v1-turn"
ORB_HOLES_SHOT_TICK=13
ORB_HOLES_EXPECTED='[[12,"inner-void",{"x":2,"y":5}]]'
ORB_HOLES_LAYOUT='{"key":"v1-turn","tiles":[{"x":1,"y":5},{"x":1,"y":6},{"x":2,"y":8},{"x":2,"y":9},{"x":4,"y":9},{"x":8,"y":5}]}'
BOSS_CLICK_RIGHT_PX=150
BOSS_CLICK_UP_PX=150
RING_CLICK_RIGHT_PX=140
RING_CLICK_UP_PX=40
FLOOD_DAMAGE_TICK=44
FLOOD_LAST_TICK=58
FLOOD_RING_SCREENSHOT_TICK=52
NEAR_SQUARE='{"minX":3,"maxX":7,"minY":3,"maxY":7}'
VOID_DRILL="void-floor"
VOID_INNER_SHOT_TICK=12
VOID_FLOOD_SHOT_TICK=45
VOID_FLOOR_HITS='[[44,9],[45,11],[46,10],[47,11],[48,10],[49,9],[50,9],[51,10],[52,9],[53,10],[54,1]]'
VOID_RUN_END='[[54,"death"]]'
VOID_PIXEL="#1e2529"
INVINCIBLE_QUERY="?seed=1&focus=${VOID_DRILL}&invincible=on"
INVINCIBLE_LAST_TICK=56
INVINCIBLE_EXPECTED='{"prevented":[[54,"floor-hit"]],"hp":[[53,1],[54,99]],"chat":"Invincible: the void floor would have killed you on tick 54."}'
INVINCIBLE_ORB_QUERY="?seed=1&invincible=on"
INVINCIBLE_ORB_UNDER_BOSS_CLICK_UP_PX=100
INVINCIBLE_ORB_BESIDE_TICK=19
INVINCIBLE_ORB_BESIDE_TILE='{"x":3,"y":8}'
INVINCIBLE_ORB_STEP_ON_TICK=24
INVINCIBLE_ORB_TILE='{"x":4,"y":8}'
INVINCIBLE_ORB_LAST_TICK=27
INVINCIBLE_ORB_EXPECTED='{"revived":[15,"floor-hit",38],"returned":[[26,{"requested":0,"applied":0,"beforeHp":99,"afterHp":99}]],"hp":[26,99],"maxHp":99}'
ORB_DRILL="lifeforce-orb"
ORB_SEED=75
ORB_DORMANT_TICK=20
ORB_GLOW_TICK=24
ORB_LAST_TICK=30
ORB_FRAMES=6
ORB_CLICK_RIGHT_PX=-195
ORB_CLICK_UP_PX=78
ORB_BOX='{"minX":-60,"maxX":50,"minY":-75,"maxY":5}'
ORB_SKIP_LAST_TICK=63
ORB_INNER_CLEAR_TICK=30
ORB_INNER_EXPIRY_TICK=35
ORB_LATE_SHOT_TICK=31
ORB_LATE_LAST_TICK=36
ORB_ENTRY_CLICK_TICK=34
ORB_ENTRY_CLICK_RIGHT_PX=106
ORB_ENTRY_CLICK_UP_PX=50
ORB_ENTRY_TILE='{"x":3,"y":3}'
ORB_ENTRY_LAST_TICK=44
ORB_OPPOSITE_EXPECTED='[[43,{"x":7,"y":7}]]'
EXPLOSION_DRILL="explosions"
EXPLOSION_INNER_MARKS="17 19 21 23 25 27"
EXPLOSION_DAMAGE_REDUCTION_PERCENT=60
EXPLOSION_OUTER_MARKS="48 50 52 54 56 58"
EXPLOSION_LAST_TICK=59
EXPLOSION_UNDER_LAST_TICK=29
STEP_CLICK_SIDE_PX=55
STEP_CLICK_DOWN_PX=25
DODGE_CLICK_SIDE_PX=110
UNDER_BOSS_CLICK_UP_PX=120
HOVER_BOSS_BODY_UP_PX=200
DODGE_BOSS_CLICK_TICK=12
DODGE_SOUTH_CLICK_UP_PX=12
DODGE_SETTLE_MS=400
DODGE_SPEEDUP_LAST_TICK=34
DODGE_SPEEDUP_ATTACKS='[13,18,20,22,24,26,28,33]'
EXPLOSION_PIXEL="#5e317b"
EXPLOSION_GLOW_BOX='{"minX":-128,"maxX":127,"minY":-16,"maxY":79}'
EXPLOSION_GLOW_MIN_SHARE=1.5
EXPLOSION_GLOW_MAX_SHARE=0.1
EXPLOSION_OVERHEAD_BOX='{"minX":-100,"maxX":99,"minY":-150,"maxY":-41}'
EXPLOSION_OVERHEAD_MIN_SHARE=0.2
EXPLOSION_OVERHEAD_SHOT_FRACTION=0.25
EXPLOSION_OUTSIDE_TICKS="15 29"
EXPLOSION_GLOW_SHOT_FRACTION=0.85
EXPLOSION_MARKED_SHOT_FRACTIONS="0.75 0.85"
EXPLOSION_RUN_END_QUERY="?seed=38&bosshp=1&focus=explosions"
EXPLOSION_KILL_CLICK_TICK=14
EXPLOSION_RUN_END_EXPECTED='{"marked":[[17,{"x":5,"y":1}]],"ended":[[18,"kill"]],"resolved":[]}'
EXPLOSION_RUN_END_FRAMES=2
SOUND_SETTINGS_KEY="osrs-sdk:settings"
SOUND_SAMPLES='{"12638":14332,"12537":8820}'
EXPLOSION_SOUNDS='[[14,12638],[17,12537],[19,12537],[21,12537],[23,12537],[25,12537],[27,12537],[45,12638],[48,12537],[50,12537],[52,12537],[54,12537],[56,12537],[58,12537]]'
EXPLOSION_EXPECTED='{"lateHit":{"requested":16,"applied":16,"beforeHp":99,"afterHp":83,"prayer":null},"under":[[18,{"x":5,"y":6},true,"hit",83],[20,{"x":5,"y":6},true,"hit",67],[22,{"x":5,"y":6},true,"hit",51],[24,{"x":5,"y":6},true,"hit",35],[26,{"x":5,"y":6},true,"hit",19],[28,{"x":5,"y":6},true,"hit",3]]}'
SPECIAL_DRILL="transition-attacks"
SPECIAL_QUERY="?seed=1&focus=${SPECIAL_DRILL}&specialSelection=replay-v2"
PROTECT_MAGIC_RIGHT_PX=514
PROTECT_RANGE_RIGHT_PX=551
PROTECT_MELEE_RIGHT_PX=588
PROTECT_DOWN_PX=218
SPECIAL_PRAY_TICK=33
SPECIAL_RANGE_PRAY_TICK=61
SPECIAL_HIT_TICK=37
SPECIAL_BEFORE_SHOT_TICK=31
SPECIAL_VORTEX_SHOT_TICK=35
SPECIAL_SPIKE_SHOT_TICK=63
SPECIAL_SEMICIRCLE_SHOT_TICK=93
SPECIAL_BLACK_SHOT_TICK=95
TELL_BOX='{"minX":-200,"maxX":200,"minY":-220,"maxY":-40}'
TELL_CENTRE_BOX='{"minX":-50,"maxX":0,"minY":-110,"maxY":-75}'
TRANSITION_SOUND_SAMPLES='{"12584":19845,"12587":33075,"12586":22050,"12585":22050,"12572":66150,"12567":33075,"12555":33075,"12556":44100,"12554":35280}'
LANDING_SOUNDS='[[29.1,12584],[29.83,12587],[31.03,12586],[31.47,12585],[89.1,12584],[89.83,12587],[91.03,12586],[91.47,12585]]'
LANDING_WINDOWS='[[29,32],[89,92]]'
STYLE_SOUNDS='[[34.2,12554],[64.4,12555],[65.1,12556],[92.1,12572],[97.1,12567]]'
STYLE_WINDOWS='[[32,37.5],[60,65.5],[92,97.5]]'
SOUND_TOLERANCE_TICKS=0.2
SPECIAL_EXPECTED='{"protected":[37,"magic",{"requested":8,"applied":8,"beforeHp":99,"afterHp":91,"prayer":"magic"}],"late":[37,"magic",{"requested":49,"applied":49,"beforeHp":99,"afterHp":50,"prayer":null}],"told":[[32,"vortex","magic"],[60,"spike-disk","ranged"],[92,"black-disk","melee"]]}'
ORB_EXPECTED='{"told":[[11,"inner-void"]],"drained":[[12,49,50]],"spawned":[[12,{"x":9,"y":4},49]],"matured":[[24,{"x":9,"y":4}]],"returned":{"requested":49,"applied":49,"beforeHp":50,"afterHp":99},"skipExpired":[[35,"inner-void"],[61,"outer-void"]],"skipHeal":[[62,{"kind":"unclaimed-orb"},{"requested":25,"applied":25,"beforeHp":1312,"afterHp":1337}]]}'
RIFT_QUERY="?seed=1&focus=rifts&drillStart=cycle-start"
OVERHEAD_SHOT_TICKS="5 31 35 45"
OVERHEAD_GAP_DRAWS='{"37":["440-11"],"38":[],"39":["440-16"],"66":["440-11"],"67":[],"68":["440-15"]}'
ICON_BOX='{"minX":-40,"maxX":40,"minY":-290,"maxY":-190}'
RIFT_CLICK_TICK=68
NORTH_EAST_RIFT_CLICK_LEFT_PX=270
NORTH_EAST_RIFT_CLICK_UP_PX=52
RIFT_BURST_TICK=97
RIFT_CHARGED_SHOT_TICK=96
RIFT_TIMER_BOX='{"minX":156,"maxX":185,"minY":-85,"maxY":-81}'
RIFT_TIMER_MAX_EARLY_SHARE=10
RIFT_TIMER_MIN_FULL_SHARE=85
RIFT_ONE_HIT='[[72,"rift-67-1","ranged",44]]'
RIFT_RALOS_HITS='[[72,"rift-67-1","ranged",18],[72,"rift-67-1","ranged",18]]'
RIFT_RALOS_LAST_TICK=74
RIFT_MELEE_HITS='[[71,"rift-67-1","melee",35],[76,"rift-67-1","melee",9]]'
RIFT_MELEE_SPLAT_TICK=71
RIFT_MELEE_LAST_TICK=77
CHAT_POLL_WAIT_MS=600
MENU_CONTROLS='["setup","focus","seed","keybinds","sound","area_sound","invincible","perf_data","whats_new"]'
MENU_QUERY="?seed=1"
MENU_SMALL_VIEWPORT="800 600"
MENU_MOBILE_DEVICE="iPhone 14"
WHATS_NEW_PHONE_VIEWPORT="390 844"
DEATH_RESULT_QUERY="?seed=1&focus=void-floor"
DEATH_RESULT_LINES='["You died","on P4 tick 54"]'
KILL_RESULT_QUERY="?seed=4&bosshp=1"
KILL_RESULT_BOSS_HP=1
KILL_RESULT_CLICK_TICK=12
KILL_RESULT_LINES='["Ocellus defeated","P4 time: 16 ticks (0:09.6)"]'
RESULT_BUTTONS='["Restart","Retry seed"]'
TELEMETRY_FIELDS='["version","view","gpu","browser","stage","end","sampleRate","frames","frameMedianMs","frameP95Ms","frameP99Ms","framesOver50Ms","runTicks","tickMedianMs","tickP95Ms","tickMaxMs","lateTicks","devicePixelRatio","canvasWidth","canvasHeight","cores"]'
TELEMETRY_BEACON_WAIT_MS=1800
LOAD_RETRY_QUERY="?seed=1"
GET_READY_QUERY="?seed=1"
STORED_VIEW_QUERY="?seed=1"
GET_READY_TICKS=6
GET_READY_CLICK_TICK=1
DEFLECT_QUERY="?seed=1&focus=rifts&setup=melee&drillStart=cycle-start"
DEFLECT_CLICK_TICK=12
DEFLECT_HOVER_SHOT_TICK=20
DEFLECT_HOVER_TILE='{"x":5,"y":3}'
DEFLECT_HOVER_TICKS='[14,29]'
DEFLECT_FIRST_MELEE_TICK=31
DEFLECT_BLOCKED_SHOT_TICK=31
DEFLECT_LAST_TICK=46
REFLECT_QUERY="?seed=4&focus=rifts&drillStart=cycle-start"
REFLECT_CLICK_TICK=38
REFLECT_BOSS_CLICK_UP_PX=100
REFLECT_NONE_SHOT_TICK=42
REFLECT_HIT_SHOT_TICK=47
REFLECT_LAST_TICK=53
REFLECT_EXPECTED='{"judged":[[42,"ranged","blocked",8],[47,"ranged","blocked",44],[52,"ranged","blocked",62]],"reflected":[[47,"ranged",4],[52,"ranged",6]],"hpAfter":89}'
REFLECT_SPLAT_BOX='{"minX":-14,"maxX":14,"minY":-52,"maxY":-24}'
REFLECT_MIN_SPLAT_SHARE=5
REFLECT_MAX_CLEAR_SHARE=1
SOUL_SPLIT_HEAL_TICK=39
RIFT_EXPECTED='{"spawned":[[67,"rift-67-0",{"x":2,"y":2}],[67,"rift-67-1",{"x":10,"y":2}]],"destroyed":"rift-67-1","attackDelay":{"before":2,"after":0},"bursts":[[97,["rift-67-0"],{"requested":36,"applied":36,"beforeHp":99,"afterHp":63,"prayer":null}]]}'
SOUL_SPLIT_EXPECTED='[[39,{"kind":"soul-split","ordinal":0},{"requested":49,"applied":49,"beforeHp":1312,"afterHp":1361}],[67,{"kind":"soul-split","ordinal":1},{"requested":47,"applied":47,"beforeHp":1361,"afterHp":1408}]]'
KILL_CHAT="Destroying the void rift empowers you!"
RIFT_SOUND_SAMPLES='{"12640":11025,"12641":14332,"12642":26460,"12643":7717}'
RIFT_SPAWN_SOUNDS='[[67.2,12643],[67.2,12643]]'
RIFT_KILL_SOUND='[0.27,12640]'
RIFT_BURST_SOUNDS='[[97.13,12641],[97.93,12642]]'
RIFT_SOUND_WINDOW='[66,99]'
CUE_QUERY="?seed=${ORB_SEED}&focus=${ORB_DRILL}&drillStart=cycle-start&outerOrbTile=safe-floor"
CUE_TOGGLE_TICK=6
CUE_CHAT_BEFORE_TICK=10
CUE_CHAT_TICK=11
CUE_LAST_TICK=50
CUE_SOUND_SAMPLES='{"12490":7717,"12497":66150,"12621":12127,"12622":12127,"12623":12127,"12624":9922}'
CUE_SOUNDS='[[5,12490],[12.4,12624],[15.87,12621],[19.8,12622],[22.8,12623],[39,12497],[43.1,12624],[44.7,12621],[46.8,12622],[48.3,12623]]'
CUE_SOUND_WINDOW='[4,50]'
CUE_CHAT="Ocellus manipulates your lifeforce!"
AUTOPLAY_POLICY_JS='(() => { const Native = window.AudioContext; if (!Native) return; const made = []; window.__audioContexts = made; window.AudioContext = class extends Native { constructor(...args) { super(...args); made.push(this); void this.suspend(); } }; })();'
VIEWPORT_RENDERS_JS='(() => { const renders = (window.__viewportRenders = { count: 0 }); window.__THREE_DEVTOOLS__ = new EventTarget(); window.__THREE_DEVTOOLS__.addEventListener("observe", ({ detail }) => { if (detail?.isWebGLRenderer !== true) return; const render = detail.render; detail.render = function (...args) { if (this.domElement.width * this.domElement.height > 1) renders.count++; return Reflect.apply(render, this, args); }; }); })();'
PRODUCTION_PORT="${VERIFY_PRODUCTION_PORT:-8003}"
PERF_GATE="src/perf/perfGate.json"
PRODUCTION_QUERY="?seed=1&invincible=on"
PRODUCTION_P3_QUERY="?phase=p3&seed=1"
PRODUCTION_WATCH_SECONDS=20
PRODUCTION_ORBS='["99","99","100","100"]'
PRODUCTION_ORBS_JS='(() => { const orbs = { framesSinceFirst: 0, blankSinceFirst: 0, first: null, last: null }; window.__orbs = orbs; let frame = []; const fillText = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (text, ...rest) { if (this.textAlign === "center" && this.font.endsWith("px Stats_11") && this.fillStyle !== "#000000" && /^\d+$/.test(String(text))) frame.push(String(text)); return fillText.call(this, text, ...rest); }; const close = () => { if (frame.length > 0) { orbs.first ??= frame; orbs.last = frame; } if (orbs.first) { orbs.framesSinceFirst++; if (frame.length === 0) orbs.blankSinceFirst++; } frame = []; requestAnimationFrame(close); }; requestAnimationFrame(close); })();'
P3_QUERY="?phase=p3&seed=1"
P3_CLEAR_QUERY="?phase=p3&seed=100&bosshp=3991"
P3_ARENA_SHOT_TICK=3
P3_ARENA_TILES='{"open":[{"x":25,"y":11},{"x":26,"y":11}],"closed":[{"x":16,"y":13},{"x":17,"y":13}],"rim":[{"x":28,"y":10}]}'
P3_PRAY_TICK=1
P3_SWINGS_LAST_TICK=18
P3_SWINGS='[[4,"swing",2,2,"melee"],[7,"swing",5,5,"melee"],[14,"swing",4,4,"melee"],[17,"swing",1,1,"melee"]]'
P3_FAR_EAST_TILE='{"x":27,"y":9}'
P3_ESCAPE_TICK=3
P3_PANIC_LAST_TICK=11
P3_PANIC='[[4,"swing",2,2,"melee"],[9,"panic",25,25,"melee"]]'
P3_BOSS_TILE='{"x":20,"y":7}'
P3_BOSS_CLICK_TICK=2
P3_CLEAR='{"panel":{"lines":["Quadrant 1 cleared (interim end)","P3 time: 6 ticks (0:03.6)"],"buttons":["Repeat P3","Retry seed","Start P4"]},"tick":6,"bossHp":3937}'
P3_CHAIN_QUERY="?phase=p3&seed=1&invincible=on"
P3_CHAIN_LAST_TICK=91
P3_CHAIN='[[4,"swing"],[7,"swing"],[10,"shadow-slash"],[14,"swing"],[17,"swing"],[20,"shadow-slash"],[24,"spin"],[29,"last-saw"],[33,"swing"],[36,"swing"],[39,"shadow-slash"],[43,"swing"],[46,"swing"],[49,"shadow-slash"],[53,"untether"],[82,"slam"],[90,"swing"]]'
P3_START_P4='{"search":"?phase=p4&setup=ranged","bossHp":1312}'
PRESENT_QUERY="?seed=1&invincible=on"
PRESENT_RESIZED_VIEWPORT="1000 700"
PRESENT_DEVICE_SCALE=2
PRESENT_RESIZED_TILE='{"x":8,"y":3}'
PRESENT_SCALED_TILE='{"x":10,"y":1}'
PRESENT_CENTRE_TILE='{"x":5,"y":5}'
PRESENT_CENTRE_HALF_PX=30
PRESENT_LIT_LEVEL_SUM=30
PRESENT_DRAWN_MIN_SHARE=10
PRESENT_LOST_MAX_SHARE=5
PRESENT_LEVEL_TOLERANCE=2
PRESENT_MAX_OFF_SHARE=1
PRESENT_HOLD_MS=2000
PRESENT_LOST_MS=1500
PRESENT_CONTEXT_LOST_LOG="[osrs-sdk] WebGL context lost while rendering the 3D viewport"
PRESENT_FRAME_WAIT_LIMIT=120
PRESENT_WEBGL_HOOKS_JS='(() => { const contexts = []; window.__webglContexts = contexts; window.__webglClears = 0; for (const Canvas of [HTMLCanvasElement, OffscreenCanvas]) { const getContext = Canvas.prototype.getContext; Canvas.prototype.getContext = function (type, ...rest) { const context = getContext.call(this, type, ...rest); if (type === "webgl2" && context && !contexts.includes(context)) contexts.push(context); return context; }; } const clear = WebGL2RenderingContext.prototype.clear; WebGL2RenderingContext.prototype.clear = function (...args) { window.__webglClears++; return clear.apply(this, args); }; })();'
# Phase 4 as RuneLite fight logs recorded on 2026-10-23 show it: the lead-in, an orb taken by a player waiting on it, and a rift kill's reset.
RECORDED_LEAD_IN_QUERY="?seed=100"
RECORDED_RING_TILE='{"x":5,"y":3}'
RECORDED_BOSS_TILE='{"x":5,"y":5}'
RECORDED_LEAD_IN_SHOT_TICK=4
RECORDED_LEAD_IN_LAST_TICK=9
RECORDED_LEAD_IN_EXPECTED='{"states":[[0,"hidden"],[4,"present-damageable"],[8,"present-out-of-melee-reach"]],"judged":[[7,"passed",54]],"bossHp":[7,{"atBossStep":1312,"atPostTick":1258}]}'
RECORDED_ORB_QUERY="?seed=75&focus=lifeforce-orb"
RECORDED_ORB_TILE='{"x":9,"y":4}'
RECORDED_ORB_CLICK_TICK=12
RECORDED_ORB_LAST_TICK=25
RECORDED_ORB_EXPECTED='{"matured":[[24,{"x":9,"y":4}]],"returned":[[24,{"requested":49,"applied":49,"beforeHp":50,"afterHp":99}]]}'
RECORDED_RIFT_QUERY="?seed=1&focus=rifts&drillStart=cycle-start"
RECORDED_NORTH_EAST_RIFT='{"x":10,"y":2}'
RECORDED_NORTH_WEST_RIFT='{"x":2,"y":2}'
RECORDED_RIFT_FIRST_TICK=68
RECORDED_RIFT_SECOND_TICK=72
RECORDED_RIFT_LAST_TICK=79
RECORDED_RIFT_EXPECTED='{"hits":[[72,"rift-67-1","ranged",44],[76,"rift-67-0","ranged",44]],"destroyed":[[73,"rift-67-1",{"before":2,"after":0}],[77,"rift-67-0",{"before":2,"after":0}]]}'
CREDIT_LINE="Created using intellectual property belonging to Jagex Limited under the terms of Jagex's Fan Content Policy. This content is not endorsed by or affiliated with Jagex."

set +a

log() {
  echo "verify: $*"
  [[ -z "${UNIT_LOG:-}" ]] || echo "verify: $*" >>"$UNIT_LOG"
}

json() {
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let v=JSON.parse(s);for(const k of process.argv[1].split(".").filter(Boolean))v=v?.[k];process.stdout.write(typeof v==="string"?v:JSON.stringify(v))})' "$1"
}

ensure_deps() {
  scripts/install-beta-sdk.sh --check && return 0
  log "installing dependencies and the beta SDK"
  npm ci --no-audit --no-fund && scripts/install-beta-sdk.sh
}

manifest_ready() {
  node_modules/.bin/tsx src/assetBundle/check.ts
}

stage_build() {
  npm run build >"$VERIFY_DIR/build.log" 2>&1
}

stage_types() {
  npm run typecheck >"$VERIFY_DIR/types.log" 2>&1
}

stage_test() {
  npm test -- --reporter=default --reporter=json --outputFile.json="$VERIFY_DIR/vitest.json" >"$VERIFY_DIR/test.log" 2>&1 || return 1
  local total
  total="$(json numPassedTests <"$VERIFY_DIR/vitest.json")"
  log "vitest passed ${total} tests"
  [[ "$total" -gt 0 ]]
}

stage_assets() {
  local flags=(--cache-dir "$OSRS_CACHE_DIR" --reader-path "$OSRS_CACHE_READER")
  if manifest_ready >"$VERIFY_DIR/assets.log" 2>&1; then
    log "assets: public/osrs-assets already has every configured asset and sprite, skipping the model rebuild" | tee -a "$VERIFY_DIR/assets.log"
    npm run item-icons -- "${flags[@]}" >>"$VERIFY_DIR/assets.log" 2>&1
    return
  fi
  npm run assets -- "${flags[@]}" >>"$VERIFY_DIR/assets.log" 2>&1 && manifest_ready
}

stage_bundle() {
  manifest_ready >"$VERIFY_DIR/bundle.log" 2>&1 || { log "bundle: public/osrs-assets is stale or incomplete; scripts/verify.sh assets rebuilds it"; return 1; }
}

parity_fights() {
  PARITY_OUT="$1" node node_modules/.bin/vitest run --config test/parity/vitest.config.mts
}

stage_parity() {
  local base cache head="$VERIFY_DIR/parity/head.json" src="$VERIFY_DIR/parity/base-src"
  base="$(git rev-parse --verify "${VERIFY_PARITY_BASE:-$(git merge-base origin/main HEAD)}^{commit}")" || { log "parity: no base revision; set VERIFY_PARITY_BASE"; return 1; }
  local parity_hash
  parity_hash="$(cat test/parity/* | node -e 'const hash = require("node:crypto").createHash("sha256"); process.stdin.on("data", bytes => hash.update(bytes)); process.stdin.on("end", () => process.stdout.write(hash.digest("hex").slice(0, 12)));')" || return 1
  [[ "$parity_hash" =~ ^[a-f0-9]{12}$ ]] || { log "invalid parity fixture hash"; return 1; }
  cache="$ROOT/.verify/parity/${base}-${parity_hash}.json"
  mkdir -p "$VERIFY_DIR/parity" "$ROOT/.verify/parity"
  if [[ -f "$cache" ]]; then
    log "parity: base ${base} recorded in ${cache}"
  else
    log "parity: recording the seeded fights at base ${base}"
    mkdir -p "$src" && git archive "$base" | tar -x -C "$src" && cp -R test/parity "$src/test/" || { log "parity: the base tree could not be exported"; return 1; }
    if git diff --quiet "$base" -- package.json package-lock.json scripts/install-beta-sdk.sh; then
      ln -s "$ROOT/node_modules" "$src/node_modules"
    else
      log "parity: the base pins other dependencies; installing them"
      (cd "$src" && npm ci --no-audit --no-fund && scripts/install-beta-sdk.sh) >"$VERIFY_DIR/parity/base-install.log" 2>&1 || { log "parity: the base install failed"; return 1; }
    fi
    (cd "$src" && parity_fights "$cache.tmp") >"$VERIFY_DIR/parity/base.log" 2>&1 && mv "$cache.tmp" "$cache" || { log "parity: the base fights did not run; see ${VERIFY_DIR}/parity/base.log"; return 1; }
    rm -rf "$src"
  fi
  parity_fights "$head" >"$VERIFY_DIR/parity/head.log" 2>&1 || { log "parity: the head fights did not run; see ${VERIFY_DIR}/parity/head.log"; return 1; }
  node scripts/verify/parity.mjs "$cache" "$head" "$PARITY_EXPECTED" 2>&1 | tee "$VERIFY_DIR/parity/verdict.txt"
  return "${PIPESTATUS[0]}"
}

port_listener() {
  lsof -nP -iTCP:"$VERIFY_PORT" -sTCP:LISTEN -t 2>/dev/null
}

process_start() {
  ps -p "$1" -o lstart= 2>/dev/null
}

serve() {
  case "$VERIFY_PORT" in 8000 | 8001)
    log "port ${VERIFY_PORT} belongs to another trainer; refusing to use it"
    return 1
    ;;
  esac
  if [[ -f "$STATE_FILE" ]]; then
    log "an instance is already recorded in ${STATE_FILE}; run scripts/verify.sh stop first"
    return 1
  fi
  if [[ -n "$(port_listener)" ]]; then
    log "port ${VERIFY_PORT} is already in use by PID $(port_listener); not starting a second instance"
    return 1
  fi
  manifest_ready || { log "assets missing: run scripts/verify.sh assets"; return 1; }

  ARCHIVE_P2=on ARCHIVE_P3=on node node_modules/.bin/webpack serve --mode development --no-color --host 127.0.0.1 --port "$VERIFY_PORT" \
    >"$VERIFY_DIR/server.log" 2>&1 &
  local pid=$!
  LAUNCHED_PID=$pid
  printf 'pid=%s\nstarted=%s\nport=%s\nevidence=%s\nrevision=%s\n' \
    "$pid" "$(process_start "$pid")" "$VERIFY_PORT" "$VERIFY_DIR" "$(git rev-parse HEAD)" >"$STATE_FILE"
  cp "$STATE_FILE" "$VERIFY_DIR/server.pid"
  log "started dev server PID ${pid} on ${URL}"

  for _ in $(seq 1 120); do
    if curl -sf -o /dev/null "$URL" && grep -q "compiled successfully" "$VERIFY_DIR/server.log"; then
      return 0
    fi
    kill -0 "$pid" 2>/dev/null || { log "dev server exited; see ${VERIFY_DIR}/server.log"; return 1; }
    sleep 1
  done
  log "dev server did not become ready within 120s"
  return 1
}

state() {
  sed -n "s/^$1=//p" "$STATE_FILE"
}

doctor() {
  [[ -f "$STATE_FILE" ]] || { log "doctor: no recorded instance"; return 1; }
  local pid page manifest problems=0
  pid="$(state pid)"
  if [[ "$(process_start "$pid")" != "$(state started)" ]]; then
    log "doctor: recorded PID ${pid} is not running (or the PID was reused)"
    problems=1
  fi
  if [[ "$(port_listener)" != "$pid" ]]; then
    log "doctor: port $(state port) is held by '$(port_listener)', not the recorded PID ${pid}"
    problems=1
  fi
  if ! page="$(curl -sf "http://127.0.0.1:$(state port)/")"; then
    log "doctor: page request failed"
    problems=1
  elif ! grep -q "<title>Ezekiel Trainer</title>" <<<"$page"; then
    log "doctor: page title is not Ezekiel Trainer"
    problems=1
  fi
  if ! manifest="$(curl -sf "http://127.0.0.1:$(state port)/osrs-assets/manifest.json")"; then
    log "doctor: manifest request failed"
    problems=1
  elif ! grep -q "\"npc-${BOSS_NPC}\"" <<<"$manifest"; then
    log "doctor: served manifest has no npc-${BOSS_NPC}"
    problems=1
  fi
  if [[ "$(state revision)" != "$(git rev-parse HEAD)" ]] || [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
    log "doctor: served tree differs from HEAD $(git rev-parse --short HEAD) (started at $(state revision), or tracked files are modified)"
  fi
  [[ $problems -eq 0 ]] && log "doctor: instance PID ${pid} on port $(state port) is healthy"
  return $problems
}

stop() {
  [[ -f "$STATE_FILE" ]] || { log "stop: no recorded instance"; return 0; }
  local pid evidence port
  pid="$(state pid)"
  evidence="$(state evidence)"
  port="$(state port)"
  if [[ "$(process_start "$pid")" == "$(state started)" ]]; then
    kill "$pid"
    for _ in $(seq 1 20); do
      kill -0 "$pid" 2>/dev/null || break
      sleep 0.5
    done
  fi
  if kill -0 "$pid" 2>/dev/null && [[ "$(process_start "$pid")" == "$(state started)" ]]; then
    log "stop: PID ${pid} is still running"
    return 1
  fi
  rm "$STATE_FILE"
  log "stop: PID ${pid} is gone; evidence kept in ${evidence}" | tee -a "$evidence/cleanup.log"
  [[ -z "$(VERIFY_PORT=$port port_listener)" ]] || { log "stop: port ${port} is still held by $(VERIFY_PORT=$port port_listener)"; return 1; }
}

ab() {
  agent-browser --config "$ROOT/scripts/browser-muted.json" --session "$BROWSER_SESSION" "$@"
}

probe() {
  ab --json eval "window.__archiveOcellusProbe.$1" | json data.result
}

fight_tick_at_least() {
  ab wait --fn "(window.__archiveOcellusProbe?.snapshot().fight?.run.tick ?? -1) >= $1" --timeout "$2" >/dev/null
}

canvas_centre() {
  local box
  box="$(ab --json get box "#world")" || return 1
  CX=$(( $(json data.x <<<"$box") + $(json data.width <<<"$box") / 2 ))
  CY=$(( $(json data.y <<<"$box") + $(json data.height <<<"$box") / 2 ))
}

click_after_tick() {
  printf '[["wait","--fn","(window.__archiveOcellusProbe?.snapshot().fight?.run.tick ?? -1) >= %d","--timeout","90000"],["mouse","move","%d","%d"],["mouse","down","left"],["mouse","up","left"]]' \
    "$1" $((CX + $2)) $((CY + $3)) | ab batch --bail >/dev/null
}

shot_after_tick() {
  printf '[["wait","--fn","(window.__archiveOcellusProbe?.snapshot().fight?.run.tick ?? -1) >= %d","--timeout","30000"],["wait","%d"],["screenshot","%s"]]' \
    "$1" "$2" "$VERIFY_DIR/$3" | ab batch --bail >/dev/null
}

start_frame_clock() {
  ab eval "$(<scripts/verify/frame-clock.js)" >/dev/null
}

arm_shot() {
  ab eval "window.__frameClock.at({ kind: '$1', tick: $2, fraction: $3 }, { kind: 'shot', name: '$4' })" >/dev/null
}

take_shot() {
  local name=$1 tick=$2 taken
  ab wait --fn "typeof window.__frameClock.done['${name}']?.png === 'string'" --timeout 30000 >/dev/null || return 1
  taken="$(ab --json eval "window.__frameClock.done['${name}']" | node -e 'let s="";process.stdin.on("data",(d)=>s+=d).on("end",()=>{const { png, ...at } = JSON.parse(s).data.result;require("fs").writeFileSync(process.argv[1],Buffer.from(png.replace(/^data:image\/png;base64,/,""),"base64"));process.stdout.write(JSON.stringify(at))})' "$VERIFY_DIR/$name")" || return 1
  log "${name} copied at ${taken}"
  [[ "$(json tick <<<"$taken")" == "$tick" ]] || { log "${name} missed tick ${tick}"; return 1; }
}

save_settings() {
  ab eval "(() => { const key = '${SOUND_SETTINGS_KEY}', saved = JSON.parse(localStorage.getItem(key) ?? '{\"version\":1,\"values\":{}}'); saved.values = { ...saved.values, ...$1 }; localStorage.setItem(key, JSON.stringify(saved)); })()" >/dev/null
}

save_sound_settings() {
  save_settings "{ playsAudio: $1, playsAreaAudio: $1 }"
}

record_audio_starts() {
  start_frame_clock && ab eval "window.__frameClock.recordAudio()" >/dev/null
}

record_overhead_draws() {
  ab eval '(() => {
    const draws = {};
    window.__overheadDraws = draws;
    const tick = () => {
      const run = window.__archiveOcellusProbe?.snapshot().fight?.run;
      return run?.kind === "running" ? run.tick : null;
    };
    const at = (t) => (draws[t] ??= { frames: 0, sprites: [] });
    for (const context of [CanvasRenderingContext2D, OffscreenCanvasRenderingContext2D]) {
      const drawImage = context.prototype.drawImage;
      context.prototype.drawImage = function (image, ...rest) {
        const sprite = /\/sprites\/(\d+-\d+)\.png$/.exec(image?.src ?? "")?.[1];
        const t = sprite === undefined ? null : tick();
        if (t !== null && !at(t).sprites.includes(sprite)) at(t).sprites.push(sprite);
        return drawImage.call(this, image, ...rest);
      };
    }
    const frame = () => {
      const t = tick();
      if (t !== null) at(t).frames++;
      requestAnimationFrame(frame);
    };
    frame();
  })()' >/dev/null
}

step_on_marks() {
  local side="$1" mark
  shift
  for mark in "$@"; do
    click_after_tick $((mark - 1)) "$side" "$STEP_CLICK_DOWN_PX" || return 1
    side=$((-side))
  done
}

# The camera trails the player by about a tick, so side steps two ticks apart drift; a click past the north edge always stops on row 1.
step_south_and_back_on_marks() {
  local north=0 mark
  for mark in "$@"; do
    click_after_tick $((mark - 1)) 0 $((north * EDGE_CLICK_DOWN_PX)) || return 1
    north=$((1 - north))
  done
}

drive_walk() {
  local before after box cx cy credit
  before="$(probe "snapshot()")"
  echo "$before" >"$VERIFY_DIR/before.json"
  ab screenshot "$VERIFY_DIR/before.png" >/dev/null || { log "before screenshot failed"; return 1; }

  credit="$(ab --json get text "#credit_line" | json data.text)"
  [[ "$credit" == "$CREDIT_LINE" ]] || { log "credit line text differs: ${credit}"; return 1; }
  [[ "$(ab --json is visible "#credit_line" | json data.visible)" == "true" ]] || { log "credit line is not visible"; return 1; }

  box="$(ab --json get box "#world")"
  cx=$(( $(json data.x <<<"$box") + $(json data.width <<<"$box") / 2 - WALK_CLICK_LEFT_PX ))
  cy=$(( $(json data.y <<<"$box") + $(json data.height <<<"$box") / 2 - WALK_CLICK_UP_PX ))
  echo "{\"x\":${cx},\"y\":${cy}}" >"$VERIFY_DIR/click.json"
  ab mouse move "$cx" "$cy" >/dev/null && ab mouse down left >/dev/null && ab mouse up left >/dev/null || return 1

  ab wait --fn "(() => { const s = window.__archiveOcellusProbe.snapshot(), spawn = ${SPAWN_TILE}; return (s.player.x !== spawn.x || s.player.y !== spawn.y) && s.player.x === s.destination.x && s.player.y === s.destination.y; })()" \
    --timeout 15000 >/dev/null || log "player did not settle on a new tile after the click"
  after="$(probe "snapshot()")"
  echo "$after" >"$VERIFY_DIR/after.json"
  ab wait 1200 >/dev/null
  ab screenshot "$VERIFY_DIR/after.png" >/dev/null || { log "after screenshot failed"; return 1; }
}

click_past_the_edge() {
  canvas_centre || return 1
  click_at "$CX" $((CY + EDGE_CLICK_DOWN_PX)) || return 1
  ab wait --fn "(() => { const s = window.__archiveOcellusProbe.snapshot(), stop = ${EDGE_STOP_TILE}; return s.player.x === stop.x && s.player.y === stop.y; })()" \
    --timeout 15000 >/dev/null || log "player never stopped on the edge tile"
}

drive_edge() {
  local arrived
  click_past_the_edge || return 1
  echo "{\"x\":${CX},\"y\":$((CY + EDGE_CLICK_DOWN_PX))}" >"$VERIFY_DIR/edge-click.json"
  arrived="$(probe "snapshot()")"
  echo "$arrived" >"$VERIFY_DIR/edge-arrived.json"
  ab wait --fn "window.__archiveOcellusProbe.snapshot().tick >= $(json tick <<<"$arrived") + ${EDGE_HOLD_TICKS}" --timeout 15000 >/dev/null
  probe "snapshot()" >"$VERIFY_DIR/edge.json"
  ab screenshot "$VERIFY_DIR/edge.png" >/dev/null || { log "edge screenshot failed"; return 1; }
}

record_boss_bar() {
  ab eval '(() => {
    const bar = {};
    window.__bossBar = bar;
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...rest) {
      const t = /^\d+ \/ \d+ \(\d+\.\d%\)$/.test(String(text)) ? window.__archiveOcellusProbe?.snapshot().fight?.run.tick : undefined;
      if (t !== undefined && !(bar[t] ??= []).includes(String(text))) bar[t].push(String(text));
      return fillText.call(this, text, ...rest);
    };
  })()' >/dev/null
}

drive_lead_in() {
  record_boss_bar || { log "the boss bar probe was not installed"; return 1; }
  fight_tick_at_least 0 90000 || { log "the boss never took its first P4 step"; return 1; }
  ab screenshot "$VERIFY_DIR/hidden.png" >/dev/null || { log "lead-in screenshot failed"; return 1; }
  probe "snapshot()" >"$VERIFY_DIR/hidden.json"
}

drive_flood_shot() {
  local box cx cy
  fight_tick_at_least "$FLOOD_DAMAGE_TICK" 90000 || { log "the flood never reached P4 tick ${FLOOD_DAMAGE_TICK}"; return 1; }
  box="$(ab --json get box "#world")"
  cx=$(( $(json data.x <<<"$box") + $(json data.width <<<"$box") / 2 ))
  cy=$(( $(json data.y <<<"$box") + $(json data.height <<<"$box") / 2 ))
  echo "{\"x\":$((cx + BOSS_CLICK_RIGHT_PX)),\"y\":$((cy - BOSS_CLICK_UP_PX))}" >"$VERIFY_DIR/attack-click.json"
  click_at $((cx + BOSS_CLICK_RIGHT_PX)) $((cy - BOSS_CLICK_UP_PX)) || return 1
  ab wait --fn "window.__archiveOcellusProbe.log().rows.some((row) => row.tick >= ${FLOOD_DAMAGE_TICK} && row.combatDraws > 0)" \
    --timeout 15000 >/dev/null || log "the bow never fired across the flood"
  echo "{\"x\":$((cx + RING_CLICK_RIGHT_PX)),\"y\":$((cy - RING_CLICK_UP_PX))}" >"$VERIFY_DIR/ring-click.json"
  click_at $((cx + RING_CLICK_RIGHT_PX)) $((cy - RING_CLICK_UP_PX)) || return 1
  fight_tick_at_least "$FLOOD_RING_SCREENSHOT_TICK" 30000 || { log "the boss never stepped to P4 tick ${FLOOD_RING_SCREENSHOT_TICK}"; return 1; }
  ab screenshot "$VERIFY_DIR/flood-ring.png" >/dev/null || { log "flood screenshot failed"; return 1; }
}

drive_cycle() {
  local cx cy
  fight_tick_at_least 12 30000 || { log "the boss never stepped to P4 tick 12"; return 1; }
  ab screenshot "$VERIFY_DIR/boss.png" >/dev/null || { log "boss screenshot failed"; return 1; }
  ab --json eval "window.__bossBar" | json data.result >"$VERIFY_DIR/boss-bar.json" || { log "boss bar capture failed"; return 1; }
  canvas_centre || { log "canvas box unreadable"; return 1; }
  step_south_and_back_on_marks $EXPLOSION_INNER_MARKS || { log "the steps on the inner explosion marks were not clicked"; return 1; }
  click_after_tick "$SPECIAL_PRAY_TICK" "$PROTECT_MAGIC_RIGHT_PX" "$PROTECT_DOWN_PX" || { log "Protect from Magic was not clicked before the vortex"; return 1; }
  fight_tick_at_least "$CYCLE_RING_TICK" 60000 || { log "the boss never stepped to P4 tick ${CYCLE_RING_TICK}"; return 1; }
  cx=$((CX + RING_CLICK_RIGHT_PX))
  cy=$((CY - RING_CLICK_UP_PX))
  echo "{\"x\":${cx},\"y\":${cy}}" >"$VERIFY_DIR/cycle-ring-click.json"
  click_at "$cx" "$cy" || return 1
  step_on_marks "$STEP_CLICK_SIDE_PX" $EXPLOSION_OUTER_MARKS || { log "the steps on the outer explosion marks were not clicked"; return 1; }
  click_after_tick "$SPECIAL_RANGE_PRAY_TICK" "$PROTECT_RANGE_RIGHT_PX" "$PROTECT_DOWN_PX" || { log "Protect from Range was not clicked before the spike disk"; return 1; }
  fight_tick_at_least "$CYCLE_LAST_TICK" 90000 || { log "the boss never stepped to P4 tick ${CYCLE_LAST_TICK}"; return 1; }
  probe "snapshot()" >"$VERIFY_DIR/cycle-snapshot.json"
  probe "log()" >"$VERIFY_DIR/cycle.json"
  ab console >"$VERIFY_DIR/console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/page-errors.json" || { log "page error capture failed"; return 1; }
}

open_settings() {
  [[ "$(ab --json is visible "#settings_menu" | json data.visible)" == true ]] || ab click "#settings" >/dev/null || { log "the Settings button did not respond"; return 1; }
}

type_seed() {
  open_settings || return 1
  ab fill "#seed" "$1" >/dev/null || { log "the seed box did not take seed $1"; return 1; }
}

keep_seed() {
  open_settings || return 1
  type_seed "$(ab --json get value "#seed" | json data.value)"
}

choose_focus() {
  if [[ -n "${2:-}" ]]; then type_seed "$2"; else keep_seed; fi || return 1
  ab select "#focus" "$1" >/dev/null || { log "focus control did not accept $1"; return 1; }
  ab wait --fn "new URLSearchParams(location.search).get('focus') === '$1'" --timeout 30000 >/dev/null || { log "choosing $1 did not load focus=$1 without Restart"; return 1; }
}

drive_focus() {
  open_ticking "$DRILL_QUERY" || return 1
  choose_focus "$FOCUS_DRILL" || return 1
  ab wait --fn "window.__archiveOcellusProbe?.snapshot().fight?.run.kind === 'waiting'" --timeout 30000 >/dev/null || { log "the reloaded drill started before the audio probe could listen"; return 1; }
  record_audio_starts || { log "the audio probe was not installed"; return 1; }
  fight_tick_at_least "$FOCUS_LAST_TICK" 120000 || { log "the reloaded boss never stepped to P4 tick ${FOCUS_LAST_TICK}"; return 1; }
  probe "log()" >"$VERIFY_DIR/focus.json"
  ab --json eval "window.__frameClock.audio" | json data.result >"$VERIFY_DIR/focus-audio.json" || { log "audio capture failed"; return 1; }
  ab screenshot "$VERIFY_DIR/focus.png" >/dev/null || { log "focus screenshot failed"; return 1; }
  ab console >"$VERIFY_DIR/focus-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/focus-page-errors.json" || { log "page error capture failed"; return 1; }
}

drive_void_shot() {
  local box
  ab open "${URL}?seed=4&deflect=none&focus=${VOID_DRILL}" >/dev/null || return 1
  ab wait --fn "window.__archiveOcellusProbe?.snapshot().ticking === true && window.__archiveOcellusProbe.snapshot().tick >= 8" \
    --timeout 90000 >/dev/null || { log "the reloaded ${VOID_DRILL} drill never started ticking"; return 1; }
  box="$(ab --json get box "#world")"
  click_at $(( $(json data.x <<<"$box") + $(json data.width <<<"$box") / 2 - WALK_CLICK_LEFT_PX )) \
    $(( $(json data.y <<<"$box") + $(json data.height <<<"$box") / 2 - WALK_CLICK_UP_PX )) || return 1
  ab wait --fn "(() => { const p = window.__archiveOcellusProbe.snapshot().player, t = ${WALK_TARGET_TILE}; return p.x === t.x && p.y === t.y; })()" \
    --timeout 15000 >/dev/null || log "the player did not reach the walk target on the reloaded drill"
  ab wait 1200 >/dev/null
  click_past_the_edge || return 1
  drive_flood_shot || return 1
  fight_tick_at_least "$FLOOD_LAST_TICK" 30000 || { log "the reloaded drill never stepped to P4 tick ${FLOOD_LAST_TICK}"; return 1; }
  probe "log()" >"$VERIFY_DIR/void-shot.json"
  ab console >"$VERIFY_DIR/void-shot-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/void-shot-page-errors.json" || { log "page error capture failed"; return 1; }
}

click_at() {
  ab mouse move "$1" "$2" >/dev/null && ab mouse down left >/dev/null && ab mouse up left >/dev/null
}

click_inventory_slot() {
  click_at $((LOADOUT_SLOT_X + $1 % 4 * LOADOUT_SLOT_DX)) $((LOADOUT_SLOT_Y + $1 / 4 * LOADOUT_SLOT_DY))
}

glaives_landed() {
  ab wait --fn "window.__archiveOcellusProbe.log().rows.flatMap((row) => row.events).filter((event) => event.kind === 'player-hit-judged').length >= $1" \
    --timeout 15000 >/dev/null
}

drive_loadouts() {
  local slot box
  ab open "${URL}${LOADOUT_QUERY}" >/dev/null || return 1
  fight_tick_at_least 9 120000 || { log "the loadout drill never stepped to P4 tick 9"; return 1; }
  probe "snapshot().fight" >"$VERIFY_DIR/loadout-before.json"
  click_at "$LOADOUT_INVENTORY_TAB_X" "$LOADOUT_INVENTORY_TAB_Y" || return 1
  ab wait 600 >/dev/null
  ab screenshot "$VERIFY_DIR/loadout-ranged.png" >/dev/null || { log "ranged setup screenshot failed"; return 1; }
  probe "snapshot().icons" >"$VERIFY_DIR/icons.json"
  click_at "$LOADOUT_EQUIPMENT_TAB_X" "$LOADOUT_EQUIPMENT_TAB_Y" || return 1
  ab wait 600 >/dev/null
  ab screenshot "$VERIFY_DIR/equipment-ranged.png" >/dev/null || { log "ranged equipment tab screenshot failed"; return 1; }
  click_at "$LOADOUT_INVENTORY_TAB_X" "$LOADOUT_INVENTORY_TAB_Y" || return 1
  ab wait 600 >/dev/null

  for slot in $(seq $((LOADOUT_SPECIAL_SLOT + 1)) "$LOADOUT_SWITCHES"); do
    click_inventory_slot "$slot" || return 1
    ab wait 150 >/dev/null
  done
  ab wait 1200 >/dev/null
  probe "snapshot().fight" >"$VERIFY_DIR/loadout-after.json"
  ab screenshot "$VERIFY_DIR/loadout-melee.png" >/dev/null || { log "switched setup screenshot failed"; return 1; }

  click_inventory_slot "$LOADOUT_SPECIAL_SLOT" || return 1
  ab wait 700 >/dev/null
  click_at "$LOADOUT_SPECIAL_ORB_X" "$LOADOUT_SPECIAL_ORB_Y" || return 1
  box="$(ab --json get box "#world")"
  click_at $(( $(json data.x <<<"$box") + $(json data.width <<<"$box") / 2 + RISEN_BOSS_CLICK_RIGHT_PX )) \
    $(( $(json data.y <<<"$box") + $(json data.height <<<"$box") / 2 + RISEN_BOSS_CLICK_DOWN_PX )) || return 1
  ab wait --fn "window.__archiveOcellusProbe.snapshot().fight.player.specialEnergy < 100" --timeout 15000 >/dev/null || log "the special attack was not spent"
  glaives_landed 2 || log "the glaives never landed"
  probe "snapshot().fight" >"$VERIFY_DIR/loadout-spec.json"
  probe "log()" >"$VERIFY_DIR/loadout-spec-log.json"
  ab wait 1200 >/dev/null
  ab screenshot "$VERIFY_DIR/loadout-spec.png" >/dev/null || { log "special attack screenshot failed"; return 1; }
  click_at "$LOADOUT_EQUIPMENT_TAB_X" "$LOADOUT_EQUIPMENT_TAB_Y" || return 1
  ab wait 600 >/dev/null
  ab screenshot "$VERIFY_DIR/equipment-melee.png" >/dev/null || { log "equipment tab screenshot failed"; return 1; }
  ab console >"$VERIFY_DIR/loadout-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/loadout-page-errors.json" || { log "page error capture failed"; return 1; }

  keep_seed && ab select "#setup" melee >/dev/null && ab click "#restart" >/dev/null || { log "setup control did not accept melee"; return 1; }
  ab wait --fn "new URLSearchParams(location.search).get('setup') === 'melee'" --timeout 30000 >/dev/null || { log "restart did not load setup=melee"; return 1; }
  fight_tick_at_least 1 120000 || { log "the reloaded melee drill never stepped to P4 tick 1"; return 1; }
  probe "snapshot().fight" >"$VERIFY_DIR/loadout-selector.json"
  ab --json errors | json data.errors >"$VERIFY_DIR/loadout-selector-page-errors.json" || { log "page error capture failed"; return 1; }
}

drive_defence_floor() {
  local box
  ab open "${URL}${DEFENCE_FLOOR_QUERY}" >/dev/null || return 1
  fight_tick_at_least 9 120000 || { log "the defence floor drill never stepped to P4 tick 9"; return 1; }
  probe "snapshot().fight" >"$VERIFY_DIR/defence-floor-start.json"
  click_at "$LOADOUT_INVENTORY_TAB_X" "$LOADOUT_INVENTORY_TAB_Y" || return 1
  ab wait 600 >/dev/null
  click_inventory_slot "$LOADOUT_SPECIAL_SLOT" || return 1
  ab wait 700 >/dev/null
  click_at "$LOADOUT_SPECIAL_ORB_X" "$LOADOUT_SPECIAL_ORB_Y" || return 1
  box="$(ab --json get box "#world")"
  click_at $(( $(json data.x <<<"$box") + $(json data.width <<<"$box") / 2 + RISEN_BOSS_CLICK_RIGHT_PX )) \
    $(( $(json data.y <<<"$box") + $(json data.height <<<"$box") / 2 + RISEN_BOSS_CLICK_DOWN_PX )) || return 1
  ab wait --fn "window.__archiveOcellusProbe.snapshot().fight.player.specialEnergy === 50" --timeout 15000 >/dev/null || log "the first Division was not spent"
  click_at "$LOADOUT_SPECIAL_ORB_X" "$LOADOUT_SPECIAL_ORB_Y" || return 1
  glaives_landed 2 || log "the first Division's glaives never landed"
  probe "snapshot().fight" >"$VERIFY_DIR/defence-floor-first.json"
  glaives_landed 4 || log "the second Division's glaives never landed"
  probe "snapshot().fight" >"$VERIFY_DIR/defence-floor.json"
  probe "log()" >"$VERIFY_DIR/defence-floor-log.json"
  ab screenshot "$VERIFY_DIR/defence-floor.png" >/dev/null || { log "defence floor screenshot failed"; return 1; }
  ab console >"$VERIFY_DIR/defence-floor-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/defence-floor-page-errors.json" || { log "page error capture failed"; return 1; }
}

hover_inventory_slot() {
  ab mouse move $((LOADOUT_SLOT_X + $1 % 4 * LOADOUT_SLOT_DX)) $((LOADOUT_SLOT_Y + $1 / 4 * LOADOUT_SLOT_DY)) >/dev/null
}
right_click_inventory_slot() {
  ab mouse move $((LOADOUT_SLOT_X + $1 % 4 * LOADOUT_SLOT_DX)) $((LOADOUT_SLOT_Y + $1 / 4 * LOADOUT_SLOT_DY)) >/dev/null && ab mouse down right >/dev/null && ab mouse up right >/dev/null
}

drive_supplies() {
  ab open "${URL}${SUPPLY_QUERY}" >/dev/null || return 1
  fight_tick_at_least 1 120000 || { log "the supplies drill never stepped to P4 tick 1"; return 1; }
  click_at "$LOADOUT_INVENTORY_TAB_X" "$LOADOUT_INVENTORY_TAB_Y" || return 1
  ab wait 600 >/dev/null
  probe "snapshot().fight.player.inventory" >"$VERIFY_DIR/supplies-inventory.json"
  right_click_inventory_slot "$SUPPLY_NAMED_SLOT" || return 1
  ab wait 300 >/dev/null
  probe "snapshot().menu" >"$VERIFY_DIR/item-menu.json"
  ab screenshot "$VERIFY_DIR/item-menu.png" >/dev/null || { log "item menu screenshot failed"; return 1; }
  canvas_centre || { log "canvas box unreadable"; return 1; }
  ab mouse move "$CX" "$CY" >/dev/null && ab wait 200 >/dev/null || return 1
  probe "snapshot().menu" >"$VERIFY_DIR/item-menu-closed.json"
  probe "snapshot().fight.run.tick" >"$VERIFY_DIR/brew-click.json"
  click_inventory_slot "$SUPPLY_BREW_SLOT" || return 1
  ab wait --fn "window.__archiveOcellusProbe.log().rows.some((row) => row.playerAtPostTick.hp > 99)" --timeout 15000 >/dev/null || log "the brew never raised the player's hitpoints"
  probe "log().rows.map((row) => [row.tick, row.playerAtPostTick.hp])" >"$VERIFY_DIR/brew-hp.json"
  ab wait 600 >/dev/null
  ab screenshot "$VERIFY_DIR/brew-heal.png" >/dev/null || { log "brew screenshot failed"; return 1; }
  ab console >"$VERIFY_DIR/supplies-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/supplies-page-errors.json" || { log "page error capture failed"; return 1; }
}

bind_inventory_key() {
  open_settings && ab click "#keybinds" >/dev/null && ab wait 300 >/dev/null && click_at "$KEYBIND_INVENTORY_BUTTON_X" "$KEYBIND_INVENTORY_BUTTON_Y" && ab press "$1" >/dev/null && ab wait 300 >/dev/null
}

drive_keybinds() {
  ab open "${URL}${SUPPLY_QUERY}" >/dev/null || return 1
  fight_tick_at_least 1 120000 || { log "the keybinds drill never stepped to P4 tick 1"; return 1; }
  click_at "$LOADOUT_INVENTORY_TAB_X" "$LOADOUT_INVENTORY_TAB_Y" && ab wait 600 >/dev/null || return 1
  hover_inventory_slot "$SUPPLY_BREW_SLOT" && ab wait 200 >/dev/null || return 1
  open_settings && ab click "#keybinds" >/dev/null && ab wait 300 >/dev/null || { log "the Keybinds button did not respond"; return 1; }
  probe "snapshot().panel" >"$VERIFY_DIR/keybinds-open.json"
  ab screenshot "$VERIFY_DIR/keybinds.png" >/dev/null || { log "key bindings screenshot failed"; return 1; }
  bind_inventory_key "$KEYBIND_NEW_KEY" || { log "the inventory key was not bound"; return 1; }
  probe "snapshot().panel" >"$VERIFY_DIR/keybinds-bound.json"
  ab --json eval "localStorage.getItem('${SOUND_SETTINGS_KEY}')" | json data.result >"$VERIFY_DIR/keybinds-saved.json" || { log "saved settings capture failed"; return 1; }
  ab open "${URL}${SUPPLY_QUERY}" >/dev/null || return 1
  fight_tick_at_least 1 120000 || { log "the reloaded drill never stepped to P4 tick 1"; return 1; }
  ab press "$KEYBIND_DEFAULT_KEY" >/dev/null && ab wait 300 >/dev/null || return 1
  probe "snapshot().panel" >"$VERIFY_DIR/keybinds-old-key.json"
  ab press "$KEYBIND_NEW_KEY" >/dev/null && ab wait 300 >/dev/null || return 1
  probe "snapshot().panel" >"$VERIFY_DIR/keybinds-reloaded.json"
  ab screenshot "$VERIFY_DIR/keybinds-reloaded.png" >/dev/null || { log "reloaded key screenshot failed"; return 1; }
  bind_inventory_key "$KEYBIND_DEFAULT_KEY" || { log "the default inventory key was not restored"; return 1; }
  probe "snapshot().panel" >"$VERIFY_DIR/keybinds-restored.json"
  ab console >"$VERIFY_DIR/keybinds-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/keybinds-page-errors.json" || { log "page error capture failed"; return 1; }
}

seed_run() {
  local box seed search
  open_settings || return 1
  box="$(ab --json get value "#seed" | json data.value)" || return 1
  seed="$(probe "log().header.seed")" || return 1
  search="$(ab --json eval "location.search" | json data.result)" || return 1
  node -e 'console.log(JSON.stringify({ box: process.argv[1], seed: Number(process.argv[2]), search: process.argv[3] }))' "$box" "$seed" "$search"
}

restart_run() {
  local loaded
  loaded="$(ab --json eval "performance.timeOrigin" | json data.result)" || return 1
  ab click "#restart" >/dev/null || return 1
  ab wait --fn "performance.timeOrigin !== ${loaded} && (window.__archiveOcellusProbe?.snapshot().fight?.run.tick ?? -1) >= 0" --timeout 120000 >/dev/null || { log "Restart never loaded a new run"; return 1; }
}

drive_seed() {
  local fresh restarted typed
  ab open "$URL" >/dev/null || return 1
  fight_tick_at_least 0 120000 || { log "the unseeded run never took its first P4 step"; return 1; }
  fresh="$(seed_run)" || return 1
  ab screenshot "$VERIFY_DIR/seed-fresh.png" >/dev/null || { log "fresh seed screenshot failed"; return 1; }
  restart_run || return 1
  restarted="$(seed_run)" || return 1
  ab fill "#seed" "$(json box <<<"$fresh")" >/dev/null || { log "the seed box did not take the typed seed"; return 1; }
  restart_run || return 1
  typed="$(seed_run)" || return 1
  echo "{\"fresh\":${fresh},\"restarted\":${restarted},\"typed\":${typed}}" >"$VERIFY_DIR/seed.json"
  ab screenshot "$VERIFY_DIR/seed.png" >/dev/null || { log "typed seed screenshot failed"; return 1; }
  ab console >"$VERIFY_DIR/seed-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/seed-page-errors.json" || { log "page error capture failed"; return 1; }
}

wait_until_ticking() {
  ab wait --fn "window.__archiveOcellusProbe?.snapshot().ticking === true && window.__archiveOcellusProbe.snapshot().tick >= 8" --timeout 90000 >/dev/null || { log "the drill never started ticking"; return 1; }
}

open_ticking() {
  ab open "${URL}$1" >/dev/null && wait_until_ticking
}

tile_pixel() {
  local page="$1" tile="$2" after="$3" read
  # The eval reads the first frame of tick $after so the next click lands in that tick; it stays under agent-browser's 25 s timeout.
  [[ "$after" == now ]] || fight_tick_at_least $((after - 1)) 90000 || { log "${page}: the fight never reached P4 tick $((after - 1))"; return 1; }
  read="$(ab --json eval "new Promise((done) => {
    const probe = window.__archiveOcellusProbe, ready = () => '${after}' === 'now' || (probe.snapshot().fight?.run.tick ?? -1) >= Number('${after}');
    const read = () => {
      if (!ready()) return requestAnimationFrame(read);
      const at = probe.tileCentre(${tile}), box = document.querySelector('#world').getBoundingClientRect();
      done({ at: at && { x: Math.round(box.x + at.x), y: Math.round(box.y + at.y) }, orders: probe.log().rows.flatMap((row) => row.inputs).filter((i) => i.kind === 'walk-ordered').length });
    };
    read();
  })" | json data.result)" || { log "${page}: tile ${tile} was not read"; return 1; }
  [[ "$(json at <<<"$read")" != null ]] || { log "${page}: tile ${tile} is not on the canvas"; return 1; }
  CLICK_X="$(json at.x <<<"$read")" CLICK_Y="$(json at.y <<<"$read")" WALK_ORDERS="$(json orders <<<"$read")"
}

click_tile() {
  local page="$1" tile="$2" modifier="${4:-none}"
  tile_pixel "$page" "$tile" "$3" || return 1
  case "$modifier" in
    none) printf '[["mouse","move","%d","%d"],["mouse","down","left"],["mouse","up","left"]]' "$CLICK_X" "$CLICK_Y" | ab batch --bail >/dev/null ;;
    control) control_click_at "$CLICK_X" "$CLICK_Y" ;;
  esac || { log "${page}: the click on ${tile} was not sent"; return 1; }
  ab wait --fn "window.__archiveOcellusProbe.log().rows.flatMap((row) => row.inputs).filter((i) => i.kind === 'walk-ordered').length > ${WALK_ORDERS}" --timeout 5000 >/dev/null ||
    log "${page}: the click on ${tile} ordered no walk"
  ab --json eval "(() => {
    const orders = window.__archiveOcellusProbe.log().rows.flatMap((row) => row.inputs).filter((i) => i.kind === 'walk-ordered');
    return { page: '${page}', tile: ${tile}, at: { x: ${CLICK_X}, y: ${CLICK_Y} }, ordered: orders[${WALK_ORDERS}]?.destination ?? null };
  })()" | json data.result >>"$VERIFY_DIR/tile-clicks.jsonl" && echo >>"$VERIFY_DIR/tile-clicks.jsonl"
}

walk_to_tile() {
  click_tile "$1" "$2" now "${4:-none}" || return 1
  ab wait --fn "(() => { const s = window.__archiveOcellusProbe.snapshot(), to = $3; return s.player.x === to.x && s.player.y === to.y; })()" \
    --timeout 15000 >/dev/null || log "player never stood on $3"
}

drive_walkway() {
  local arrived
  ab open "${URL}${WALKWAY_QUERY}" >/dev/null && wait_until_ticking || return 1
  walk_to_tile walkway "$WALKWAY_ORDER_TILE" "$WALKWAY_STOP_TILE" || return 1
  echo "{\"x\":${CLICK_X},\"y\":${CLICK_Y}}" >"$VERIFY_DIR/walkway-click.json"
  arrived="$(probe "snapshot()")"
  echo "$arrived" >"$VERIFY_DIR/walkway-arrived.json"
  ab wait --fn "window.__archiveOcellusProbe.snapshot().tick >= $(json tick <<<"$arrived") + ${EDGE_HOLD_TICKS}" --timeout 15000 >/dev/null
  probe "snapshot()" >"$VERIFY_DIR/walkway.json"
  probe "log()" >"$VERIFY_DIR/walkway-log.json"
  ab screenshot "$VERIFY_DIR/walkway.png" >/dev/null || { log "walkway screenshot failed"; return 1; }
  ab console >"$VERIFY_DIR/walkway-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/walkway-page-errors.json" || { log "page error capture failed"; return 1; }
  ab open "${URL}${WALKWAY_QUERY}" >/dev/null && wait_until_ticking || return 1
  walk_to_tile walkway-run-end "$WALKWAY_RUN_END_TILE" "$WALKWAY_RUN_END_TILE" || return 1
  arrived="$(probe "snapshot()")"
  ab wait --fn "window.__archiveOcellusProbe.snapshot().tick >= $(json tick <<<"$arrived") + ${EDGE_HOLD_TICKS}" --timeout 15000 >/dev/null
  probe "snapshot()" >"$VERIFY_DIR/walkway-run-end.json"
  probe "log()" >"$VERIFY_DIR/walkway-run-end-log.json"
  ab screenshot "$VERIFY_DIR/walkway-run-end.png" >/dev/null || { log "walkway run end screenshot failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/walkway-run-end-page-errors.json" || { log "page error capture failed"; return 1; }
}

# agent-browser's mouse commands take no modifier keys, so the Control-click goes through CDP's Input domain as they do.
control_click_at() {
  local cdp
  cdp="$(ab get cdp-url)" || return 1
  node -e '
    const [cdp, page, x, y, modifiers] = process.argv.slice(1);
    const socket = new WebSocket(cdp);
    let id = 0;
    const pending = new Map();
    const send = (method, params, sessionId) =>
      new Promise((resolve, reject) => {
        pending.set(++id, (reply) => (reply.error ? reject(new Error(`${method}: ${reply.error.message}`)) : resolve(reply.result)));
        socket.send(JSON.stringify({ id, method, params, sessionId }));
      });
    socket.onmessage = ({ data }) => {
      const reply = JSON.parse(data);
      pending.get(reply.id)?.(reply);
      pending.delete(reply.id);
    };
    socket.onopen = async () => {
      try {
        const pages = (await send("Target.getTargets", {})).targetInfos.filter((t) => t.type === "page" && t.url.startsWith(page));
        if (pages.length !== 1) throw new Error(`expected one page at ${page}, found ${pages.length}`);
        const { sessionId } = await send("Target.attachToTarget", { targetId: pages[0].targetId, flatten: true });
        const at = { x: Number(x), y: Number(y), modifiers: Number(modifiers) };
        await send("Input.dispatchMouseEvent", { ...at, type: "mouseMoved" }, sessionId);
        await send("Input.dispatchMouseEvent", { ...at, type: "mousePressed", button: "left", buttons: 1, clickCount: 1 }, sessionId);
        await send("Input.dispatchMouseEvent", { ...at, type: "mouseReleased", button: "left", buttons: 0, clickCount: 1 }, sessionId);
        process.exit(0);
      } catch (error) {
        console.error(`verify: ${error.message}`);
        process.exit(1);
      }
    };
  ' "$cdp" "$URL" "$1" "$2" "$CONTROL_MODIFIER"
}

drive_control_walk() {
  ab open "${URL}${WALKWAY_QUERY}" >/dev/null && wait_until_ticking && canvas_centre || return 1
  ab eval '(() => { window.__contextMenus = 0; document.querySelector("#world").addEventListener("contextmenu", () => window.__contextMenus++); return true; })()' >/dev/null || return 1
  click_tile control-walk "$WALKWAY_ORDER_TILE" now control || return 1
  ab wait --fn "window.__archiveOcellusProbe.snapshot().player.x >= 8" --timeout 15000 >/dev/null || log "player never passed x 8 after the Control-click"
  ab screenshot "$VERIFY_DIR/control-walk.png" >/dev/null || { log "control walk screenshot failed"; return 1; }
  ab wait --fn "(() => { const s = window.__archiveOcellusProbe.snapshot(), to = ${WALKWAY_STOP_TILE}; return s.player.x === to.x && s.player.y === to.y; })()" \
    --timeout 15000 >/dev/null || log "player never stood on ${WALKWAY_STOP_TILE} after the Control-click"
  ab --json eval '({ platform: navigator.platform, contextMenus: window.__contextMenus, menu: window.__archiveOcellusProbe.snapshot().menu })' | json data.result >"$VERIFY_DIR/control-walk-menu.json"
  probe "log()" >"$VERIFY_DIR/control-walk-log.json"
  ab mouse move $((CX - WALK_CLICK_LEFT_PX)) $((CY - WALK_CLICK_UP_PX)) >/dev/null && ab mouse down right >/dev/null && ab mouse up right >/dev/null || return 1
  ab wait 300 >/dev/null
  probe "snapshot().menu" >"$VERIFY_DIR/control-walk-right-click.json"
  ab console >"$VERIFY_DIR/control-walk-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/control-walk-page-errors.json" || { log "page error capture failed"; return 1; }
}

click_twice_in_one_tick() {
  local first=($1) last=($2)
  ab eval "(() => {
    const clock = window.__frameClock, tick = window.__archiveOcellusProbe.snapshot().tick + 1;
    clock.at({ kind: 'world', tick, fraction: ${CORRECTION_FIRST_MS} / clock.tickMs }, { kind: 'click', name: 'correction-first', x: ${first[0]}, y: ${first[1]} });
    clock.at({ kind: 'world', tick, fraction: ${CORRECTION_LATE_MS} / clock.tickMs }, { kind: 'click', name: 'correction-last', x: ${last[0]}, y: ${last[1]} });
  })()" >/dev/null && ab wait --fn "window.__frameClock.done['correction-last'] !== undefined" --timeout 10000 >/dev/null
}

drive_click_correction() {
  local first last attempt downs
  for attempt in $(seq 1 "$CORRECTION_ATTEMPTS"); do
    ab open "${URL}${WALKWAY_QUERY}" >/dev/null && wait_until_ticking || return 1
    start_frame_clock || { log "the frame clock was not installed"; return 1; }
    tile_pixel correction "$CORRECTION_FIRST_TILE" now || return 1
    first="$CLICK_X $CLICK_Y"
    tile_pixel correction "$CORRECTION_LAST_TILE" now || return 1
    last="$CLICK_X $CLICK_Y"
    ab eval '(() => {
      const downs = window.__correctionDowns = [];
      document.querySelector("#world").addEventListener("mousedown", () => {
        const tick = window.__archiveOcellusProbe.snapshot().tick;
        downs.push({ tick, intoTickMs: Math.round(performance.now() - window.__frameClock.starts.world[tick]) });
      }, true);
    })()' >/dev/null || return 1
    click_twice_in_one_tick "$first" "$last" || { log "the two correction clicks were not sent"; return 1; }
    downs="$(ab --json eval "window.__correctionDowns" | json data.result)" || return 1
    [[ "$(json '0.tick' <<<"$downs")" == "$(json '1.tick' <<<"$downs")" ]] && break
    log "correction attempt ${attempt}: the second click fell after the tick boundary (${downs}); reloading"
  done
  ab wait --fn "window.__archiveOcellusProbe.snapshot().tick >= window.__correctionDowns[0].tick + 4" --timeout 15000 >/dev/null || return 1
  ab --json eval '(() => {
    const rows = window.__archiveOcellusProbe.log().rows, ordered = rows.filter((row) => row.inputs.some((input) => input.kind === "walk-ordered"));
    const at = rows.indexOf(ordered[0]);
    return {
      downs: window.__correctionDowns,
      orderRows: ordered.map((row) => ({ worldTick: row.worldTick, orders: row.inputs.filter((input) => input.kind === "walk-ordered").map((input) => input.destination) })),
      tiles: at < 0 ? [] : rows.slice(at, at + 3).map((row) => row.playerAtPostTick.tile),
    };
  })()' | json data.result >"$VERIFY_DIR/click-correction.json" || return 1
  ab screenshot "$VERIFY_DIR/click-correction.png" >/dev/null || { log "click correction screenshot failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/click-correction-page-errors.json" || { log "page error capture failed"; return 1; }
}

top_down_view() {
  local step
  ab mouse move "$CX" $((CY - BACK_WALL_TOP_DOWN_DRAG_PX / 2)) >/dev/null && ab mouse down middle >/dev/null || return 1
  for step in 1 2 3 4 5 6; do
    ab mouse move "$CX" $((CY - BACK_WALL_TOP_DOWN_DRAG_PX / 2 + step * BACK_WALL_TOP_DOWN_DRAG_PX / 6)) >/dev/null || return 1
  done
  ab mouse up middle >/dev/null && ab wait "$CAMERA_SETTLE_MS" >/dev/null
}

drive_back_wall() {
  ab open "${URL}${WALKWAY_QUERY}" >/dev/null && wait_until_ticking && canvas_centre || return 1
  walk_to_tile back-wall-view "$BACK_WALL_START_TILE" "$BACK_WALL_START_TILE" || return 1
  top_down_view || return 1
  ab screenshot "$VERIFY_DIR/back-wall-top-down.png" >/dev/null || { log "back wall screenshot failed"; return 1; }
  ab open "${URL}${WALKWAY_QUERY}" >/dev/null && wait_until_ticking || return 1
  walk_to_tile back-wall "$BACK_WALL_START_TILE" "$BACK_WALL_START_TILE" || return 1
  ab wait "$CAMERA_SETTLE_MS" >/dev/null
  walk_to_tile back-wall-toward "$BACK_WALL_END_TILE" "$BACK_WALL_END_TILE" control || return 1
  ab wait "$CAMERA_SETTLE_MS" >/dev/null
  walk_to_tile back-wall-back "$BACK_WALL_START_TILE" "$BACK_WALL_START_TILE" control || return 1
  probe "log()" >"$VERIFY_DIR/back-wall-log.json"
  top_down_view || return 1
  ab screenshot "$VERIFY_DIR/back-wall-flood.png" >/dev/null || { log "back wall flood screenshot failed"; return 1; }
  ab console >"$VERIFY_DIR/back-wall-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/back-wall-page-errors.json" || { log "page error capture failed"; return 1; }
}

drive_corner() {
  local step
  ab open "${URL}${CORNER_QUERY}" >/dev/null && wait_until_ticking && canvas_centre || return 1
  walk_to_tile corner-hole "$CORNER_HOLE_TILE" "$CORNER_HOLE_TILE" || return 1
  probe "snapshot()" >"$VERIFY_DIR/corner-hole.json"
  probe "log()" >"$VERIFY_DIR/corner-hole-log.json"
  ab wait 1000 >/dev/null && ab screenshot "$VERIFY_DIR/corner-hole.png" >/dev/null || { log "corner screenshot failed"; return 1; }
  ab open "${URL}${CORNER_QUERY}" >/dev/null && wait_until_ticking || return 1
  walk_to_tile corner-nub "$CORNER_NUB_TILE" "$CORNER_NUB_TILE" || return 1
  probe "snapshot()" >"$VERIFY_DIR/corner-nub.json"
  probe "log()" >"$VERIFY_DIR/corner-nub-log.json"
  ab console >"$VERIFY_DIR/corner-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/corner-page-errors.json" || { log "page error capture failed"; return 1; }
  ab open "${URL}${CORNER_QUERY}" >/dev/null && wait_until_ticking || return 1
  walk_to_tile corner-view "$CORNER_VIEW_TILE" "$CORNER_VIEW_TILE" || return 1
  ab mouse move "$CX" $((CY + 100)) >/dev/null && ab mouse down middle >/dev/null || return 1
  for step in 1 2 3 4 5; do
    ab mouse move $((CX - step * CORNER_VIEW_DRAG_LEFT_PX / 5)) $((CY + 100)) >/dev/null || return 1
  done
  ab mouse up middle >/dev/null && ab wait 1500 >/dev/null || return 1
  ab screenshot "$VERIFY_DIR/corner-view.png" >/dev/null || { log "corner view screenshot failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/corner-view-page-errors.json" || { log "page error capture failed"; return 1; }
}

drive_boss_pathing() {
  ab open "${URL}${PATHING_QUERY}" >/dev/null && fight_tick_at_least 0 120000 || return 1
  walk_to_tile pathing "$PATHING_WEST_TILE" "$PATHING_WEST_TILE" || return 1
  click_tile pathing "$PATHING_EAST_TILE" "$PATHING_UNDER_TICK" || return 1
  click_tile pathing "$PATHING_BACK_TILE" "$PATHING_AROUND_TICK" || return 1
  shot_after_tick $((PATHING_AROUND_TICK + 2)) 300 pathing-around.png || { log "the pathing drill never reached P4 tick $((PATHING_AROUND_TICK + 2))"; return 1; }
  fight_tick_at_least "$PATHING_LAST_TICK" 30000 || { log "the pathing drill never stepped to P4 tick ${PATHING_LAST_TICK}"; return 1; }
  probe "log()" >"$VERIFY_DIR/pathing.json"
  ab console >"$VERIFY_DIR/pathing-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/pathing-page-errors.json" || { log "page error capture failed"; return 1; }
  ab open "${URL}${PATHING_QUERY}" >/dev/null && fight_tick_at_least 0 120000 || return 1
  click_tile pathing-reroute "$PATHING_EDGE_TILE" "$PATHING_REROUTE_TICK" || return 1
  fight_tick_at_least $((PATHING_REROUTE_TICK + 4)) 30000 || { log "the reroute drill never stepped to P4 tick $((PATHING_REROUTE_TICK + 4))"; return 1; }
  probe "log()" >"$VERIFY_DIR/pathing-reroute.json"
  ab console >"$VERIFY_DIR/pathing-reroute-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/pathing-reroute-page-errors.json" || { log "page error capture failed"; return 1; }
  ab open "${URL}${PATHING_QUERY}" >/dev/null && fight_tick_at_least 0 120000 || return 1
  click_tile pathing-control "$PATHING_EDGE_TILE" "$PATHING_REROUTE_TICK" control || return 1
  fight_tick_at_least $((PATHING_REROUTE_TICK + 4)) 30000 || { log "the Control-click reroute drill never stepped to P4 tick $((PATHING_REROUTE_TICK + 4))"; return 1; }
  probe "log()" >"$VERIFY_DIR/pathing-control.json"
  ab console >"$VERIFY_DIR/pathing-control-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/pathing-control-page-errors.json" || { log "page error capture failed"; return 1; }
  ab open "${URL}${PATHING_QUERY}" >/dev/null && fight_tick_at_least 0 120000 || return 1
  walk_to_tile pathing-out "$PATHING_UNDER_TILE" "$PATHING_UNDER_TILE" || return 1
  click_tile pathing-out "$PATHING_OUT_TILE" "$PATHING_OUT_TICK" || return 1
  shot_after_tick $((PATHING_OUT_TICK + 1)) 300 pathing-out.png || { log "the walk-out drill never reached P4 tick $((PATHING_OUT_TICK + 1))"; return 1; }
  fight_tick_at_least $((PATHING_OUT_TICK + 4)) 30000 || { log "the walk-out drill never stepped to P4 tick $((PATHING_OUT_TICK + 4))"; return 1; }
  probe "log()" >"$VERIFY_DIR/pathing-out.json"
  ab console >"$VERIFY_DIR/pathing-out-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/pathing-out-page-errors.json" || { log "page error capture failed"; return 1; }
}

drive_floor_holes() {
  ab open "${URL}${HOLES_QUERY}" >/dev/null && wait_until_ticking || return 1
  ab wait 1200 >/dev/null && ab screenshot "$VERIFY_DIR/holes-drawn.png" >/dev/null || { log "holes screenshot failed"; return 1; }
  shot_after_tick "$HOLE_FLOOD_SHOT_TICK" 300 holes-flood.png || { log "the holes drill never reached P4 tick ${HOLE_FLOOD_SHOT_TICK}"; return 1; }
  walk_to_tile holes "$HOLE_TILE" "$HOLE_TILE" || return 1
  echo "{\"x\":${CLICK_X},\"y\":${CLICK_Y}}" >"$VERIFY_DIR/hole-click.json"
  ab wait --fn "window.__archiveOcellusProbe.log().rows.flatMap((row) => row.events).filter((e) => e.kind === 'hole-hit').length >= ${HOLE_HITS}" \
    --timeout 15000 >/dev/null || log "the player on the hole never took ${HOLE_HITS} hits"
  ab screenshot "$VERIFY_DIR/hole-hit.png" >/dev/null || { log "hole hit screenshot failed"; return 1; }
  probe "log()" >"$VERIFY_DIR/holes.json"
  ab console >"$VERIFY_DIR/holes-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/holes-page-errors.json" || { log "page error capture failed"; return 1; }
}

drive_orb_off_holes() {
  ab open "${URL}${ORB_HOLES_QUERY}" >/dev/null && wait_until_ticking || return 1
  shot_after_tick "$ORB_HOLES_SHOT_TICK" 300 orb-off-holes.png || { log "the full fight never reached P4 tick ${ORB_HOLES_SHOT_TICK}"; return 1; }
  probe "log()" >"$VERIFY_DIR/orb-off-holes.json"
  ab console >"$VERIFY_DIR/orb-off-holes-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/orb-off-holes-page-errors.json" || { log "page error capture failed"; return 1; }
}

drive_orb_late_and_entry() {
  ab open "${URL}?seed=${ORB_SEED}&focus=${ORB_DRILL}" >/dev/null && wait_until_ticking && canvas_centre || return 1
  shot_after_tick "$ORB_LATE_SHOT_TICK" 300 orb-late.png || { log "the orb drill never reached P4 tick ${ORB_LATE_SHOT_TICK}"; return 1; }
  click_at $((CX + ORB_CLICK_RIGHT_PX)) $((CY - ORB_CLICK_UP_PX)) || return 1
  fight_tick_at_least "$ORB_LATE_LAST_TICK" 30000 || { log "the orb drill never stepped to P4 tick ${ORB_LATE_LAST_TICK}"; return 1; }
  probe "log()" >"$VERIFY_DIR/orb-late.json"
  ab --json errors | json data.errors >"$VERIFY_DIR/orb-late-page-errors.json" || { log "page error capture failed"; return 1; }

  ab open "${URL}?seed=${ORB_SEED}&focus=${ORB_DRILL}" >/dev/null && wait_until_ticking && canvas_centre || return 1
  click_after_tick "$ORB_ENTRY_CLICK_TICK" "$ORB_ENTRY_CLICK_RIGHT_PX" "-$ORB_ENTRY_CLICK_UP_PX" || { log "the walk into the 5x5 was not clicked"; return 1; }
  shot_after_tick "$ORB_ENTRY_LAST_TICK" 300 orb-entry.png || { log "the orb drill never reached P4 tick ${ORB_ENTRY_LAST_TICK}"; return 1; }
  probe "log()" >"$VERIFY_DIR/orb-entry.json"
  ab console >"$VERIFY_DIR/orb-entry-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/orb-entry-page-errors.json" || { log "page error capture failed"; return 1; }
}

drive_void_floor() {
  open_ticking "$DRILL_QUERY" || return 1
  choose_focus "$VOID_DRILL" || return 1
  fight_tick_at_least "$VOID_INNER_SHOT_TICK" 120000 || { log "the reloaded boss never stepped to P4 tick ${VOID_INNER_SHOT_TICK}"; return 1; }
  ab screenshot "$VERIFY_DIR/void-inner.png" >/dev/null || { log "inner void screenshot failed"; return 1; }
  fight_tick_at_least "$VOID_FLOOD_SHOT_TICK" 60000 || { log "the reloaded boss never stepped to P4 tick ${VOID_FLOOD_SHOT_TICK}"; return 1; }
  ab screenshot "$VERIFY_DIR/void-flood.png" >/dev/null || { log "flood screenshot failed"; return 1; }
  ab wait --fn "window.__archiveOcellusProbe.snapshot().fight?.run.kind === 'ended'" --timeout 60000 >/dev/null || { log "the player standing on the flood never died"; return 1; }
  probe "log()" >"$VERIFY_DIR/void-floor.json"
  ab console >"$VERIFY_DIR/void-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/void-page-errors.json" || { log "page error capture failed"; return 1; }
}

drive_lifeforce_orb() {
  local box ox oy frame
  open_ticking "$DRILL_QUERY" || return 1
  choose_focus "$ORB_DRILL" "$ORB_SEED" || return 1
  fight_tick_at_least 12 120000 || { log "the orb drill never reached the lifeforce hit"; return 1; }
  ab screenshot "$VERIFY_DIR/orb-hit.png" >/dev/null || { log "lifeforce hit screenshot failed"; return 1; }
  box="$(ab --json get box "#world")"
  ox=$(( $(json data.x <<<"$box") + $(json data.width <<<"$box") / 2 + ORB_CLICK_RIGHT_PX ))
  oy=$(( $(json data.y <<<"$box") + $(json data.height <<<"$box") / 2 - ORB_CLICK_UP_PX ))
  # The orb's teal pulses within a tick, so each look is a burst of frames. The player stays on spawn until the glow burst, because on the orb it hides the glow.
  fight_tick_at_least "$ORB_DORMANT_TICK" 30000 || { log "the boss never stepped to P4 tick ${ORB_DORMANT_TICK}"; return 1; }
  for frame in $(seq 1 "$ORB_FRAMES"); do
    ab screenshot "$VERIFY_DIR/orb-dormant-${frame}.png" >/dev/null || { log "dormant orb screenshot failed"; return 1; }
  done
  fight_tick_at_least "$ORB_GLOW_TICK" 30000 || { log "the boss never stepped to P4 tick ${ORB_GLOW_TICK}"; return 1; }
  for frame in $(seq 1 "$ORB_FRAMES"); do
    ab screenshot "$VERIFY_DIR/orb-glow-${frame}.png" >/dev/null || { log "glowing orb screenshot failed"; return 1; }
  done
  click_at "$ox" "$oy" || return 1
  ab wait --fn "(() => { const d = window.__archiveOcellusProbe.snapshot().destination, spawn = ${SPAWN_TILE}; return d !== null && (d.x !== spawn.x || d.y !== spawn.y); })()" \
    --timeout 5000 >/dev/null || log "the orb click set no new destination"
  echo "{\"x\":${ox},\"y\":${oy},\"snapshot\":$(probe "snapshot()")}" >"$VERIFY_DIR/orb-click.json"
  fight_tick_at_least "$ORB_LAST_TICK" 30000 || { log "the boss never stepped to P4 tick ${ORB_LAST_TICK}"; return 1; }
  probe "log()" >"$VERIFY_DIR/orb.json"
  ab console >"$VERIFY_DIR/orb-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/orb-page-errors.json" || { log "page error capture failed"; return 1; }

  ab open "${URL}?seed=${ORB_SEED}&focus=${ORB_DRILL}" >/dev/null || return 1
  fight_tick_at_least "$ORB_SKIP_LAST_TICK" 120000 || { log "the orb-skipping drill never stepped to P4 tick ${ORB_SKIP_LAST_TICK}"; return 1; }
  ab screenshot "$VERIFY_DIR/orb-skip.png" >/dev/null || { log "skipped orb screenshot failed"; return 1; }
  probe "log()" >"$VERIFY_DIR/orb-skip.json"
  ab console >"$VERIFY_DIR/orb-skip-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/orb-skip-page-errors.json" || { log "page error capture failed"; return 1; }
}

drive_explosions() {
  local inner=($EXPLOSION_INNER_MARKS) outer=($EXPLOSION_OUTER_MARKS) outside=($EXPLOSION_OUTSIDE_TICKS)
  open_ticking "?seed=${ORB_SEED}&focus=${ORB_DRILL}" || return 1
  save_sound_settings true || { log "the sound settings were not saved"; return 1; }
  choose_focus "$EXPLOSION_DRILL" || return 1
  fight_tick_at_least 0 120000 || { log "the explosions drill never started"; return 1; }
  record_audio_starts || { log "the audio probe was not installed"; return 1; }
  start_frame_clock || { log "the frame clock was not installed"; return 1; }
  canvas_centre || { log "canvas box unreadable"; return 1; }
  arm_shot fight "${outside[0]}" "$EXPLOSION_OVERHEAD_SHOT_FRACTION" explosion-before.png && arm_shot fight "${inner[0]}" "$EXPLOSION_GLOW_SHOT_FRACTION" explosion-left.png &&
    arm_shot fight "${outside[1]}" "$EXPLOSION_OVERHEAD_SHOT_FRACTION" explosion-after.png && arm_shot fight "${outer[0]}" "$EXPLOSION_OVERHEAD_SHOT_FRACTION" explosion-standing.png ||
    { log "the explosion shots were not armed"; return 1; }
  take_shot explosion-before.png "${outside[0]}" || { log "pre-series shot failed"; return 1; }
  click_after_tick $((inner[0] - 1)) "$DODGE_CLICK_SIDE_PX" "$STEP_CLICK_DOWN_PX" || { log "the first dodge was not clicked"; return 1; }
  take_shot explosion-left.png "${inner[0]}" || { log "left marker shot failed"; return 1; }
  step_on_marks "-$DODGE_CLICK_SIDE_PX" "${inner[@]:1}" || { log "the other dodges were not clicked"; return 1; }
  take_shot explosion-after.png "${outside[1]}" || { log "post-series shot failed"; return 1; }
  click_after_tick "${outer[0]}" "$DODGE_CLICK_SIDE_PX" "$STEP_CLICK_DOWN_PX" || { log "the late step was not clicked"; return 1; }
  take_shot explosion-standing.png "${outer[0]}" || { log "the late step shot failed"; return 1; }
  fight_tick_at_least "$EXPLOSION_LAST_TICK" 30000 || { log "the explosions drill never stepped to P4 tick ${EXPLOSION_LAST_TICK}"; return 1; }
  probe "log()" >"$VERIFY_DIR/explosions.json"
  ab --json eval "window.__frameClock.audio" | json data.result >"$VERIFY_DIR/explosion-audio.json" || { log "audio capture failed"; return 1; }
  ab console >"$VERIFY_DIR/explosion-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/explosion-page-errors.json" || { log "page error capture failed"; return 1; }
  save_sound_settings false || { log "the sound settings were not restored"; return 1; }

  ab open "${URL}?seed=1&focus=${EXPLOSION_DRILL}&drillStart=cycle-start" >/dev/null || return 1
  canvas_centre || { log "canvas box unreadable"; return 1; }
  click_after_tick 0 0 "-$UNDER_BOSS_CLICK_UP_PX" || { log "the walk under the hidden boss was not clicked"; return 1; }
  start_frame_clock || { log "the frame clock was not installed"; return 1; }
  arm_shot fight "${inner[0]}" "$EXPLOSION_GLOW_SHOT_FRACTION" explosion-under.png && take_shot explosion-under.png "${inner[0]}" || { log "under-boss shot failed"; return 1; }
  fight_tick_at_least "$EXPLOSION_UNDER_LAST_TICK" 30000 || { log "the camping drill never stepped to P4 tick ${EXPLOSION_UNDER_LAST_TICK}"; return 1; }
  probe "log()" >"$VERIFY_DIR/explosions-under.json"
  ab console >"$VERIFY_DIR/explosion-under-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/explosion-under-page-errors.json" || { log "page error capture failed"; return 1; }
}

# The camera trails each step, so the step waits for it to settle; a click past the north edge always stops on row 1.
drive_dodge_speedup() {
  local north=0 mark
  ab open "${URL}?seed=1&focus=${EXPLOSION_DRILL}" >/dev/null || return 1
  canvas_centre || { log "canvas box unreadable"; return 1; }
  click_after_tick "$DODGE_BOSS_CLICK_TICK" 0 "-$HOVER_BOSS_BODY_UP_PX" || { log "the hovering boss was not clicked"; return 1; }
  for mark in $EXPLOSION_INNER_MARKS; do
    printf '[["wait","--fn","(window.__archiveOcellusProbe?.snapshot().fight?.run.tick ?? -1) >= %d","--timeout","30000"],["wait","%d"],["mouse","move","%d","%d"],["mouse","down","left"],["mouse","up","left"],["wait","--fn","(window.__archiveOcellusProbe?.snapshot().fight?.run.tick ?? -1) >= %d","--timeout","30000"],["mouse","move","%d","%d"],["mouse","down","left"],["mouse","up","left"]]' \
      $((mark - 1)) "$DODGE_SETTLE_MS" "$CX" $((north ? CY + EDGE_CLICK_DOWN_PX : CY - DODGE_SOUTH_CLICK_UP_PX)) "$mark" "$CX" $((CY - HOVER_BOSS_BODY_UP_PX)) |
      ab batch --bail >/dev/null || { log "the dodge on mark ${mark} was not clicked"; return 1; }
    north=$((1 - north))
  done
  fight_tick_at_least "$DODGE_SPEEDUP_LAST_TICK" 30000 || { log "the dodging drill never stepped to P4 tick ${DODGE_SPEEDUP_LAST_TICK}"; return 1; }
  probe "log()" >"$VERIFY_DIR/dodge-speedup.json"
  ab console >"$VERIFY_DIR/dodge-speedup-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/dodge-speedup-page-errors.json" || { log "page error capture failed"; return 1; }
}

drive_explosion_run_end() {
  local inner=($EXPLOSION_INNER_MARKS) frame fraction ended
  ab open "${URL}${EXPLOSION_RUN_END_QUERY}" >/dev/null || return 1
  fight_tick_at_least 0 120000 || { log "the run-end drill never started"; return 1; }
  start_frame_clock || { log "the frame clock was not installed"; return 1; }
  canvas_centre || { log "canvas box unreadable"; return 1; }
  click_after_tick "$EXPLOSION_KILL_CLICK_TICK" 0 "-$HOVER_BOSS_BODY_UP_PX" || { log "the hovering boss was not clicked"; return 1; }
  click_after_tick $((inner[0] - 1)) "$DODGE_CLICK_SIDE_PX" "$STEP_CLICK_DOWN_PX" || { log "the step off the mark was not clicked"; return 1; }
  frame=0
  for fraction in $EXPLOSION_MARKED_SHOT_FRACTIONS; do
    frame=$((frame + 1))
    arm_shot fight "${inner[0]}" "$fraction" "explosion-run-end-marked-${frame}.png" || { log "marked shot was not armed"; return 1; }
  done
  for frame in $(seq 1 "$frame"); do
    take_shot "explosion-run-end-marked-${frame}.png" "${inner[0]}" || { log "marked shot failed"; return 1; }
  done
  ab wait --fn "window.__archiveOcellusProbe.snapshot().fight?.run.kind === 'ended'" --timeout 30000 >/dev/null || { log "the run-end drill never ended"; return 1; }
  ended="$(probe "snapshot().tick")" || return 1
  for frame in $(seq 1 "$EXPLOSION_RUN_END_FRAMES"); do
    arm_shot world $((ended + frame)) "$EXPLOSION_GLOW_SHOT_FRACTION" "explosion-run-end-${frame}.png" || { log "run-end shot was not armed"; return 1; }
  done
  for frame in $(seq 1 "$EXPLOSION_RUN_END_FRAMES"); do
    take_shot "explosion-run-end-${frame}.png" $((ended + frame)) || { log "run-end shot failed"; return 1; }
  done
  probe "log()" >"$VERIFY_DIR/explosion-run-end.json"
  ab console >"$VERIFY_DIR/explosion-run-end-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/explosion-run-end-page-errors.json" || { log "page error capture failed"; return 1; }
}

drive_transition_attack() {
  ab open "${URL}${SPECIAL_QUERY}" >/dev/null || return 1
  canvas_centre || { log "canvas box unreadable"; return 1; }
  shot_after_tick "$SPECIAL_BEFORE_SHOT_TICK" 0 special-before.png || { log "pre-tell screenshot failed"; return 1; }
  click_after_tick "$SPECIAL_PRAY_TICK" "$PROTECT_MAGIC_RIGHT_PX" "$PROTECT_DOWN_PX" || { log "Protect from Magic was not clicked before the landing"; return 1; }
  shot_after_tick "$SPECIAL_VORTEX_SHOT_TICK" 0 special-vortex.png || { log "vortex screenshot failed"; return 1; }
  fight_tick_at_least "$SOUL_SPLIT_HEAL_TICK" 30000 || { log "the transition drill never stepped to the Soul Split heal at P4 tick ${SOUL_SPLIT_HEAL_TICK}"; return 1; }
  probe "log()" >"$VERIFY_DIR/special.json"
  ab console >"$VERIFY_DIR/special-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/special-page-errors.json" || { log "page error capture failed"; return 1; }

  save_sound_settings true || { log "the sound settings were not saved"; return 1; }
  keep_seed && ab click "#restart" >/dev/null || { log "Restart was not clicked"; return 1; }
  ab wait --fn "new URLSearchParams(location.search).has('setup')" --timeout 30000 >/dev/null || { log "Restart did not reload the transition drill"; return 1; }
  fight_tick_at_least 0 120000 || { log "the late-prayer drill never started"; return 1; }
  record_audio_starts || { log "the audio probe was not installed"; return 1; }
  click_after_tick "$SPECIAL_HIT_TICK" "$PROTECT_MAGIC_RIGHT_PX" "$PROTECT_DOWN_PX" || { log "the late Protect from Magic was not clicked"; return 1; }
  shot_after_tick "$SOUL_SPLIT_HEAL_TICK" 0 special-heal.png || { log "Soul Split heal screenshot failed"; return 1; }
  shot_after_tick "$SPECIAL_SPIKE_SHOT_TICK" 0 special-spike-disk.png || { log "spike disk screenshot failed"; return 1; }
  shot_after_tick "$SPECIAL_SEMICIRCLE_SHOT_TICK" 0 special-semicircle.png || { log "semicircle screenshot failed"; return 1; }
  shot_after_tick "$SPECIAL_BLACK_SHOT_TICK" 0 special-black-disk.png || { log "black disk screenshot failed"; return 1; }
  ab wait --fn "window.__archiveOcellusProbe.snapshot().fight?.run.kind === 'ended'" --timeout 60000 >/dev/null || { log "the player who prayed late never died"; return 1; }
  ab wait 1000 >/dev/null
  probe "log()" >"$VERIFY_DIR/special-late.json"
  ab --json eval "window.__frameClock.audio" | json data.result >"$VERIFY_DIR/special-audio.json" || { log "audio capture failed"; return 1; }
  ab console >"$VERIFY_DIR/special-late-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/special-late-page-errors.json" || { log "page error capture failed"; return 1; }
  save_sound_settings false || { log "the sound settings were not restored"; return 1; }
}

drive_overheads_rifts() {
  local shot
  ab open "${URL}${RIFT_QUERY}" >/dev/null || return 1
  fight_tick_at_least 0 120000 || { log "the rifts drill never loaded"; return 1; }
  save_sound_settings true || { log "the sound settings were not saved"; return 1; }
  keep_seed && ab click "#restart" >/dev/null || { log "Restart was not clicked"; return 1; }
  ab wait --fn "new URLSearchParams(location.search).has('setup')" --timeout 30000 >/dev/null || { log "Restart did not reload the rifts drill"; return 1; }
  fight_tick_at_least 0 120000 || { log "the rifts drill never started"; return 1; }
  record_audio_starts || { log "the audio probe was not installed"; return 1; }
  record_overhead_draws || { log "the overhead draw probe was not installed"; return 1; }
  canvas_centre || { log "canvas box unreadable"; return 1; }
  for shot in $OVERHEAD_SHOT_TICKS; do
    shot_after_tick "$shot" 0 "overhead-${shot}.png" || { log "overhead screenshot at P4 tick ${shot} failed"; return 1; }
  done
  shot_after_tick "$RIFT_CLICK_TICK" 0 rift-spawned.png || { log "rift spawn screenshot failed"; return 1; }
  click_after_tick "$RIFT_CLICK_TICK" "-$NORTH_EAST_RIFT_CLICK_LEFT_PX" "-$NORTH_EAST_RIFT_CLICK_UP_PX" || { log "the north-east rift was not clicked"; return 1; }
  ab wait --fn "window.__archiveOcellusProbe.log().rows.some((row) => row.events.some((e) => e.kind === 'rift-destroyed'))" --timeout 30000 >/dev/null || { log "no rift was destroyed after the click"; return 1; }
  ab wait "$CHAT_POLL_WAIT_MS" >/dev/null
  ab screenshot "$VERIFY_DIR/rift-destroyed.png" >/dev/null || { log "rift kill screenshot failed"; return 1; }
  ab --json get text "#game_chat" >"$VERIFY_DIR/rift-chat.json" || { log "chat text capture failed"; return 1; }
  shot_after_tick "$RIFT_CHARGED_SHOT_TICK" 0 rift-charged.png || { log "charged rift screenshot failed"; return 1; }
  shot_after_tick "$RIFT_BURST_TICK" 0 rift-burst.png || { log "rift burst screenshot failed"; return 1; }
  fight_tick_at_least $((RIFT_BURST_TICK + 1)) 30000 || { log "the rifts drill never stepped past the burst at P4 tick ${RIFT_BURST_TICK}"; return 1; }
  probe "log()" >"$VERIFY_DIR/rifts.json"
  ab --json eval "window.__frameClock.audio" | json data.result >"$VERIFY_DIR/rift-audio.json" || { log "audio capture failed"; return 1; }
  ab --json eval "window.__overheadDraws" | json data.result >"$VERIFY_DIR/overhead-draws.json" || { log "overhead draw capture failed"; return 1; }
  ab console >"$VERIFY_DIR/rift-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/rift-page-errors.json" || { log "page error capture failed"; return 1; }
  save_sound_settings false || { log "the sound settings were not restored"; return 1; }

  ab open "${URL}${RIFT_QUERY}" >/dev/null || return 1
  fight_tick_at_least 0 120000 || { log "the Ralos rifts drill never loaded"; return 1; }
  click_at "$LOADOUT_INVENTORY_TAB_X" "$LOADOUT_INVENTORY_TAB_Y" || return 1
  ab wait 600 >/dev/null
  click_inventory_slot "$LOADOUT_SPECIAL_SLOT" || { log "Ralos was not wielded"; return 1; }
  canvas_centre || { log "canvas box unreadable"; return 1; }
  click_after_tick "$RIFT_CLICK_TICK" "-$NORTH_EAST_RIFT_CLICK_LEFT_PX" "-$NORTH_EAST_RIFT_CLICK_UP_PX" || { log "the north-east rift was not clicked with Ralos"; return 1; }
  fight_tick_at_least "$RIFT_RALOS_LAST_TICK" 30000 || { log "the Ralos rifts drill never stepped to P4 tick ${RIFT_RALOS_LAST_TICK}"; return 1; }
  probe "log()" >"$VERIFY_DIR/rift-ralos.json"
  ab console >"$VERIFY_DIR/rift-ralos-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/rift-ralos-page-errors.json" || { log "page error capture failed"; return 1; }

  ab open "${URL}${RIFT_QUERY}&setup=melee" >/dev/null || return 1
  fight_tick_at_least 0 120000 || { log "the melee rifts drill never loaded"; return 1; }
  canvas_centre || { log "canvas box unreadable"; return 1; }
  click_after_tick "$RIFT_CLICK_TICK" "-$NORTH_EAST_RIFT_CLICK_LEFT_PX" "-$NORTH_EAST_RIFT_CLICK_UP_PX" || { log "the north-east rift was not clicked with the scythe"; return 1; }
  shot_after_tick "$RIFT_MELEE_SPLAT_TICK" 0 rift-melee-hit.png || { log "melee rift hit screenshot failed"; return 1; }
  fight_tick_at_least "$RIFT_MELEE_LAST_TICK" 30000 || { log "the melee rifts drill never stepped to P4 tick ${RIFT_MELEE_LAST_TICK}"; return 1; }
  probe "log()" >"$VERIFY_DIR/rift-melee.json"
  ab console >"$VERIFY_DIR/rift-melee-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/rift-melee-page-errors.json" || { log "page error capture failed"; return 1; }

  ab open "${URL}${DEFLECT_QUERY}" >/dev/null || return 1
  canvas_centre || { log "canvas box unreadable"; return 1; }
  click_after_tick "$DEFLECT_CLICK_TICK" "$RISEN_BOSS_CLICK_RIGHT_PX" "$RISEN_BOSS_CLICK_DOWN_PX" || { log "the risen boss was not clicked"; return 1; }
  shot_after_tick "$DEFLECT_HOVER_SHOT_TICK" 0 hover-out-of-reach.png || { log "hovering boss screenshot failed"; return 1; }
  shot_after_tick "$DEFLECT_BLOCKED_SHOT_TICK" 0 deflect-blocked.png || { log "deflected attack screenshot failed"; return 1; }
  fight_tick_at_least "$DEFLECT_LAST_TICK" 60000 || { log "the deflect drill never stepped to P4 tick ${DEFLECT_LAST_TICK}"; return 1; }
  probe "log()" >"$VERIFY_DIR/deflect.json"
  ab console >"$VERIFY_DIR/deflect-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/deflect-page-errors.json" || { log "page error capture failed"; return 1; }

  ab open "${URL}${REFLECT_QUERY}" >/dev/null || return 1
  canvas_centre || { log "canvas box unreadable"; return 1; }
  click_after_tick "$REFLECT_CLICK_TICK" 0 "-$REFLECT_BOSS_CLICK_UP_PX" || { log "the landed boss was not clicked"; return 1; }
  shot_after_tick "$REFLECT_NONE_SHOT_TICK" 0 reflect-none.png || { log "unreflected hit screenshot failed"; return 1; }
  shot_after_tick "$REFLECT_HIT_SHOT_TICK" 0 reflect-hit.png || { log "reflected hit screenshot failed"; return 1; }
  fight_tick_at_least "$REFLECT_LAST_TICK" 60000 || { log "the reflect drill never stepped to P4 tick ${REFLECT_LAST_TICK}"; return 1; }
  probe "log()" >"$VERIFY_DIR/reflect.json"
  ab console >"$VERIFY_DIR/reflect-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/reflect-page-errors.json" || { log "page error capture failed"; return 1; }
}

invincible_toggle() {
  open_settings || return 1
  printf '{"visible":%s,"checked":%s}\n' "$(ab --json is visible "#invincible" | json data.visible)" "$(ab --json is checked "#invincible" | json data.checked)"
}

drive_invincible() {
  local search toggle
  ab open "${URL}${DRILL_QUERY}" >/dev/null || return 1
  fight_tick_at_least 0 120000 || { log "the default drill never took its first P4 step"; return 1; }
  invincible_toggle >"$VERIFY_DIR/invincible-default.json" || { log "invincible toggle capture failed"; return 1; }
  ab open "${URL}${INVINCIBLE_QUERY}" >/dev/null || return 1
  fight_tick_at_least 0 120000 || { log "the invincible drill never took its first P4 step"; return 1; }
  invincible_toggle >"$VERIFY_DIR/invincible-linked.json" || { log "invincible toggle capture failed"; return 1; }
  fight_tick_at_least "$INVINCIBLE_LAST_TICK" 90000 || { log "the invincible drill never stepped to P4 tick ${INVINCIBLE_LAST_TICK}"; return 1; }
  ab wait "$CHAT_POLL_WAIT_MS" >/dev/null
  ab screenshot "$VERIFY_DIR/invincible.png" >/dev/null || { log "invincible screenshot failed"; return 1; }
  ab --json get text "#game_chat" >"$VERIFY_DIR/invincible-chat.json" || { log "chat text capture failed"; return 1; }
  probe "log()" >"$VERIFY_DIR/invincible.json"
  ab console >"$VERIFY_DIR/invincible-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/invincible-page-errors.json" || { log "page error capture failed"; return 1; }
  restart_run || return 1
  search="$(ab --json eval "location.search" | json data.result)" || return 1
  toggle="$(invincible_toggle)" || { log "invincible toggle capture failed"; return 1; }
  node -e 'console.log(JSON.stringify({ search: process.argv[1], toggle: JSON.parse(process.argv[2]) }))' "$search" "$toggle" >"$VERIFY_DIR/invincible-restarted.json"

  ab open "${URL}${INVINCIBLE_ORB_QUERY}" >/dev/null || return 1
  fight_tick_at_least 0 120000 || { log "the invincible full fight never took its first P4 step"; return 1; }
  canvas_centre || { log "canvas box unreadable"; return 1; }
  click_at "$CX" $((CY - INVINCIBLE_ORB_UNDER_BOSS_CLICK_UP_PX)) || { log "the walk under the boss was not clicked"; return 1; }
  # Wait beside the orb through the revival at 24, then step on, so the orb is taken after the revival cleared its credit.
  tile_pixel invincible-orb "$INVINCIBLE_ORB_BESIDE_TILE" "$INVINCIBLE_ORB_BESIDE_TICK" || return 1
  click_after_tick "$INVINCIBLE_ORB_BESIDE_TICK" $((CLICK_X - CX)) $((CLICK_Y - CY)) || { log "the walk beside the orb was not clicked"; return 1; }
  tile_pixel invincible-orb "$INVINCIBLE_ORB_TILE" "$INVINCIBLE_ORB_STEP_ON_TICK" || return 1
  click_after_tick "$INVINCIBLE_ORB_STEP_ON_TICK" $((CLICK_X - CX)) $((CLICK_Y - CY)) || { log "the step onto the orb was not clicked"; return 1; }
  fight_tick_at_least "$INVINCIBLE_ORB_LAST_TICK" 30000 || { log "the invincible full fight never stepped to P4 tick ${INVINCIBLE_ORB_LAST_TICK}"; return 1; }
  ab screenshot "$VERIFY_DIR/invincible-orb.png" >/dev/null || { log "invincible orb screenshot failed"; return 1; }
  probe "log()" >"$VERIFY_DIR/invincible-orb.json"
  ab console >"$VERIFY_DIR/invincible-orb-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/invincible-orb-page-errors.json" || { log "page error capture failed"; return 1; }
}

audio_contexts() {
  ab --json eval "(window.__audioContexts ?? []).map((context) => context.state)" | json data.result
}

sound_toggles() {
  open_settings || return 1
  printf '{"sound":{"visible":%s,"checked":%s},"areaSound":{"visible":%s,"checked":%s}}\n' \
    "$(ab --json is visible "#sound" | json data.visible)" "$(ab --json is checked "#sound" | json data.checked)" \
    "$(ab --json is visible "#area_sound" | json data.visible)" "$(ab --json is checked "#area_sound" | json data.checked)"
}

audio_resumed() {
  ab wait --fn "(window.__audioContexts ?? []).length > 0 && window.__audioContexts.every((context) => context.state === 'running')" --timeout 5000 >/dev/null
}

drive_cues() {
  local BROWSER_SESSION="${BROWSER_SESSION}-autoplay"
  echo "$AUTOPLAY_POLICY_JS" >"$VERIFY_DIR/autoplay-policy.js"
  ab --init-script "$VERIFY_DIR/autoplay-policy.js" set viewport 1280 800 >/dev/null || { log "the autoplay session did not start"; return 1; }
  ab open "${URL}${CUE_QUERY}" >/dev/null || return 1
  fight_tick_at_least 0 120000 || { log "the fresh cue drill never started"; return 1; }
  record_audio_starts || { log "the audio probe was not installed"; return 1; }
  audio_contexts >"$VERIFY_DIR/cue-contexts-fresh.json" || { log "audio context capture failed"; return 1; }
  sound_toggles >"$VERIFY_DIR/cue-toggles-fresh.json" || { log "sound toggle capture failed"; return 1; }
  canvas_centre || { log "canvas box unreadable"; return 1; }
  click_after_tick 0 0 0 || { log "the canvas was not clicked"; return 1; }
  probe "snapshot().fight.run.tick" >"$VERIFY_DIR/cue-fresh-click.json"
  audio_resumed || log "the audio context did not resume after the canvas click"
  audio_contexts >"$VERIFY_DIR/cue-contexts-fresh-clicked.json" || { log "audio context capture failed"; return 1; }
  fight_tick_at_least "$CUE_TOGGLE_TICK" 30000 || { log "the fresh cue drill never stepped to P4 tick ${CUE_TOGGLE_TICK}"; return 1; }
  ab --json eval "window.__frameClock.audio" | json data.result >"$VERIFY_DIR/cue-fresh-audio.json" || { log "audio capture failed"; return 1; }
  open_settings && ab click "#area_sound" >/dev/null && ab click "#sound" >/dev/null || { log "the sound toggles were not unticked"; return 1; }
  ab --json eval "localStorage.getItem('${SOUND_SETTINGS_KEY}')" | json data.result >"$VERIFY_DIR/cue-sound-off-saved.json" || { log "saved settings capture failed"; return 1; }
  ab console >"$VERIFY_DIR/cue-fresh-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/cue-fresh-page-errors.json" || { log "page error capture failed"; return 1; }

  keep_seed && restart_run || { log "Restart did not reload the fresh cue drill"; return 1; }
  record_audio_starts || { log "the audio probe was not installed"; return 1; }
  probe "snapshot().fight.run.tick" >"$VERIFY_DIR/cue-recording-from.json"
  audio_contexts >"$VERIFY_DIR/cue-contexts-loaded.json" || { log "audio context capture failed"; return 1; }
  sound_toggles >"$VERIFY_DIR/cue-toggles-off.json" || { log "sound toggle capture failed"; return 1; }
  fight_tick_at_least "$CUE_TOGGLE_TICK" 30000 || { log "the cue drill never stepped to P4 tick ${CUE_TOGGLE_TICK}"; return 1; }
  open_settings && ab click "#area_sound" >/dev/null && ab click "#sound" >/dev/null || { log "the sound toggles were not clicked"; return 1; }
  probe "snapshot().fight.run.tick" >"$VERIFY_DIR/cue-toggle-click.json"
  audio_resumed || log "the audio context did not resume after the toggle click"
  audio_contexts >"$VERIFY_DIR/cue-contexts-toggled.json" || { log "audio context capture failed"; return 1; }
  sound_toggles >"$VERIFY_DIR/cue-toggles-on.json" || { log "sound toggle capture failed"; return 1; }
  ab --json eval "localStorage.getItem('${SOUND_SETTINGS_KEY}')" | json data.result >"$VERIFY_DIR/cue-sound-saved.json" || { log "saved settings capture failed"; return 1; }
  fight_tick_at_least "$CUE_LAST_TICK" 60000 || { log "the cue drill never stepped to P4 tick ${CUE_LAST_TICK}"; return 1; }
  ab --json eval "window.__frameClock.audio" | json data.result >"$VERIFY_DIR/cue-toggle-audio.json" || { log "audio capture failed"; return 1; }
  ab console >"$VERIFY_DIR/cue-toggle-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/cue-toggle-page-errors.json" || { log "page error capture failed"; return 1; }

  keep_seed && restart_run || { log "Restart did not reload the cue drill"; return 1; }
  record_audio_starts || { log "the audio probe was not installed"; return 1; }
  audio_contexts >"$VERIFY_DIR/cue-contexts-reloaded.json" || { log "audio context capture failed"; return 1; }
  sound_toggles >"$VERIFY_DIR/cue-toggles-reloaded.json" || { log "sound toggle capture failed"; return 1; }
  canvas_centre || { log "canvas box unreadable"; return 1; }
  click_after_tick 0 0 0 || { log "the canvas was not clicked"; return 1; }
  audio_resumed || log "the audio context did not resume after the canvas click"
  audio_contexts >"$VERIFY_DIR/cue-contexts-clicked.json" || { log "audio context capture failed"; return 1; }
  fight_tick_at_least "$CUE_CHAT_BEFORE_TICK" 30000 || { log "the cue drill never stepped to P4 tick ${CUE_CHAT_BEFORE_TICK}"; return 1; }
  ab --json get text "#game_chat" >"$VERIFY_DIR/cue-chat-before.json" || { log "chat text capture failed"; return 1; }
  fight_tick_at_least "$CUE_CHAT_TICK" 30000 || { log "the cue drill never stepped to the lifeforce tell at P4 tick ${CUE_CHAT_TICK}"; return 1; }
  ab wait "$CHAT_POLL_WAIT_MS" >/dev/null
  ab --json get text "#game_chat" >"$VERIFY_DIR/cue-chat.json" || { log "chat text capture failed"; return 1; }
  fight_tick_at_least "$CUE_LAST_TICK" 60000 || { log "the reloaded cue drill never stepped to P4 tick ${CUE_LAST_TICK}"; return 1; }
  probe "log()" >"$VERIFY_DIR/cues.json"
  ab --json eval "window.__frameClock.audio" | json data.result >"$VERIFY_DIR/cue-audio.json" || { log "audio capture failed"; return 1; }
  ab console >"$VERIFY_DIR/cue-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/cue-page-errors.json" || { log "page error capture failed"; return 1; }
  ab close >/dev/null 2>&1
}

menu_state() {
  ab --json eval "(() => {
    const visible = (id) => document.getElementById(id)?.checkVisibility() === true;
    const box = (id) => { const r = document.getElementById(id)?.getBoundingClientRect(); return r ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom } : null; };
    return {
      expanded: document.getElementById('settings')?.getAttribute('aria-expanded') ?? null,
      menu: visible('settings_menu'),
      controls: Object.fromEntries(${MENU_CONTROLS}.map((id) => [id, visible(id)])),
      buttons: { settings: visible('settings'), restart: visible('restart') },
      controlsBox: box('drill_controls'),
      footerBox: box('credits'),
      credit: visible('credit_line'),
      menuBox: box('settings_menu'),
      viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
    };
  })()" | json data.result
}

menu_open_close() {
  local name=$1 closed opened second
  ab open "${URL}${MENU_QUERY}" >/dev/null || return 1
  fight_tick_at_least 0 120000 || { log "the ${name} menu page never took its first P4 step" >&2; return 1; }
  closed="$(menu_state)" || return 1
  ab screenshot "$VERIFY_DIR/menu-closed-${name}.png" >/dev/null || { log "closed ${name} menu screenshot failed" >&2; return 1; }
  ab click "#settings" >/dev/null && ab wait 300 >/dev/null || { log "the ${name} Settings button was not clicked" >&2; return 1; }
  opened="$(menu_state)" || return 1
  ab screenshot "$VERIFY_DIR/menu-open-${name}.png" >/dev/null || { log "open ${name} menu screenshot failed" >&2; return 1; }
  ab click "#settings" >/dev/null && ab wait 300 >/dev/null || { log "the ${name} Settings button was not clicked again" >&2; return 1; }
  second="$(menu_state)" || return 1
  printf '{"closed":%s,"open":%s,"secondClick":%s}\n' "$closed" "$opened" "$second"
}

drive_settings_menu() {
  local desktop small mobile escape outside inside
  desktop="$(menu_open_close desktop)" || return 1
  open_settings && ab wait 300 >/dev/null && ab press Escape >/dev/null && ab wait 300 >/dev/null || { log "Escape was not pressed on the open menu"; return 1; }
  escape="$(menu_state)" || return 1
  open_settings && ab wait 300 >/dev/null && ab click "#seed" >/dev/null && ab wait 300 >/dev/null || { log "the seed box was not clicked in the open menu"; return 1; }
  inside="$(menu_state)" || return 1
  canvas_centre || { log "canvas box unreadable"; return 1; }
  click_at "$CX" "$CY" && ab wait 300 >/dev/null || { log "the canvas was not clicked with the menu open"; return 1; }
  outside="$(menu_state)" || return 1
  ab --json errors | json data.errors >"$VERIFY_DIR/menu-page-errors.json" || { log "page error capture failed"; return 1; }

  ab set viewport $MENU_SMALL_VIEWPORT >/dev/null || return 1
  small="$(menu_open_close small)" || return 1
  ab --json errors | json data.errors >"$VERIFY_DIR/menu-small-page-errors.json" || { log "page error capture failed"; return 1; }
  ab set viewport 1280 800 >/dev/null || return 1

  local BROWSER_SESSION="${BROWSER_SESSION}-mobile"
  ab set device "$MENU_MOBILE_DEVICE" >/dev/null || { log "the mobile session did not start"; return 1; }
  mobile="$(menu_open_close mobile)" || return 1
  ab --json errors | json data.errors >"$VERIFY_DIR/menu-mobile-page-errors.json" || { log "page error capture failed"; return 1; }
  ab close >/dev/null 2>&1

  printf '{"desktop":%s,"small":%s,"mobile":%s,"escape":%s,"inside":%s,"outside":%s}\n' "$desktop" "$small" "$mobile" "$escape" "$inside" "$outside" >"$VERIFY_DIR/menu.json"
}

result_panel() {
  ab --json eval "(() => {
    const panel = document.getElementById('run_result');
    return {
      visible: panel?.checkVisibility() === true,
      lines: panel ? [...panel.querySelectorAll('h2, p')].map((line) => line.textContent) : [],
      buttons: panel ? [...panel.querySelectorAll('button')].map((button) => button.textContent) : [],
      run: window.__archiveOcellusProbe.snapshot().fight?.run ?? null,
    };
  })()" | json data.result
}

next_run() {
  ab --json eval "(() => { const probe = window.__archiveOcellusProbe; return { search: location.search, seed: probe.log().header.seed, bossHp: probe.snapshot().fight?.boss.hp ?? null, panel: document.getElementById('run_result') !== null }; })()" | json data.result
}

click_result() {
  local loaded
  loaded="$(ab --json eval "performance.timeOrigin" | json data.result)" || return 1
  ab click "#$1" >/dev/null || return 1
  ab wait --fn "performance.timeOrigin !== ${loaded} && (window.__archiveOcellusProbe?.snapshot().fight?.run.tick ?? -1) >= 0" --timeout 120000 >/dev/null || { log "#$1 never loaded a new run"; return 1; }
}

drive_run_results() {
  local start
  ab open "${URL}${DEATH_RESULT_QUERY}" >/dev/null || return 1
  ab wait --fn "window.__archiveOcellusProbe?.snapshot().fight?.run.kind === 'ended'" --timeout 120000 >/dev/null || { log "the player on the flood never died"; return 1; }
  ab wait "$CHAT_POLL_WAIT_MS" >/dev/null
  result_panel >"$VERIFY_DIR/death-result.json" || { log "death result capture failed"; return 1; }
  ab screenshot "$VERIFY_DIR/death-result.png" >/dev/null || { log "death result screenshot failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/death-result-page-errors.json" || { log "page error capture failed"; return 1; }
  click_result result_restart || return 1
  next_run >"$VERIFY_DIR/death-restart.json" || { log "restarted run capture failed"; return 1; }

  ab open "${URL}${KILL_RESULT_QUERY}" >/dev/null || return 1
  fight_tick_at_least 0 120000 || { log "the bosshp drill never took its first P4 step"; return 1; }
  start="$(next_run)" || return 1
  canvas_centre || { log "canvas box unreadable"; return 1; }
  click_after_tick "$KILL_RESULT_CLICK_TICK" "$RISEN_BOSS_CLICK_RIGHT_PX" "$RISEN_BOSS_CLICK_DOWN_PX" || { log "the boss was not clicked"; return 1; }
  ab wait --fn "window.__archiveOcellusProbe.snapshot().fight?.run.kind === 'ended'" --timeout 60000 >/dev/null || { log "the bosshp run never ended"; return 1; }
  ab wait "$CHAT_POLL_WAIT_MS" >/dev/null
  result_panel >"$VERIFY_DIR/kill-result.json" || { log "kill result capture failed"; return 1; }
  ab screenshot "$VERIFY_DIR/kill-result.png" >/dev/null || { log "kill result screenshot failed"; return 1; }
  ab set viewport $MENU_SMALL_VIEWPORT >/dev/null && ab wait 600 >/dev/null && ab screenshot "$VERIFY_DIR/kill-result-small.png" >/dev/null || { log "small kill result screenshot failed"; return 1; }
  ab set viewport 1280 800 >/dev/null && ab wait 600 >/dev/null || return 1
  ab --json errors | json data.errors >"$VERIFY_DIR/kill-result-page-errors.json" || { log "page error capture failed"; return 1; }
  click_result result_retry || return 1
  printf '{"start":%s,"retry":%s}\n' "$start" "$(next_run)" >"$VERIFY_DIR/kill-retry.json" || { log "retried run capture failed"; return 1; }
}

telemetry_box() {
  ab --json eval "({ checked: document.getElementById('perf_data')?.checked ?? null, saved: localStorage.getItem('archive-ocellus:perf-data'), version: document.getElementById('app_version')?.textContent ?? null, search: location.search })" | json data.result
}

kill_and_wait_for_beacon() {
  fight_tick_at_least 0 120000 || { log "the telemetry page never took its first P4 step"; return 1; }
  canvas_centre || { log "canvas box unreadable"; return 1; }
  click_after_tick "$KILL_RESULT_CLICK_TICK" "$RISEN_BOSS_CLICK_RIGHT_PX" "$RISEN_BOSS_CLICK_DOWN_PX" || { log "the boss was not clicked on the telemetry page"; return 1; }
  ab wait --fn "window.__archiveOcellusProbe.snapshot().fight?.run.kind === 'ended'" --timeout 60000 >/dev/null || { log "the telemetry run never ended"; return 1; }
  ab wait "$TELEMETRY_BEACON_WAIT_MS" >/dev/null
}

drive_telemetry() {
  local before after restored
  ab network route "**/telemetry.json" --body '{"sampleRate":1}' >/dev/null && ab network route "**/t" --body '' >/dev/null || { log "the telemetry routes were not set"; ab network unroute >/dev/null; return 1; }
  ab network requests --clear >/dev/null || return 1
  ab open "${URL}${KILL_RESULT_QUERY}" >/dev/null || return 1
  kill_and_wait_for_beacon || { ab network unroute >/dev/null; return 1; }
  open_settings && ab wait 300 >/dev/null || { ab network unroute >/dev/null; return 1; }
  before="$(telemetry_box)" || return 1
  ab click "#perf_data" >/dev/null && ab press Escape >/dev/null || { log "the performance data box was not clicked"; ab network unroute >/dev/null; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/telemetry-page-errors.json" || { log "page error capture failed"; return 1; }
  click_result result_retry || { ab network unroute >/dev/null; return 1; }
  after="$(telemetry_box)" || return 1
  kill_and_wait_for_beacon || { ab network unroute >/dev/null; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/telemetry-opted-out-page-errors.json" || { log "page error capture failed"; return 1; }
  ab --json network requests | json data.requests >"$VERIFY_DIR/telemetry-requests.json" || { log "telemetry request capture failed"; return 1; }
  open_settings && ab wait 300 >/dev/null && ab click "#perf_data" >/dev/null && ab press Escape >/dev/null || { log "the performance data box was not ticked again"; ab network unroute >/dev/null; return 1; }
  restored="$(telemetry_box)" || return 1
  ab network unroute >/dev/null || { log "the telemetry routes were not lifted"; return 1; }
  printf '{"before":%s,"after":%s,"restored":%s}\n' "$before" "$after" "$restored" >"$VERIFY_DIR/telemetry-box.json"
}

record_get_ready() {
  ab eval '(() => {
    const now = () => window.__archiveOcellusProbe?.snapshot() ?? null;
    const record = { installedAt: now(), clickTick: null, overlay: {}, player: {} };
    window.__getReady = record;
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...rest) {
      const count = /^GET READY\.\.\.(\d+)$/.exec(String(text))?.[1];
      const t = count === undefined ? undefined : now()?.tick;
      if (t !== undefined && !(record.overlay[t] ??= []).includes(Number(count))) record.overlay[t].push(Number(count));
      return fillText.call(this, text, ...rest);
    };
    document.addEventListener("mousedown", () => { record.clickTick ??= now()?.tick ?? null; }, true);
    const frame = () => {
      const snapshot = now();
      if (snapshot?.player) record.player[snapshot.tick] = snapshot.player;
      requestAnimationFrame(frame);
    };
    frame();
  })()' >/dev/null
}

drive_stored_view() {
  local BROWSER_SESSION="${BROWSER_SESSION}-stored-view"
  echo "$VIEWPORT_RENDERS_JS" >"$VERIFY_DIR/viewport-renders.js"
  ab --init-script "$VERIFY_DIR/viewport-renders.js" set viewport 1280 800 >/dev/null || { log "the stored view session did not start"; return 1; }
  ab open "${URL}osrs-assets/manifest.json" >/dev/null || return 1
  ab eval "localStorage.setItem('${SOUND_SETTINGS_KEY}', JSON.stringify({ version: 1, values: { use3dView: false, rotated: 'south' } }))" >/dev/null || { log "the 2D view was not stored"; return 1; }
  ab --json eval "JSON.parse(localStorage.getItem('${SOUND_SETTINGS_KEY}')).values" | json data.result >"$VERIFY_DIR/stored-view-before.json" || { log "the stored view was not read"; return 1; }
  ab open "${URL}${STORED_VIEW_QUERY}" >/dev/null || return 1
  ab wait --fn "window.__archiveOcellusProbe?.snapshot().ticking === true && window.__archiveOcellusProbe.snapshot().tick >= 8" --timeout 90000 >/dev/null || log "the page with a stored 2D view never started ticking"
  ab screenshot "$VERIFY_DIR/stored-view.png" >/dev/null || { log "stored view screenshot failed"; return 1; }
  ab --json eval "({ tick: window.__archiveOcellusProbe?.snapshot().tick ?? null, viewportRenders: window.__viewportRenders.count, saved: JSON.parse(localStorage.getItem('${SOUND_SETTINGS_KEY}')).values })" |
    json data.result >"$VERIFY_DIR/stored-view.json" || { log "stored view capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/stored-view-page-errors.json" || { log "page error capture failed"; return 1; }
  ab close >/dev/null 2>&1
}

drive_get_ready() {
  ab open "${URL}${GET_READY_QUERY}" >/dev/null || return 1
  record_get_ready || { log "the GET READY probe was not installed"; return 1; }
  ab wait --fn "window.__archiveOcellusProbe?.snapshot().ticking === true && window.__archiveOcellusProbe.snapshot().tick >= ${GET_READY_CLICK_TICK}" \
    --timeout 90000 >/dev/null || { log "the GET READY page never started ticking"; return 1; }
  canvas_centre || { log "canvas box unreadable"; return 1; }
  click_at $((CX - WALK_CLICK_LEFT_PX)) $((CY - WALK_CLICK_UP_PX)) || return 1
  fight_tick_at_least 1 30000 || { log "the boss never stepped to P4 tick 1 after GET READY"; return 1; }
  ab --json eval "window.__getReady" | json data.result >"$VERIFY_DIR/get-ready.json" || { log "GET READY capture failed"; return 1; }
  probe "log()" >"$VERIFY_DIR/get-ready-log.json"
  ab --json errors | json data.errors >"$VERIFY_DIR/get-ready-page-errors.json" || { log "page error capture failed"; return 1; }
}

drive_load_retry() {
  local file opened deadline
  file="$(node -p 'require(process.argv[1]).assets["npc-" + process.argv[2]].file' "$MANIFEST" "$BOSS_NPC")" || { log "the boss asset is not in the manifest"; return 1; }
  echo "$file" >"$VERIFY_DIR/load-retry-asset.txt"
  ab open about:blank >/dev/null || return 1
  ab network har start --content none >/dev/null || { log "HAR recording did not start"; return 1; }
  ab network route "**/osrs-assets/${file}" --abort >/dev/null || { log "the boss asset route was not set"; return 1; }
  ab network requests --clear >/dev/null || return 1
  ab open "${URL}${LOAD_RETRY_QUERY}" >/dev/null &
  opened=$!
  deadline=$((SECONDS + 90))
  until [[ "$(ab --json network requests --filter "$file" | json data.requests.length)" -gt 0 ]]; do
    (( SECONDS < deadline )) || { log "the page never requested the boss asset"; ab network unroute >/dev/null; wait "$opened"; return 1; }
  done
  ab network unroute >/dev/null || { log "the boss asset route was not lifted"; return 1; }
  wait "$opened" || return 1
  ab wait --fn "window.__archiveOcellusProbe?.snapshot().tick >= 8" --timeout 90000 >/dev/null || log "the trainer never started ticking after the dropped boss asset"
  ab network har stop "$VERIFY_DIR/load-retry.har" >/dev/null || { log "HAR capture failed"; return 1; }
  ab --json network requests --filter "favicon.ico" | json data.requests >"$VERIFY_DIR/load-favicon-requests.json" || { log "favicon request capture failed"; return 1; }
  ab --json eval "({ text: document.body.innerText, tick: window.__archiveOcellusProbe?.snapshot().tick ?? null })" | json data.result >"$VERIFY_DIR/load-retry.json" || { log "load state capture failed"; return 1; }
  ab screenshot "$VERIFY_DIR/load-retry.png" >/dev/null || { log "load retry screenshot failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/load-retry-page-errors.json" || { log "page error capture failed"; return 1; }
}

whats_new_state() {
  ab --json eval "(() => {
    const visible = (element) => element?.checkVisibility() === true;
    const box = (id) => { const r = document.getElementById(id)?.getBoundingClientRect(); return r ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom } : null; };
    const panel = document.getElementById('whats_new_panel');
    const version = document.getElementById('app_version');
    return {
      settingsDot: visible(document.querySelector('#settings .unseen_dot')),
      menuDot: visible(document.querySelector('#whats_new .unseen_dot')),
      whatsNewButton: visible(document.getElementById('whats_new')),
      menu: visible(document.getElementById('settings_menu')),
      panel: visible(panel),
      releases: [...(panel?.querySelectorAll('article') ?? [])].map((release) => ({ version: release.querySelector('h3')?.textContent ?? null, notes: [...release.querySelectorAll('li')].map((note) => note.textContent) })),
      panelBox: box('whats_new_panel'),
      credit: document.getElementById('credit_line')?.textContent ?? null,
      version: visible(version) ? version.textContent : null,
      creditBox: box('credit_line'),
      versionBox: box('app_version'),
      seen: localStorage.getItem('archive-ocellus:seen-release'),
      focused: document.activeElement?.id || null,
      focusedVisible: visible(document.activeElement),
      viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
    };
  })()" | json data.result
}

open_whats_new_page() {
  ab open "${URL}${MENU_QUERY}" >/dev/null && fight_tick_at_least 0 120000 || { log "the What's new page never took its first P4 step"; return 1; }
}

drive_whats_new() {
  local notes first menu opened small phone closed escape key_menu key_opened key_closed key_escaped reloaded reopened
  notes="$(node scripts/release-notes.mjs)" || { log "release-notes.mjs rejected the changelog"; return 1; }
  echo "$notes" >"$VERIFY_DIR/whats-new-notes.md"
  open_whats_new_page || return 1
  first="$(whats_new_state)" || return 1
  ab screenshot "$VERIFY_DIR/whats-new-unseen.png" >/dev/null || { log "unseen What's new screenshot failed"; return 1; }
  ab click "#settings" >/dev/null && ab wait 300 >/dev/null || { log "the Settings button was not clicked"; return 1; }
  menu="$(whats_new_state)" || return 1
  ab click "#whats_new" >/dev/null && ab wait 300 >/dev/null || { log "the What's new button was not clicked"; return 1; }
  opened="$(whats_new_state)" || return 1
  ab screenshot "$VERIFY_DIR/whats-new-open.png" >/dev/null || { log "open What's new screenshot failed"; return 1; }
  ab set viewport $MENU_SMALL_VIEWPORT >/dev/null && ab wait 300 >/dev/null || return 1
  small="$(whats_new_state)" || return 1
  ab screenshot "$VERIFY_DIR/whats-new-small.png" >/dev/null || { log "small What's new screenshot failed"; return 1; }
  ab set viewport $WHATS_NEW_PHONE_VIEWPORT >/dev/null && ab wait 300 >/dev/null || return 1
  phone="$(whats_new_state)" || return 1
  ab screenshot "$VERIFY_DIR/whats-new-phone.png" >/dev/null || { log "phone What's new screenshot failed"; return 1; }
  ab set viewport 1280 800 >/dev/null && ab wait 300 >/dev/null || return 1
  ab click "#whats_new_close" >/dev/null && ab wait 300 >/dev/null || { log "the What's new Close button was not clicked"; return 1; }
  closed="$(whats_new_state)" || return 1
  open_settings && ab click "#whats_new" >/dev/null && ab wait 300 >/dev/null && ab press Escape >/dev/null && ab wait 300 >/dev/null || { log "Escape was not pressed on the open What's new panel"; return 1; }
  escape="$(whats_new_state)" || return 1
  ab focus "#settings" >/dev/null && ab press Enter >/dev/null && ab press Shift+Tab >/dev/null && ab wait 300 >/dev/null || { log "Settings was not opened from the keyboard"; return 1; }
  key_menu="$(whats_new_state)" || return 1
  ab press Enter >/dev/null && ab wait 300 >/dev/null || { log "Enter was not pressed on What's new"; return 1; }
  key_opened="$(whats_new_state)" || return 1
  ab focus "#whats_new_close" >/dev/null && ab press Enter >/dev/null && ab wait 300 >/dev/null || { log "Enter was not pressed on Close"; return 1; }
  key_closed="$(whats_new_state)" || return 1
  ab focus "#settings" >/dev/null && ab press Enter >/dev/null && ab press Shift+Tab >/dev/null && ab press Enter >/dev/null && ab wait 300 >/dev/null && ab press Escape >/dev/null && ab wait 300 >/dev/null || { log "Escape was not pressed on the keyboard-opened panel"; return 1; }
  key_escaped="$(whats_new_state)" || return 1
  ab --json errors | json data.errors >"$VERIFY_DIR/whats-new-page-errors.json" || { log "page error capture failed"; return 1; }
  open_whats_new_page || return 1
  reloaded="$(whats_new_state)" || return 1
  ab screenshot "$VERIFY_DIR/whats-new-seen.png" >/dev/null || { log "seen What's new screenshot failed"; return 1; }
  ab click "#settings" >/dev/null && ab wait 300 >/dev/null || { log "the reloaded Settings button was not clicked"; return 1; }
  reopened="$(whats_new_state)" || return 1
  ab --json errors | json data.errors >"$VERIFY_DIR/whats-new-reload-page-errors.json" || { log "page error capture failed"; return 1; }
  ab press Escape >/dev/null

  printf '{"first":%s,"menu":%s,"opened":%s,"small":%s,"phone":%s,"closed":%s,"escape":%s,"keyMenu":%s,"keyOpened":%s,"keyClosed":%s,"keyEscaped":%s,"reloaded":%s,"reopened":%s}\n' \
    "$first" "$menu" "$opened" "$small" "$phone" "$closed" "$escape" "$key_menu" "$key_opened" "$key_closed" "$key_escaped" "$reloaded" "$reopened" >"$VERIFY_DIR/whats-new.json"
}

p3_page_done() {
  probe "log()" >"$VERIFY_DIR/$1.json" || { log "$1: fight log capture failed"; return 1; }
  ab console >"$VERIFY_DIR/$1-console.log" 2>&1 || { log "$1: console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/$1-page-errors.json" || { log "$1: page error capture failed"; return 1; }
}

p3_tile_samples() {
  ab --json eval "(() => {
    const probe = window.__archiveOcellusProbe, box = document.querySelector('#world').getBoundingClientRect();
    const at = (tile) => { const p = probe.tileCentre(tile); return p && { x: Math.round(box.x + p.x), y: Math.round(box.y + p.y) }; };
    return Object.fromEntries(Object.entries(${P3_ARENA_TILES}).map(([kind, tiles]) => [kind, tiles.map((tile) => ({ tile, at: at(tile) }))]));
  })()" | json data.result
}

p3_arena_shot() {
  local samples
  fight_tick_at_least "$P3_ARENA_SHOT_TICK" 30000 || { log "the P3 drill never reached P3 tick ${P3_ARENA_SHOT_TICK}"; return 1; }
  samples="$(p3_tile_samples)" || { log "the P3 tile pixels were not read"; return 1; }
  ab screenshot "$VERIFY_DIR/p3-arena.png" >/dev/null || { log "the P3 arena screenshot failed"; return 1; }
  echo "$samples" >"$VERIFY_DIR/p3-arena-tiles.json"
}

drive_p3_drill() {
  ab open "${URL}${P3_QUERY}" >/dev/null || return 1
  fight_tick_at_least 0 120000 || { log "the P3 drill never started"; return 1; }
  canvas_centre || { log "canvas box unreadable"; return 1; }
  click_after_tick "$P3_PRAY_TICK" "$PROTECT_MELEE_RIGHT_PX" "$PROTECT_DOWN_PX" || { log "Protect from Melee was not clicked in P3"; return 1; }
  p3_arena_shot || return 1
  record_boss_bar || { log "the boss bar probe was not installed"; return 1; }
  fight_tick_at_least "$P3_SWINGS_LAST_TICK" 60000 || { log "the P3 drill never reached P3 tick ${P3_SWINGS_LAST_TICK}"; return 1; }
  probe "snapshot()" >"$VERIFY_DIR/p3-snapshot.json"
  ab --json eval "window.__bossBar" | json data.result >"$VERIFY_DIR/p3-boss-bar.json" || { log "P3 boss bar capture failed"; return 1; }
  p3_page_done p3-swings || return 1

  ab open "${URL}${P3_QUERY}" >/dev/null || return 1
  fight_tick_at_least 0 120000 || { log "the P3 panic page never started"; return 1; }
  canvas_centre || { log "canvas box unreadable"; return 1; }
  click_after_tick "$P3_PRAY_TICK" "$PROTECT_MELEE_RIGHT_PX" "$PROTECT_DOWN_PX" || { log "Protect from Melee was not clicked on the panic page"; return 1; }
  if tile_pixel p3-panic "$P3_FAR_EAST_TILE" "$P3_ESCAPE_TICK"; then
    click_after_tick "$P3_ESCAPE_TICK" $((CLICK_X - CX)) $((CLICK_Y - CY)) || { log "the run to the far east was not clicked"; return 1; }
  fi
  fight_tick_at_least "$P3_PANIC_LAST_TICK" 30000 || { log "the panic page never reached P3 tick ${P3_PANIC_LAST_TICK}"; return 1; }
  p3_page_done p3-panic || return 1

  ab open "${URL}${P3_CHAIN_QUERY}" >/dev/null || return 1
  fight_tick_at_least "$P3_CHAIN_LAST_TICK" 180000 || { log "the P3 chain page never reached P3 tick ${P3_CHAIN_LAST_TICK}"; return 1; }
  p3_page_done p3-chain || return 1

  ab open "${URL}${P3_CLEAR_QUERY}" >/dev/null || return 1
  fight_tick_at_least 0 120000 || { log "the P3 interim clear page never started"; return 1; }
  tile_pixel p3-clear "$P3_BOSS_TILE" "$P3_BOSS_CLICK_TICK" || return 1
  canvas_centre || { log "canvas box unreadable"; return 1; }
  click_after_tick "$P3_BOSS_CLICK_TICK" $((CLICK_X - CX)) $((CLICK_Y - CY)) || { log "the P3 boss was not clicked"; return 1; }
  ab wait --fn "window.__archiveOcellusProbe.snapshot().fight?.run.kind === 'ended'" --timeout 30000 >/dev/null || log "the P3 run never reached the 76% break"
  ab wait "$CHAT_POLL_WAIT_MS" >/dev/null
  result_panel >"$VERIFY_DIR/p3-clear-panel.json" || { log "P3 result panel capture failed"; return 1; }
  ab screenshot "$VERIFY_DIR/p3-clear.png" >/dev/null || { log "P3 result screenshot failed"; return 1; }
  p3_page_done p3-clear || return 1
  click_result result_start_p4 || log "Start P4 loaded no new run"
  ab --json eval "(() => { const probe = window.__archiveOcellusProbe, box = document.getElementById('phase'); return { search: location.search, logPhase: probe.log().header.phase ?? null, bossHp: probe.snapshot().fight?.boss.hp ?? null, rejected: probe.snapshot().rejected, phaseBox: box ? box.value : null }; })()" |
    json data.result >"$VERIFY_DIR/p3-start-p4.json" || { log "the P4 page after Start P4 was not read"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/p3-start-p4-page-errors.json" || { log "page error capture failed"; return 1; }
}

pause_by_tab_switch() {
  local trainer
  trainer="$(ab --json tab list | node -e 'let s="";process.stdin.on("data",(d)=>(s+=d)).on("end",()=>console.log(JSON.parse(s).data.tabs.find((tab)=>tab.active).tabId))')" || return 1
  ab tab new about:blank >/dev/null && ab tab close >/dev/null && ab tab "$trainer" >/dev/null || { log "the tab switch that pauses the trainer failed"; return 1; }
  ab wait --fn "window.__archiveOcellusProbe.snapshot().ticking === false && [...document.querySelectorAll('button')].some((button) => button.textContent === 'Resume')" --timeout 5000 >/dev/null ||
    { log "switching tabs did not pause the trainer"; return 1; }
}

click_resume() {
  ab find role button click --name Resume >/dev/null && ab wait --fn "window.__archiveOcellusProbe.snapshot().ticking === true" --timeout 5000 >/dev/null || log "Resume did not restart the trainer"
}

# The WebGL layer reads back blank outside a frame that drew it, so the expected screen waits for a frame callback after a 3D render.
frame_present() {
  local scene="(() => {
    const world = document.querySelector('#world'), area = world.parentElement, edges = world.getBoundingClientRect();
    const box = (e) => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; };
    const meets = (b) => b.width > 0 && b.height > 0 && b.right > edges.left && b.left < edges.right && b.bottom > edges.top && b.top < edges.bottom;
    const covers = (b) => b.left <= edges.left && b.top <= edges.top && b.right >= edges.right && b.bottom >= edges.bottom;
    const layers = [...area.querySelectorAll(':scope > canvas')].filter((canvas) => !canvas.hidden);
    const overlays = [...area.children, ...document.body.children].filter((e) => !layers.includes(e) && !e.contains(world) && getComputedStyle(e).visibility !== 'hidden' && meets(e.getBoundingClientRect()));
    const backdrops = overlays.filter((e) => covers(e.getBoundingClientRect()));
    return { world, box, layers, backdrops, excluded: overlays.flatMap((e) => (backdrops.includes(e) ? [...e.children] : [e])).map(box) };
  })()"
  ab --json eval "new Promise((done) => {
    let clears = window.__webglClears, waited = 0;
    const compose = () => {
      const drew = window.__webglClears !== clears;
      clears = window.__webglClears;
      if (!drew && waited++ < ${PRESENT_FRAME_WAIT_LIMIT}) return requestAnimationFrame(compose);
      const { world, box, layers, backdrops, excluded } = ${scene};
      const expected = new OffscreenCanvas(world.width, world.height), context = expected.getContext('2d');
      context.fillStyle = 'black';
      context.fillRect(0, 0, world.width, world.height);
      for (const layer of layers) context.drawImage(layer, 0, 0);
      for (const backdrop of backdrops) {
        context.fillStyle = getComputedStyle(backdrop).backgroundColor;
        context.fillRect(0, 0, world.width, world.height);
      }
      const frame = {
        ticking: window.__archiveOcellusProbe.snapshot().ticking,
        drew,
        devicePixelRatio,
        centre: window.__archiveOcellusProbe.tileCentre(${PRESENT_CENTRE_TILE}),
        world: { ...box(world), backing: [world.width, world.height] },
        layers: layers.map((layer) => ({ ...box(layer), backing: [layer.width, layer.height] })),
        excluded,
      };
      expected.convertToBlob({ type: 'image/png' }).then((blob) => {
        const reader = new FileReader();
        reader.onload = () => done({ ...frame, expected: String(reader.result).split(',')[1] });
        reader.readAsDataURL(blob);
      });
    };
    requestAnimationFrame(compose);
  })" | node -e '
    let s = "";
    process.stdin.on("data", (d) => (s += d)).on("end", () => {
      const { success, data } = JSON.parse(s);
      if (!success) process.exit(1);
      const { expected, ...frame } = data.result;
      require("fs").writeFileSync(`${process.argv[1]}-expected.png`, Buffer.from(expected, "base64"));
      require("fs").writeFileSync(`${process.argv[1]}.json`, JSON.stringify(frame));
    });
  ' "$VERIFY_DIR/$1" || { log "$1: the expected frame was not composed"; return 1; }
  ab screenshot "$VERIFY_DIR/$1-screen.png" >/dev/null || { log "$1: screenshot failed"; return 1; }
  ab --json eval "${scene}.excluded" | node -e '
    let s = "";
    process.stdin.on("data", (d) => (s += d)).on("end", () => {
      const { success, data } = JSON.parse(s);
      if (!success) process.exit(1);
      const file = `${process.argv[1]}.json`, frame = JSON.parse(require("fs").readFileSync(file, "utf8"));
      require("fs").writeFileSync(file, JSON.stringify({ ...frame, excluded: [...frame.excluded, ...data.result] }));
    });
  ' "$VERIFY_DIR/$1" || { log "$1: the overlays were not measured after the screenshot"; return 1; }
}

camera_still() {
  [[ "$(ab --json eval "new Promise((done) => {
    const seen = [], started = performance.now();
    const look = () => {
      seen.push(JSON.stringify(window.__archiveOcellusProbe.tileCentre($1)));
      if (seen.length >= 5 && seen.slice(-5).every((at) => at === seen.at(-1))) return done(true);
      if (performance.now() - started > 10000) return done(false);
      setTimeout(look, 100);
    };
    look();
  })" | json data.result)" == true ]] || log "the camera never settled on $1"
}

live_present() {
  ab --json eval "({ lost: window.__webglContexts[0].isContextLost(), contexts: window.__webglContexts.length, centre: window.__archiveOcellusProbe.tileCentre(${PRESENT_CENTRE_TILE}) })" |
    json data.result >"$VERIFY_DIR/$1.json" || { log "$1: context state capture failed"; return 1; }
  ab screenshot "$VERIFY_DIR/$1.png" >/dev/null || { log "$1: screenshot failed"; return 1; }
}

drive_layered_present() {
  local BROWSER_SESSION="${BROWSER_SESSION}-present"
  echo "$PRESENT_WEBGL_HOOKS_JS" >"$VERIFY_DIR/present-webgl-hooks.js"
  ab --init-script "$VERIFY_DIR/present-webgl-hooks.js" set viewport 1280 800 >/dev/null || { log "the present session did not start"; return 1; }
  ab open "${URL}${PRESENT_QUERY}" >/dev/null && wait_until_ticking || return 1

  ab set viewport $PRESENT_RESIZED_VIEWPORT >/dev/null || return 1
  ab wait --fn "(([width, height], world) => world.width === width && world.height === height)([${PRESENT_RESIZED_VIEWPORT// /,}], document.querySelector('#world'))" --timeout 5000 >/dev/null ||
    { log "#world never took the ${PRESENT_RESIZED_VIEWPORT} viewport"; return 1; }
  camera_still "$PRESENT_RESIZED_TILE"
  walk_to_tile present-resized "$PRESENT_RESIZED_TILE" "$PRESENT_RESIZED_TILE" || return 1
  pause_by_tab_switch && frame_present present-resized && click_resume || return 1

  ab set viewport $PRESENT_RESIZED_VIEWPORT "$PRESENT_DEVICE_SCALE" >/dev/null || return 1
  ab wait --fn "devicePixelRatio === ${PRESENT_DEVICE_SCALE}" --timeout 5000 >/dev/null || { log "the device scale never became ${PRESENT_DEVICE_SCALE}"; return 1; }
  camera_still "$PRESENT_SCALED_TILE"
  walk_to_tile present-scaled "$PRESENT_SCALED_TILE" "$PRESENT_SCALED_TILE" || return 1
  pause_by_tab_switch && frame_present present-scaled && click_resume || return 1

  ab set viewport 1280 800 >/dev/null && ab wait --fn "devicePixelRatio === 1 && document.querySelector('#world').width === 1280" --timeout 5000 >/dev/null || return 1
  pause_by_tab_switch && frame_present present-paused || return 1
  ab wait "$PRESENT_HOLD_MS" >/dev/null && ab screenshot "$VERIFY_DIR/present-paused-held-screen.png" >/dev/null || { log "held pause screenshot failed"; return 1; }
  click_resume
  probe "snapshot().ticking" >"$VERIFY_DIR/present-resumed.json"

  ab eval "(window.__loseContext = window.__webglContexts[0].getExtension('WEBGL_lose_context')).loseContext()" >/dev/null || { log "the WebGL context could not be lost"; return 1; }
  ab wait "$PRESENT_LOST_MS" >/dev/null && live_present present-context-lost || return 1
  ab eval "window.__loseContext.restoreContext()" >/dev/null || { log "the WebGL context could not be restored"; return 1; }
  ab wait --fn "!window.__webglContexts[0].isContextLost()" --timeout 5000 >/dev/null || log "the WebGL context was never restored"
  ab wait "$PRESENT_LOST_MS" >/dev/null && live_present present-context-restored-live || return 1
  pause_by_tab_switch && frame_present present-context-restored && click_resume || return 1
  ab console >"$VERIFY_DIR/present-console.log" 2>&1 || { log "console capture failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/present-page-errors.json" || { log "page error capture failed"; return 1; }
  ab close >/dev/null 2>&1
}

click_tile_after_tick() {
  tile_pixel "$1" "$2" "$3" || return 1
  canvas_centre || { log "$1: canvas box unreadable"; return 1; }
  click_after_tick "$3" $((CLICK_X - CX)) $((CLICK_Y - CY)) || { log "$1: the click on $2 after P4 tick $3 was not sent"; return 1; }
}

drive_recorded_fights() {
  ab open "${URL}${RECORDED_LEAD_IN_QUERY}" >/dev/null || return 1
  fight_tick_at_least 0 120000 || { log "the lead-in page never started"; return 1; }
  click_tile_after_tick recorded-lead-in "$RECORDED_RING_TILE" 0 || return 1
  click_tile_after_tick recorded-lead-in "$RECORDED_BOSS_TILE" "$RECORDED_LEAD_IN_SHOT_TICK" || return 1
  fight_tick_at_least "$RECORDED_LEAD_IN_LAST_TICK" 30000 || { log "the lead-in page never reached P4 tick ${RECORDED_LEAD_IN_LAST_TICK}"; return 1; }
  ab screenshot "$VERIFY_DIR/recorded-lead-in.png" >/dev/null || { log "lead-in hit screenshot failed"; return 1; }
  p3_page_done recorded-lead-in || return 1

  ab open "${URL}${RECORDED_ORB_QUERY}" >/dev/null || return 1
  fight_tick_at_least 0 120000 || { log "the waiting orb page never started"; return 1; }
  click_tile_after_tick recorded-orb "$RECORDED_ORB_TILE" "$RECORDED_ORB_CLICK_TICK" || return 1
  shot_after_tick $((RECORDED_ORB_LAST_TICK - 2)) 0 recorded-orb-waiting.png || { log "waiting orb screenshot failed"; return 1; }
  fight_tick_at_least "$RECORDED_ORB_LAST_TICK" 30000 || { log "the waiting orb page never reached P4 tick ${RECORDED_ORB_LAST_TICK}"; return 1; }
  ab screenshot "$VERIFY_DIR/recorded-orb-returned.png" >/dev/null || { log "returned orb screenshot failed"; return 1; }
  p3_page_done recorded-orb || return 1

  ab open "${URL}${RECORDED_RIFT_QUERY}" >/dev/null || return 1
  fight_tick_at_least 0 120000 || { log "the rift reset page never started"; return 1; }
  click_tile_after_tick recorded-rift "$RECORDED_NORTH_EAST_RIFT" "$RECORDED_RIFT_FIRST_TICK" || return 1
  click_tile_after_tick recorded-rift "$RECORDED_NORTH_WEST_RIFT" "$RECORDED_RIFT_SECOND_TICK" || return 1
  fight_tick_at_least "$RECORDED_RIFT_LAST_TICK" 30000 || { log "the rift reset page never reached P4 tick ${RECORDED_RIFT_LAST_TICK}"; return 1; }
  p3_page_done recorded-rift || return 1
}

drive_p4_cycle() {
  ab open "${URL}${DRILL_QUERY}" >/dev/null || return 1
  drive_lead_in || return 1
  ab wait --fn "window.__archiveOcellusProbe?.snapshot().ticking === true && window.__archiveOcellusProbe.snapshot().tick >= 8" \
    --timeout 90000 >/dev/null || { log "trainer never started ticking"; return 1; }
  drive_walk && drive_edge && drive_cycle
}

clear_browser() {
  ab set viewport 1280 800 >/dev/null && ab network unroute >/dev/null && ab open "${URL}osrs-assets/manifest.json" >/dev/null &&
    ab eval "localStorage.clear(); sessionStorage.clear()" >/dev/null && ab console --clear >/dev/null && ab errors --clear >/dev/null
}

run_unit() {
  local unit=$1 VERIFY_DIR="$VERIFY_DIR/units/$1" UNIT_LOG= CX= CY= CLICK_X= CLICK_Y= WALK_ORDERS= started=$SECONDS status=0
  mkdir -p "$VERIFY_DIR" || return 1
  log "unit ${unit}"
  UNIT_LOG="$VERIFY_DIR/unit.log"
  clear_browser || { log "the browser was not cleared before ${unit}"; status=1; }
  [[ $status -ne 0 ]] || "drive_${unit}" || status=$?
  [[ -n "$CX" ]] || canvas_centre >/dev/null 2>&1
  [[ -z "$CX" ]] || printf '{"x":%d,"y":%d}\n' "$CX" "$CY" >"$VERIFY_DIR/canvas-centre.json"
  node scripts/verify/judge.mjs "$unit" "$VERIFY_DIR" "$status" $((SECONDS - started))
}

drive() {
  ab set viewport 1280 800 >/dev/null || return 1
  # A new browser's first screenshot takes about 10 s, longer than the hidden lead-in, so it goes to a blank page.
  ab open about:blank >/dev/null && ab screenshot "$VERIFY_DIR/warm-up.png" >/dev/null || { log "warm-up screenshot failed"; return 1; }
  local unit
  for unit in "${BROWSER_UNITS[@]}"; do
    run_unit "$unit"
  done
  node scripts/verify/report.mjs "$VERIFY_DIR" "${BROWSER_UNITS[@]}"
}

release_browser() {
  ab close >/dev/null 2>&1
  agent-browser --session "${BROWSER_SESSION}-autoplay" close >/dev/null 2>&1
  agent-browser --session "${BROWSER_SESSION}-mobile" close >/dev/null 2>&1
  agent-browser --session "${BROWSER_SESSION}-stored-view" close >/dev/null 2>&1
  agent-browser --session "${BROWSER_SESSION}-present" close >/dev/null 2>&1
  [[ -n "$LAUNCHED_PID" && -f "$STATE_FILE" && "$(state pid)" == "$LAUNCHED_PID" ]] || return 0
  stop
}

stage_browser() {
  BROWSER_SESSION="archive-ocellus-verify-$(basename "$VERIFY_DIR")"
  LAUNCHED_PID=
  local result=1
  trap 'release_browser; exit 130' INT TERM
  if serve && doctor; then
    drive
    result=$?
  fi
  release_browser || result=1
  trap - INT TERM
  return $result
}

production_listener() {
  VERIFY_PORT=$PRODUCTION_PORT port_listener
}

watch_production_page() {
  local name=$1
  ab wait --fn "window.__orbs?.first !== null" --timeout 90000 >/dev/null || log "${name}: the minimap orbs never drew their numbers"
  sleep "$PRODUCTION_WATCH_SECONDS"
  ab --json eval "({ text: document.body.innerText, orbs: window.__orbs })" | json data.result >"$VERIFY_DIR/${name}.json" || { log "${name}: page state capture failed"; return 1; }
  ab screenshot "$VERIFY_DIR/${name}.png" >/dev/null || { log "${name}: screenshot failed"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/${name}-page-errors.json" || { log "${name}: page error capture failed"; return 1; }
}

drive_production() {
  local url="http://127.0.0.1:${PRODUCTION_PORT}/${PRODUCTION_QUERY}" opened deadline
  echo "$PRODUCTION_ORBS_JS" >"$VERIFY_DIR/production-orbs.js"
  ab --init-script "$VERIFY_DIR/production-orbs.js" set viewport 1280 800 >/dev/null || { log "the production session did not start"; return 1; }
  ab open "$url" >/dev/null || return 1
  watch_production_page production || return 1

  ab open about:blank >/dev/null || return 1
  ab network har start --content none >/dev/null || { log "HAR recording did not start"; return 1; }
  ab network route "http://127.0.0.1:${PRODUCTION_PORT}/*.png" --abort >/dev/null || { log "the SDK image route was not set"; return 1; }
  ab network requests --clear >/dev/null || return 1
  ab open "$url" >/dev/null &
  opened=$!
  deadline=$((SECONDS + 90))
  until [[ "$(ab --json network requests --filter ".png" | json data.requests.length)" -gt 0 ]]; do
    (( SECONDS < deadline )) || { log "the page never requested an SDK image"; ab network unroute >/dev/null; wait "$opened"; return 1; }
  done
  ab network unroute >/dev/null || { log "the SDK image route was not lifted"; return 1; }
  wait "$opened" || return 1
  watch_production_page production-dropped-images || return 1
  ab network har stop "$VERIFY_DIR/production-dropped-images.har" >/dev/null || { log "HAR capture failed"; return 1; }

  node -e '
    const fs = require("fs"), [dir, port, expectedOrbs] = process.argv.slice(1);
    const read = (name) => JSON.parse(fs.readFileSync(`${dir}/${name}`, "utf8"));
    const statuses = {};
    for (const { request, response } of read("production-dropped-images.har").log.entries) {
      if (new RegExp(`^http://127\\.0\\.0\\.1:${port}/[^/]+\\.png$`).test(request.url)) (statuses[request.url] ??= []).push(response.status);
    }
    const dropped = Object.entries(statuses).filter(([, attempts]) => attempts[0] === 0);
    const page = (name) => {
      const { text, orbs } = read(`${name}.json`);
      return {
        loaded: !text.includes("Loading failed"),
        orbs,
        errors: read(`${name}-page-errors.json`).map((error) => error.text ?? error.message ?? String(error)).slice(0, 3),
        errorCount: read(`${name}-page-errors.json`).length,
      };
    };
    const [clean, retried] = ["production", "production-dropped-images"].map(page);
    const orbsDrawn = ({ orbs }) => orbs.first !== null && JSON.stringify(orbs.first) === expectedOrbs && orbs.last.length === 4 && orbs.blankSinceFirst === 0;
    const checks = {
      productionLoads: clean.loaded,
      productionOrbsShowNumbers: orbsDrawn(clean),
      noProductionPageErrors: clean.errorCount === 0,
      droppedSdkImagesRetried: dropped.length > 0 && dropped.every(([, attempts]) => attempts[attempts.length - 1] === 200),
      productionLoadsAfterDroppedImages: retried.loaded,
      orbsShowNumbersAfterDroppedImages: orbsDrawn(retried),
      noPageErrorsAfterDroppedImages: retried.errorCount === 0,
    };
    console.log(JSON.stringify({ clean, retried, dropped: dropped.map(([url, attempts]) => ({ url, attempts })), checks }, null, 2));
    process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
  ' "$VERIFY_DIR" "$PRODUCTION_PORT" "$PRODUCTION_ORBS" >"$VERIFY_DIR/production-checks.json"
  local verdict=$?
  cat "$VERIFY_DIR/production-checks.json"
  [[ $verdict -eq 0 ]] || log "a production check failed"
  drive_production_hidden_p3 || verdict=1
  return $verdict
}

drive_production_hidden_p3() {
  ab open "http://127.0.0.1:${PRODUCTION_PORT}/${PRODUCTION_P3_QUERY}" >/dev/null || return 1
  ab eval '(() => {
    const bars = window.__bossBars = [];
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...rest) {
      if (/^\d+ \/ \d+ \(\d+\.\d%\)$/.test(String(text)) && !bars.includes(String(text))) bars.push(String(text));
      return fillText.call(this, text, ...rest);
    };
  })()' >/dev/null || { log "the production boss bar probe was not installed"; return 1; }
  ab wait --fn "window.__bossBars.length > 0" --timeout 90000 >/dev/null || log "the production page never drew a boss bar"
  ab click "#settings" >/dev/null && ab wait 300 >/dev/null || { log "the production Settings button was not clicked"; return 1; }
  ab --json eval "(() => {
    const box = (id) => { const r = document.getElementById(id)?.getBoundingClientRect(); return r ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom } : null; };
    return { search: location.search, bars: window.__bossBars, menuOpen: document.getElementById('settings_menu')?.checkVisibility() === true, setupBox: document.getElementById('setup') !== null, phaseBox: document.getElementById('phase') !== null, comingSoon: document.getElementById('coming_soon')?.textContent ?? null, controlsBox: box('drill_controls'), footerBox: box('credits') };
  })()" |
    json data.result >"$VERIFY_DIR/production-phase-p3.json" || { log "the production phase=p3 page was not read"; return 1; }
  ab --json errors | json data.errors >"$VERIFY_DIR/production-phase-p3-page-errors.json" || { log "page error capture failed"; return 1; }
  node -e '
    const fs = require("fs"), [dir, entryBar] = process.argv.slice(1);
    const page = JSON.parse(fs.readFileSync(`${dir}/production-phase-p3.json`, "utf8"));
    const errors = JSON.parse(fs.readFileSync(`${dir}/production-phase-p3-page-errors.json`, "utf8"));
    const checks = {
      phaseP3OpensP4: page.search === "?phase=p3&seed=1" && page.bars[0] === entryBar && errors.length === 0,
      noPhaseBox: page.menuOpen && page.setupBox && !page.phaseBox,
      comingSoonBelowClearButtons: page.comingSoon === "Phases 1 to 3 coming soon." && page.controlsBox.bottom <= page.footerBox.top,
    };
    console.log(JSON.stringify({ page, errors: errors.length, checks }, null, 2));
    process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
  ' "$VERIFY_DIR" "$BOSS_BAR_AT_ENTRY" >"$VERIFY_DIR/production-phase-p3-checks.json"
  local verdict=$?
  cat "$VERIFY_DIR/production-phase-p3-checks.json"
  [[ $verdict -eq 0 ]] || log "a hidden P3 production check failed"
  return $verdict
}

release_production() {
  ab close >/dev/null 2>&1
  [[ -n "$PRODUCTION_PID" ]] || return 0
  kill "$PRODUCTION_PID" 2>/dev/null
  wait "$PRODUCTION_PID" 2>/dev/null
  [[ -z "$(production_listener)" ]] || { log "port ${PRODUCTION_PORT} is still held by $(production_listener)"; return 1; }
  log "production: static server PID ${PRODUCTION_PID} is gone"
}

production_port_free() {
  case "$PRODUCTION_PORT" in 8000 | 8001 | "$VERIFY_PORT")
    log "port ${PRODUCTION_PORT} belongs to another server; refusing to use it"
    return 1
    ;;
  esac
  [[ -z "$(production_listener)" ]] || { log "port ${PRODUCTION_PORT} is already in use by PID $(production_listener)"; return 1; }
}

serve_static() {
  python3 -m http.server "$PRODUCTION_PORT" --bind 127.0.0.1 --directory "$1" >"$2" 2>&1 &
  PRODUCTION_PID=$!
  log "started static server PID ${PRODUCTION_PID} on http://127.0.0.1:${PRODUCTION_PORT}/"
  for _ in $(seq 1 30); do
    curl -sf -o /dev/null "http://127.0.0.1:${PRODUCTION_PORT}/" && return 0
    sleep 0.5
  done
  log "the static server never answered"
  return 1
}

stage_production() {
  production_port_free || return 1
  manifest_ready || { log "assets missing: run scripts/verify.sh assets"; return 1; }
  ARCHIVE_P2=off ARCHIVE_P3=off node node_modules/.bin/webpack --mode production --output-path "$VERIFY_DIR/production" >"$VERIFY_DIR/production-build.log" 2>&1 || { log "the production build failed"; return 1; }

  local BROWSER_SESSION="archive-ocellus-verify-$(basename "$VERIFY_DIR")-production" PRODUCTION_PID= result=1
  trap 'release_production; exit 130' INT TERM
  if serve_static "$VERIFY_DIR/production" "$VERIFY_DIR/production-server.log"; then
    drive_production
    result=$?
  fi
  release_production || result=1
  trap - INT TERM
  return $result
}

perf_gate() {
  json "$1" <"$PERF_GATE"
}

perf_base_revision() {
  local base
  base="$(git rev-parse --verify "${VERIFY_PERF_BASE:-$(git merge-base origin/main HEAD)}^{commit}")" || { log "perf: no base revision; set VERIFY_PERF_BASE"; return 1; }
  log "perf: comparing against base ${base}"
  echo "$base" >"$VERIFY_DIR/perf/base-revision"
}

build_perf_base() {
  local base src="$VERIFY_DIR/perf/base-src"
  base="$(cat "$VERIFY_DIR/perf/base-revision")"
  mkdir -p "$src/public" && git archive "$base" | tar -x -C "$src" || { log "perf: the base tree could not be exported"; return 1; }
  ln -s "$ROOT/public/osrs-assets" "$src/public/osrs-assets"
  if git diff --quiet "$base" -- package.json package-lock.json scripts/install-beta-sdk.sh; then
    ln -s "$ROOT/node_modules" "$src/node_modules"
  else
    log "perf: the base pins other dependencies; installing them"
    (cd "$src" && npm ci --no-audit --no-fund && scripts/install-beta-sdk.sh) >"$VERIFY_DIR/perf/base-install.log" 2>&1 || { log "perf: the base install failed"; return 1; }
  fi
  (cd "$src" && node node_modules/.bin/webpack --mode production --output-path "$VERIFY_DIR/perf/www/base") >"$VERIFY_DIR/perf/base-build.log" 2>&1 || { log "perf: the base build failed"; return 1; }
  rm -rf "$src"
}

perf_tab() {
  ab --json tab list | json data.tabs.0.targetId
}

release_throttle() {
  [[ -n "$THROTTLE_PID" ]] || return 0
  kill "$THROTTLE_PID" 2>/dev/null
  wait "$THROTTLE_PID" 2>/dev/null
  log "perf: CPU throttle holder PID ${THROTTLE_PID} is gone"
  THROTTLE_PID=
}

throttle_perf() {
  local log_file="$VERIFY_DIR/perf/throttle.log"
  : >"$log_file"
  node --import tsx src/perf/devtools.ts throttle "$(ab get cdp-url)" "$(perf_tab)" "$(perf_gate workload.cpuThrottleRate)" >"$log_file" 2>&1 &
  THROTTLE_PID=$!
  for _ in $(seq 1 60); do
    grep -q "^throttled" "$log_file" && { log "perf: $(cat "$log_file"), PID ${THROTTLE_PID}"; return 0; }
    kill -0 "$THROTTLE_PID" 2>/dev/null || break
    sleep 0.5
  done
  log "perf: the CPU throttle did not start: $(cat "$log_file")"
  return 1
}

perf_capture() {
  local name=$1 side=$2 until=$3 heap_from=${4:-} at
  ab open about:blank >/dev/null && ab open "http://127.0.0.1:${PRODUCTION_PORT}/${side}/$(perf_gate workload.query)#perf" >/dev/null || { log "perf: the ${name} page did not open"; return 1; }
  for at in $heap_from "$until"; do
    ab wait --fn "window.__perfGate.p4Tick() >= ${at}" --timeout $((until * 600 + 120000)) >/dev/null || { log "perf: the ${name} run did not reach P4 tick ${at}"; return 1; }
    [[ -z "$heap_from" ]] || node --import tsx src/perf/devtools.ts heap "$(ab get cdp-url)" "$(perf_tab)" >>"$VERIFY_DIR/perf/heap.log" || { log "perf: no heap reading at P4 tick ${at} of ${name}"; return 1; }
  done
  ab --json eval "JSON.stringify(window.__perfGate.capture())" | json data.result >"$VERIFY_DIR/perf/captures/${name}.json" || { log "perf: the ${name} capture could not be read"; return 1; }
  [[ -z "$THROTTLE_PID" ]] || kill -0 "$THROTTLE_PID" 2>/dev/null || { log "perf: the CPU throttle ended during ${name}: $(cat "$VERIFY_DIR/perf/throttle.log")"; return 1; }
  log "perf: captured ${name}"
}

drive_perf() {
  local mode=$1 pair side order
  ab --init-script "$ROOT/src/perf/observer.js" set viewport 1280 800 >/dev/null || { log "the perf session did not start"; return 1; }
  if [[ $mode == pairs ]]; then
    throttle_perf || return 1
    for pair in $(seq 1 "$(perf_gate timing.pairs)"); do
      order=(base head)
      ((pair % 2 == 0)) && order=(head base)
      for side in "${order[@]}"; do
        perf_capture "${side}-${pair}" "$side" "$(perf_gate workload.window.to)" || return 1
      done
    done
    release_throttle
  fi
  perf_capture long head "$(perf_gate workload.resources.to)" "$(perf_gate workload.resources.from)" || return 1
  VERIFY_PERF_BASE="$(cat "$VERIFY_DIR/perf/base-revision")" node node_modules/.bin/tsx src/perf/check.ts "$PERF_GATE" "$VERIFY_DIR/perf/captures" "$VERIFY_DIR/perf/www/head" "$mode" >"$VERIFY_DIR/perf-checks.json"
}

stage_perf() {
  perf_stage pairs
}

stage_perfbudgets() {
  perf_stage no-pairs
}

perf_stage() {
  local mode=$1
  production_port_free || return 1
  manifest_ready || { log "assets missing: run scripts/verify.sh assets"; return 1; }
  mkdir -p "$VERIFY_DIR/perf/captures"
  node node_modules/.bin/webpack --mode production --output-path "$VERIFY_DIR/perf/www/head" >"$VERIFY_DIR/perf/head-build.log" 2>&1 || { log "perf: the head build failed"; return 1; }
  perf_base_revision || return 1
  [[ $mode == no-pairs ]] || build_perf_base || return 1

  local BROWSER_SESSION="archive-ocellus-verify-$(basename "$VERIFY_DIR")-perf" PRODUCTION_PID= THROTTLE_PID= result=1
  trap 'release_throttle; release_production; exit 130' INT TERM
  if serve_static "$VERIFY_DIR/perf/www" "$VERIFY_DIR/perf/server.log"; then
    drive_perf "$mode"
    result=$?
  fi
  release_throttle
  release_production || result=1
  trap - INT TERM
  return $result
}

all_units() {
  local module
  for module in scripts/verify/units/*.mjs; do basename "$module" .mjs; done
}

plan() {
  local base changed
  base="$(git rev-parse --verify "${VERIFY_PLAN_BASE:-$(git merge-base origin/main HEAD)}^{commit}")" || { log "plan: no base revision; set VERIFY_PLAN_BASE"; return 1; }
  mapfile -t changed < <(git diff --name-only --no-renames "$base" && git ls-files --others --exclude-standard)
  log "plan: ${#changed[@]} paths changed since ${base}"
  node node_modules/.bin/tsx src/verifyPlan/main.ts scripts/verify-impact.json scripts/verify/units "$@" -- "${changed[@]}"
}

judge_evidence() {
  local dir=$1 unit units=("${@:2}")
  [[ ${#units[@]} -gt 0 ]] || mapfile -t units < <(ls "$dir/units")
  for unit in "${units[@]}"; do
    node scripts/verify/judge.mjs "$unit" "$dir/units/$unit" 0 "$(json seconds <"$dir/units/$unit/verdict.json" 2>/dev/null || echo 0)"
  done
  node scripts/verify/report.mjs "$dir" "${units[@]}"
}

case "${1:-}" in
  serve) mkdir -p "$VERIFY_DIR" "$ROOT/.verify" && ensure_deps && serve && doctor && log "drive ${URL}; evidence in ${VERIFY_DIR}; stop with scripts/verify.sh stop"; exit $? ;;
  doctor) doctor; exit $? ;;
  stop) stop; exit $? ;;
  units) all_units; exit 0 ;;
  plan) plan "${@:2}"; exit $? ;;
  judge) [[ -d "${2:-}/units" ]] || { log "usage: scripts/verify.sh judge <evidence dir> [unit...]"; exit 2; }; judge_evidence "${@:2}"; exit $? ;;
  report) [[ -d "${2:-}/units" ]] || { log "usage: scripts/verify.sh report <evidence dir>"; exit 2; }; node scripts/verify/report.mjs "$2" $(all_units); exit $? ;;
esac

stages=() BROWSER_UNITS=() BROWSER_SHARD=
while [[ $# -gt 0 ]]; do
  case "$1" in
    --unit) [[ -n "${2:-}" ]] || { log "--unit needs a unit name"; exit 2; }; BROWSER_UNITS+=("$2"); shift 2 ;;
    --shard) [[ "${2:-}" =~ ^[1-9][0-9]*/[1-9][0-9]*$ ]] || { log "--shard needs INDEX/COUNT, such as 3/8"; exit 2; }; BROWSER_SHARD=$2; shift 2 ;;
    t0) stages+=(bundle build types test parity); shift ;;
    *) stages+=("$1"); shift ;;
  esac
done
[[ ${#stages[@]} -gt 0 ]] || stages=(assets build types test browser production)
for stage in "${stages[@]}"; do
  case "$stage" in bundle | build | types | test | parity | assets | browser | production | perf | perfbudgets) ;; *) log "unknown stage: ${stage}"; exit 2 ;; esac
done
if [[ " ${stages[*]} " == *" browser "* ]]; then
  [[ ${#BROWSER_UNITS[@]} -gt 0 ]] || mapfile -t BROWSER_UNITS < <(all_units)
  [[ -z "$BROWSER_SHARD" ]] || mapfile -t BROWSER_UNITS < <(node scripts/verify/shard.mjs scripts/verify/unit-seconds.json "${BROWSER_SHARD%/*}" "${BROWSER_SHARD#*/}" "${BROWSER_UNITS[@]}")
  [[ ${#BROWSER_UNITS[@]} -gt 0 ]] || { log "browser shard ${BROWSER_SHARD} has no units"; exit 2; }
  for unit in "${BROWSER_UNITS[@]}"; do
    [[ -f "scripts/verify/units/${unit}.mjs" ]] && declare -F "drive_${unit}" >/dev/null || { log "unknown browser unit ${unit}; scripts/verify.sh units lists them"; exit 2; }
  done
elif [[ ${#BROWSER_UNITS[@]} -gt 0 || -n "$BROWSER_SHARD" ]]; then
  log "--unit and --shard select browser units; add the browser stage"
  exit 2
fi

mkdir -p "$VERIFY_DIR" "$ROOT/.verify"
ensure_deps || { echo "FAIL deps" | tee "$VERIFY_DIR/summary.txt"; exit 1; }
log "evidence: ${VERIFY_DIR}"
failed=0
: >"$VERIFY_DIR/summary.txt"
for stage in "${stages[@]}"; do
  if "stage_$stage"; then
    echo "PASS $stage" | tee -a "$VERIFY_DIR/summary.txt"
  else
    echo "FAIL $stage" | tee -a "$VERIFY_DIR/summary.txt"
    failed=1
  fi
done
exit $failed
