const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
const mod=fs.readFileSync(__dirname+'/Scripts/main.lua','utf8');
function run(tail){
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
 const harness=`
 files={}; nativeCalls=0; calls=0; queue={}; now=1000; identity=1; standalone=true; authority=false; players=1; spectators=0; modeValid=true; valid=true; count=0
 io.open=function(p,m)
   local k=p:match('([^/]+)$')
   if m=='r' then if not files[k] then return nil end; return {read=function() return files[k] end,close=function() end} end
   return {write=function(self,s) files[k]=s end,close=function() end}
 end
 os.remove=function(p) files[p:match('([^/]+)$')]=nil; return true end
 os.rename=function(a,b) a=a:match('([^/]+)$');b=b:match('([^/]+)$'); if not files[a] then return nil end;files[b]=files[a];files[a]=nil;return true end
 os.time=function() return now end
 debug.getinfo=function() return {source='@mock/Scripts/main.lua'} end
 allowedMock={Fiber=true,Stone=true}; received={}; rejectStone=false
 dofile=function() return allowedMock end
 local pc;pc={GetAddress=function() return identity end,GetFullName=function() return "Player"..identity end,IsValid=function() return valid end, IsLocalController=function() return true end, HasAuthority=function() return authority end,
 AddItemToInventory=function(self,item) assert(allowedMock[item.RowName]);calls=calls+1;received[item.RowName]=(received[item.RowName] or 0)+1 end}
 PC=pc
 package.preload.UEHelpers=function() return {GetPlayerController=function() return pc end,GetPlayer=function() return pc end} end
 StaticFindObject=function() nativeCalls=nativeCalls+1; return {IsValid=function() return true end,IsStandalone=function() return standalone end,GetGameMode=function() return {IsValid=function() return modeValid end,GetNumPlayers=function() return players end,GetNumSpectators=function() return spectators end} end,IsValidName=function(self,name) return not (rejectStone and name=='Stone') end} end
 FName=function(x) return x end
 LoopAsync=function(ms,f) assert(ms==3000 or ms==1000);if ms==3000 then heartbeatLoop=f else autoLoop=f end end
 Key={F11=122}
 RegisterKeyBind=function(k,f) key=f end
 ExecuteInGameThread=function(f) f() end
 ExecuteWithDelay=function(ms,f) assert(ms==100);table.insert(queue,f) end
 pump=function() local f=table.remove(queue,1);if f then f() end end
 drain=function() while #queue>0 do pump() end end
 print=function() end
 `;
 const result=lauxlib.luaL_dostring(L,to_luastring(harness+'\n'+mod+'\n'+tail));
 if(result!==lua.LUA_OK) throw Error(to_jsstring(lua.lua_tostring(L,-1)));
 lua.lua_close(L);
}
const id='a'.repeat(32);
test('mixed set crosses item boundary within a batch and executes exactly 1000 calls',()=>run(`files['request.txt']='${id}|1000|SET|Fiber:610,Stone:390';key();assert(calls==25);while #queue>0 do local before=calls;pump();assert(calls-before<=25) end;assert(received.Fiber==610 and received.Stone==390);assert(files['status.txt']:find('|SENT|1000|SET',1,true));key();assert(calls==1000)`));
test('set cancellation stops remaining kinds after a partial batch',()=>run(`files['request.txt']='${id}|1000|SET|Fiber:10,Stone:90';key();assert(received.Fiber==10 and received.Stone==15);files['cancel.txt']='${id}';drain();assert(calls==25 and files['status.txt']:find('|CANCELLED|25|',1,true))`));
test('every set entry and native template is validated before any delivery',()=>{
 for(const payload of ['Fiber:1,Unknown:1','Fiber:1,Fiber:1','Fiber:0','Fiber:1,Stone:1000','Fiber:1,','Fiber:1,,Stone:1',',Fiber:1','Fiber:1.5','Fiber:-1','Fiber:1|Stone:1',''])
 run(`files['request.txt']='${id}|1000|SET|${payload}';key();drain();assert(calls==0 and not files['processing.txt'])`);
 run(`rejectStone=true;files['request.txt']='${id}|1000|SET|Fiber:1,Stone:1';key();assert(calls==0 and files['status.txt']:find('|ERROR|0|',1,true))`);
});
test('set format rejects too many kinds and oversized payloads',()=>{
 run(`local parts={};for i=1,21 do allowedMock['Item'..i]=true;parts[i]='Item'..i..':1' end;files['request.txt']='${id}|1000|SET|'..table.concat(parts,',');key();assert(calls==0)`);
 run(`files['request.txt']='${id}|1000|SET|Fiber:'..string.rep('0',4096)..'1';key();assert(calls==0)`);
 run(`local parts={};for i=1,20 do allowedMock['Item'..i]=true;parts[i]='Item'..i..':1' end;files['request.txt']='${id}|1000|SET|'..table.concat(parts,',');key();assert(calls==20)`);
});
test('set world change or multiplayer transition stops later batches',()=>{
 for(const change of ['identity=2','players=2'])run(`standalone=false;authority=true;files['request.txt']='${id}|1000|SET|Fiber:25,Stone:25';key();${change};drain();assert(calls==25 and not received.Stone)`);
});
test('1000 is accepted and runs as forty bounded batches; repeated F11 cannot duplicate it',()=>run(`files['request.txt']='${id}|1000|Fiber|1000';key();assert(calls==25 and #queue==1);key();assert(calls==25);local batches=1;while #queue>0 do local before=calls;pump();assert(calls-before<=25);batches=batches+1 end;assert(calls==1000 and batches==40);assert(not files['processing.txt']);assert(files['status.txt']:find('|SENT|1000|',1,true));key();assert(calls==1000)`));
test('cancel matches request id and stops remaining batches without rolling back prior calls',()=>run(`files['request.txt']='${id}|1000|Fiber|1000';key();files['cancel.txt']='not-this-request';pump();assert(calls==50);files['cancel.txt']='${id}';drain();assert(calls==50);assert(files['status.txt']:find('|CANCELLED|50|',1,true));assert(not files['processing.txt'])`));
test('changed player, unavailable player, joining player and deadline stop pending calls',()=>{
 for(const change of ['identity=2','valid=false','players=2','now=1031'])
 run(`standalone=false;authority=true;files['request.txt']='${id}|1000|Fiber|1000';key();assert(calls==25);${change};drain();assert(calls==25);assert(files['status.txt']:find('|ERROR|25|',1,true));assert(not files['processing.txt'])`);
});
test('missing scheduler fails before generating and scheduler failure reports partial count',()=>{
 run(`ExecuteWithDelay=nil;files['request.txt']='${id}|1000|Fiber|1000';key();assert(calls==0);assert(not files['processing.txt'])`);
 run(`ExecuteWithDelay=function() error('scheduler unavailable') end;files['request.txt']='${id}|1000|Fiber|1000';key();assert(calls==25);assert(files['status.txt']:find('|ERROR|25|',1,true));assert(not files['processing.txt'])`);
});
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
 for(const request of [`${id}|800|Fiber|1`,`${id}|1000|Unknown|1`,`${id}|1000|Fiber|1001`,'broken'])
 run(`files['request.txt']='${request}';key();assert(calls==0);assert(not files['request.txt']);assert(files['status.txt']:find('|ERROR|',1,true))`);
});
test('missing player blocks generation',()=>run(`valid=false;files['request.txt']='${id}|1000|Fiber|1';key();assert(calls==0)`));
test('catalog only contains unique valid template identifiers',()=>{
 const items=JSON.parse(fs.readFileSync(__dirname+'/catalog.json'));
 assert.equal(new Set(items.map(i=>i.id)).size,items.length);
 assert(items.every(i=>/^[A-Za-z0-9_]+$/.test(i.id)&&i.name));
 assert(!items.some(i=>i.id==='Charcoal_From_Wood'));
});

