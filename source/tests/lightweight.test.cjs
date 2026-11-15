const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('hidden navigation does not read containers, but visible navigation resumes',()=>{
 const html=fs.readFileSync(require.resolve('../mod/hud/index.html'),'utf8');const start=html.indexOf('function drawNav(){'),end=html.indexOf('function drawBenches(',start),code=html.slice(start,end);
 let reads=0;const node={style:{},value:''};const c={document:{hidden:false},S:{tab2:'map',nav:{on:true}},$:()=>node,allBoxes:()=>{reads++;throw Error('visible read')},window:{}};vm.createContext(c);vm.runInContext(code,c);
 for(let i=0;i<80;i++)c.drawNav();assert.equal(reads,0);c.S.tab2='nav';c.document.hidden=true;c.drawNav();assert.equal(reads,0);c.document.hidden=false;assert.throws(()=>c.drawNav(),/visible read/);assert.equal(reads,1);
});
test('inventory and visible animal samples retain three-second cadence on separate ticks',()=>{
 const lua=fs.readFileSync(require.resolve('../mod/Scripts/main.lua'),'utf8');const bag=Number(lua.match(/if tick % 4 == (\d) then bagChanged/)[1]),animal=Number(lua.match(/if tick % 4 == (\d) and WORLD_READY and on\("animals"\)/)[1]);assert.notEqual(bag,animal);for(const phase of [bag,animal])assert.equal(Array.from({length:80},(_,i)=>i).filter(i=>i%4===phase).length,20);
});
