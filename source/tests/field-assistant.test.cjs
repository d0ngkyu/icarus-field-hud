const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const fa=require('../mod/hud/field-assistant.js');

const html=fs.readFileSync(path.join(__dirname,'../mod/hud/index.html'),'utf8');
const dataMatch=html.match(/<script id="d" type="application\/json">(.*?)<\/script>/);
const D=JSON.parse(dataMatch[1]);
const CAVEMAP=JSON.parse(html.match(/const CAVEMAP=(\{.*?\});\n/)[1]);

test('all preset craft kits and essential checklist items exist in game items and recipes',()=>{
 for(const kit of fa.CRAFT_KITS){
  assert.ok(kit.items.length>=4,kit.id);
  for(const [k,n] of kit.items){
   assert.ok(D.items[k],`missing item ${k} in kit ${kit.id}`);
   assert.ok(D.recipes[k],`missing recipe ${k} in kit ${kit.id}`);
   assert.ok(Number.isInteger(n)&&n>=1);
  }
 }
 for(const item of fa.ESSENTIAL_CHECKLIST){
  assert.ok(D.recipes[item.craftKey],`missing craftKey recipe ${item.craftKey} for ${item.id}`);
  for(const k of item.keys){
   assert.ok(D.items[k],`missing item ${k} in checklist ${item.id}`);
  }
 }
});

test('applyCraftKit merges or replaces safely and filters invalid recipe keys',()=>{
 const initial=[{k:'Bed_Bedroll',n:1}];
 const merged=fa.applyCraftKit(initial,[['Bed_Bedroll',2],['Crafting_Bench',1],['NonExistent_Item',5]],'merge',D.recipes);
 assert.deepEqual(merged,[{k:'Bed_Bedroll',n:3},{k:'Crafting_Bench',n:1}]);
 assert.deepEqual(initial,[{k:'Bed_Bedroll',n:1}],'does not mutate input array');

 const replaced=fa.applyCraftKit(merged,[['Oxygen_Tank',2]],'replace',D.recipes);
 assert.deepEqual(replaced,[{k:'Oxygen_Tank',n:2}]);
});

test('recommendCaveCourse skips farmed/depleted caves and orders nearby caves into a short route',()=>{
 const caves=CAVEMAP.Terrain_016;
 const origin=[-330000,230000];
 const statusMap={'g:3':{state:'farmed'},'g:2':{state:'depleted'}};
 const course=fa.recommendCaveCourse(caves,origin,k=>statusMap[k],{mode:'balanced',maxStops:4,gridName:()=>'B3'});
 assert.equal(course.stops.length,4);
 assert.equal(course.points.length,5);
 assert.deepEqual(course.points[0],origin);
 assert.ok(!course.stops.some(s=>s.key==='g:3'||s.key==='g:2'),'skips farmed and depleted caves');
 assert.ok(course.totalMeters>0);
 assert.ok(course.totalOres>0);
 assert.match(course.hazardSummary,/동굴웜|벌집|위험/);
});

test('buildBriefing summarizes top 3 nearby caves and detects items already in player bag',()=>{
 const briefing=fa.buildBriefing({
  world:'Terrain_016',
  worldName:'올림푸스',
  pose:[0,0,0,0],
  home:null,
  caves:CAVEMAP.Terrain_016,
  statusLookup:()=>null,
  prog:{lvl:25,bpp:10,tp:2},
  goalKey:'Fabricator',
  goalName:'조립대',
  craftList:[{k:'Fabricator',n:1}],
  shortCount:4,
  bag:{Oxygen_Tank:1,Steel_Pickaxe:1,Bandage_Basic:5},
  checked:{bedroll:true},
  validRecipes:D.recipes,
  gridName:()=>'H8'
 });
 assert.equal(briefing.topCaves.length,3);
 assert.equal(briefing.readyCount,4);
 const oxy=briefing.checklist.find(x=>x.id==='oxygen');
 assert.equal(oxy.bagCount,1);
 assert.equal(oxy.ready,true);
 const bed=briefing.checklist.find(x=>x.id==='bedroll');
 assert.equal(bed.manualDone,true);
 assert.equal(bed.ready,true);
});