test('a request is delivered automatically without F11, once, and an idle loop does no game work',()=>run(`
 local before=nativeCalls;autoLoop();assert(calls==0 and nativeCalls==before,'idle loop must not touch game objects')
 files['request.txt']='${id}|1000|Fiber|3';autoLoop();assert(calls==3 and files['status.txt']:find('|SENT|3|',1,true) and not files['request.txt'])
 autoLoop();assert(calls==3,'no duplicate')`));
test('automatic pickup keeps every safety check: multiplayer and expired requests are refused',()=>{
 run(`standalone=false;authority=true;players=2;files['request.txt']='${id}|1000|Fiber|3';autoLoop();assert(calls==0 and files['status.txt']:find('|ERROR|',1,true))`);
 run(`files['request.txt']='${id}|800|Fiber|3';autoLoop();assert(calls==0 and files['status.txt']:find('|ERROR|',1,true))`);
 run(`files['request.txt']='${id}|1000|Fiber|30';autoLoop();assert(calls==25);autoLoop();assert(calls==25,'busy while batching');drain();assert(calls==30)`);
});

const tp=`pos={X=1000,Y=2000,Z=300};teleported=nil;pc.K2_GetActorLocation=function() return pos end;pc.K2_GetActorRotation=function() return {Yaw=90} end;pc.K2_TeleportTo=function(self,l,r) teleported={l,r};pos={X=l.X,Y=l.Y,Z=l.Z};return true end;pc.GetFullName=function() return '/Game/Maps/Terrain_016/Terrain_016.Terrain_016:PersistentLevel.BP_IcarusPlayerCharacterSurvival_C_1' end;`;
test('teleport: save here, go to a saved spot on the same map, and back',()=>run(`${tp.replace('pc.','PCX.').replace(/pc\./g,'PCX.')}`.replace(/PCX\./g,'PC.')+`
 files['teleport.txt']='${id}|1000|HERE';autoLoop();assert(files['here.txt']=='${id}|Terrain_016|1000|2000|300' and not files['teleport.txt'])
 files['teleport.txt']='${id}|1000|GO|Terrain_016|-5000|7000|100';autoLoop();assert(teleported[1].X==-5000 and teleported[1].Z==250 and teleported[2].Yaw==90)
 assert(files['teleport-back.txt']=='Terrain_016|1000|2000|300' and files['status.txt']:find('|SENT|0|TELEPORT',1,true))
 files['teleport.txt']='${id}|1000|BACK';autoLoop();assert(teleported[1].X==1000 and teleported[1].Y==2000)
 assert(calls==0,'teleport never creates items')`));
