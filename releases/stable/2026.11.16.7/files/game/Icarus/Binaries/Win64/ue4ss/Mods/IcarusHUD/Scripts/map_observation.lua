-- Read-only, loaded-world observations. No save loading, mutation or hooks.
local M = {}
local function valid(a) return a and a:IsValid() end
local function quoted(s)
    s=tostring(s or ''):sub(1,160)
    return '"'..s:gsub('[%z\1-\31\\"]',function(c)
        if c=='"' then return '\\"' elseif c=='\\' then return '\\\\' end
        return string.format('\\u%04x',string.byte(c))
    end)..'"'
end
function M.party(world, localPawn)
    if not valid(world) then return nil end
    local gs=world.GameState
    if not valid(gs) or not gs:IsA('/Script/Icarus.IcarusGameStateSurvival') then return nil end
    local arr=gs.PlayerArray
    local n=arr:GetArrayNum()
    if type(n)~='number' or n<0 or n>64 then return nil end
    local out,complete,walked={},true,0
    local wn=world:GetFullName()
    local mine=nil
    pcall(function() if valid(localPawn) and valid(localPawn.PlayerState) then mine=localPawn.PlayerState:GetFullName() end end)
    arr:ForEach(function(_,element)
        walked=walked+1
        if walked>64 then complete=false return end
        local ok=pcall(function()
            local ps=element:get()
            if not valid(ps) then complete=false return end
            local id=ps.PlayerID
            if type(id)~='number' or id<0 then complete=false return end
            local name='서버원 '..tostring(id)
            pcall(function() local s=ps.PlayerNamePrivate:ToString() if type(s)=='string' and #s>0 then name=s end end)
            local pos='null'
            pcall(function()
                local p=ps.PawnPrivate
                if not valid(p) then return end
                local pw=p:GetWorld()
                if not valid(pw) or pw:GetFullName()~=wn then return end
                local l=p:K2_GetActorLocation()
                if l.X~=l.X or l.Y~=l.Y or l.Z~=l.Z then return end
                pos=string.format('[%.0f,%.0f,%.0f]',l.X,l.Y,l.Z)
            end)
            table.insert(out,'{"id":'..quoted(tostring(id))..',"n":'..quoted(name)..',"p":'..pos..',"self":'..tostring(ps:GetFullName()==mine)..'}')
        end)
        if not ok then complete=false end
    end)
    return '{"complete":'..tostring(complete and walked==n)..',"members":['..table.concat(out,',')..']}'
end
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
