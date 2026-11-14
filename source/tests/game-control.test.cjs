const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
const {createControl}=require('../app/game-control.js');
test('game control refuses absent/unknown game and only launches fixed Steam app',async()=>{
 let called='';const c=createControl({modDir:()=>null,gameUp:async()=>false,openExternal:async u=>called=u});
 await c('start');assert.equal(called,'steam://rungameid/1149460');await assert.rejects(c('save'),/실행 중/);await assert.rejects(c('kill'),/지원하지/);
 const unknown=createControl({gameUp:async()=>null});await assert.rejects(unknown('start'),/확인하지/);
});
test('save request ignores stale responses, awaits matching result and expires pending files',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'icarus-control-'));let clock=100000,iterations=0;
 try{const c=createControl({modDir:()=>dir,gameUp:async()=>true,now:()=>clock,sleep:async()=>{clock+=500;iterations++;const id=fs.readFileSync(path.join(dir,'control-request.txt'),'utf8').split('|')[0];fs.writeFileSync(path.join(dir,'control-response.txt'),(iterations===1?'stale':id)+'|save_processed');}});assert.equal((await c('save')).status,'save_processed');assert.equal(iterations,2);
 const timeout=createControl({modDir:()=>dir,gameUp:async()=>true,now:()=>clock,sleep:async()=>clock+=10000});assert.equal((await timeout('exit')).status,'timeout');assert.equal(fs.existsSync(path.join(dir,'control-request.txt')),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('Lua host saving guards authority, active saves, expiry and failed saves before exit',()=>{
 const F=require('fengari'),{lua,lauxlib,lualib,to_luastring,to_jsstring}=F,L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
 lua.lua_pushstring(L,to_luastring(fs.readFileSync(path.join(__dirname,'../mod/Scripts/game_control.lua'),'utf8')));lua.lua_setglobal(L,to_luastring('SOURCE'));
 const code=`local now=100 local files={} os.time=function() return now end
 io.open=function(p,mode) if mode=='r' and not files[p] then return nil end return {read=function() return files[p] end,write=function(_,s) files[p]=s end,close=function() end} end
 os.remove=function(p) files[p]=nil return true end
 local count,quit=0,0
 local gm={LastProspectSaveStateTime=10,UpdateProspectStateFailedCounter=0,bCurrentUpdateProspectIsSaving=false,IsValid=function() return true end,IsA=function() return true end,ForceImmediateProspectSave=function() count=count+1 end}
 local world={AuthorityGameMode=gm,IsValid=function() return true end,GetFullName=function() return 'world' end}
 local pawn={IsValid=function() return true end}
 FindFirstOf=function() return {IsValid=function() return true end,IsVisible=function() return true end,GetWorld=function() return world end,QuitGame=function() quit=quit+1 end} end
 local c=assert(load(SOURCE))()
 local function request(id,action,stamp) files['d/control-request.txt']=id..'|'..(stamp or now)..'|'..action;c.tick('d',pawn,world,true) end
 request('a','save',1);assert(count==0 and files['d/control-response.txt']=='a|expired')
 world.AuthorityGameMode=nil;request('b','save');assert(count==0);world.AuthorityGameMode=gm
 request('c','save');assert(count==1 and files['d/control-response.txt']=='c|save_requested')
 c.tick('d',pawn,world,true);assert(files['d/control-response.txt']=='c|save_requested')
 gm.LastProspectSaveStateTime=11;c.tick('d',pawn,world,true);assert(files['d/control-response.txt']=='c|save_processed')
 now=120;request('d','exit');assert(count==2);gm.UpdateProspectStateFailedCounter=1;c.tick('d',pawn,world,true);assert(quit==0 and files['d/control-response.txt']=='d|save_failed')
 now=140;request('e','exit');gm.LastProspectSaveStateTime=12;c.tick('d',pawn,world,true);assert(quit==1)
 `;
 const rc=lauxlib.luaL_dostring(L,to_luastring(code));assert.equal(rc,lua.LUA_OK,rc?to_jsstring(lua.lua_tostring(L,-1)):'');lua.lua_close(L);
});
