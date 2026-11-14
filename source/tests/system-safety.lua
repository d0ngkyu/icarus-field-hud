-- Executed by lua-safety.test.cjs using Fengari (Lua 5.3), no game/native calls.
local scans, oldTouched, currentInventory = 0, 0, nil
local present, worldName = true, "World_A"
local world = {IsValid=function() return true end,GetFullName=function() return worldName end}
local pawn = {IsValid=function() return present end,GetFullName=function() return "Player.Test" end,
 GetWorld=function() return world end,K2_GetActorLocation=function() return {X=10,Y=20,Z=30} end,
 GetControlRotation=function() return {Yaw=0} end}
local invalid = {IsValid=function() return false end}
local remotePawn={IsValid=function() error('remote client pawn touched') end}
local remoteController={IsValid=function() return true end,IsLocalPlayerController=function() return false end,Pawn=remotePawn}
local localController={IsValid=function() return true end,IsLocalPlayerController=function() return true end,Pawn=pawn,PlayerState=invalid}
package.preload.UEHelpers=function() return {GetPlayer=function() return pawn end,GetWorld=function() return world end,GetPlayerController=function() return invalid end} end
package.preload.animals=function() return assert(load(ANIMAL_SOURCE))() end
Key=setmetatable({},{__index=function(_,k) return k end})
local boundKeys={}
RegisterKeyBind=function(k) boundKeys[k]=true end
ExecuteInGameThread=function(fn) fn() end
LoopAsync=function() end
io.open=function() return nil end
FindAllOf=function(name) if name=='PlayerController' then return {remoteController,localController} end;scans=scans+1;if name=='Inventory' and currentInventory then return {currentInventory} end;return {} end
print=function() end
local extra='\nreturn {tick=autoTick,send=send,scan=scanOres,bag=scanBag,slots=addSlots,safe=function(v) SAFE=v end}'
local m=assert(load(MAIN_SOURCE..extra))()
for _,k in ipairs({'F3','F4','F5','F6'}) do assert(not boundKeys[k],'automation key registered: '..k) end
for _,k in ipairs({'F7','F8','F9','F10'}) do assert(boundKeys[k],'reference key missing: '..k) end
for i=1,60 do m.tick() end
assert(not WORLD_READY and scans==0,'scans ran during initial warmup')
m.tick();assert(WORLD_READY,'stable session not ready')
present=false;m.tick();assert(not WORLD_READY,'lost player kept world ready')
local before=scans
present=true
for i=1,60 do m.tick() end
assert(not WORLD_READY and scans==before,'rejoin reused previous warmup')
m.tick();assert(WORLD_READY)
worldName='World_B';m.tick();assert(not WORLD_READY,'world change not reset')
for i=1,60 do m.tick() end
assert(WORLD_READY)
m.safe(true);before=scans;m.scan();assert(scans==before,'safe mode scanned ores')
m.safe(false)
local function inventory(stale)
 return {IsValid=function() if stale() then oldTouched=oldTouched+1;error('stale pointer used') end;return true end,
 GetFullName=function() return 'Inventory.Test.Bag' end,
 Slots={Slots={GetArrayNum=function() return 0 end,ForEach=function() end}}}
end
local stale=false
currentInventory=inventory(function() return stale end);m.bag()
stale=true;currentInventory=inventory(function() return false end);m.bag()
assert(oldTouched==0,'native inventory cached across callbacks')
local walked=false
local oversized={IsValid=function() return true end,Slots={Slots={GetArrayNum=function() return 513 end,ForEach=function() walked=true end}}}
assert(m.slots(oversized,{})==0 and not walked,'oversized array traversed')
local queued={}
ExecuteInGameThread=function(f) queued[#queued+1]=f end
for i=1,20 do m.send('inv') end
assert(#queued==1,'repeated hotkey flooded game-thread queue')
WORLD_READY=false;before=scans;queued[1]();assert(scans==before,'queued key ran during transition')
return true
