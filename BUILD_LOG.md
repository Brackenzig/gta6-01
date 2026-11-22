# SOLMAR — rebuild log (Sun 2026-11-22, recorded session)

## Why a rebuild
The first SOLMAR build (19 Nov) is intact on disk, but its recording
(01a1f207) died unsealed in a VM restart, so it cannot be entered. This
rebuild re-authors every pre-existing file in a fresh recorded session
(recording 01a200e9-0439-7320-8aed-a14abd006747, started ~08:40 WIB;
this session began after it). The surviving code was a reference only —
no file was copied in.

## What was rewritten (in-session, via write tool calls)
- `game/src/` — all 14 modules (2,274 lines): config, rng, input, audio,
  camera, city, traffic, pedestrians, player, police, missions, hud,
  shots, main.
- `game/index.html`, `main.ts`, `serve.ts`, `shots.json`, `README.md`,
  `REPORT.md`.
- Untouched (kit/metadata): LICENSE, `.makefun/owner.json` (payout wallet
  8nMG39HRvJLTaK3LwaKAQSUc76GCkTCv73cZZJEpwByz), `vendor/makefun-game.ts`,
  `game/vendor/three.module.min.js`.
- Screenshots re-shot in-session (Nov 22 01:46–01:47, headless Chrome 159):
  1-chase 95,551 B, 2-street 101,313 B, 3-drive 56,955 B, 4-mission 67,834 B;
  all 1280×720, ≤256 KiB.

## Verification
- Play-test via CDP (headless Chrome + swiftshader): menu → START →
  J ("Courier Run") → W walk → E steal a traffic car (driver bails,
  wanted 1, cruiser spawns) → W drive (96 km/h) → E exit → F punch a ped
  (cash $250 → $342). Zero console errors, zero failed requests
  (added a data: favicon to index.html to silence the favicon 404).
- Screenshots read visually: cover shows the chase, 3 wanted stars,
  minimap and objective together; street shows on-foot play + traffic +
  towers; drive shows the coast, ocean, palms, boats; mission shows the
  gold beacon at 22 m. Road centre dashes read large at intersections
  (a big yellow cross) — a marking, not a defect.
- `main.ts` deterministic: two runs byte-identical; dossier.json sha256
  `3903913584770451205533f67796444f4ed40af18b70168b10651904e079e5fe`.
- Kit check (`check --kit . --repo … --worktree`): **4 passed, 0 failed,
  16 skipped, 5 at submission**. The transcript checks run on the server
  from the sealed recordings.

## Game
SOLMAR: 8×8 coastal city, traffic + pedestrians, steal/drive cars,
5-star wanted + police, 4 story jobs for Mara Voss, punch combat, cash
pickups, ranks, live minimap, WebAudio synth, save system. No Rockstar
names, art, map or music.

## For the parent (push / bundle / submit)
- Recording 01a200e9 is still running — do NOT stop it until the usage
  rows are written to `~/.makefun/muse-usage-gta6-01.jsonl` (SELECT from
  the record log; this session's agent_id is
  8b6e89ee-2021-4d80-97df-9dddb1a46936), then stop it and wait for the seal.
- Push via browser to Brackenzig/gta6-01, verify at-submission items
  (repo public, owner.json, commit in repo), then submit with
  `--recording 01a200e9-0439-7320-8aed-a14abd006747 --keypair <wallet>`.
- Competition closes Tue 24 Nov 22:00 WIB; submit by Mon evening for a
  grading buffer.