test('Feature 5 timer state machine is drift-free, supports pause/resume/add, and fires completion once',()=>{
 let t=fa.startTimer(300,'제련·정제',1000);
 let tick=fa.tickTimer(t,151000);
 assert.equal(tick.status,'running');
 assert.equal(tick.clock,'02:30');
 assert.equal(tick.justCompleted,false);

 // Pause at 2:30 remaining
 t=fa.togglePauseTimer(t,151000);
 tick=fa.tickTimer(t,500000);
 assert.equal(tick.status,'paused');
 assert.equal(tick.clock,'02:30','paused timer does not drift over time');

 // Add 60s while paused -> 3:30
 t=fa.addTimerSeconds(t,60,500000);
 tick=fa.tickTimer(t,500000);
 assert.equal(tick.clock,'03:30');

 // Resume at 600,000 -> ends at 810,000
 t=fa.togglePauseTimer(t,600000);
 tick=fa.tickTimer(t,810000);
 assert.equal(tick.status,'completed');
 assert.equal(tick.justCompleted,true,'fires completion notification on first tick at endAt');

 // Subsequent tick does not re-fire notification
 const tick2=fa.tickTimer(tick.timer,820000);
 assert.equal(tick2.status,'completed');
 assert.equal(tick2.justCompleted,false,'never spams duplicate completion alerts');
});

test('Feature 5 night dimmer cycles strictly within safe readable bounds and state normalizer rejects malformed data',()=>{
 assert.equal(fa.cycleDimLevel(0),20);
 assert.equal(fa.cycleDimLevel(20),35);
 assert.equal(fa.cycleDimLevel(35),50);
 assert.equal(fa.cycleDimLevel(50),0);
 assert.equal(fa.cycleDimLevel(999),0);

 const norm=fa.normalizeAssistantState({
  dim:95,
  checked:{oxygen:1,unknown:1},
  customKits:[{name:' 내 커스텀 ',items:[['Bed_Bedroll',2],['Bad',-3]]}],
  courseMode:'invalid'
 });
 assert.equal(norm.dim,0,'rejects unsafe dim levels');
 assert.deepEqual(norm.checked,{oxygen:true});
 assert.equal(norm.customKits.length,1);
 assert.deepEqual(norm.customKits[0].items,[['Bed_Bedroll',2]]);
 assert.equal(norm.courseMode,'balanced');
});

