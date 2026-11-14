-- Read only the currently visible tame detail panel, never scan world creatures.
-- SDK evidence: UMG_MountInterface_V2, UGeneticsComponent, UMG_StatTitle.
local M = {}
local keys = {"Vitality", "Endurance", "Muscle", "Agility", "Hardiness", "Toughness", "Utility"}
local function valid(o) return o and o:IsValid() end
local function same(a,b) return valid(a) and valid(b) and a:GetFullName()==b:GetFullName() end
local function text(t)
    if t == nil then return "" end
    if type(t) == "string" then return t end
    return t:ToString()
end
local function quote(s)
    s = tostring(s or ""):sub(1, 4000)
    return '"' .. s:gsub('[%z\1-\31\\"]', function(c)
        if c == '\\' then return '\\\\' end
        if c == '"' then return '\\"' end
        return string.format('\\u%04x', string.byte(c))
    end) .. '"'
end
-- Fewer native reads = fewer chances to crash: the genetics list is read once per opening of a panel, only after
-- its panel has stayed open for two checks in a row (fully built), and never again after a bad read.
local cache, bad, pendingId, pendingSeen = {}, {}, nil, 0
local readOne, liveDetails
function M.reset()
    cache, bad, pendingId, pendingSeen = {}, {}, nil, 0
end
-- M.why: short reason for the last result, logged by main.lua when it changes (diagnosis only).
M.why = ""
-- Other animal windows, only checked by name/visibility (no data read) so the log shows which one is open.
local others = {"UMG_PersistentMountInfo_C", "UMG_TameParent_C", "W_CreatureScanner_C", "Umg_GeneticLineage_C", "UMG_MountTrade_C", "UMG_TalentView_Mount_C"}
local function visibleOther()
    for _, cls in ipairs(others) do
        local list = FindAllOf(cls) or {}
        for i, w in ipairs(list) do
            if i > 4 then break end
            if valid(w) and not w:GetFullName():find("Default__", 1, true) and w:IsInViewport() and w:IsVisible() then return cls end
        end
    end
    return nil
end
local quiet = 0
function M.read()
    local panels = FindAllOf("UMG_MountInterface_V2_C") or {}
    local inspected = 0
    for _, panel in ipairs(panels) do
        inspected = inspected + 1
        if inspected > 8 then break end
        -- The tame window can sit inside a parent menu; then the panel itself is not "in viewport" but has a parent.
        if valid(panel) and not panel:GetFullName():find("Default__", 1, true)
            and panel:IsVisible() and (panel:IsInViewport() or valid(panel:GetParent())) then
            local actor = panel.LinkedMount
            if not valid(actor) then M.why = "panel open, no linked animal" return nil end
            local id = actor:GetFullName()
            if cache[id] then M.why = "ok (live UI, cached genes)" return liveDetails(panel, actor, cache[id]) end
            if bad[id] then return nil end
            if pendingId ~= id then pendingId, pendingSeen = id, 1 M.why = "panel open, waiting" return nil end
            pendingSeen = pendingSeen + 1
            if pendingSeen < 2 then return nil end
            bad[id] = true                      -- set first: a failure below never retries this animal
            local value, why = readOne(panel, actor)
            if value then bad[id] = nil cache[id] = value M.why = "ok" else M.why = "read failed: " .. tostring(why) end
            return value and liveDetails(panel, actor, value) or nil
        end
    end
    pendingId, pendingSeen, cache = nil, 0, {}   -- panel closed: read again (once) next time it opens
    quiet = quiet + 1
    if quiet >= 5 then quiet = 0 local o = visibleOther() M.why = o and ("other animal window open: " .. o) or "no animal window" end
    return nil
end

readOne = function(panel, actor)
    do do -- (kept from the earlier loop body)
            local species = actor.MountData.RowName:ToString()
            local class = StaticFindObject("/Script/Icarus.GeneticsComponent")
            if not valid(class) then return nil, "no genetics class" end
            local genetics = actor:GetComponentByClass(class)
            if not valid(genetics) then return nil, "no genetics component" end
            if not genetics.bHasGeneratedGenetics then return nil, "genetics not generated" end
            local values = genetics.CreatureGenetics
            local count = values:GetArrayNum()
            if count ~= 7 then return nil, "gene count " .. tostring(count) end
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
                if genes[key] == nil then return nil, "missing gene " .. key end
                geneJson[#geneJson + 1] = quote(key) .. ':' .. genes[key]
            end
            return '{"id":' .. quote(actor:GetFullName())
                .. ',"species":' .. quote(species) .. ',"sex":' .. tostring(tonumber(genetics.CreatureSex) or 0)
                .. ',"genes":{' .. table.concat(geneJson, ',') .. '}'
        end
    end
    return nil
end
-- Only plain JSON is cached. Reacquire UI widgets every sample; never retain UObjects.
liveDetails = function(panel, actor, base)
            local stats, tips, detail = {}, {}, {}
            local display = panel.UMG_StatDisplayMount
            if valid(display) and display.Initialised and same(display.TargetActor,actor) then
                for _, key in ipairs({"Health", "HealthRegen", "Stamina", "StaminaRegen", "MeleeDamage", "MovementSpeed", "SprintSpeed", "WeightCapacity", "ColdRes", "HeatRes", "FallRes", "FireRes", "MeleeRes", "PoisonRes", "ProjectileRes"}) do
                    local item = display[key]
                    if valid(item) and valid(item.StatValue) then
                        stats[#stats + 1] = quote(key) .. ':' .. quote(text(item.StatValue:GetText()))
                    end
                end
            end
            local geneticsUI = panel.Umg_GeneticsDisplay
            if valid(geneticsUI) and same(geneticsUI.LinkedActor,actor) then
                local valuesUI = geneticsUI.Umg_GeneticValues
                if valid(valuesUI) then for _, key in ipairs(keys) do
                    local item = valuesUI[key]
                    if valid(item) then tips[#tips+1] = quote(key) .. ':' .. quote(text(item['Built Tooltip'])) end
                end end
            end
            local extra = panel.UMG_StatsWindow
            if valid(extra) and extra:IsVisible() and same(extra.BoundActor,actor) and valid(extra.Container) then
                local count = math.min(extra.Container:GetChildrenCount(), 8)
                local category = "능력치"
                for i=0,count-1 do
                    local list = extra.Container:GetChildAt(i)
                    if valid(list) and list:GetFullName():match('^UMG_StatList_C ') and valid(list.Stats) then
                        local n = math.min(list.Stats:GetChildrenCount(), 96)
                        for j=0,n-1 do
                            if #detail >= 96 then break end
                            local item = list.Stats:GetChildAt(j)
                            if valid(item) and item:IsVisible() then
                                local cls = item:GetFullName()
                                if cls:match('^UMG_StatTitleCategory_C ') and valid(item.TitleText) then category=text(item.TitleText:GetText())
                                elseif cls:match('^UMG_StatTitle_C ') and valid(item.TitleText) and valid(item.StatValue) then
                                    detail[#detail+1]='{"group":'..quote(category)..',"label":'..quote(text(item.TitleText:GetText()))..',"value":'..quote(text(item.StatValue:GetText()))..'}'
                                end
                            end
                        end
                    end
                end
            end
            return base .. ',"name":' .. quote(text(actor.MountName)) .. ',"stats":{' .. table.concat(stats, ',') .. '},"tooltips":{' .. table.concat(tips, ',') .. '},"details":[' .. table.concat(detail, ',') .. ']}'
    end
return M
