# Ezekiel inventory, special attacks, and dodge energy

The default melee setup wears Inquisitor armour and uses the scythe on crush. The crimson kisten and elder maul occupy the first two slots of the third inventory row. The harmonised staff and ancestral robe top complete that row. Bastion and super combat potions begin the fourth row, followed by the occult necklace and ancestral robe bottom. Each completed sword or finale dodge that avoids damage restores three special attack points on its resolution tick, capped at 100.

## Sub-features

- `zeke-inventory` keeps ranged switches in the first two rows, with the cape before the ring. Special weapons and magic switches share the third row. Boost potions and the remaining magic switches share the fourth row, followed by six brews and six restores.
- `zeke-crush` keeps the scythe on crush when equipped from either starting setup and after switching back.
- `zeke-specials` equips either weapon through inventory clicks and activates its special through the special attack orb. Each costs 50 points. A landed elder maul special reduces current Defence by 35%.
- `zeke-dodge-energy` restores three points once for each safe completed dodge. Acceptance, cancellation, unsafe landings, and ordinary movement restore nothing.

## How to get to it (user POV)

- Open `/?seed=1&invincible=on` for the default melee setup. Open `/?seed=1&setup=ranged&invincible=on` for the ranged setup.
- Press the inventory key, initially F4, to switch equipment or drink supplies.
- Open `/?seed=1&phase=finale&invincible=on` for consecutive lightning dodges.

## Driving it with agent-browser

Preconditions: Use the verification skill's `serve` and `doctor` commands. Set the viewport to 1280 by 800. Use an isolated browser session. Read `window.__zekeProbe`, which is available in development builds. Save snapshots and screenshots before and after each action, followed by console output and page errors.

- Open: `agent-browser open 'http://127.0.0.1:8002/?seed=1&invincible=on'`. Wait with `agent-browser wait --fn 'window.__zekeProbe?.snapshot()?.tick >= 1' --timeout 90000`.
- Inventory: `agent-browser press F4`. Read `agent-browser eval 'window.__zekeProbe.snapshot()'`. The equipped helmet, chest, and legs have IDs 24419, 24420, and 24421. The attack style is `AGGRESSIVE (CRUSH)`. Inventory indices 8 through 15 are 33631, 21003, 24423, 21021, 22461, 12695, 12002, and 21024.
- Magic switch: Click the final two third-row slots at page coordinates (1203,572) and (1242,572), then the final two fourth-row slots at (1203,604) and (1242,604). Send mouse move, down, and up for each click. After the next tick, the equipped weapon, chest, necklace, and legs have IDs 24423, 21021, 12002, and 21024. Click the same slots again to restore melee gear and check the scythe's crush style.
- Kisten: Click (1125,572). Wait for equipped weapon 33631. Click the special orb at (1140,157), then attack the boss. Read its projected tile with `window.__zekeProbe.tileCentre({x:5,y:6})`, add the canvas bounding rectangle's origin, and click 30 pixels above that point. Special energy falls from 100 to 50.
- Maul: On a fresh page, click (1164,572), then the special orb and the boss. Check equipped weapon 21003 and energy 50. A successful delayed hit reduces the boss's current Defence.
- Dodge: On the finale page, spend a special first. Click the projection of (4,5) during encounter tick 16. At tick 17, the snapshot shows that landing and three additional special points. The log records `successful-dodge` on tick 17. Repeat with (4,6) at tick 17 and (4,4) at tick 18. Each safe dodge restores another three points.
- Tests: Run `scripts/verify.sh t0` on Node 22. `test/zeke/loadout.test.ts` drives SDK equipment and attacks against `TestNpc`. `test/zeke/dodgeEnergy.test.ts` covers resolution timing, unsafe landings, cancellation, duplicate inputs, and the cap through the SDK world.

## Gotchas

- Slot coordinates assume the default panel scale and a 1280 by 800 viewport. Project floor clicks through the read-only probe because the camera follows the player.
- The boots and arrows are shared between setups. The second row ends with the switching cape and ring.
- The energy orb starts at 100, so spend a special before checking restoration. Passive special regeneration can also increase energy on later ticks.
- Invincibility does not make an unsafe dodge eligible for restoration. Use the hazard outcome, not the player's remaining HP, to judge success.
- Generated gear models, item icons, special effects, and animations require `scripts/verify.sh assets`. Generated files remain ignored.
