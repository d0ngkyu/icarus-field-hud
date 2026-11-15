const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let F;try{F=require('fengari')}catch{}
test('Lua map context: no account collection, current world/cave guards, missing scope, errors and cap',{skip:!F&&'requires fengari'},()=>{
 const {lua,lauxlib,lualib,to_luastring,to_jsstring}=F,L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
 lua.lua_pushstring(L,to_luastring(fs.readFileSync(path.join(__dirname,'../mod/Scripts/map_observation.lua'),'utf8')));lua.lua_setglobal(L,to_luastring('SOURCE'));
 const rc=lauxlib.luaL_dostring(L,to_luastring(`
 local scope='prospectA';local w={IsValid=function() return true end,GetFullName=function() return 'worldA' end}
 w.GameState={IsValid=function() return true end,IsA=function() return true end,ReplicatedActiveProspect={ProspectID={ToString=function() return scope end}}}
 local function player(world,cave) return {IsValid=function() return true end,GetFullName=function() return 'Player' end,GetWorld=function() return world end,GetIsInCave=function() return cave end,K2_GetActorLocation=function() return {X=1,Y=2,Z=3} end} end
 local foreign={IsValid=function() return true end,GetFullName=function() return 'worldB' end}
 local list={player(w,false),player(foreign,true),player(w,true),{IsValid=function() error('unloaded') end}}
 FindAllOf=function(c) assert(c=='IcarusPlayerCharacterSurvival');return list end
 local m=assert(load(SOURCE))();
 local spawn=player(w,false);spawn['Meta Node Handle']={RowName={ToString=function() return 'MetaDeposit_Volcanic' end}}
 local wrong=player(foreign,false);wrong['Meta Node Handle']=spawn['Meta Node Handle']
 local plant=player(w,false);plant.ResourceCount=0
 local originalFind=FindAllOf
 FindAllOf=function(c) if c=='BP_IcarusMetaSpawn_C' then return {spawn,wrong} elseif c=='BP_ExoticPlantSpawn_C' then return {player(w,false)} else return {plant} end end
 local marks=m.redMarks(w);assert(#marks==3 and marks[1]:find('r:Tree',1,true) and marks[3]:find(',0]',1,true))
 plant.ResourceCount=4;assert(m.redMarks(w)[3]:find(',4]',1,true));assert(#m.redMarks(nil)==0)
 FindAllOf=originalFind
 local id,points=m.context(w,true);assert(id=='prospectA' and points=='[[1,2,3,1]]')
 id,points=m.context(w,false);assert(points=='[]')
 w.GameState.bIsOpenWorldProspect=true;w.GameState.GetReplicatedProspectGameTime=function() return 10700 end
 local _,_,clock=m.context(w,false);assert(clock=='{"seconds":10700.0,"open":true}')
 w.GameState.GetReplicatedProspectGameTime=function() error('unsupported') end;_,_,clock=m.context(w,false);assert(clock==nil)
 w.GameState.GetReplicatedProspectGameTime=function() return 0/0 end;_,_,clock=m.context(w,false);assert(clock==nil)
 scope='';assert(m.context(w,true)==nil);scope='invalid"id';assert(m.context(w,true)==nil)
 scope='prospectB';list={};for i=1,100 do list[i]=player(w,true) end;id,points=m.context(w,true);local _,n=points:gsub('%[1,2,3,1%]','');assert(n==64)
 assert(m.context(nil,true)==nil)
 local ps={IsValid=function() return true end,PlayerID=7,GetFullName=function() return 'PS7' end,PlayerNamePrivate={ToString=function() return 'Friend' end},PawnPrivate=player(w,true)}
 w.GameState.PlayerArray={GetArrayNum=function() return 1 end,ForEach=function(_,f) f(1,{get=function() return ps end}) end}
 local roster=m.party(w,{IsValid=function() return true end,PlayerState=ps});assert(roster:find('"n":"Friend"',1,true) and roster:find('"self":true',1,true) and roster:find('"p":[1,2,3]',1,true))
 ps.PawnPrivate=nil;roster=m.party(w,nil);assert(roster:find('"p":null',1,true))
 w.GameState.PlayerArray.GetArrayNum=function() return 65 end;assert(m.party(w,nil)==nil)

 `));assert.equal(rc,lua.LUA_OK,rc?to_jsstring(lua.lua_tostring(L,-1)):'');lua.lua_close(L);
});