test('DOM mount, dimmer veil, Escape isolation, cave route replacement, and lifecycle hooks operate without conflicts',()=>{
 const byId=new Map();
 const docEvents={};
 function makeEl(tag,id=''){
  const el={
   tagName:String(tag||'div').toUpperCase(),
   id,
   hidden:false,
   disabled:false,
   value:'',
   textContent:'',
   _innerHTML:'',
   dataset:{},
   style:{props:{},setProperty(k,v){this.props[k]=v;},getPropertyValue(k){return this.props[k]||'';}},
   classList:{set:new Set(),add(...ks){ks.forEach(k=>this.set.add(k));},remove(...ks){ks.forEach(k=>this.set.delete(k));},toggle(k,f){if(f===undefined)f=!this.set.has(k);if(f)this.set.add(k);else this.set.delete(k);return f;},contains(k){return this.set.has(k);}},
   children:[],
   events:{},
   setAttribute(k,v){this[k]=v;},
   addEventListener(k,f){this.events[k]=f;},
   appendChild(c){this.children.push(c);if(c.id)byId.set(c.id,c);return c;},
   append(...cs){cs.forEach(c=>this.appendChild(c));},
   before(c){if(c.id)byId.set(c.id,c);},
   contains(target){return target===this;},
   getBoundingClientRect(){return {left:900,right:1050,top:40,bottom:70,width:150,height:30};},
   querySelectorAll(){return [];}
  };
  Object.defineProperty(el,'innerHTML',{
   get(){return this._innerHTML;},
   set(v){
    this._innerHTML=String(v);
    // Register any id="..." created inside innerHTML so getElementById finds them
    for(const m of this._innerHTML.matchAll(/id="([^"]+)"/g)){
     if(!byId.has(m[1]))byId.set(m[1],makeEl('div',m[1]));
    }
   }
  });
  if(id)byId.set(id,el);
  return el;
 }

 const tabbar=makeEl('nav','tabbar');
 const paneChar=makeEl('div','pane-character');
 const routelist=makeEl('div','routelist');
 routelist.previousElementSibling=makeEl('h2');
 const leftsec=makeEl('section','leftsec');

 const storage=new Map();
 let drawCalls=0,liveCalls=0,tabCalls=0,recordsChanged=0,focusedPoint=null,pathsLayerOn=false;
 const S={
  tab2:'character',
  world:'Terrain_016',
  pose:[1000,2000,0,0],
  t:[{k:'Bed_Bedroll',n:1}],
  maps:{Terrain_016:{lm:{},ore:{},track:[],pins:[],paths:[{n:'내 수동 경로',c:'#58b7e8',pts:[[0,0],[100,100]]}],rings:[],notes:{}}}
 };

 const ctx={
  window:null,
  document:{
   hidden:false,
   head:makeEl('head'),
   body:makeEl('body'),
   createElement:tag=>makeEl(tag),
   getElementById:id=>byId.get(id)||null,
   addEventListener:(k,f)=>{docEvents[k]=f;}
  },
  localStorage:{
   getItem:k=>storage.get(k)||null,
   setItem:(k,v)=>storage.set(k,String(v))
  },
  innerWidth:1440,
  S,
  R:D.recipes,
  nm:k=>D.items[k]?.[0]||k,
  esc:s=>String(s),
  totals:()=>({raw:[['Wood',10,10,0]],mid:[],used:[]}),
  save(){},
  addLog(){},
  draw(){drawCalls++;return 'drawn';},
  __setTab(k){S.tab2=k;tabCalls++;return k;},
  __icarusLive(m){liveCalls++;return m;},
  __toast(){},
  __mapViewWorld:()=>'Terrain_016',
  __mapRecordsChanged(){recordsChanged++;},
  __mapApi:{
   CAVEMAP,
   gridName:()=>'G8',
   currentMap:()=>true,
   focus(x,y){focusedPoint=[x,y];},
   setPathsLayer(on){pathsLayerOn=!!on;}
  },
  HudHoverHelp:{rules:{}},
  setInterval(){return 1;},
  Date
 };
 ctx.window=ctx;
 vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../mod/hud/field-assistant.js'),'utf8'),ctx);

 // Verify all 4 features mounted
 assert.ok(byId.get('hud-night-veil'));
 assert.ok(byId.get('hud-quickbar'));
 assert.ok(byId.get('hud-timer-btn'));
 assert.ok(byId.get('hud-dim-btn'));
 assert.ok(byId.get('hud-timer-pop'));
 assert.ok(byId.get('character-briefing'));
 assert.ok(byId.get('cave-route-box'));
 assert.ok(byId.get('craft-kits-box'));

 // Verify Feature 5 Night Dimmer cycles veil alpha cleanly
 const veil=byId.get('hud-night-veil');
 const dimBtn=byId.get('hud-dim-btn');
 assert.equal(veil.style.getPropertyValue('--hud-dim-alpha'),'0');
 dimBtn.onclick({stopPropagation(){}});
 assert.equal(veil.style.getPropertyValue('--hud-dim-alpha'),'0.2');
 dimBtn.onclick({stopPropagation(){}});
 assert.equal(veil.style.getPropertyValue('--hud-dim-alpha'),'0.35');

 // Verify Feature 5 Escape key isolation: when popover is hidden, Escape does NOT stopPropagation
 const pop=byId.get('hud-timer-pop');
 const timerBtn=byId.get('hud-timer-btn');
 assert.equal(pop.hidden,true);
 let stopped=false;
 docEvents.keydown({key:'Escape',stopPropagation(){stopped=true;}});
 assert.equal(stopped,false,'Escape must pass through to map/tooltips when timer popover is closed');

 // Open popover -> Escape closes popover and stops propagation
 timerBtn.onclick({stopPropagation(){}});
 assert.equal(pop.hidden,false);
 docEvents.keydown({key:'Escape',stopPropagation(){stopped=true;}});
 assert.equal(stopped,true);
 assert.equal(pop.hidden,true);

 // Verify Feature 2 Cave Route Recommender preserves user manual routes and replaces old [추천 코스]
 const buildBtn=byId.get('caveroute-build');
 buildBtn.onclick();
 assert.equal(S.maps.Terrain_016.paths.length,2,'1 recommended course + 1 manual route');
 assert.match(S.maps.Terrain_016.paths[0].n,/^\[추천 코스\]/);
 assert.equal(S.maps.Terrain_016.paths[1].n,'내 수동 경로');
 assert.equal(pathsLayerOn,true);
 assert.ok(Array.isArray(focusedPoint));
 assert.equal(recordsChanged,1);

 // Clicking again updates [추천 코스] in place without duplicating
 buildBtn.onclick();
 assert.equal(S.maps.Terrain_016.paths.length,2,'does not spam duplicate recommended routes');

 // Verify wrapped draw, __setTab, __icarusLive preserve return values and call originals
 assert.equal(ctx.draw(),'drawn');
 assert.equal(drawCalls,1);
 assert.equal(ctx.__setTab('map'),'map');
 assert.equal(tabCalls,1);
 assert.deepEqual(ctx.__icarusLive({t:1}),{t:1});
 assert.equal(liveCalls,1);
});
