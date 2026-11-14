-- Read only the currently visible tame detail panel, never scan world creatures.
-- SDK evidence: UMG_MountInterface_V2, UGeneticsComponent, UMG_StatTitle.
local M = {}
local keys = {"Vitality", "Endurance", "Muscle", "Agility", "Hardiness", "Toughness", "Utility"}
local function valid(o) return o and o:IsValid() end
local function text(t)
    if t == nil then return "" end
    if type(t) == "string" then return t end
    return t:ToString()
end
local function quote(s)
    s = tostring(s or ""):sub(1, 300)
    return '"' .. s:gsub('[%z\1-\31\\"]', function(c)
        if c == '\\' then return '\\\\' end
        if c == '"' then return '\\"' end
        return string.format('\\u%04x', string.byte(c))
    end) .. '"'
end
function M.read()
    local panels = FindAllOf("UMG_MountInterface_V2_C") or {}
    local inspected = 0
    for _, panel in ipairs(panels) do
        inspected = inspected + 1
        if inspected > 8 then break end
        if valid(panel) and not panel:GetFullName():find("Default__", 1, true)
            and panel:IsInViewport() and panel:IsVisible() then
            local actor = panel.LinkedMount
            if not valid(actor) then return nil end
            local species = actor.MountData.RowName:ToString()
            local class = StaticFindObject("/Script/Icarus.GeneticsComponent")
            if not valid(class) then return nil end
            local genetics = actor:GetComponentByClass(class)
            if not valid(genetics) or not genetics.bHasGeneratedGenetics then return nil end
            local values = genetics.CreatureGenetics
            local count = values:GetArrayNum()
            if count ~= 7 then return nil end
            local genes, visited = {}, 0
            values:ForEach(function(_, entry)
                visited = visited + 1
                if visited > 7 then return true end
                local row = entry:get()
                local name = row.GeneticValue.RowName:ToString()
                local n = tonumber(row.Value)
                if n and n >= 0 and n <= 10 and n % 1 == 0 then genes[name] = n end
            end)
            local geneJson = {}
            for _, key in ipairs(keys) do
                if genes[key] == nil then return nil end
                geneJson[#geneJson + 1] = quote(key) .. ':' .. genes[key]
            end
            local stats = {}
            local display = panel.UMG_StatDisplayMount
            if valid(display) then
                for _, key in ipairs({"Health", "Stamina", "MeleeDamage", "MovementSpeed", "SprintSpeed", "WeightCapacity"}) do
                    local item = display[key]
                    if valid(item) and valid(item.StatValue) then
                        stats[#stats + 1] = quote(key) .. ':' .. quote(text(item.StatValue:GetText()))
                    end
                end
            end
            return '{"id":' .. quote(actor:GetFullName()) .. ',"name":' .. quote(text(actor.MountName))
                .. ',"species":' .. quote(species) .. ',"sex":' .. tostring(tonumber(genetics.CreatureSex) or 0)
                .. ',"genes":{' .. table.concat(geneJson, ',') .. '},"stats":{' .. table.concat(stats, ',') .. '}}'
        end
    end
    return nil
end
return M
