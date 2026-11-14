const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const A=require('../mod/hud/animals');
test('chart order matches the game and live payload is bounded and plain text',()=>{
 assert.deepEqual(A.keys,['Vitality','Endurance','Muscle','Agility','Toughness','Hardiness','Utility']);
 const a=A.normalize({species:'Moa',genes:Object.fromEntries(A.keys.map(k=>[k,4])),tooltips:{Agility:'<b>이동 속도 [4]</>\n이동 속도 +4%'},stats:{Health:'1,136',ColdRes:'-6%'},details:[{group:'저항',label:'불 저항',value:'40%'}]});
 assert.equal(a.tooltips.Agility,'이동 속도 [4]\n이동 속도 +4%');assert.equal(a.stats.ColdRes,'-6%');assert.equal(a.details[0].value,'40%');
});
test('animal genes read once but UI stats refresh; target switch waits; closed window clears',()=>{
 const F=require('fengari'),{lua,lauxlib,lualib,to_luastring,to_jsstring}=F,L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
 lua.lua_pushstring(L,to_luastring(fs.readFileSync(path.join(__dirname,'../mod/Scripts/animals.lua'),'utf8')));lua.lua_setglobal(L,to_luastring('SOURCE'));
 const code=`local function obj(t) t.IsValid=function()return true end return t end
 local function txt(s) return obj{GetText=function()return s end} end
 local reads=0 local open=true local name='AnimalA' local hp='100'
 local actor=obj{GetFullName=function()return name end,MountName='동물',MountData={RowName={ToString=function()return 'Moa' end}}}
 local genes={} for _,k in ipairs({'Vitality','Endurance','Muscle','Agility','Hardiness','Toughness','Utility'}) do table.insert(genes,{GeneticValue={RowName={ToString=function()return k end}},Value=4}) end
 local comp=obj{bHasGeneratedGenetics=true,CreatureSex=2,CreatureGenetics={GetArrayNum=function()return 7 end,ForEach=function(_,f)reads=reads+1 for i,g in ipairs(genes)do f(i,{get=function()return g end})end end}}
 actor.GetComponentByClass=function()return comp end
 local display=obj{Initialised=true,TargetActor=actor,Health=obj{StatValue=obj{GetText=function()return hp end}}}
 local gt=obj{['Built Tooltip']='이동 속도 +4%'}
 local list=obj{GetFullName=function()return 'UMG_StatList_C x' end,Stats=obj{GetChildrenCount=function()return 2 end,GetChildAt=function(_,i)if i==0 then return obj{GetFullName=function()return 'UMG_StatTitleCategory_C x' end,IsVisible=function()return true end,TitleText=txt('저항')}else return obj{GetFullName=function()return 'UMG_StatTitle_C x' end,IsVisible=function()return true end,TitleText=txt('불 저항'),StatValue=txt('40%')}end end}}
 local panel=obj{LinkedMount=actor,GetFullName=function()return 'UMG_MountInterface_V2_C x' end,IsVisible=function()return open end,IsInViewport=function()return open end,GetParent=function()return nil end,UMG_StatDisplayMount=display,Umg_GeneticsDisplay=obj{LinkedActor=actor,Umg_GeneticValues=obj{Agility=gt}},UMG_StatsWindow=obj{BoundActor=actor,IsVisible=function()return true end,Container=obj{GetChildrenCount=function()return 1 end,GetChildAt=function()return list end}}}
 FindAllOf=function(cls)if cls=='UMG_MountInterface_V2_C' then return {panel}end return {} end StaticFindObject=function()return obj{}end
 local m=assert(load(SOURCE))();assert(m.read()==nil);local first=m.read();assert(first:find('"Health":"100"',1,true));assert(first:find('이동 속도 +4%',1,true));assert(first:find('"value":"40%"',1,true));hp='90';assert(m.read():find('"Health":"90"',1,true));assert(reads==1)
 name='AnimalB';assert(m.read()==nil);assert(m.read():find('AnimalB',1,true));assert(reads==2)
 open=false;assert(m.read()==nil);open=true;assert(m.read()==nil);assert(m.read());assert(reads==3)
 display.TargetActor=obj{GetFullName=function()return 'different' end};assert(m.read():find('"stats":{}',1,true))
 `;const rc=lauxlib.luaL_dostring(L,to_luastring(code));assert.equal(rc,lua.LUA_OK,rc?to_jsstring(lua.lua_tostring(L,-1)):'');lua.lua_close(L);
});
