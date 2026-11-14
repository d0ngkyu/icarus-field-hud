-- Explicit, expiring UI requests only. No UObject is retained between ticks.
local M = {}
local pending, lastRequest = nil, 0
local function valid(o) return o and o:IsValid() end
function M.tick(dir, pawn, world, enabled)
    if not dir then return end
    local function reply(id, status)
        local f = io.open(dir .. '/control-response.txt', 'w')
        if f then f:write(id .. '|' .. status) f:close() end
    end
    local function mode()
        if not valid(pawn) or not valid(world) then return nil end
        local gm = world.AuthorityGameMode
        if not valid(gm) or not gm:IsA('/Script/Icarus.IcarusGameModeSurvival') then return nil end
        return gm
    end
    if pending then
        local p = pending
        if os.time()-p.at > 45 then reply(p.id, 'timeout') pending=nil return end
        if not enabled then reply(p.id,'disabled') pending=nil return end
        local gm = mode()
        if not gm or world:GetFullName()~=p.world then reply(p.id,'world_changed') pending=nil return end
        if gm.UpdateProspectStateFailedCounter > p.failures then reply(p.id,'save_failed') pending=nil return end
        if not gm.bCurrentUpdateProspectIsSaving and gm.LastProspectSaveStateTime > p.before then
            pending=nil
            if p.action=='exit' then
                -- Let the game's own escape-menu quit flow handle shutdown.
                local menu=FindFirstOf('UMG_EscapeMenu_C')
                if not valid(menu) or not menu:IsVisible() or menu:GetWorld():GetFullName()~=p.world then reply(p.id,'open_escape') return end
                reply(p.id,'quit_requested')
                menu:QuitGame()
            else reply(p.id,'save_processed') end
        end
        return
    end
    local f=io.open(dir .. '/control-request.txt','r')
    if not f then return end
    local raw=f:read(256) or '' f:close()
    if not os.remove(dir .. '/control-request.txt') then return end
    local id, timestamp, action=raw:match('^(%w+)|(%d+)|(%a+)$')
    if not id or (action~='save' and action~='exit') then return end
    local now=os.time()
    if math.abs(now-tonumber(timestamp))>15 then reply(id,'expired') return end
    if not enabled then reply(id,'disabled') return end
    if now-lastRequest<10 then reply(id,'cooldown') return end
    local gm=mode()
    if not gm then reply(id,'host_only') return end
    if gm.bCurrentUpdateProspectIsSaving then reply(id,'saving_busy') return end
    if action=='exit' then
        local menu=FindFirstOf('UMG_EscapeMenu_C')
        if not valid(menu) or not menu:IsVisible() or menu:GetWorld():GetFullName()~=world:GetFullName() then reply(id,'open_escape') return end
    end
    pending={id=id,action=action,at=now,world=world:GetFullName(),before=gm.LastProspectSaveStateTime,failures=gm.UpdateProspectStateFailedCounter}
    lastRequest=now
    reply(id,'save_requested')
    local ok=pcall(function() gm:ForceImmediateProspectSave() end)
    if not ok then reply(id,'save_failed') pending=nil end
end
function M.reset() pending=nil end
return M
