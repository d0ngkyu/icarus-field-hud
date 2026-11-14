-- Explicit F11 requests only. Never scans the world or runs a background UObject loop.
local H = require('UEHelpers')
local src = debug.getinfo(1, 'S').source:gsub('^@', '')
local dir = src:match('^(.*[/\\])')
local root = dir .. '../'
local allowed = dofile(dir .. 'catalog.lua')
local request = root .. 'request.txt'
local processing = root .. 'processing.txt'
local status = root .. 'status.txt'
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
writeStatus('-', 'READY', 0, 'F11')
local function process()
    local f = io.open(request, 'r')
    if not f then return end
    local text = f:read(512); f:close()
    if not os.rename(request, processing) then return end
    local id, timestamp, item, quantity = text:match('^([a-f0-9]+)|(%d+)|([A-Za-z0-9_]+)|(%d+)%s*$')
    local sent = 0
    local ok, err = pcall(function()
        assert(id and #id == 32, 'Invalid request')
        local age = os.time() - tonumber(timestamp)
        assert(age >= -5 and age <= 120, 'Request expired; prepare again')
        quantity = tonumber(quantity)
        assert(quantity >= 1 and quantity <= 100 and allowed[item], 'Invalid item or quantity')
        local pc = H.GetPlayerController()
        local player = H.GetPlayer()
        assert(pc and pc:IsValid() and player and player:IsValid(), 'Enter a single-player world first')
        assert(pc:IsLocalController() == true, 'Local controller required')
        local mode = soloMode(pc, player)
        assert(mode == 'SINGLE' or mode == 'HOST', mode == 'MULTI' and '다른 서버 접속 또는 여러 명이 있는 월드에서는 사용할 수 없습니다.' or '혼자 플레이하는 호스트인지 확인하지 못했습니다. 월드 입장 후 다시 시도하세요.')
        local lib = StaticFindObject('/Script/Icarus.Default__ItemTemplateLibrary')
        assert(lib and lib:IsValid() and lib:IsValidName(FName(item)) == true, 'Template not available in this game version')
        writeStatus(id, 'WORKING', 0, item)
        for i = 1, quantity do
            assert(pc:IsValid() and player:IsValid(), 'World changed')
            pc:AddItemToInventory({RowName=FName(item), DataTableName=FName('D_ItemTemplate')})
            sent = i
        end
        -- The Blueprint function has no success result. Do not claim inventory delivery.
        writeStatus(id, 'SENT', sent, item)
    end)
    if not ok then writeStatus(id or '-', 'ERROR', sent, err) end
    os.remove(processing)
end
RegisterKeyBind(Key.F11, function()
    if busy then return end
    busy = true
    local ok, err = pcall(function()
        ExecuteInGameThread(function()
            probeWorld()
            local success, why = pcall(process)
            if not success then writeStatus('-', 'ERROR', 0, why) end
            busy = false
        end)
    end)
    if not ok then busy = false; writeStatus('-', 'ERROR', 0, err) end
end)
print('[IcarusSoloItems] Ready: prepare an item in the desktop tool, then press F11.\n')
