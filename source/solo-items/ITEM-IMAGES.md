# Item images · 0.3.6

- Existing project HUD atlas reused for this personal tool. Game artwork remains the property of its owners; no AI replacement artwork.
- Source: `files/game/Icarus/Binaries/Win64/ue4ss/Mods/IcarusHUD/hud/icons.webp` and matching `source/mod/hud/index.html` at feature base `9a1e6aedbba287c85d626e653200f46bfe8b15c3`.
- Original WebP SHA256: `9e827fad4e4d4539d1577726a3136d1c63661e3426b9e753f6cbb4f79f03621f`.
- Catalog template -> static ID -> HUD atlas index. No fuzzy name matching. 2,155/2,989 mapped; 834 without artwork use a neutral box and “이미지 준비 중”.
- Atlas: 48 columns, 48px cells, 2304×2064. PNG palette compression (1,529,921 bytes) slightly reduces color precision. One decoded bitmap (~18MiB) shared by visible rows and the selection preview; no per-item bitmap cache, network calls, polling, or game memory reads.
- Images and mapping embedded in the exe, preserving the nine-file package allowlist accepted by existing 0.3.x updaters.
- Rebuild: `node tools/BuildItemImages.cjs <matching HUD index.html> <icons.webp>` with `sharp` available. Build.ps1 embeds `assets/items.png` and `assets/item-images.json`.
- `--image-test` checks resources/mapping/known and missing rendering; `--layout-test` checks four sizes and eight tabs. `--image-preview` is a developer-only read-only window: requests, settings actions, startup mod synchronization, updates and window preference writes disabled.
- Suggestions only (not implemented): favorites/recent items, category filters, saved item-and-quantity sets. Actual inventory delivery and game FPS are not validated by image UI tests.
