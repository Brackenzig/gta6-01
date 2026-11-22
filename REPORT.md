# SOLMAR — build report

## What it is
SOLMAR is an open-world crime game in a sun-soaked coastal city of its own:
an 8×8 grid city with a beach and marina, traffic and pedestrians, cars to
steal and drive, a five-star wanted level with pursuing police cruisers and
officers on foot, four story jobs for fixer Mara Voss, combat (punching),
cash pickups, ranks, a live minimap, synthesised sound, and a save system.
No Rockstar/GTA names, art, map or music anywhere — the city, characters,
vehicles and story are all original.

## Files (all written in the recorded session)
- `game/index.html` — import map (`three` → vendored three.module.min.js),
  HUD + overlay markup and CSS.
- `game/src/config.js` — tuning, road grid, districts, ranks, the 4 jobs.
- `game/src/rng.js` — seeded RNG (mulberry32); `?seed=` rebuilds one city.
- `game/src/city.js` — streets, towers (canvas window textures), palms,
  street/traffic lights, beach, ocean, marina boats, building colliders.
- `game/src/traffic.js` — 14 lane-following cars + the shared car factory.
- `game/src/pedestrians.js` — sidewalk walkers, fleeing, cash drops.
- `game/src/player.js` — walk/run, punch, steal/drive cars, damage, cash.
- `game/src/police.js` — wanted 0–5, cruiser pursuit + ramming, officers,
  busts, wanted decay.
- `game/src/missions.js` — the 4-job loop (Courier, Getaway, Grand Theft,
  Marina Heist) with gold beacon, timer and escalating payouts.
- `game/src/hud.js` — cash/rank/district, stars, health, speed, mission
  banner + objective + timer, live 2D minimap.
- `game/src/audio.js` — WebAudio synth: engine, sirens, jingles, impacts.
- `game/src/input.js` — keyboard/mouse state with edge-triggered presses.
- `game/src/camera.js` — chase / high / front cameras (front looks back so
  a chase shot frames the player's car with the police behind it).
- `game/src/shots.js` — `?shot=<name>&seed=1` stages each screenshot and
  flags `window.__shotReady` when the scene settles.
- `game/src/main.js` — bootstrap, state machine (menu/playing/paused/
  busted/wasted), save/load, game loop.
- `game/vendor/three.module.min.js` — vendored three.js (kit file).
- `main.ts` — Node 22 stdlib: copies game/ + screenshots/ to the output
  dir and writes dossier.json via buildDossier.
- `shots.json` — the four shot URLs.
- `screenshots/` — 1-chase.jpg (95,551 B), 2-street.jpg (101,313 B),
  3-drive.jpg (56,955 B), 4-mission.jpg (67,834 B); all 1280×720, ≤256 KiB.

## Screenshots (what each shows)
1. **1-chase.jpg (cover)** — front camera: the player's red car with a
   police cruiser behind it, three wanted stars, minimap, mission objective.
2. **2-street.jpg** — on foot at a Downtown intersection: traffic car,
   towers, palms, street lights, mission banner.
3. **3-drive.jpg** — coastal drive: ocean, sand, palms, boats, a car at speed.
4. **4-mission.jpg** — on foot at the Marina pickup under the gold beacon.

## Verification (all done in-session, headless Chrome 159 + swiftshader)
- Every screenshot inspected visually; the cover shows the chase, three
  stars, minimap and objective together. The road centre dashes read large
  at intersections (a big yellow cross) — a marking, not a defect.
- Interactive play test via CDP, zero console errors, zero failed requests:
  menu → START → J starts "Courier Run" → W walks → E steals a traffic car
  (driver bails, wanted 1, a cruiser spawns) → W drives (96 km/h) → E exits
  → F punches a ped (cash $250 → $342). All state transitions verified.
- `MAKEFUN_OUTPUT_DIR=/tmp/out1 node main.ts` and `/tmp/out2` run twice:
  outputs byte-identical (`diff -r` clean); dossier.json sha256
  `3903913584770451205533f67796444f4ed40af18b70168b10651904e079e5fe`.
- Kit check (`node cli/makefun.mjs check --kit . --repo … --worktree`):
  **4 passed, 0 failed, 16 skipped, 5 at submission** — the transcript
  checks run on the server from the sealed recordings; the 5 at-submission
  items (repo public / owner / created after open / commit in repo /
  duplicate snapshot) are for submit time.

## Known limits
- Headless swiftshader renders at a few fps, so screenshot runs need a
  long wait (about 20 s per shot); on a real GPU the game runs at full speed.
- The judge sees the game mostly through the screenshots; the dossier
  outline shows the module/function names (one job per file, as required).

## For submit (parent)
- Recording `01a200e9-0439-7320-8aed-a14abd006747` is running (log
  `~/.makefun/record-gta6-01.log`). Before sealing it, write the usage rows
  to `~/.makefun/muse-usage-gta6-01.jsonl` with the SELECT the record log
  prints (agent_id of this session + any subagents), then stop the recording
  and wait for the seal line.
- The make.fun account has no GitHub login, so the submitted commit needs
  `.makefun/owner.json` with the payout wallet (same fix as news-image v1,
  whose first submit was refused on repo_owner). Verify the at-submission
  items before the first submit attempt — a refusal costs a daily entry.
- Push via the browser, then submit from the kit dir with
  `--recording <id> --repo-url https://github.com/Brackenzig/gta6-01
  --commit <sha> --title "SOLMAR — open-world crime game" --keypair
  <wallet keypair>`. Prizes are escrowed, so the entry must be signed.
- Test server (if re-shooting): `node serve.ts --port 8901` in gta6-01/.
