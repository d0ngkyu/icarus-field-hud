-- IcarusHUD: sends the recipe you are looking at to the second-monitor HUD.
-- F8 = show this item on the HUD (replaces the list)
-- F9 = add this item to the HUD list
local KEY_SHOW = Key.F8
local KEY_ADD  = Key.F9
local KEY_INV  = Key.F10  -- refresh inventory counts only
local NEAR_CM  = 5000     -- storage within 50 m counts as "near"
local OUTS = {}
do
    local src = debug.getinfo(1, "S").source or ""
    local dir = src:match("^@?(.*)[/\\][Ss]cripts[/\\][^/\\]*$")
    if dir then table.insert(OUTS, dir .. "\\hud\\live.js") end
    table.insert(OUTS, "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Icarus\\Icarus\\Binaries\\Win64\\ue4ss\\Mods\\IcarusHUD\\hud\\live.js")
    table.insert(OUTS, "ue4ss/Mods/IcarusHUD/hud/live.js")
    table.insert(OUTS, "Mods/IcarusHUD/hud/live.js")
end
local OUT = nil
local MODDIR = nil
do
    local src = debug.getinfo(1, "S").source or ""
    MODDIR = src:match("^@?(.*)[/\\][Ss]cripts[/\\][^/\\]*$")
end

local function fileExists(p)
    local f = p and io.open(p, "r")
    if f then f:close() return true end
    return false
end
-- semi-automatic helpers (F3-F6) only run when the switch file exists (HUD settings turn it on)
-- features the HUD program switched off after a crash (one word per line), or everything extra in safe mode
local FEAT_OFF = {}
local SAFE = MODDIR and fileExists(MODDIR .. "\\safe_mode.txt") or false
pcall(function()
    local f = io.open(MODDIR .. "\\features_off.txt", "r")
    if f then for line in f:lines() do local w = line:match("^%s*([%w_]+)") if w then FEAT_OFF[w] = true end end f:close() end
end)
local function on(feat) return not SAFE and not FEAT_OFF[feat] end
local MACROS = MODDIR and fileExists(MODDIR .. "\\macros_on.txt") and on("macros") or false
-- what the mod is busy with right now: if the game falls over, the HUD program reads this to know why
local lastStep = nil
local function step(name)
    if name == lastStep then return end
    lastStep = name
    pcall(function()
        local f = io.open(MODDIR .. "\\diag_step.txt", "w")
        if f then f:write(name, "|", os.time(), "\n") f:close() end
    end)
end
-- copying map pictures out of the game is only needed on the machine that builds updates
local DEVMODE = MODDIR and fileExists(MODDIR .. "\\dev.txt") or false
local function MacroBind(key, fn)
    if MACROS then RegisterKeyBind(key, function() step("macro") fn() end) end
end

local function openOut()
    local errs = {}
    if OUT then local f = io.open(OUT, "w") if f then return f end end
    for _, p in ipairs(OUTS) do
        local f, e = io.open(p, "w")
        if f then OUT = p return f end
        table.insert(errs, tostring(e))
    end
    return nil, table.concat(errs, " | ")
end

local seq = os.time() % 100000 * 10

local function log(s) print("[IcarusHUD] " .. tostring(s) .. "\n") end

local function rowName(widget, prop)
    local ok, name = pcall(function()
        return widget[prop].RowName:ToString()
    end)
    if ok and name and name ~= "" and name ~= "None" then return name end
    return nil
end

local function flag(widget, fn)
    local ok, v = pcall(function() return widget[fn](widget) end)
    return ok and v == true
end

local function parentValid(w)
    local ok, v = pcall(function() local p = w:GetParent() return p ~= nil and p:IsValid() end)
    return ok and v == true
end

local function findRecipe()
    local best, bestScore, cands = nil, -1, 0
    for _, cls in ipairs({ "UMG_Processor_C", "UMG_Processor_Skinning_C", "UMG_Processor_FoodTrough_T4_C" }) do
        local list = FindAllOf(cls)
        if list then
            for _, w in ipairs(list) do
                if w:IsValid() and not string.find(w:GetFullName(), "Default__", 1, true) then
                    local n = rowName(w, "LastSelected")
                    local vis, vp = flag(w, "IsVisible"), flag(w, "IsInViewport")
                    local foc, par = flag(w, "HasFocusedDescendants") or flag(w, "HasAnyUserFocus"), parentValid(w)
                    local score = (vis and 4 or 0) + (foc and 3 or 0) + (par and 2 or 0) + (vp and 1 or 0)
                    cands = cands + 1
                    if n and score >= bestScore and score > 0 then best, bestScore = n, score end
                end
            end
        end
    end
    if best then return best, "bench score " .. bestScore end
    -- hand crafting tab (inventory screen)
    local handName, handOpen = nil, false
    local list = FindAllOf("UMG_Crafting_C")
    if list then
        for _, w in ipairs(list) do
            if w:IsValid() and not string.find(w:GetFullName(), "Default__", 1, true)
               and not string.find(w:GetFullName(), "/Game/", 1, true) then
                local n = rowName(w, "Recipe")
                if n then
                    handName = n
                    handOpen = flag(w, "HasFocusedDescendants") or flag(w, "HasAnyUserFocus")
                end
            end
        end
    end
    if handName and handOpen then return handName, "hand" end
    -- item held in hand (building pieces, deployables, tools)
    local okH, held = pcall(function()
        local pawn = require("UEHelpers").GetPlayer()
        local fd = pawn.FocusedItemData
        local inv, slot = fd.FocusedItemInventory, fd.FocusedItemSlot
        if not inv or not inv:IsValid() then return nil end
        local found = nil
        inv.Slots.Slots:ForEach(function(_, e)
            local sl = e:get()
            if not found and sl.Index == slot then
                local n = sl.ItemData.ItemStaticData.RowName:ToString()
                if n and n ~= "" and n ~= "None" then found = n end
            end
        end)
        return found
    end)
    if okH and held and held ~= "Player_Fist" then return held, "held", true end
    if not okH then log("held item read failed: " .. tostring(held)) end
    if handName then return handName, "hand-last" end
    return nil, "none of " .. cands
end

local UEHelpers = require("UEHelpers")

local function addSlots(inv, into)
    local n = 0
    local slots = inv.Slots.Slots
    slots:ForEach(function(_, e)
        local ok = pcall(function()
            local item = e:get().ItemData
            local name = item.ItemStaticData.RowName:ToString()
            if name == nil or name == "" or name == "None" then return end
            local count = 1
            item.ItemDynamicData:ForEach(function(_, d)
                local dd = d:get()
                if dd.PropertyType == 7 then count = dd.Value end
            end)
            if count < 1 then count = 1 end
            into[name] = (into[name] or 0) + count
            n = n + 1
        end)
    end)
    return n
end

