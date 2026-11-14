const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../mod/hud/index.html'),'utf8');
function harness(){
 const nodes=new Map(),noop=()=>{};
 const ctx=new Proxy({createRadialGradient:()=>({addColorStop:noop}),measureText:()=>({width:10})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
 const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',style:{},dataset:{},classList:{toggle:noop,add:noop,remove:noop,contains:()=>true},addEventListener:noop,getContext:()=>ctx,getBoundingClientRect:()=>({width:800,height:600}),setPointerCapture:noop});return nodes.get(id)};
 let now=1000;const clock=class extends Date{static now(){return now}};
 const c=vm.createContext({S:{},I:{},D:{},Date:clock,console,save:noop,draw:noop,allBoxes:()=>[],addLog:noop,nm:x=>x,en:x=>x,esc:x=>x,document:{body:node("body"),getElementById:node,createElement:node,querySelector:()=>node('query'),addEventListener:noop},window:{addEventListener:noop},Image:class{},setInterval:noop,setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop});
 let code=html.slice(html.indexOf('(()=>{\n// ===== interactive map:'),html.indexOf('</script>',html.indexOf('// ===== interactive map:')));
 assert.ok(code.length>1000);
 code=code.replace(/\}\)\(\);\s*$/, 'window.test={session,M,selectMap,wpButton,dedupCaves,resize,drawMap,V,fitMap};})();');
 vm.runInContext(code,c);return {c,t:c.window.test,node,tick:n=>{now=n},ingest:m=>c.window.__mapIngest(m)};
}
test('offline browsing and independent per-world pins, paths and views',()=>{
 const h=harness(),{t}=h;t.resize();t.selectMap('Terrain_017');t.M().pins.push({x:1});t.V.x=123;t.selectMap('Terrain_016');assert.equal(t.M().pins.length,0);t.selectMap('Terrain_017');assert.equal(t.M().pins.length,1);assert.equal(t.V.x,123);assert.equal(t.session.active(1000),false);
});
test('cached telemetry cannot fake connection; first moving stream selects actual map once',()=>{
 const h=harness(),{t}=h;t.selectMap('Terrain_017');h.ingest({w:'Terrain_016',t:1,p:[1,2]});h.ingest({w:'Terrain_016',t:1});assert.equal(t.session.view,'Terrain_017');h.tick(2000);h.ingest({w:'Terrain_016',t:2});assert.equal(t.session.view,'Terrain_016');t.selectMap('Terrain_019');h.tick(3000);h.ingest({w:'Terrain_016',t:3,lm:[['c:Cave',100,200]]});assert.equal(t.session.view,'Terrain_019');assert.equal(Object.keys(t.M('Terrain_019').lm).length,0);assert.equal(Object.keys(t.M('Terrain_016').lm).length,1);
});
test('world changes auto-select after fresh heartbeat; expired stream blocks waypoint commands',()=>{
 const h=harness(),{t}=h;h.ingest({w:'Terrain_016',t:1});h.tick(2000);h.ingest({w:'Terrain_016',t:2});assert.match(t.wpButton(1,2,3),/data-mwp/);t.selectMap('Terrain_017');assert.doesNotMatch(t.wpButton(1,2,3),/data-mwp/);h.ingest({w:'Terrain_019',t:3});h.tick(3000);h.ingest({w:'Terrain_019',t:4});assert.equal(t.session.view,'Terrain_019');h.tick(34000);h.ingest({w:'Terrain_019',t:4});assert.doesNotMatch(t.wpButton(1,2,3),/data-mwp/);assert.equal(t.session.active(34000),false);
});
test('different maps with equal marker counts do not share cave deduplication',()=>{
 const {t}=harness();const a={lm:{a:['c:Cave',0,0],b:['w:Cave',0,0]}},b={lm:{a:['c:Cave',0,0],b:['w:Cave',90000,90000]}};assert.equal(t.dedupCaves(a).a,1);assert.equal(t.dedupCaves(b).a,undefined);
});
test('actual world transition isolates and restores remembered base and containers',()=>{
 const h=harness();h.c.S.world='Terrain_016';h.c.S.home=[1,2,3];h.c.S.mem={box:{p:[1,2,3]}};h.c.S.wp='1|2|3';h.c.S.pose=[1,2,3];
 h.ingest({w:'Terrain_017',t:1});assert.equal(h.c.S.home,null);assert.equal(Object.keys(h.c.S.mem).length,0);assert.equal(h.c.S.wp,null);assert.equal(h.c.S.pose,null);
 h.ingest({w:'Terrain_016',t:2});assert.deepEqual(h.c.S.home,[1,2,3]);assert.ok(h.c.S.mem.box);
});
test('all inline scripts parse and offline map renders with no native calls',()=>{
 for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))if(!m[0].includes('application/json'))new vm.Script(m[1]);
 const h=harness();h.t.resize();h.t.drawMap();assert.match(h.node('mapworld').textContent,/미접속/);assert.equal(h.node('mtme').disabled,true);
});
