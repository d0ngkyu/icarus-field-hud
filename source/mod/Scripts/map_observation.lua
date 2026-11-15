-- Read-only, loaded-world observations. No save loading, mutation or hooks.
local M = {}
local function valid(a) return a and a:IsValid() end
function M.context(world, players)
    if not valid(world) then return nil end
    local gs = world.GameState
    if not valid(gs) or not gs:IsA('/Script/Icarus.IcarusGameStateSurvival') then return nil end
    local scope = gs.ReplicatedActiveProspect.ProspectID:ToString()
    if type(scope)~='string' or #scope<1 or #scope>160 then return nil end
    -- IDs are local-only grouping keys; never include account IDs/names.
    if scope:find('[^%w_%-]') then return nil end
    local out={}
    if players then
        local wn=world:GetFullName()
        for i,a in ipairs(FindAllOf('IcarusPlayerCharacterSurvival') or {}) do
            if i>64 then break end
            pcall(function()
                if not valid(a) or a:GetFullName():find('Default__',1,true) then return end
                local aw=a:GetWorld()
                if not valid(aw) or aw:GetFullName()~=wn then return end
                -- Only positive game cave classification counts. No proximity-only visits.
                if a:GetIsInCave()~=true then return end
                local p=a:K2_GetActorLocation()
                table.insert(out,string.format('[%.0f,%.0f,%.0f,1]',p.X,p.Y,p.Z))
            end)
        end
    end
    return scope, '['..table.concat(out,',')..']'
end
return M