local function scanInventory(full)
    local bag, near, cls, boxes, stats = {}, {}, {}, {}, { bag = 0, near = 0, skip = 0, err = 0 }
    local pawn = UEHelpers.GetPlayer()
    if not pawn or not pawn:IsValid() then return nil, "no player" end
    local pawnTag = "." .. pawn:GetFullName():match("[^.]*$") .. "."
    local ploc = pawn:K2_GetActorLocation()
    local list = FindAllOf("Inventory")
    if not list then return nil, "no inventories" end
    for _, inv in ipairs(list) do
        local ok, err = pcall(function()
            if not inv:IsValid() then return end
            local full = inv:GetFullName()
            if string.find(full, "Default__", 1, true) then return end
            if string.find(full, pawnTag, 1, true) then
                addSlots(inv, bag) stats.bag = stats.bag + 1
                return
            end
            if string.find(full, "PlayerCharacter", 1, true) or string.find(full, "InventoryContainerManager", 1, true)
               or string.find(full, "Wild", 1, true) or string.find(full, "Corpse", 1, true) then
                stats.skip = stats.skip + 1 return
            end
            local outer = inv:GetOuter()
            local loc = outer:K2_GetActorLocation()
            local dx, dy, dz = loc.X - ploc.X, loc.Y - ploc.Y, loc.Z - ploc.Z
            local cname = "?"
            pcall(function() cname = outer:GetClass():GetFName():ToString() end)
            local key = outer:GetFullName()
            if full then
                local box = boxes[key]
                if not box then box = { c = cname, x = loc.X, y = loc.Y, z = loc.Z, items = {} } boxes[key] = box end
                addSlots(inv, box.items)
            end
            if dx * dx + dy * dy + dz * dz <= NEAR_CM * NEAR_CM then
                addSlots(inv, near) stats.near = stats.near + 1
                cls[cname] = 1
            else
                stats.skip = stats.skip + 1
            end
        end)
        if not ok then stats.err = stats.err + 1 stats.lastErr = tostring(err) end
    end
    return { bag = bag, near = near, cls = cls, boxes = boxes }, string.format("bag inv=%d near inv=%d skipped=%d errors=%d %s",
        stats.bag, stats.near, stats.skip, stats.err, stats.lastErr or "")
end

local ORE_KEEP = 6  -- nearest N per ore type

local LAST_ORES = {}
local function scanOres(keep)
    local pawn = UEHelpers.GetPlayer()
    if not pawn or not pawn:IsValid() then return {}, "no player" end
    local ploc = pawn:K2_GetActorLocation()
    local byType, seen, total, errs = {}, {}, 0, 0
    local function add(kind, name, a)
        local loc = a:K2_GetActorLocation()
        local dx, dy, dz = loc.X - ploc.X, loc.Y - ploc.Y, loc.Z - ploc.Z
        local t = kind .. ":" .. name
        byType[t] = byType[t] or {}
        table.insert(byType[t], { d = dx * dx + dy * dy + dz * dz, x = loc.X, y = loc.Y, z = loc.Z, a = a })
        total = total + 1
    end
    local function each(classes, fn)
        for _, cn in ipairs(classes) do
            local list = FindAllOf(cn)
            if list then
                for _, a in ipairs(list) do
                    local ok = pcall(function()
                        if not a:IsValid() then return end
                        local full = a:GetFullName()
                        if seen[full] or string.find(full, "Default__", 1, true) then return end
                        seen[full] = true
                        fn(a)
                    end)
                    if not ok then errs = errs + 1 end
                end
            end
        end
    end
    each({ "VoxelResource" }, function(a)
        local n = a.NonDeterministicVoxelSetup.RowName:ToString()
        if n == nil or n == "" or n == "None" then n = a.VoxelSetupRow.RowName:ToString() end
        if n and n ~= "" and n ~= "None" then add("v", n, a) end
    end)
    each({ "ResourceDeposit" }, function(a)
        local n = a.Type.RowName:ToString()
        if n and n ~= "" and n ~= "None" then add("d", n, a) end
    end)
    each({ "CaveEntranceBase" }, function(a) add("c", "Cave", a) end)
    each({ "BP_OilGeyser_C" }, function(a) add("g", "Oil", a) end)
    each({ "BP_EnzymeGeyser_C" }, function(a) add("g", "Enzyme", a) end)
    each({ "IcarusNPCGOAPCharacter" }, function(a)
        add("a", a:GetClass():GetFName():ToString(), a)
    end)
    local out, types = {}, 0
    LAST_ORES = {}
    for t, list in pairs(byType) do
        types = types + 1
        table.sort(list, function(p, q) return p.d < q.d end)
        local kept = 0
        for _, o in ipairs(list) do
            if kept >= (keep or ORE_KEEP) then break end
            local mined = false
            pcall(function() mined = (o.a:GetVoxelFullyMined() == true) end)
            if not mined then
                table.insert(LAST_ORES, { t = t, x = o.x, y = o.y, z = o.z })
                table.insert(out, string.format('["%s",%.0f,%.0f,%.0f]', (t:gsub('[^%w_:%-%.]', '')), o.x, o.y, o.z))
                kept = kept + 1
            end
        end
    end
    return out, string.format("ores total=%d types=%d errors=%d", total, types, errs)
end

-- landmarks for the map (caves, deep ore veins, geysers) - cheap, runs every 30 s
local lastLm = ""
local function worldName()
    local n = "?"
    pcall(function() n = UEHelpers.GetWorld():GetFullName():match("([%w_]+)$") end)
    return n or "?"
end

-- the whole map's caves, deep ore veins and exotic spots are listed in the world settings (also far away / unexplored)
local wsCache, wsWorld, wsNote = nil, nil, false
local function softName(p)
    local n = nil
    for _, f in ipairs({
        function() return p:ToString() end,
        function() return p.SoftObjectPtr.ObjectID.AssetPathName:ToString() end,
        function() return p.ObjectID.AssetPathName:ToString() end,
        function() return p.AssetPathName:ToString() end,
        function() return p:get():GetFullName() end,
        function() return tostring(p) end,
    }) do
        local ok, v = pcall(f)
        if ok and type(v) == "string" and v:find("CAVE_", 1, true) then n = v break end
    end
    return n
end
local function worldSettingsMarks()
    local w = nil
    pcall(function() w = UEHelpers.GetWorld():GetFullName() end)
    if wsCache and w == wsWorld then return wsCache end
    local out = {}
    -- every map piece has its own settings object: take caves from all of them, veins from the fullest one
    local ws, best, cands, withCaves = nil, -1, 0, 0
    local nc, nd, nx, unk = 0, 0, 0, 0
    local seenCave = {}
    for _, cand in ipairs(FindAllOf("IcarusWorldSettings") or {}) do
        pcall(function()
            if not cand:IsValid() or string.find(cand:GetFullName(), "Default__", 1, true) then return end
            cands = cands + 1
            local n = cand.DeepMiningOreDepositSpawnLocations:GetArrayNum() + cand.ExoticVoxelSpawnLocations:GetArrayNum()
            if n > best then ws, best = cand, n end
            if cand.CaveLocations:GetArrayNum() > 0 then
                withCaves = withCaves + 1
                cand.CaveLocations:ForEach(function(_, e)
                    local v = e:get()
                    local l = v.Location
                    local key = math.floor(l.X / 500) .. ":" .. math.floor(l.Y / 500)
                    if seenCave[key] then return end
                    seenCave[key] = true
                    local pn = softName(v.Prefab)
                    local id = pn and pn:match("CAVE_([%w_]+)") or nil
                    if not id then unk = unk + 1 end
                    table.insert(out, string.format('["w:%s",%.0f,%.0f,%.0f]', (id or "Cave"):gsub('[^%w_]', ''), l.X, l.Y, l.Z))
                    nc = nc + 1
                end)
            end
        end)
    end
    if not ws then
        if not wsNote then log("whole-map marks: no world settings found") wsNote = true end
        return out
    end
    pcall(function()
        ws.DeepMiningOreDepositSpawnLocations:ForEach(function(_, e)
            local t = e:get().Translation
            table.insert(out, string.format('["e:Deep",%.0f,%.0f,%.0f]', t.X, t.Y, t.Z)) nd = nd + 1
        end)
    end)
    pcall(function()
        ws.ExoticVoxelSpawnLocations:ForEach(function(_, e)
            local t = e:get().Translation
            table.insert(out, string.format('["x:Exotic",%.0f,%.0f,%.0f]', t.X, t.Y, t.Z)) nx = nx + 1
        end)
    end)
    local wsSum = nc .. "/" .. nd .. "/" .. nx
    if wsSum ~= wsLastSum then
        wsLastSum = wsSum
        log(string.format("whole-map marks: %d caves (%d without size) from %d of %d settings, %d deep veins, %d exotic spots", nc, unk, withCaves, cands, nd, nx))
        wsNote = true
    end
    if nc > 0 and nd + nx > 0 then wsCache, wsWorld = out, w end
    return out
