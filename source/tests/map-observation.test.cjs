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
 local m=assert(load(SOURCE))();local id,points=m.context(w,true);assert(id=='prospectA' and points=='[[1,2,3,1]]')
 id,points=m.context(w,false);assert(points=='[]')
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
