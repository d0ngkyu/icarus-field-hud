-- Runs only when the app leaves a request (picked up automatically within ~1 s) or on F11.
-- Never scans the world; the background loops touch files only, game objects only while a request runs.
local H = require('UEHelpers')
local src = debug.getinfo(1, 'S').source:gsub('^@', '')
local dir = src:match('^(.*[/\\])')
local root = dir .. '../'
local allowed = dofile(dir .. 'catalog.lua')
local request = root .. 'request.txt'
local processing = root .. 'processing.txt'
local status = root .. 'status.txt'
local cancel = root .. 'cancel.txt'
local teleport = root .. 'teleport.txt'
local teleportBack = root .. 'teleport-back.txt'
local here = root .. 'here.txt'
local MAX_QUANTITY, BATCH_SIZE = 1000, 25
local busy = false
-- File-only liveness: no UObject lookup or game-thread work in this loop.
local session = os.time()
local function heartbeat()
    local path = root .. 'heartbeat.txt'
    local f = io.open(path .. '.tmp', 'w')
    if f then
        f:write('1|' .. os.time() .. '|' .. session .. '|LOADED'); f:close()
        os.remove(path); os.rename(path .. '.tmp', path)
    end
    return false
end
heartbeat()
if type(LoopAsync) == 'function' then LoopAsync(3000, function() pcall(heartbeat); return false end) end
-- Explicit F11 only; never cache world objects across calls.
local function soloMode(pc, player)
    if not (pc and pc:IsValid() and player and player:IsValid() and pc:IsLocalController() == true) then return 'WAITING' end
    local system = StaticFindObject('/Script/Engine.Default__KismetSystemLibrary')
    if not (system and system:IsValid()) then return 'WAITING' end
    if system:IsStandalone(pc) == true then return 'SINGLE' end
    if pc:HasAuthority() ~= true then return 'MULTI' end
    local gameplay = StaticFindObject('/Script/Engine.Default__GameplayStatics')
    if not (gameplay and gameplay:IsValid()) then return 'WAITING' end
    local mode = gameplay:GetGameMode(pc)
    if not (mode and mode:IsValid()) then return 'WAITING' end
    local players, spectators = mode:GetNumPlayers(), mode:GetNumSpectators()
    if type(players) ~= 'number' or type(spectators) ~= 'number' or players < 1 or spectators < 0 then return 'WAITING' end
    if players == 1 and spectators == 0 then return 'HOST' end
    return 'MULTI'
end
local function probeWorld()
    local state = 'WAITING'
    local ok = pcall(function()
        local pc, player = H.GetPlayerController(), H.GetPlayer()
        state = soloMode(pc, player)
    end)
    if not ok then state = 'WAITING' end
    local f = io.open(root .. 'world-check.txt', 'w')
    if f then f:write('1|' .. os.time() .. '|' .. session .. '|' .. state); f:close() end
end
local function writeStatus(id, state, count, detail)
    local f = io.open(status, 'w')
    if f then f:write(table.concat({id, state, tostring(count), (tostring(detail or ''):gsub('[\r\n|]', ' '))}, '|')); f:close() end
