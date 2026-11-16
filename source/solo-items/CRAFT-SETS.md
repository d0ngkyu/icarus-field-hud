# Category filters and crafting sets · 0.3.7

## Data and behavior
- Local installed `data.pak` D_ItemsStatic tags/traits produce nine exclusive categories plus All; category and case-insensitive Korean/English/template search intersect. Unclassified items remain in Other, never hidden from All. Counts: materials198, tools/weapons509, armor/bags204, food/drinks244, medicine56, building/furniture768, benches/equipment425, farming/animals124, other461 (total2989).
- Seven recipe-based material sets: basic workshop (Crafting_Bench + Stone_Furnace + Anvil_Bench), Carpentry_Bench, Masonry_Bench, Armor_Bench, Herbalism_Bench, Machining_Bench, Fabricator.
- Inputs are direct ingredient quantities from local D_ProcessorRecipes. Shared ingredients merge; static IDs resolve to catalog templates (exact template ID preferred). Finished items are not granted. Blueprint unlocks and required crafting stations remain necessary. Inventory contents, perks, discounts and weights are not calculated.
- `assets/library.json` stores category mapping, recipe IDs, set totals and SHA256 of the extracted recipe table. `tools/BuildLibrary.cjs <D_ItemsStatic.json> <D_ProcessorRecipes.json>` regenerates it. No data extraction at runtime. Embedded resource keeps old updater's nine-file package contract.
- Set dialog displays ingredient pictures/names/quantities and multiplier. Maximum multiplier is floor(1000 / base total); total cap1000, at most20 distinct kinds. Clicking Prepare queues once; explicit in-game F11 executes. Main window update application is deferred while the modal is open. Preview mode cannot queue requests or update mods.

## Protocol and safety
- Legacy `id|timestamp|item|quantity` remains supported.
- Sets: `id|timestamp|SET|Fiber:60,Wood:82,...` (max4096 bytes, unique catalog IDs, positive integer counts). All names and native templates are checked before any generation; malformed/unknown/duplicate/oversized sets execute zero calls.
- 25 total calls per game-thread batch, 100ms delay, 30-second processing timeout and 2-minute queued request expiry unchanged. Only primitive identity values persist across delay callbacks. Host/one-player/world identity checks repeat for each batch; cancel by request UUID stops the remainder and does not remove prior items. F11 replay and repeated presses do not duplicate consumed requests.
- SENT/WORKING counts describe function calls, not independently confirmed inventory receipts. Actual delivery/FPS not verified by mocks.

## Verification
- Lua/Fengari21 tests: mixed1000 across40 batches, cross-kind cancellation, invalid late entry/template preflight,20/21 kind boundaries, malformed/oversized messages, host/multiplayer/world transitions, existing single item regression.
- C# library/self/image/connection/layout checks. Library checks all categories, intersection search, seven exact totals and multiplier rejection; renders every set at max multiplier at560×560 and760×650 and checks child bounds. Main layout4 sizes×8 tabs.
- Windows preview showed category control and recommendation button. User input/preview closure prevented further interactive dialog checks. Offscreen WinForms rendering verified material rows/icons/quantities, explanations and actions; native combo/spinner text is not captured reliably offscreen. No actual game request was generated.