test('teleport refuses other maps, multiplayer, old requests and wild coordinates',()=>{
 for(const [setup,req] of [['','GO|Terrain_017|0|0|0'],['standalone=false;authority=true;players=2','GO|Terrain_016|0|0|0'],['','GO|Terrain_016|9000000|0|0'],['','BACK'],['','GO|Terrain_016|1|x|0']])
  run(tp.replace(/pc\./g,'PC.')+setup+`;files['teleport.txt']='${id}|1000|${req}';autoLoop();assert(teleported==nil and files['status.txt']:find('|ERROR|',1,true))`);
 run(tp.replace(/pc\./g,'PC.')+`files['teleport.txt']='${id}|900|GO|Terrain_016|0|0|0';autoLoop();assert(teleported==nil)`);
});

test('teleport falls back when TeleportTo refuses the spot',()=>{
 run(tp.replace(/pc\./g,'PC.')+`tries=0;PC.K2_TeleportTo=function(self,l) tries=tries+1;return false end;PC.K2_SetActorLocation=function(self,l,sweep,hit,tele) assert(sweep==false and tele==true);pos={X=l.X,Y=l.Y,Z=l.Z};return true end
  files['teleport.txt']='${id}|1000|GO|Terrain_016|-5000|7000|100';autoLoop();assert(tries==2 and pos.X==-5000 and files['status.txt']:find('|SENT|0|TELEPORT',1,true))`);
 run(tp.replace(/pc\./g,'PC.')+`PC.K2_TeleportTo=function() return false end;PC.K2_SetActorLocation=function() return false end
  files['teleport.txt']='${id}|1000|GO|Terrain_016|-5000|7000|100';autoLoop();assert(files['status.txt']:find('|ERROR|',1,true) and pos.X==1000)`);
});