end

local function scanLandmarks()
    local out, sum = {}, 0
    step("worldmarks")
    local okW, wm = true, {}
    if on("worldmarks") then okW, wm = pcall(worldSettingsMarks) end
    step("landmarks")
    if okW and wm then for _, m in ipairs(wm) do table.insert(out, m) end sum = sum + #wm * 7 else log("world marks failed: " .. tostring(wm)) end
    local function each(cn, kind, nameFn)
        local list = FindAllOf(cn)
        if not list then return end
        for _, a in ipairs(list) do
            pcall(function()
                if not a:IsValid() or string.find(a:GetFullName(), "Default__", 1, true) then return end
                local l = a:K2_GetActorLocation()
                if l.X == 0 and l.Y == 0 then return end
                local n = nameFn(a)
                if not n or n == "" or n == "None" then return end
                table.insert(out, string.format('["%s:%s",%.0f,%.0f,%.0f]', kind, (n:gsub('[^%w_%-%.]', '')), l.X, l.Y, l.Z))
                sum = sum + math.floor(l.X / 100) + math.floor(l.Y / 100)
            end)
        end
    end
    each("CaveEntranceBase", "c", function() return "Cave" end)
    each("ResourceDeposit", "d", function(a) return a.Type.RowName:ToString() end)
    each("BP_OilGeyser_C", "g", function() return "Oil" end)
    each("BP_EnzymeGeyser_C", "g", function() return "Enzyme" end)
    -- world bosses: the game shares their spawn points with everyone (same as the in-game map)
    step("bosses")
    for _, sp in ipairs(WORLD_READY and on("bosses") and FindAllOf("WorldBossSpawner") or {}) do
        pcall(function()
            if not sp:IsValid() or string.find(sp:GetFullName(), "Default__", 1, true) then return end
            local l = sp:K2_GetActorLocation()
            if l.X == 0 and l.Y == 0 then return end
            local row = sp.WorldBoss.RowName:ToString()
            if not row or row == "" or row == "None" then return end
            local dead = sp.bHasBossBeenKilled and 1 or 0
            table.insert(out, string.format('["b:%s#%d",%.0f,%.0f,%.0f,%d]', row:gsub('[^%w_]', ''), sp.BossID or 0, l.X, l.Y, l.Z, dead))
            sum = sum + math.floor(l.X / 1000) + dead * 7
        end)
    end
    step("landmarks")
    local sig = #out .. ":" .. sum
    if sig == lastLm then return nil end
    lastLm = sig
    return "[" .. table.concat(out, ",") .. "]"
end

local function jsonBoxes(boxes)
    local parts = {}
    for _, b in pairs(boxes) do
        if next(b.items) ~= nil then
            local items = {}
            for k, v in pairs(b.items) do table.insert(items, string.format('"%s":%.0f', (k:gsub('[^%w_%-%.]', '')), v)) end
            table.insert(parts, string.format('{"c":"%s","p":[%.0f,%.0f,%.0f],"i":{%s}}', (b.c:gsub('[^%w_%-%.]', '')), b.x, b.y, b.z, table.concat(items, ",")))
        end
    end
    return "[" .. table.concat(parts, ",") .. "]"
end

local function jsonKeys(t)
    local parts = {}
    for k, _ in pairs(t) do table.insert(parts, '"' .. (k:gsub('[^%w_%-%.]', '')) .. '"') end
    return "[" .. table.concat(parts, ",") .. "]"
end

local function jsonMap(t)
    local parts = {}
    for k, v in pairs(t) do
        table.insert(parts, string.format('"%s":%.0f', (k:gsub('[^%w_%-%.]', '')), v))
    end
    return "{" .. table.concat(parts, ",") .. "}"
end

local function poseJson()
    local pawn = UEHelpers.GetPlayer()
    if not pawn or not pawn:IsValid() then return nil end
    local l = pawn:K2_GetActorLocation()
    local yaw = 0
    pcall(function() yaw = pawn:GetControlRotation().Yaw end)
    return string.format('[%.0f,%.0f,%.0f,%.0f]', l.X, l.Y, l.Z, yaw)
end

-- growth coach: blueprint unlock state, level and points
local BP_NAMES = nil
local lastProg, lastProgJson = "", nil

local function loadNames()
    if BP_NAMES then return BP_NAMES end
    local ok, t = pcall(require, "bp_names")
    if not ok or type(t) ~= "table" then
        ok, t = pcall(dofile, (MODDIR or ".") .. "\\Scripts\\bp_names.lua")
    end
    if ok and type(t) == "table" then BP_NAMES = t else BP_NAMES = {} log("bp_names.lua not loaded: " .. tostring(t)) end
    return BP_NAMES
end

