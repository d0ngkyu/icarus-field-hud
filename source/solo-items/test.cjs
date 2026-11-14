const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
const mod=fs.readFileSync(__dirname+'/Scripts/main.lua','utf8');
function run(tail){
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
 const harness=`
 files={}; nativeCalls=0; calls=0; standalone=true; authority=false; players=1; spectators=0; modeValid=true; valid=true; count=0
 io.open=function(p,m)
   local k=p:match('([^/]+)$')
   if m=='r' then if not files[k] then return nil end; return {read=function() return files[k] end,close=function() end} end
   return {write=function(self,s) files[k]=s end,close=function() end}
 end
 os.remove=function(p) files[p:match('([^/]+)$')]=nil; return true end
 os.rename=function(a,b) a=a:match('([^/]+)$');b=b:match('([^/]+)$'); if not files[a] then return nil end;files[b]=files[a];files[a]=nil;return true end
 os.time=function() return 1000 end
 debug.getinfo=function() return {source='@mock/Scripts/main.lua'} end
 dofile=function() return {Fiber=true} end
 local pc={IsValid=function() return valid end, IsLocalController=function() return true end, HasAuthority=function() return authority end,
 AddItemToInventory=function(self,item) assert(item.RowName=='Fiber');calls=calls+1 end}
 package.preload.UEHelpers=function() return {GetPlayerController=function() return pc end,GetPlayer=function() return pc end} end
 StaticFindObject=function() nativeCalls=nativeCalls+1; return {IsValid=function() return true end,IsStandalone=function() return standalone end,GetGameMode=function() return {IsValid=function() return modeValid end,GetNumPlayers=function() return players end,GetNumSpectators=function() return spectators end} end,IsValidName=function() return true end} end
 FName=function(x) return x end
 LoopAsync=function(ms,f) assert(ms==3000);heartbeatLoop=f end
 Key={F11=122}
 RegisterKeyBind=function(k,f) key=f end
 ExecuteInGameThread=function(f) f() end
 print=function() end
 `;
 const result=lauxlib.luaL_dostring(L,to_luastring(harness+'\n'+mod+'\n'+tail));
 if(result!==lua.LUA_OK) throw Error(to_jsstring(lua.lua_tostring(L,-1)));
 lua.lua_close(L);
}
const id='a'.repeat(32);
test('one-player authoritative host is allowed even when IsStandalone is false',()=>run(`standalone=false;authority=true;files['request.txt']='${id}|1000|Fiber|1';key();assert(calls==1);assert(files['world-check.txt']:find('|HOST',1,true));assert(files['status.txt']:find('|SENT|1|',1,true))`));
test('remote client is blocked even when alone',()=>run(`standalone=false;authority=false;files['request.txt']='${id}|1000|Fiber|1';key();assert(calls==0)`));
test('multiple players, spectators, missing mode and uncertain counts fail closed',()=>{
 for(const change of ['players=2','spectators=1','modeValid=false','players=nil','players=0','spectators=nil'])
 run(`standalone=false;authority=true;${change};files['request.txt']='${id}|1000|Fiber|1';key();assert(calls==0);assert(files['status.txt']:find('|ERROR|0|',1,true))`);
});
test('joining player is rechecked on next request; status has exactly four fields',()=>run(`standalone=false;authority=true;files['request.txt']='${id}|1000|Fiber|1';key();assert(calls==1);players=2;files['request.txt']='${id}|1000|Fiber|1';key();assert(calls==1);local _,n=files['status.txt']:gsub('|','');assert(n==3)`));
test('heartbeat writes liveness without any UObject/native call or item generation',()=>run(`assert(files['heartbeat.txt']=='1|1000|1000|LOADED');heartbeatLoop();assert(nativeCalls==0 and calls==0)`));
test('F11 without a request checks single world but never creates an item',()=>run(`key();assert(calls==0);assert(files['world-check.txt']=='1|1000|1000|SINGLE')`));
test('readiness reports multiplayer and missing player separately',()=>{run(`standalone=false;key();assert(calls==0);assert(files['world-check.txt']:find('|MULTI',1,true))`);run(`valid=false;key();assert(calls==0);assert(files['world-check.txt']:find('|WAITING',1,true))`);});
test('explicit request calls the template function once per item; replay has no effect',()=>run(`files['request.txt']='${id}|1000|Fiber|3';key();assert(calls==3);key();assert(calls==3);assert(files['status.txt']:find('|SENT|3|',1,true))`));
test('multiplayer blocked without a generation call',()=>run(`standalone=false;files['request.txt']='${id}|1000|Fiber|3';key();assert(calls==0);assert(files['status.txt']:find('|ERROR|',1,true))`));
test('expired, malformed, unknown and oversized requests are consumed without spawning',()=>{
 for(const request of [`${id}|800|Fiber|1`,`${id}|1000|Unknown|1`,`${id}|1000|Fiber|101`,'broken'])
 run(`files['request.txt']='${request}';key();assert(calls==0);assert(not files['request.txt']);assert(files['status.txt']:find('|ERROR|',1,true))`);
});
test('missing player blocks generation',()=>run(`valid=false;files['request.txt']='${id}|1000|Fiber|1';key();assert(calls==0)`));
test('catalog only contains unique valid template identifiers',()=>{
 const items=JSON.parse(fs.readFileSync(__dirname+'/catalog.json'));
 assert.equal(new Set(items.map(i=>i.id)).size,items.length);
 assert(items.every(i=>/^[A-Za-z0-9_]+$/.test(i.id)&&i.name));
 assert(!items.some(i=>i.id==='Charcoal_From_Wood'));
});
