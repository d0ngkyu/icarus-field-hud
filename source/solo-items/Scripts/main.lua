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
local function writeStatus(id, state, count, detail)
    local f = io.open(status, 'w')
    if f then f:write(table.concat({id, state, tostring(count), tostring(detail or ''):gsub('[\r\n|]', ' ')}, '|')); f:close() end
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
        local system = StaticFindObject('/Script/Engine.Default__KismetSystemLibrary')
        assert(system and system:IsValid(), 'System library unavailable')
        assert(system:IsStandalone(pc) == true, 'Single-player standalone mode required')
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
            local success, why = pcall(process)
            if not success then writeStatus('-', 'ERROR', 0, why) end
            busy = false
        end)
    end)
    if not ok then busy = false; writeStatus('-', 'ERROR', 0, err) end
end)
print('[IcarusSoloItems] Ready: prepare an item in the desktop tool, then press F11.\n')