local lastQuick = ""
local function readProgress(force)
    local t0 = os.clock()
    local pc = UEHelpers.GetPlayerController()
    if not pc or not pc:IsValid() then return nil end
    local ps = pc.PlayerState
    if not ps or not ps:IsValid() then return nil end
    local bm = ps.BlueprintTalentController.Model
    local lvl, bpp, tp = -1, -1, -1
    pcall(function() lvl = bm:GetLevel() end)
    pcall(function() bpp = bm:GetAvailablePoints() end)
    pcall(function() tp = ps.PlayerTalentController.Model:GetAvailablePoints() end)
    if lvl < 0 then return nil end   -- still loading into the world
    local quick = string.format("%d|%d|%d", lvl, bpp, tp)
    if not force and quick == lastQuick and lastProgJson then return nil end
    lastQuick = quick
    local unl, errs, firstErr = {}, 0, nil
    for _, n in ipairs(loadNames()) do
        local ok, v = pcall(function()
            return bm:IsTalentUnlocked({ RowName = FName(n), DataTableName = FName("D_Talents") })
        end)
        if ok then
            if v == true then table.insert(unl, '"' .. n .. '"') end
        else
            errs = errs + 1
            firstErr = firstErr or tostring(v)
        end
    end
    local sig = string.format("%d|%d|%d|%s", lvl, bpp, tp, table.concat(unl, ","))
    local dt = (os.clock() - t0) * 1000
    if sig ~= lastProg then
        lastProg = sig
        log(string.format("progress: level %d, blueprint points %d, talent points %d, %d/%d unlocked, %d errors %s (%.0f ms)",
            lvl, bpp, tp, #unl, #loadNames(), errs, firstErr or "", dt))
        lastProgJson = string.format('{"lvl":%d,"bpp":%d,"tp":%d,"u":[%s]}', lvl, bpp, tp, table.concat(unl, ","))
        return lastProgJson
    end
    return nil
end

local function send(mode)
    step("key_" .. tostring(mode))
    ExecuteInGameThread(function()
        local ok, err = pcall(function()
            local name, src, isItem = nil, "", false
            if mode ~= "inv" then
                name, src, isItem = findRecipe()
                if not name then log("no recipe selected (open a bench and click an item first)") end
            end
            local invJson = "null"
            local full = (mode == "inv")
            local okInv, data, info = pcall(scanInventory, full)
            if okInv and data then
                local navJson = ""
                if full then
                    local t0 = os.clock()
                    local oreJson = "[]"
                    local okO, ores, oinfo = pcall(scanOres)
                    if okO then oreJson = "[" .. table.concat(ores, ",") .. "]" log(tostring(oinfo)) else log("ore scan failed: " .. tostring(ores)) end
                    navJson = ',"box":' .. jsonBoxes(data.boxes) .. ',"ore":' .. oreJson
                    log(string.format("ore scan took %.0f ms", (os.clock() - t0) * 1000))
                end
                if full then pcall(function() lastProg = "" end) end
                invJson = '{"bag":' .. jsonMap(data.bag) .. ',"near":' .. jsonMap(data.near) .. ',"cls":' .. jsonKeys(data.cls) .. navJson .. '}'
                log("inventory: " .. tostring(info))
            else
                log("inventory scan failed: " .. tostring(okInv and info or data))
            end
            if not name and invJson == "null" then return end
            local poseNow, progNow = nil, nil
            if mode == "inv" then local okP, pj = pcall(readProgress, true) if okP then progNow = pj or lastProgJson else log("progress read failed: " .. tostring(pj)) end end
            pcall(function() poseNow = poseJson() end)
            seq = seq + 1
            local f, e = openOut()
            if not f then log("cannot write: " .. tostring(e)) return end
            f:write(string.format('window.__icarusLive&&window.__icarusLive({"t":%d,"%s":"%s","add":%s,"inv":%s%s%s});\n',
                seq, isItem and "i" or "r", name and (name:gsub('[\\"]', '')) or "", mode == "add" and "true" or "false", invJson,
                poseNow and (',"p":' .. poseNow) or "", progNow and (',"prog":' .. progNow) or ""))
            f:close()
            if name then log(mode .. " " .. name .. " (" .. src .. ")") end
        end)
        if not ok then log("error: " .. tostring(err)) end
    end)
end

-- automatic refresh: the player's own items (every 1.5 s) and position/facing (every 0.75 s)
local AUTO_MS = 750
local bagInvs, bagAge, lastBag, lastBagJson, lastPose, autoBusy, autoMax, tick = nil, 0, "", "{}", "", false, 0, 0

local function findBagInvs()
    local out = {}
    local pawn = UEHelpers.GetPlayer()
    if not pawn or not pawn:IsValid() then return out end
    local pawnTag = "." .. pawn:GetFullName():match("[^.]*$") .. "."
    local list = FindAllOf("Inventory")
    if list then
        for _, inv in ipairs(list) do
            if inv:IsValid() and string.find(inv:GetFullName(), pawnTag, 1, true) then table.insert(out, inv) end
        end
    end
    return out
end

local function scanBag()
    bagAge = bagAge + 1
    local stale = (bagInvs == nil) or (#bagInvs == 0) or (bagAge >= 40)
    if not stale then
        for _, inv in ipairs(bagInvs) do if not inv:IsValid() then stale = true break end end
    end
    if stale then bagInvs = findBagInvs() bagAge = 0 end
    if #bagInvs == 0 then return false end
    local bag = {}
    for _, inv in ipairs(bagInvs) do pcall(addSlots, inv, bag) end
    local keys = {}
    for k, v in pairs(bag) do table.insert(keys, k .. ":" .. v) end
    table.sort(keys)
    local sig = table.concat(keys, ",")
    if sig == lastBag then return false end
    lastBag = sig
    lastBagJson = jsonMap(bag)
    return true
end


-- the game's own map fog: which map tiles you have uncovered (same as the in-game map)
local lastFogSig, fogAt = nil, -1000
local FOG_EVERY = 800  -- ticks of 750 ms = 10 minutes
fogNow = false
local function readFog(force)
    if not lastPose then return nil end
    local mm = nil
    for _, c in ipairs(FindAllOf("MapManager_C") or {}) do
        if c:IsValid() and not string.find(c:GetFullName(), "Default__", 1, true) then mm = c break end
    end
    if not mm then return nil end
    local t0 = os.clock()
    local ts = mm.TileSize
    local tr = mm.MapCorner.Translation
    local cx, cy = tr.X, tr.Y
    if not ts or ts <= 0 then return nil end
    local out, hexd, open, nc = {}, "0123456789abcdef", 0, 0
    mm.FogData:ForEach(function(_, re)
        local row = re:get()
        local parts, acc, bits, n = {}, 0, 0, 0
        row.ColumnTiles:ForEach(function(_, ce)
            local v = ce:get()
            v = tonumber(v) or 4
            n = n + 1
            acc = acc * 2 + ((v ~= 4) and 1 or 0)
            if v ~= 4 then open = open + 1 end
            bits = bits + 1
            if bits == 4 then local k = acc + 1 parts[#parts + 1] = hexd:sub(k, k) acc, bits = 0, 0 end
        end)
        if bits > 0 then acc = acc * math.floor(2 ^ (4 - bits)) local k = acc + 1 parts[#parts + 1] = hexd:sub(k, k) end
        if n > nc then nc = n end
        out[#out + 1] = table.concat(parts)
    end)
    local nr = #out
    if nr == 0 or nr > 600 then return nil end
    local sig = nr .. ":" .. open
    if not force and sig == lastFogSig then return nil end
    lastFogSig = sig
    -- which way round the table is: your own tile must be uncovered
    local o = 0
    pcall(function()
        local px, py = lastPose and lastPose:match("^%[(%-?[%d%.]+),(%-?[%d%.]+)")
        px, py = tonumber(px), tonumber(py)
        if not px then return end
        local ix, iy = math.floor((px - cx) / ts) + 1, math.floor((py - cy) / ts) + 1
        local function at(r, c)
            local row = out[r] if not row or c < 1 then return nil end
            local k = math.floor((c - 1) / 4) + 1
            local ch = row:sub(k, k) if ch == "" then return nil end
            local val = tonumber(ch, 16)
            return math.floor(val / (2 ^ (3 - (c - 1) % 4))) % 2 == 1
        end
        local a, b = at(ix, iy), at(iy, ix)
        if a and not b then o = 1 elseif b and not a then o = 2 end
    end)
    log(string.format("map fog: %dx%d tiles of %.0f cm, %d uncovered, layout %d (%.0f ms)", nr, nc, ts, open, o, (os.clock() - t0) * 1000))
    return string.format('{"cx":%.0f,"cy":%.0f,"ts":%.0f,"o":%d,"r":["%s"]}', cx, cy, ts, o, table.concat(out, '","'))
end

WORLD_READY = false
local function autoTick()
    local t0 = os.clock()
    step("tick")
    tick = tick + 1
    local bagChanged = false
    if tick % 2 == 0 then bagChanged = scanBag() end
    local pose = poseJson()
    local poseChanged = pose ~= nil and pose ~= lastPose
    WORLD_READY = pose ~= nil and tick > 60
    local dt = (os.clock() - t0) * 1000
    if dt > autoMax + 5 then autoMax = dt log(string.format("tick took %.0f ms", dt)) end
    local withInv = bagChanged or (tick % 20 == 0)
    local lmJ = nil
    if tick % 40 == 7 then
        step("landmarks")
        local okL, lj = true, nil
        if on("landmarks") then okL, lj = pcall(scanLandmarks) end
        step("idle")
        if okL then lmJ = lj else log("landmark scan failed: " .. tostring(lj)) end
    end
    local oreJ = nil
    if tick % 80 == 41 then
        local okO, list = pcall(scanOres, 40)
        if okO and type(list) == "table" and #list > 0 then oreJ = "[" .. table.concat(list, ",") .. "]" end
    end
    local fogJ = nil
    -- reading the game's fog table crashed the game once (2026-11-14 08:55, step "fog"), so read it
    -- rarely: once after the world loads, then every 10 minutes, or on F10 (at most once a minute)
    local fogFirst = fogAt < 0 and lastPose ~= nil and tick > 60
    local fogDue = fogFirst or (fogAt >= 0 and tick % FOG_EVERY == 13) or (fogNow and tick > 20 and tick - fogAt >= 80)
    if fogNow and not fogDue and tick - fogAt < 80 then fogNow = false end
    if fogDue then
        fogAt = tick
        step("fog")
        local okF, fj = true, nil
        if on("fog") then okF, fj = pcall(readFog, fogFirst or fogNow) end
        step("idle")
        fogNow = false
        if okF then fogJ = fj else log("map fog read failed: " .. tostring(fj)) end
    end
    local progJ = nil
    if tick % 20 == 3 then
        step("progress")
        local okP, pj = true, nil
        if on("progress") then okP, pj = pcall(readProgress) end
        step("idle")
        if okP then progJ = pj else log("progress read failed: " .. tostring(pj)) end
    end
    if not poseChanged and not withInv and not progJ and not lmJ and not oreJ and not fogJ then return end
    if pose then lastPose = pose end
    seq = seq + 1
    local f = openOut()
    if not f then return end
    f:write(string.format('window.__icarusLive&&window.__icarusLive({"t":%d,"auto":true,"w":"%s"%s%s%s%s%s%s});\n', seq, worldName(), oreJ and (',"ore":' .. oreJ) or "",
        pose and (',"p":' .. pose) or "", withInv and (',"inv":{"bag":' .. lastBagJson .. '}') or "",
        progJ and (',"prog":' .. progJ) or "", lmJ and (',"lm":' .. lmJ) or "", fogJ and (',"fog":' .. fogJ) or ""))
    f:close()
end

LoopAsync(AUTO_MS, function()
    if autoBusy then return false end
    autoBusy = true
    ExecuteInGameThread(function()
        local ok, err = pcall(autoTick)
        if not ok then bagInvs = nil log("tick error: " .. tostring(err)) end
        autoBusy = false
    end)
    return false
end)

-- F7: put the game's own personal waypoint on the target chosen in the HUD.
-- The HUD copies "ICARUSHUD|x|y|z|" to the clipboard; pressing F7 again on the same target removes the waypoint.
local function hudMsg(text)
    seq = seq + 1
    local f = openOut()
    if f then
        f:write(string.format('window.__icarusLive&&window.__icarusLive({"t":%d,"auto":true,"msg":"%s"});\n', seq, (text:gsub('[\\"]', ''))))
        f:close()
    end
end

local KEY_WP = Key.F7
local lastWp = ""
WP = { x = nil, y = nil, z = nil, kind = nil, quota = {}, home = nil }

local function sendWp(code)
    seq = seq + 1
    local f = openOut()
    if f then
        f:write(string.format('window.__icarusLive&&window.__icarusLive({"t":%d,"auto":true,"wp":"%s"});\n', seq, code))
        f:close()
    end
end

function setWaypoint(x, y, z)
    local pc = UEHelpers.GetPlayerController()
    local ps = pc.PlayerState
    ps:ServerMovePersonalWaypoint({ X = x, Y = y, Z = z }, pc)
    WP.x, WP.y, WP.z = x, y, z
    lastWp = string.format("%d|%d|%d", math.floor(x + 0.5), math.floor(y + 0.5), math.floor(z + 0.5))
    log("waypoint set at " .. lastWp)
    sendWp(lastWp)
end

local function clearWaypoint()
    local pc = UEHelpers.GetPlayerController()
    pc.PlayerState:ServerDestroyWaypoint()
    lastWp = ""
    WP.x = nil
    log("waypoint removed")
    sendWp("")
end

local function readClipboard()
    local lib = StaticFindObject("/Script/Icarus.Default__UMGFunctionLibrary")
    if not lib or not lib:IsValid() then return "" end
    local txt = lib:PasteFromClipboard()
    if type(txt) ~= "string" then txt = txt:ToString() end
    return txt or ""
end

-- HUD copies: ICARUSHUD|x|y|z|k=<kind>|q=<item:target,...>|h=<x,y,z>|
local function waypoint()
    ExecuteInGameThread(function()
        local ok, err = pcall(function()
            local txt = readClipboard()
            local x, y, z = string.match(txt, "^ICARUSHUD|(%-?%d+)|(%-?%d+)|(%-?%d+)|")
            if not x then
                log("waypoint: nothing selected in the HUD (clipboard has no target)")
                hudMsg("HUD에서 '게임에 표시'를 먼저 누르세요")
                return
            end
            WP.kind = string.match(txt, "|k=([%w_:%-%.]+)|")
            WP.quota = {}
            local q = string.match(txt, "|q=([%w_:,%-%.]*)|")
            if q then for item, n in string.gmatch(q, "([%w_%-%.]+):(%d+)") do WP.quota[item] = tonumber(n) end end
            local hx, hy, hz = string.match(txt, "|h=(%-?%d+),(%-?%d+),(%-?%d+)|")
            if hx then WP.home = { x = tonumber(hx), y = tonumber(hy), z = tonumber(hz) } end
            if (x .. "|" .. y .. "|" .. z) == lastWp then clearWaypoint()
            else setWaypoint(tonumber(x), tonumber(y), tonumber(z)) end
        end)
        if not ok then log("waypoint error: " .. tostring(err)) end
    end)
end

-- ===== F4: walk toward the waypoint (you only steer around obstacles) =====
local KEY_WALK = Key.F4
local WALK_MS, ARRIVE_CM, STUCK_S = 40, 450, 4
local walking, walkGen, walkLast, walkLastT = false, 0, nil, 0

local function stopWalk(why)
    if not walking then return end
    walking = false
    walkGen = walkGen + 1
    log("auto walk stopped: " .. why)
    hudMsg("자동 이동 꺼짐 (" .. why .. ")")
end

local function walkStep(gen)
    if not walking or gen ~= walkGen then return end
    local ok, err = pcall(function()
        if not WP.x then stopWalk("표시된 목표 없음") return end
        local pawn = UEHelpers.GetPlayer()
        local pc = UEHelpers.GetPlayerController()
        local l = pawn:K2_GetActorLocation()
        local dx, dy = WP.x - l.X, WP.y - l.Y
        if dx * dx + dy * dy < ARRIVE_CM * ARRIVE_CM then stopWalk("도착") return end
        local now = os.clock()
        if not walkLast then walkLast, walkLastT = { X = l.X, Y = l.Y }, now end
        if now - walkLastT >= STUCK_S then
            local mx, my = l.X - walkLast.X, l.Y - walkLast.Y
            if mx * mx + my * my < 150 * 150 then stopWalk("막힘 - 방향을 틀고 다시 F4") return end
            walkLast, walkLastT = { X = l.X, Y = l.Y }, now
        end
        local want = math.deg(math.atan(dy, dx))
        local r = pc:GetControlRotation()
        local diff = (want - r.Yaw + 540) % 360 - 180
        local turn = math.max(-6, math.min(6, diff))
        pc:SetControlRotation({ Pitch = r.Pitch, Yaw = r.Yaw + turn, Roll = r.Roll })
        local yaw = math.rad(r.Yaw + turn)
        pawn:AddMovementInput({ X = math.cos(yaw), Y = math.sin(yaw), Z = 0 }, 1.0, false)
    end)
    if not ok then stopWalk("오류: " .. tostring(err)) end
end

MacroBind(KEY_WALK, function()
    ExecuteInGameThread(function()
        if walking then stopWalk("F4") return end
        if not WP.x then
            log("auto walk: no waypoint")
            hudMsg("먼저 목표를 나침반에 표시하세요 (HUD → 게임에 표시 → F7)")
            return
        end
        walking, walkLast = true, nil
        walkGen = walkGen + 1
        local gen = walkGen
        log("auto walk started")
        hudMsg("자동 이동 켜짐 - 목표로 걷는 중 (F4로 끄기)")
        LoopAsync(WALK_MS, function()
            if not walking or gen ~= walkGen then return true end
            ExecuteInGameThread(function() walkStep(gen) end)
            return false
        end)
    end)
end)

-- ===== F5: auto mine / chop (repeats the attack while you stand still) =====
local KEY_MINE   = Key.F5
local MINE_MS    = 700        -- one swing roughly every 0.7 s
local MINE_MAX_S = 600        -- stops by itself after 10 minutes
local MINE_MOVE  = 300        -- stops if you move more than 3 m
local FIRE_A, FIRE_B = "InpActEvt_Fire_K2Node_InputActionEvent_22", "InpActEvt_Fire_K2Node_InputActionEvent_23"
local mining, mineStart, mineLoc, mineGen = false, 0, nil, 0
local mineBase, mineSeen, mineLastGain, mineChk, usedNodes = {}, {}, 0, 0, {}
local DEPLETED_S = 12

local function bagCounts()
    local bag = {}
    for _, inv in ipairs(findBagInvs()) do pcall(addSlots, inv, bag) end
    return bag
end

local function cell(x, y) return string.format("%d|%d", math.floor(x / 600), math.floor(y / 600)) end

local function stopMining(why)
    if not mining then return end
    mining = false
    mineGen = mineGen + 1
    pcall(function()
        local pawn = UEHelpers.GetPlayer()
        pawn[FIRE_B](pawn, { KeyName = FName("LeftMouseButton") })
    end)
    log("auto mine stopped: " .. why)
    hudMsg("자동 채굴 꺼짐 (" .. why .. ")")
end

local function mineStep(gen)
    if not mining or gen ~= mineGen then return end
    local ok, err = pcall(function()
        local pawn = UEHelpers.GetPlayer()
        if not pawn or not pawn:IsValid() then stopMining("no player") return end
        local l = pawn:K2_GetActorLocation()
        local dx, dy, dz = l.X - mineLoc.X, l.Y - mineLoc.Y, l.Z - mineLoc.Z
        if dx * dx + dy * dy + dz * dz > MINE_MOVE * MINE_MOVE then stopMining("moved") return end
        if os.time() - mineStart > MINE_MAX_S then stopMining("10분 경과") return end
        mineChk = mineChk + 1
        if mineChk % 3 == 0 then
            local bag, anyQuota, allDone = bagCounts(), false, true
            for item, n in pairs(bag) do
                if n > (mineSeen[item] or mineBase[item] or 0) then mineLastGain = os.clock() end
                mineSeen[item] = n
            end
            for item, q in pairs(WP.quota or {}) do
                if (bag[item] or 0) > (mineBase[item] or 0) then
                    anyQuota = true
                    if (bag[item] or 0) < q then allDone = false end
                end
            end
            if anyQuota and allDone then
                stopMining("필요량 달성")
                if WP.home then
                    setWaypoint(WP.home.x, WP.home.y, WP.home.z)
                    hudMsg("필요량을 다 모았습니다 → 나침반에 기지 표시 (F4로 귀환)")
                else
                    hudMsg("필요량을 다 모았습니다 (HUD에서 기지를 저장해 두면 귀환 안내가 됩니다)")
                end
                return
            end
            if os.clock() - mineLastGain > DEPLETED_S then
                stopMining("더 나오지 않음")
                usedNodes[cell(l.X, l.Y)] = true
                local best, bestD = nil, nil
                for _, o in ipairs(LAST_ORES) do
                    if WP.kind and o.t == WP.kind and not usedNodes[cell(o.x, o.y)] then
                        local d = (o.x - l.X) ^ 2 + (o.y - l.Y) ^ 2
                        if d > 800 * 800 and (not bestD or d < bestD) then best, bestD = o, d end
                    end
                end
                if best then
                    setWaypoint(best.x, best.y, best.z)
                    hudMsg(string.format("이 광맥은 끝 → 다음 광맥 표시 (%d m, F4로 이동)", math.floor(math.sqrt(bestD) / 100)))
                else
                    hudMsg("이 광맥은 끝 - 주변에 같은 광맥이 더 없습니다 (F10으로 다시 찾기)")
                end
                return
            end
        end
        local key = { KeyName = FName("LeftMouseButton") }
        pawn[FIRE_A](pawn, key)
        pawn[FIRE_B](pawn, key)
    end)
    if not ok then stopMining("error: " .. tostring(err)) end
end

MacroBind(KEY_MINE, function()
    ExecuteInGameThread(function()
        if mining then stopMining("F5") return end
        local ok, err = pcall(function()
            local pawn = UEHelpers.GetPlayer()
            local l = pawn:K2_GetActorLocation()
            mineLoc = { X = l.X, Y = l.Y, Z = l.Z }
        end)
        if not ok then log("auto mine start failed: " .. tostring(err)) return end
        mining, mineStart = true, os.time()
        mineBase, mineSeen, mineLastGain, mineChk = bagCounts(), {}, os.clock(), 0
        mineGen = mineGen + 1
        local gen = mineGen
        log("auto mine started")
        hudMsg("자동 채굴 켜짐 (F5로 끄기, 움직이면 자동으로 꺼짐)")
        LoopAsync(MINE_MS, function()
            if not mining or gen ~= mineGen then return true end
            ExecuteInGameThread(function() mineStep(gen) end)
            return false
        end)
    end)
end)

-- ===== F6: queue the HUD's parts list at the open bench =====
local KEY_CRAFT = Key.F6

local function openProcessing()
    local best, bestScore = nil, -1
    for _, cls in ipairs({ "UMG_Processor_C", "UMG_Processor_Skinning_C" }) do
        local list = FindAllOf(cls)
        if list then
            for _, w in ipairs(list) do
                if w:IsValid() and not string.find(w:GetFullName(), "Default__", 1, true) then
                    local score = (flag(w, "IsVisible") and 4 or 0) + ((flag(w, "HasFocusedDescendants") or flag(w, "HasAnyUserFocus")) and 3 or 0)
                        + (parentValid(w) and 2 or 0) + (flag(w, "IsInViewport") and 1 or 0)
                    if score > 0 and score >= bestScore then best, bestScore = w, score end
                end
            end
        end
    end
    local proc = nil
    if best then
        pcall(function() local out = {} best:GetProcessingComponent(out) proc = out.Processing end)
        if proc and not proc:IsValid() then proc = nil end
    end
    if not proc then
        -- fallback: the nearest processor within 8 m
        local pawn = UEHelpers.GetPlayer()
        local p = pawn:K2_GetActorLocation()
        local bestD = 800 * 800
        local list = FindAllOf("ProcessingComponent") or {}
        for _, c in ipairs(list) do
            pcall(function()
                if not c:IsValid() or string.find(c:GetFullName(), "Default__", 1, true) then return end
                local l = c:GetOwner():K2_GetActorLocation()
                local d = (l.X - p.X) ^ 2 + (l.Y - p.Y) ^ 2 + (l.Z - p.Z) ^ 2
                if d < bestD then bestD, proc = d, c end
            end)
        end
    end
    return proc, best ~= nil
end

local function playerBag(pawn)
    local q, e = "", ""
    pcall(function() q = pawn.QuickbarInventory:GetFullName() end)
    pcall(function() e = pawn.EquipmentInventory:GetFullName() end)
    local bestInv, bestN = nil, -1
    for _, inv in ipairs(findBagInvs()) do
        local full = inv:GetFullName()
        if full ~= q and full ~= e then
            local n = 0
            pcall(function() inv.Slots.Slots:ForEach(function() n = n + 1 end) end)
            if n > bestN then bestInv, bestN = inv, n end
        end
    end
    return bestInv
end

MacroBind(KEY_CRAFT, function()
    ExecuteInGameThread(function()
        local ok, err = pcall(function()
            local lib = StaticFindObject("/Script/Icarus.Default__UMGFunctionLibrary")
            local txt = lib:PasteFromClipboard()
            if type(txt) ~= "string" then txt = txt:ToString() end
            if not string.find(txt or "", "^ICARUSCRAFT|") then
                log("craft: no parts list in the clipboard") hudMsg("HUD에서 '부품 대기열 복사'를 먼저 누르세요") return
            end
            local proc, fromWidget = openProcessing()
            if not proc then log("craft: no open bench found") hudMsg("열려 있는 작업대를 찾지 못했습니다") return end
            local set = "?"
            pcall(function() set = proc:GetRecipeSetRow().RowName:ToString() end)
            local pc = UEHelpers.GetPlayerController()
            local pawn = UEHelpers.GetPlayer()
            local proxy = pc:GetNetworkProxyComponent()
            local bag = playerBag(pawn)
            local quick = pawn.QuickbarInventory
            local added, skipped = 0, 0
            for recipe, count, sets in string.gmatch(txt, "|([%w_]+)%*(%d+)@([%w_,]+)") do
                if string.find("," .. sets .. ",", "," .. set .. ",", 1, true) then
                    local okA, e2 = pcall(function()
                        proxy["Proxy_Processing_ AddProcessingRecipe"](proxy, proc,
                            { RowName = FName(recipe), DataTableName = FName("D_ProcessorRecipes") },
                            bag, quick, pawn, tonumber(count))
                    end)
                    if okA then added = added + 1 log("craft: queued " .. recipe .. " x" .. count)
                    else log("craft: failed " .. recipe .. ": " .. tostring(e2)) end
                else
                    skipped = skipped + 1
                end
            end
            pcall(function() proxy:Proxy_Processing_StartProcessing(proc) end)
            log(string.format("craft: bench set %s (from %s), queued %d, other benches %d", set, fromWidget and "screen" or "nearest", added, skipped))
            hudMsg(string.format("대기열에 %d개 넣음 · 다른 작업대용 %d개", added, skipped))
        end)
        if not ok then log("craft error: " .. tostring(err)) end
    end)
end)

-- ===== F3: take only the needed materials out of the storage box in front of you =====
local KEY_TAKE = Key.F3
local TAKE_CM = 500

local function parseQuota(txt)
    local q = string.match(txt or "", "|q=([%w_:,%-%.]*)|")
    if not q then return nil end
    local t = {}
    for item, n in string.gmatch(q, "([%w_%-%.]+):(%d+)") do t[item] = tonumber(n) end
    return t
end

MacroBind(KEY_TAKE, function()
    ExecuteInGameThread(function()
        local ok, err = pcall(function()
            local quota = parseQuota(readClipboard()) or WP.quota or {}
            if next(quota) == nil then hudMsg("HUD에서 목표를 정하고 '게임에 표시'나 '부품 대기열 복사'를 먼저 누르세요") return end
            local pawn = UEHelpers.GetPlayer()
            local pc = UEHelpers.GetPlayerController()
            local p = pawn:K2_GetActorLocation()
            local pawnTag = "." .. pawn:GetFullName():match("[^.]*$") .. "."
            local bag = playerBag(pawn)
            if not bag then hudMsg("가방을 찾지 못했습니다") return end
            -- nearest storage within 5 m
            local box, bestD = nil, TAKE_CM * TAKE_CM
            for _, inv in ipairs(FindAllOf("Inventory") or {}) do
                pcall(function()
                    if not inv:IsValid() then return end
                    local full = inv:GetFullName()
                    if string.find(full, "Default__", 1, true) or string.find(full, pawnTag, 1, true) then return end
                    local l = inv:GetOuter():K2_GetActorLocation()
                    local d = (l.X - p.X) ^ 2 + (l.Y - p.Y) ^ 2 + (l.Z - p.Z) ^ 2
                    if d < bestD then
                        local n = 0
                        inv.Slots.Slots:ForEach(function() n = n + 1 end)
                        if n > 0 then box, bestD = inv, d end
                    end
                end)
            end
            if not box then hudMsg("5m 안에 보관함이 없습니다 - 상자 앞에서 F3") return end
            local have = bagCounts()
            local moved, names = 0, {}
            local slots = {}
            box.Slots.Slots:ForEach(function(_, e)
                pcall(function()
                    local sl = e:get()
                    local item = sl.ItemData.ItemStaticData.RowName:ToString()
                    local count = 1
                    sl.ItemData.ItemDynamicData:ForEach(function(_, d) local dd = d:get() if dd.PropertyType == 7 then count = dd.Value end end)
                    table.insert(slots, { idx = sl.Index, item = item, n = count })
                end)
            end)
            for _, sl in ipairs(slots) do
                local want = quota[sl.item]
                if want and (have[sl.item] or 0) < want then
                    local okM, e2 = pcall(function() pc:OnServer_QuickMoveItem(box, sl.idx, { bag }) end)
                    if okM then
                        have[sl.item] = (have[sl.item] or 0) + sl.n
                        moved = moved + 1
                        names[sl.item] = true
                    else
                        log("take: move failed " .. sl.item .. ": " .. tostring(e2))
                    end
                end
            end
            local list = {}
            for k in pairs(names) do table.insert(list, k) end
            log(string.format("take: moved %d stacks (%s) from %s", moved, table.concat(list, ","), box:GetOuter():GetFullName():match("[^.]*$")))
            hudMsg(moved > 0 and string.format("보관함에서 필요한 재료 %d묶음을 꺼냈습니다", moved) or "이 보관함에는 필요한 재료가 없습니다")
        end)
        if not ok then log("take error: " .. tostring(err)) end
    end)
end)

RegisterKeyBind(KEY_WP, waypoint)
RegisterKeyBind(KEY_SHOW, function() send("show") end)
RegisterKeyBind(KEY_ADD,  function() send("add")  end)
RegisterKeyBind(KEY_INV,  function() fogNow = true send("inv")  end)
-- start the desktop HUD program together with the game (set to false to turn off)
local LAUNCH_APP = true
if LAUNCH_APP and MODDIR then
    pcall(function()
        local exe = MODDIR .. "\\app\\IcarusHUD.exe"
        -- a shared install keeps the program wherever the person unzipped it; it leaves its path here
        local pf = io.open(MODDIR .. "\\app_path.txt", "r")
        if pf then local t = pf:read("*l") pf:close() if t and t:match("%.exe$") and fileExists(t) then exe = t end end
        local f = io.open(exe, "rb")
        if f then
            f:close()
            os.execute('start "" "' .. exe .. '"')
            log("started HUD program")
        end
    end)
end


-- one-time copy of the game's own map pictures (raw bytes) out of its pak files, done off the game thread
local function mapRaw(doneName, wantDir, wantFile, tag)
    if not MODDIR then return end
    local doneF = MODDIR .. "\\" .. doneName
    local t = io.open(doneF, "r") if t then t:close() return end
    local game = MODDIR:match("^(.*)[/\\]Binaries[/\\]Win64[/\\]")
    if not game then return end
    local pakDir = game .. "\\Content\\Paks\\"
    local man = {}
    local count = 0
    for i = -1, 40 do
        local name = (i < 0) and "pakchunk0-WindowsNoEditor.pak" or ("pakchunk0_s" .. i .. "-WindowsNoEditor.pak")
        local f = io.open(pakDir .. name, "rb")
        if f then
            local ok, err = pcall(function()
                local size = f:seek("end")
                local tl = math.min(size, 4096)
                f:seek("set", size - tl)
                local tail = f:read(tl)
                local at = nil
                for k = tl - 3, 1, -1 do
                    if tail:sub(k, k + 3) == "\225\018\111\090" then at = k break end
                end
                if not at then error("no footer") end
                local ioff, isz = string.unpack("<I8I8", tail, at + 8)
                local methods = {}
                for k = 0, 4 do
                    local s = tail:sub(at + 40 + 32 * k, at + 71 + 32 * k):gsub("%z.*$", ""):gsub("[^%w]", "")
                    methods[#methods + 1] = s
                end
                f:seek("set", ioff)
                local idx = f:read(isz)
                local function fstr(b, o)
                    local n = string.unpack("<i4", b, o) o = o + 4
                    if n < 0 then return "", o - 2 * n end
                    return b:sub(o, o + n - 2), o + n
                end
                local _, o = fstr(idx, 1)
                o = o + 12
                if string.unpack("<I4", idx, o) ~= 0 then o = o + 40 else o = o + 4 end
                o = o + 4
                local fo, fsz = string.unpack("<I8I8", idx, o) o = o + 36
                local es = string.unpack("<I4", idx, o) o = o + 4
                local enc = idx:sub(o, o + es - 1)
                idx = nil
                f:seek("set", fo)
                local di = f:read(fsz)
                local p = 1
                local nd = string.unpack("<I4", di, p) p = p + 4
                for _ = 1, nd do
                    local dn dn, p = fstr(di, p)
                    local nf = string.unpack("<I4", di, p) p = p + 4
                    local hit = wantDir(dn)
                    for _ = 1, nf do
                        local fn fn, p = fstr(di, p)
                        local eo = string.unpack("<i4", di, p) p = p + 4
                        if hit and wantFile(fn) then
                            local q = eo + 1
                            local fl = string.unpack("<I4", enc, q) q = q + 4
                            if (fl & 0x3f) == 0x3f then q = q + 4 end
                            local bc = (fl >> 6) & 0xffff
                            local m = (fl >> 23) & 0x3f
                            local function rd(bit)
                                local v
                                if (fl & (1 << bit)) ~= 0 then v = string.unpack("<I4", enc, q) q = q + 4
                                else v = string.unpack("<I8", enc, q) q = q + 8 end
                                return v
                            end
                            local off = rd(31)
                            local us = rd(30)
                            local cs = (m ~= 0) and rd(29) or us
                            local sizes = {}
                            if m == 0 then sizes = { us }
                            elseif bc == 1 then sizes = { cs }
                            else for k = 0, bc - 1 do sizes[#sizes + 1] = string.unpack("<I4", enc, q + 4 * k) end end
                            local hdr = 8 + 8 + 8 + 4 + 20 + 1 + 4 + ((m ~= 0) and (4 + 16 * bc) or 0)
                            local tot = 0
                            for _, z in ipairs(sizes) do tot = tot + z end
                            f:seek("set", off + hdr)
                            local data = f:read(tot)
                            local outName = tag(dn) .. "__" .. fn
                            local w = io.open(MODDIR .. "\\mapraw_" .. outName, "wb")
                            if w then
                                w:write(data) w:close()
                                count = count + 1
                                man[#man + 1] = table.concat({ outName, methods[m] or "none", us, table.concat(sizes, ",") }, "|")
                            end
                        end
                    end
                end
            end)
            f:close()
            if not ok then man[#man + 1] = "#" .. name .. " " .. tostring(err) end
        end
    end
    local w = io.open(doneF, "w")
    if w then w:write(table.concat(man, "\n")) w:close() end
    log("game files copied (" .. doneName .. "): " .. count)
end
if DEVMODE then
    local function jobs()
        -- (nothing to copy right now)
    end
    if ExecuteAsync then ExecuteAsync(function() local ok, e = pcall(jobs) if not ok then log("map copy error: " .. tostring(e)) end end)
    else ExecuteWithDelay(15000, function() pcall(jobs) end) end
end

if SAFE then log("SAFE MODE: only crafting, inventory and waypoints are on") end
for k in pairs(FEAT_OFF) do log("feature switched off after a crash: " .. k) end
log("loaded. F7 = waypoint, F8 = show, F9 = add, F10 = refresh inventory + navigation" .. (MACROS and "; helpers on: F3 = take needed, F4 = auto walk, F5 = auto mine, F6 = queue parts" or "; helpers F3-F6 are off"))