end
-- A request made before this game start must never execute on a later keypress.
os.remove(request)
os.remove(processing)
os.remove(teleport)
writeStatus('-', 'READY', 0, 'F11')
local function process()
    local f = io.open(request, 'r')
    if not f then busy = false; return end
    local text = f:read(4097); f:close()
    if not os.rename(request, processing) then busy = false; return end
    local id, timestamp, item, payload = text:match('^([a-f0-9]+)|(%d+)|([A-Za-z0-9_]+)|([^|]+)%s*$')
    local quantity, entries, entryIndex, entrySent = 0, {}, 1, 0
    local sent, done = 0, false
    local started = os.time()
    local function finish(state, detail)
        if done then return end
        done = true
        writeStatus(id or '-', state, sent, detail)
        os.remove(processing)
        busy = false
    end
    local function cancelled()
        local c = io.open(cancel, 'r')
        if not c then return false end
        local value = c:read(64); c:close()
        return value == id
    end
    local ok, err = pcall(function()
        assert(#text <= 4096 and id and #id == 32, 'Invalid request')
        local age = os.time() - tonumber(timestamp)
        assert(age >= -5 and age <= 120, 'Request expired; prepare again')
        local seen, canonical = {}, {}
        local function add(name, count)
            count = tonumber(count)
            assert(name and allowed[name] and count and count >= 1 and count <= MAX_QUANTITY and count % 1 == 0 and not seen[name], 'Invalid item or quantity')
            seen[name] = true; quantity = quantity + count
            assert(quantity <= MAX_QUANTITY and #entries < 20, 'Set limit exceeded')
            entries[#entries+1] = {item=name, count=count}
        end
        if item == 'SET' then
            for part in payload:gmatch('[^,]+') do
                local name, count = part:match('^([A-Za-z0-9_]+):(%d+)$')
                add(name, count); canonical[#canonical+1] = part
            end
            assert(#entries > 0 and table.concat(canonical, ',') == payload, 'Invalid set format')
        else
            assert(payload:match('^%d+%s*$'), 'Invalid quantity')
            add(item, payload)
        end
        assert(quantity <= BATCH_SIZE or type(ExecuteWithDelay) == 'function', 'Delayed processing unavailable')
        local pc, player = H.GetPlayerController(), H.GetPlayer()
        assert(pc and pc:IsValid() and player and player:IsValid(), 'Enter a single-player world first')
        local initialMode = soloMode(pc, player)
        assert(initialMode == 'SINGLE' or initialMode == 'HOST', 'Single-player host required')
        local controllerAddress, playerAddress = pc:GetAddress(), player:GetAddress()
        local controllerName, playerName = pc:GetFullName(), player:GetFullName()
        local library = StaticFindObject('/Script/Icarus.Default__ItemTemplateLibrary')
        assert(library and library:IsValid(), 'Template library unavailable')
        for _, entry in ipairs(entries) do assert(library:IsValidName(FName(entry.item)) == true, 'Template not available in this game version') end
        -- Keep primitive identity only across delayed callbacks, not UObject wrappers.
        pc, player, library = nil, nil, nil
        local step
        step = function()
            if done then return end
            local success, why = pcall(function()
                if cancelled() then finish('CANCELLED', 'Requested by user'); return end
                assert(os.time() - started <= 30, 'Request processing timeout')
                local currentPC, currentPlayer = H.GetPlayerController(), H.GetPlayer()
                assert(currentPC and currentPC:IsValid() and currentPlayer and currentPlayer:IsValid(), 'World changed')
                assert(currentPC:GetAddress() == controllerAddress and currentPlayer:GetAddress() == playerAddress and currentPC:GetFullName() == controllerName and currentPlayer:GetFullName() == playerName, 'Player changed; prepare again')
                local mode = soloMode(currentPC, currentPlayer)
                assert(mode == 'SINGLE' or mode == 'HOST', '혼자 플레이하는 호스트인지 확인하지 못했거나 다른 플레이어가 접속했습니다.')
                local lib = StaticFindObject('/Script/Icarus.Default__ItemTemplateLibrary')
                assert(lib and lib:IsValid(), 'Template library unavailable')
                local checkedItem
                for i = 1, math.min(BATCH_SIZE, quantity - sent) do
                    local entry = entries[entryIndex]
                    if checkedItem ~= entry.item then assert(lib:IsValidName(FName(entry.item)) == true, 'Template not available in this game version'); checkedItem = entry.item end
                    assert(currentPC:IsValid() and currentPlayer:IsValid(), 'World changed')
                    currentPC:AddItemToInventory({RowName=FName(entry.item), DataTableName=FName('D_ItemTemplate')})
                    sent = sent + 1
                    entrySent = entrySent + 1
                    if entrySent >= entry.count then entryIndex = entryIndex + 1; entrySent = 0 end
                end
                if sent >= quantity then finish('SENT', item); return end
                writeStatus(id, 'WORKING', sent, quantity)
                ExecuteWithDelay(100, function()
                    local queued, failure = pcall(function() ExecuteInGameThread(step) end)
                    if not queued then finish('ERROR', failure) end
                end)
            end)
            if not success then finish('ERROR', why) end
        end
        step()
    end)
    if not ok then finish('ERROR', err) end
end
local function run()
    if busy then return end
    busy = true
    local ok, err = pcall(function()
        ExecuteInGameThread(function()
            probeWorld()
            local success, why = pcall(process)
            if not success then writeStatus('-', 'ERROR', 0, why); busy = false end
        end)
    end)
    if not ok then busy = false; writeStatus('-', 'ERROR', 0, err) end
end
-- Teleport (single-player tool only): id|time|HERE  /  id|time|GO|world|x|y|z  /  id|time|BACK
local MAP_LIMIT = 700000
local function worldOf(player)
    local name = player:GetFullName() or ''
    return name:match('(Terrain_%d+)') or name:match('/Game/Maps/([%w_]+)') or '?'
end
local function writeLine(path, text)
    local f = io.open(path .. '.tmp', 'w')
    if f then f:write(text); f:close(); os.remove(path); os.rename(path .. '.tmp', path) end
end
local function readLine(path, limit)
    local f = io.open(path, 'r'); if not f then return nil end
    local t = f:read(limit or 512); f:close(); return t
end
local function processTeleport()
    local text = readLine(teleport, 512)
    os.remove(teleport)
    if not text then busy = false; return end
    local id, timestamp, cmd, rest = text:match('^([a-f0-9]+)|(%d+)|(%u+)|?(.-)%s*$')
    local ok, err = pcall(function()
        assert(id and #id == 32, 'Invalid request')
        local age = os.time() - tonumber(timestamp)
        assert(age >= -5 and age <= 60, 'Request expired; try again')
        local pc, player = H.GetPlayerController(), H.GetPlayer()
        assert(pc and pc:IsValid() and player and player:IsValid(), 'Enter a single-player world first')
        local mode = soloMode(pc, player)
        assert(mode == 'SINGLE' or mode == 'HOST', 'Single-player host required')
        local world = worldOf(player)
        local loc = player:K2_GetActorLocation()
        assert(loc and loc.X, 'Position unavailable')
        local function at(x, y, z) return string.format('%s|%d|%d|%d', world, math.floor(x + 0.5), math.floor(y + 0.5), math.floor(z + 0.5)) end
        if cmd == 'HERE' then
            writeLine(here, id .. '|' .. at(loc.X, loc.Y, loc.Z))
            writeStatus(id, 'SENT', 0, 'HERE'); return
        end
        local target
        if cmd == 'GO' then
            local w, x, y, z = rest:match('^([%w_]+)|(%-?%d+)|(%-?%d+)|(%-?%d+)$')
            target = {w = w, x = tonumber(x), y = tonumber(y), z = tonumber(z)}
        elseif cmd == 'BACK' then
            local w, x, y, z = (readLine(teleportBack, 128) or ''):match('^([%w_]+)|(%-?%d+)|(%-?%d+)|(%-?%d+)')
            assert(w, 'No previous position yet')
            target = {w = w, x = tonumber(x), y = tonumber(y), z = tonumber(z)}
        else error('Unknown command') end
        assert(target.w and target.x and target.y and target.z, 'Invalid position')
        assert(target.w == world, 'That place is on another map (' .. tostring(target.w) .. ')')
        assert(math.abs(target.x) <= MAP_LIMIT and math.abs(target.y) <= MAP_LIMIT and math.abs(target.z) <= 200000, 'Position outside the map')
        writeLine(teleportBack, at(loc.X, loc.Y, loc.Z))
        local rot = player:K2_GetActorRotation()
        -- arrive a little above the spot so the character does not start inside the ground
        local yaw = rot and rot.Yaw or 0
        -- TeleportTo refuses spots its collision test thinks are blocked (often a saved spot right at
        -- ground level). Try a little higher, then place the character directly without that test.
        local moved = false
        for _, lift in ipairs({150, 400}) do
            if player:K2_TeleportTo({X = target.x, Y = target.y, Z = target.z + lift}, {Pitch = 0, Yaw = yaw, Roll = 0}) ~= false then moved = true; break end
        end
        if not moved then
            pcall(function() player:K2_SetActorLocation({X = target.x, Y = target.y, Z = target.z + 150}, false, {}, true) end)
            local now = player:K2_GetActorLocation()
            moved = now and math.abs(now.X - target.x) < 300 and math.abs(now.Y - target.y) < 300
        end
        assert(moved, 'The game refused the move (blocked spot)')
        writeStatus(id, 'SENT', 0, 'TELEPORT')
    end)
    if not ok then writeStatus(id or '-', 'ERROR', 0, err) end
    busy = false
end
local function runTeleport()
    if busy then return end
    busy = true
    local ok, err = pcall(function() ExecuteInGameThread(function()
        local success, why = pcall(processTeleport)
        if not success then writeStatus('-', 'ERROR', 0, why); busy = false end
    end) end)
    if not ok then busy = false; writeStatus('-', 'ERROR', 0, err) end
end
-- F11 still works (and also checks single-world readiness without a request).
RegisterKeyBind(Key.F11, run)
-- Automatic pickup: a file check every second; game work happens only when a request file exists.
local function pending()
    if busy then return false end
    local f = io.open(request, 'r')
    if not f then return false end
    f:close()
    return true
end
if type(LoopAsync) == 'function' then
    LoopAsync(1000, function()
        if pending() then pcall(run)
        elseif not busy then local f = io.open(teleport, 'r'); if f then f:close(); pcall(runTeleport) end end
        return false
    end)
end
print('[IcarusSoloItems] Ready: requests are picked up automatically (F11 also works); 20 kinds / 1000 total, 25 calls per batch.\n')
