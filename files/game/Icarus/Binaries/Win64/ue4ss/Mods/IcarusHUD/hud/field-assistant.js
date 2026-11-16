// Field Assistant (Gemini):
// 1) Character tab: Expedition Briefing & Pre-departure Essential Checklist
// 2) Map tab: Nearest high-value unvisited cave route recommender (Nearest-Neighbor + 2-opt)
// 3) Craft tab: 1-click Expedition & Base Craft Kits + Custom Kit saving
// Pure UI/planning module — zero additional game/native Lua reads.
(function(root){
'use strict';

const STORAGE_KEY='icarus.assistant.v1';
const ESSENTIAL_CHECKLIST=[
 {id:'oxygen',label:'산소 용기',sub:'산소 탱크 또는 산소 주머니',keys:['Oxygen_Tank','Oxygen_Bladder'],craftKey:'Oxygen_Tank',fallbackKey:'Oxygen_Bladder'},
 {id:'water',label:'물 용기',sub:'보온병·휴대용 물통·물주머니',keys:['Thermos','Canteen','Waterskin'],craftKey:'Canteen',fallbackKey:'Waterskin'},
 {id:'bedroll',label:'부활 침낭',sub:'원정 중 임시 부활 지점 확보',keys:['Bed_Bedroll','Bed_Interior_Wood','Rustic_Bed'],craftKey:'Bed_Bedroll'},
 {id:'pickaxe',label:'채굴 곡괭이',sub:'광석·심층 동굴 채굴 필수 도구',keys:['Titanium_Pickaxe','Platinum_Pickaxe','Steel_Pickaxe','Metal_Pickaxe','Stone_Pickaxe'],craftKey:'Steel_Pickaxe',fallbackKey:'Metal_Pickaxe'},
 {id:'light',label:'동굴 조명',sub:'손전등·랜턴·횃불',keys:['Flashlight','Lantern','Biofuel_Lamp','Wood_Rag_Torch','Wood_Flare'],craftKey:'Lantern',fallbackKey:'Wood_Rag_Torch'},
 {id:'hammer',label:'수리·건축 망치',sub:'폭풍 피해 및 임시 은신처 수리',keys:['Titanium_Hammer','Platinum_Hammer','Steel_Hammer','Iron_Hammer','Building_RepairTool'],craftKey:'Iron_Hammer',fallbackKey:'Building_RepairTool'},
 {id:'meds',label:'붕대·외상 치료',sub:'출혈·열상 응급 처치',keys:['Suture_Kit','Bandage_Basic','Bandage_Heat','Bandage_Cooling','Splint'],craftKey:'Bandage_Basic'},
 {id:'antidote',label:'해독·항생제',sub:'동굴웜 독·폐렴·기생충 대비',keys:['Antipoison_Paste','Antibiotic_Paste','Antiparasitic_Paste','Antipoison_Pill','Antibiotic_Pill'],craftKey:'Antipoison_Paste'}
];

const CRAFT_KITS=[
 {
  id:'starter-base',
  name:'초반 생존·기지 세트',
  desc:'첫 정착지 구축에 필요한 기본 작업대와 생존 필수품',
  items:[
   ['Bed_Bedroll',1],['Crafting_Bench',1],['Kit_Stone_Furnace',1],
   ['Anvil_Bench',1],['Building_RepairTool',1],['Oxygen_Bladder',1],['Waterskin',1]
  ]
 },
 {
  id:'cave-expedition',
  name:'동굴 채굴 원정 세트',
  desc:'중·대형 동굴 채굴 및 독·감염 대비 원정 준비물',
  items:[
   ['Steel_Pickaxe',1],['Lantern',1],['Oxygen_Tank',1],['Canteen',1],
   ['Bandage_Basic',5],['Antipoison_Paste',3],['Antibiotic_Paste',2]
  ]
 },
 {
  id:'biofuel-mining',
  name:'바이오연료 심층·엑조틱 세트',
  desc:'3티어 바이오연료 기반 심층 광맥·엑조틱 채굴 패키지',
  items:[
   ['Extractor_Biofuel',2],['Deep_Mining_Drill_Biofuel',2],['Radar_Biofuel',1],
   ['Composter',1],['Jerrycan',3]
  ]
 },
 {
  id:'electric-mining',
  name:'전동 추출·발전 세트 (4티어)',
  desc:'4티어 전동 추출기·드릴 및 전력 공급 패키지',
  items:[
   ['Extractor_Electric',2],['Deep_Mining_Drill_Electric',2],['Radar_Electric',1],
   ['Kit_Generator',1],['Solar_Panel',1],['SplineTool_Electricity',1]
  ]
 },
 {
  id:'workshop-tech',
  name:'핵심 공방 테크업 세트',
  desc:'기계 제작대부터 콘크리트·조립대·재료 처리기까지 핵심 설비',
  items:[
   ['Kit_Machining_Bench',1],['Concrete_Furnace_V2',1],['Cement_Mixer',1],
   ['Fabricator',1],['Material_Processor',1]
  ]
 }
];

const HAZ_NAMES={w:'동굴웜',h:'벌집',b:'박쥐 둥지',s:'거미 둥지',l:'땅상어'};

function normalizeAssistantState(raw={}){
 if(!raw||typeof raw!=='object')raw={};
 const checked={};
 if(raw.checked&&typeof raw.checked==='object'){
  for(const item of ESSENTIAL_CHECKLIST){
   if(raw.checked[item.id])checked[item.id]=true;
  }
 }
 const customKits=[];
 if(Array.isArray(raw.customKits)){
  for(const k of raw.customKits.slice(0,8)){
   if(!k||typeof k!=='object')continue;
   const name=String(k.name||'').trim().slice(0,30);
   if(!name||!Array.isArray(k.items))continue;
   const items=k.items
    .filter(x=>Array.isArray(x)&&typeof x[0]==='string'&&Number.isFinite(Number(x[1]))&&Number(x[1])>0)
    .map(x=>[x[0],Math.min(999,Math.max(1,Math.round(Number(x[1]))))])
    .slice(0,24);
   if(items.length)customKits.push({id:String(k.id||'custom-'+customKits.length),name,items});
  }
 }
 const courseMode=['balanced','large','deep'].includes(raw.courseMode)?raw.courseMode:'balanced';
 return {checked,customKits,courseMode};
}

function applyCraftKit(currentList,kitItems,mode='merge',validRecipes=null){
 const base=mode==='replace'?[]:(Array.isArray(currentList)?currentList.map(t=>({...t})):[]);
 for(const entry of (kitItems||[])){
  const k=Array.isArray(entry)?entry[0]:entry?.k;
  const n=Math.min(999,Math.max(1,Math.round(Number(Array.isArray(entry)?entry[1]:entry?.n)||1)));
  if(!k||(validRecipes&&!validRecipes[k]))continue;
  const found=base.find(t=>t.k===k);
  if(found)found.n=Math.min(999,found.n+n);
  else base.push({k,n});
 }
 return base;
}

function caveHazardSummary(creatures){
 if(!creatures||typeof creatures!=='object')return '위험 생물 거의 없음';
 const parts=[];
 for(const k of ['w','h','b','s','l']){
  const v=creatures[k];
  if(!Array.isArray(v)||v.length<2)continue;
  if(v[0]===0&&v[1]===0)continue;
  parts.push(HAZ_NAMES[k]+' '+(v[0]===v[1]?v[0]:v[0]+'~'+v[1]));
 }
 return parts.length?parts.join(', '):'위험 생물 거의 없음';
}

function optimizeStopOrder(origin,stops){
 if(stops.length<=1)return stops.slice();
 const remaining=stops.slice();
 const ordered=[];
 let cur=origin;
 while(remaining.length){
  let bestIdx=0,bestDist=Infinity;
  for(let i=0;i<remaining.length;i++){
   const d=Math.hypot(remaining[i].x-cur[0],remaining[i].y-cur[1]);
   if(d<bestDist){bestDist=d;bestIdx=i;}
  }
  const next=remaining.splice(bestIdx,1)[0];
  ordered.push(next);
  cur=[next.x,next.y];
 }
 // 2-opt refinement anchored at origin
 const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 const pts=()=>[origin,...ordered.map(s=>[s.x,s.y])];
 let improved=true;
 while(improved){
  improved=false;
  const p=pts();
  for(let i=1;i<ordered.length-1;i++){
   for(let j=i+1;j<ordered.length;j++){
    const before=dist(p[i-1],p[i])+dist(p[j],p[j+1]||p[j]);
    const after=dist(p[i-1],p[j])+dist(p[i],p[j+1]||p[j]);
    if(j<ordered.length-1&&after+1e-3<before){
     const rev=ordered.slice(i-1,j).reverse();
     ordered.splice(i-1,rev.length,...rev);
     improved=true;
    }
   }
  }
 }
 return ordered;
}

function recommendCaveCourse(caves,origin,statusLookup,options={}){
 const rows=Array.isArray(caves)?caves:[];
 const anchor=Array.isArray(origin)&&Number.isFinite(origin[0])&&Number.isFinite(origin[1])?[origin[0],origin[1]]:[0,0];
 const mode=options.mode||'balanced';
 const maxStops=Math.max(2,Math.min(6,Number(options.maxStops)||4));
 const gridFn=typeof options.gridName==='function'?options.gridName:()=>'';
 const allow=typeof options.allow==='function'?options.allow:null;

 const candidates=[];
 rows.forEach((r,i)=>{
  if(!Array.isArray(r)||!Number.isFinite(r[0])||!Number.isFinite(r[1]))return;
  if(allow&&!allow(r))return;
  const key='g:'+i;
  const st=typeof statusLookup==='function'?statusLookup(key):(statusLookup&&statusLookup[key]);
  const stateName=typeof st==='string'?st:st?.state;
  if(stateName==='farmed'||stateName==='depleted')return;
  const level=Number(r[2])||1;
  const oreCount=Number.isFinite(r[4])?Number(r[4]):null;
  const deepVeins=Number(r[5])||0;
  const underwater=!!r[6];
  const through=(Number(r[7])||1)>1;
  const creatures=r[9]||{};
  const distMeters=Math.round(Math.hypot(r[0]-anchor[0],r[1]-anchor[1])/100);
  const lvText=level===4?'Lv.M':'Lv.'+level;
  const grid=gridFn(r[0],r[1])||'';
  candidates.push({
   index:i,key,x:r[0],y:r[1],level,lvText,
   oreCount,deepVeins,underwater,through,creatures,
   hazards:caveHazardSummary(creatures),
   visited:stateName==='visited',
   distMeters,grid
  });
 });

 if(!candidates.length){
  return {stops:[],points:[],totalMeters:0,totalOres:0,totalDeepVeins:0,hazardSummary:'후보 동굴 없음'};
 }

 let filtered=candidates.filter(c=>!c.visited);
 if(filtered.length<maxStops)filtered=candidates.slice();

 let modePool=filtered.filter(c=>{
  if(mode==='large')return c.level>=3||(c.oreCount!==null&&c.oreCount>=34);
  if(mode==='deep')return c.deepVeins>0||c.level>=2;
  return c.level>=2||(c.oreCount!==null&&c.oreCount>=25);
 });
 if(modePool.length<Math.min(2,filtered.length))modePool=filtered.slice();

 // Score by value-to-distance ratio so nearby rich caves win
 modePool.sort((a,b)=>{
  const val=c=>(c.level*18)+((c.oreCount??(c.level*15))*1.2)+(c.deepVeins*16)-(c.visited?35:0);
  const sa=val(a)/Math.max(250,a.distMeters+220);
  const sb=val(b)/Math.max(250,b.distMeters+220);
  return sb-sa||a.distMeters-b.distMeters;
 });

 // Take top cluster candidates (up to 10) and pick a cohesive set of maxStops
 const pool=modePool.slice(0,Math.max(maxStops*2,8));
 const chosen=[pool[0]];
 while(chosen.length<maxStops&&chosen.length<pool.length){
  let best=null,bestScore=-Infinity;
  for(const cand of pool){
   if(chosen.some(x=>x.key===cand.key))continue;
   const last=chosen[chosen.length-1];
   const stepDist=Math.hypot(cand.x-last.x,cand.y-last.y)/100;
   const val=(cand.level*15)+(cand.oreCount??20)+(cand.deepVeins*14);
   const score=val-stepDist*0.045-cand.distMeters*0.015;
   if(score>bestScore){bestScore=score;best=cand;}
  }
  if(!best)break;
  chosen.push(best);
 }

 const ordered=optimizeStopOrder(anchor,chosen);
 const points=[[Math.round(anchor[0]),Math.round(anchor[1])]];
 let totalMeters=0,totalOres=0,totalDeepVeins=0;
 const hazTotals={};
 const stops=ordered.map((c,idx)=>{
  const prev=points[points.length-1];
  const legMeters=Math.round(Math.hypot(c.x-prev[0],c.y-prev[1])/100);
  totalMeters+=legMeters;
  if(c.oreCount!==null)totalOres+=c.oreCount;
  totalDeepVeins+=c.deepVeins;
  for(const k of ['w','h','b','s','l']){
   const v=c.creatures?.[k];
   if(Array.isArray(v)&&v.length>=2&&(v[0]>0||v[1]>0)){
    if(!hazTotals[k])hazTotals[k]=[0,0];
    hazTotals[k][0]+=v[0];
    hazTotals[k][1]+=v[1];
   }
  }
  points.push([Math.round(c.x),Math.round(c.y)]);
  return {...c,stepNo:idx+1,legMeters};
 });

 const hazParts=Object.entries(hazTotals).map(([k,[mn,mx]])=>HAZ_NAMES[k]+' '+(mn===mx?mn:mn+'~'+mx));
 return {
  stops,
  points,
  totalMeters,
  totalOres,
  totalDeepVeins,
  hazardSummary:hazParts.length?hazParts.join(', '):'위험 생물 거의 없음'
 };
}

function buildBriefing({world,worldName,pose,home,caves,statusLookup,prog,goalKey,goalName,craftList,shortCount,bag,checked,validRecipes,gridName,allow}){
 const hasPose=Array.isArray(pose)&&Number.isFinite(pose[0])&&Number.isFinite(pose[1]);
 const hasHome=Array.isArray(home)&&Number.isFinite(home[0])&&Number.isFinite(home[1]);
 const anchor=hasPose?[pose[0],pose[1]]:hasHome?[home[0],home[1]]:[0,0];
 const anchorLabel=hasPose?'내 실시간 위치 기준':hasHome?'저장된 기지(🏠) 기준':'지도 중심 기준 (위치 수신 전)';

 const course=recommendCaveCourse(caves||[],anchor,statusLookup,{mode:'balanced',maxStops:3,gridName,allow});
 const topCaves=course.stops.slice(0,3);

 const bagMap=(bag&&typeof bag==='object')?bag:{};
 const checkMap=(checked&&typeof checked==='object')?checked:{};
 const checklist=ESSENTIAL_CHECKLIST.map(item=>{
  let bagCount=0;
  for(const k of item.keys){
   if(Number.isFinite(bagMap[k])&&bagMap[k]>0)bagCount+=bagMap[k];
  }
  let craftKey=item.craftKey;
  if(validRecipes&&!validRecipes[craftKey]&&item.fallbackKey&&validRecipes[item.fallbackKey]){
   craftKey=item.fallbackKey;
  }
  const manualDone=!!checkMap[item.id];
  const ready=bagCount>0||manualDone;
  return {
   id:item.id,
   label:item.label,
   sub:item.sub,
   bagCount,
   manualDone,
   ready,
   craftKey
  };
 });

 return {
  world:world||'Terrain_016',
  worldName:worldName||world||'올림푸스',
  anchor,
  anchorLabel,
  topCaves,
  goalKey:goalKey||null,
  goalName:goalName||'추천 목표 확인',
  craftCount:Array.isArray(craftList)?craftList.length:0,
  shortCount:Number(shortCount)||0,
  level:prog?.lvl??null,
  checklist,
  readyCount:checklist.filter(x=>x.ready).length
 };
}

const api={
 STORAGE_KEY,
 ESSENTIAL_CHECKLIST,
 CRAFT_KITS,
 normalizeAssistantState,
 applyCraftKit,
 caveHazardSummary,
 recommendCaveCourse,
 buildBriefing
};

if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(!root?.document)return;
root.HudFieldAssistant=api;

// Register hover help descriptions so HudHoverHelp resolves all new controls cleanly.
if(root.HudHoverHelp?.rules){
 Object.assign(root.HudHoverHelp.rules,{
  '[data-briefing-cave-map]':'지도 탭으로 이동해 이 동굴 위치를 바로 가운데에 보여 줍니다.',
  '[data-briefing-course]':'지도 탭으로 가서 같은 기준의 동굴 코스를 경로로 그립니다.',
  '[data-briefing-cave-wp]':'이 동굴을 나침반 목표(F7)로 준비합니다.',
  '[data-check-toggle]':'원정 출발 전 이 준비물을 챙겼다고 체크합니다.',
  '[data-check-craft]':'이 준비물을 제작 탭 만들 목록에 바로 담습니다.',
  '[data-kit-load]':'이 추천 세트의 아이템들을 만들 목록에 한 번에 추가합니다.',
  '[data-kit-replace]':'현재 만들 목록을 비우고 이 세트만 깔끔하게 불러옵니다.',
  '[data-kit-save]':'지금 만들 목록에 담긴 아이템 조합을 내 세트로 저장합니다.',
  '[data-kit-del]':'저장해 둔 내 세트를 삭제합니다.',
  '#caveroute-mode':'추천받을 동굴 코스 기준(균형·대형 집중·심층 광맥)을 고릅니다.',
  '#caveroute-build':'내 위치(또는 기지·지도 중심)에서 가장 효율적인 미방문 동굴 코스를 자동 계산해 지도 경로로 그립니다.',
  '[data-caveroute-stop]':'추천 코스의 해당 순번 동굴로 지도를 이동합니다.'
 });
}

let state;
try{
 state=normalizeAssistantState(JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'));
}catch{
 state=normalizeAssistantState();
}
function saveState(){
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{}
}

const css=document.createElement('style');
css.textContent=`

#character-briefing{margin-top:16px}
.briefing-grid{display:grid;grid-template-columns:1.15fr 1fr;gap:14px;margin-top:12px}
@media(max-width:860px){.briefing-grid{grid-template-columns:1fr}}
.briefing-card{background:#101821;border:1px solid #283847;border-radius:8px;padding:14px}
.briefing-card h3{font-size:15px;margin:0 0 6px;color:#d8b77d}
.briefing-sub{font-size:12px;color:#93a6b7;margin:0 0 10px}
.briefing-cave-list{display:grid;gap:8px}
.briefing-cave-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;background:#16222e;border:1px solid #2b3d4e;border-radius:7px}
.briefing-cave-item strong{font-size:13px;color:#eef3f7;display:block}
.briefing-cave-item small{font-size:11.5px;color:#98abb9;display:block;margin-top:2px}
.briefing-cave-actions{display:flex;gap:5px;flex-shrink:0}
.briefing-cave-actions button{min-height:28px;padding:4px 8px;font-size:11.5px}
.prep-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
@media(max-width:600px){.prep-list{grid-template-columns:1fr}}
.prep-item{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:7px 9px;background:#15202b;border:1px solid #273746;border-radius:7px;font-size:12.5px}
.prep-item.ready{border-color:#3a6b5c;background:#132422}
.prep-item label{display:flex;align-items:center;gap:7px;cursor:pointer;min-width:0;flex:1}
.prep-item label span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.prep-item small{display:block;font-size:10.5px;color:#8ea2b2}
.prep-item .bag-ok{color:#72cbb0;font-size:11px;font-weight:600;white-space:nowrap}
.prep-item button{min-height:26px;padding:2px 7px;font-size:11px;flex-shrink:0}

#craft-kits-box{min-width:0;max-width:100%;margin-top:14px;padding-top:12px;border-top:1px solid #283644}
#craft-kits-box h3{font-size:13.5px;color:#d8b77d;margin:0 0 6px;display:flex;align-items:center;justify-content:space-between}
.kit-list{display:grid;grid-template-columns:minmax(0,1fr);gap:6px;margin-top:8px}
.kit-row{min-width:0;display:flex;align-items:center;justify-content:space-between;gap:6px;padding:7px 9px;background:#101821;border:1px solid #283746;border-radius:7px}
.kit-row-info{min-width:0;flex:1}
.kit-row-info strong{display:block;font-size:12.5px;color:#e6edf3}
.kit-row-info small{display:block;font-size:11px;color:#8fa2b2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kit-row-actions{display:flex;gap:4px;flex-shrink:0}
.kit-row-actions button{min-height:26px;padding:3px 7px;font-size:11px}
.kit-save-bar{display:flex;gap:6px;margin-top:8px}
.kit-save-bar input{flex:1;padding:5px 8px;font-size:12px;min-height:28px}
.kit-save-bar button{min-height:28px;padding:4px 9px;font-size:11.5px;white-space:nowrap}

#cave-route-box{margin:8px 0 12px;padding:10px;background:#101923;border:1px solid #2b3d4d;border-radius:7px}
#cave-route-box h3{font-size:12.5px;color:#d8b77d;margin:0 0 6px}
.caveroute-controls{display:flex;gap:6px;margin-bottom:6px}
.caveroute-controls select{flex:1;padding:4px 7px;font-size:12px;min-height:28px}
.caveroute-controls button{min-height:28px;padding:4px 9px;font-size:12px;white-space:nowrap}
#caveroute-summary{font-size:11.5px;color:#b8c9d8;line-height:1.5}
.caveroute-stops{display:grid;gap:4px;margin-top:6px}
.caveroute-stops button{text-align:left;font-size:11.5px;min-height:26px;padding:4px 7px;display:flex;justify-content:space-between;gap:6px}
`;
document.head.appendChild(css);

// 1. Character Tab: Expedition Briefing & Pre-departure Essential Checklist
let briefingSig='';
// exploration mode: only caves in places I have been
const exploreAllow=world=>(typeof S==='object'&&S&&S.explore&&root.__mapApi?.known)?(r=>root.__mapApi.known(world,r[0],r[1])):null;
function mountCharacterBriefing(){
 const pane=document.getElementById('pane-character');
 if(!pane)return;
 let sec=document.getElementById('character-briefing');
 if(!sec){
  sec=document.createElement('section');
  sec.id='character-briefing';
  pane.appendChild(sec);
  sec.addEventListener('click',e=>{
   if(e.target.closest('[data-briefing-course]')){root.__setTab?.('map');document.getElementById('caveroute-build')?.click();return;}
   const mapBtn=e.target.closest('[data-briefing-cave-map]');
   if(mapBtn){
    const x=Number(mapBtn.dataset.x),y=Number(mapBtn.dataset.y);
    if(Number.isFinite(x)&&Number.isFinite(y)){
     root.__setTab?.('map');
     root.__mapApi?.focus?.(x,y,0.32);
    }
    return;
   }
   const wpBtn=e.target.closest('[data-briefing-cave-wp]');
   if(wpBtn){
    const x=Math.round(Number(wpBtn.dataset.x)||0),y=Math.round(Number(wpBtn.dataset.y)||0);
    const w=`${x}|${y}|0`;
    try{
     if(typeof copyText==='function')copyText(`ICARUSHUD|${w}|k=c:Cave|`);
     if(typeof S==='object'&&S){S.wpSel=w;if(typeof save==='function')save();}
     if(typeof addLog==='function')addLog('브리핑에서 동굴 목표 선택');
     root.__toast?.('동굴 좌표 복사됨 · 게임에서 F7을 누르면 나침반에 표시됩니다.',true);
     briefingSig='';renderCharacterBriefing();
    }catch{}
    return;
   }
   const craftBtn=e.target.closest('[data-check-craft]');
   if(craftBtn){
    const k=craftBtn.dataset.checkCraft;
    if(k&&typeof S==='object'&&S&&typeof R==='object'&&R[k]){
     S.t=applyCraftKit(S.t,[[k,1]],'merge',R);
     if(typeof addLog==='function')addLog('준비물 제작 담기: '+(typeof nm==='function'?nm(k):k));
     if(typeof draw==='function')draw();
     root.__toast?.((typeof nm==='function'?nm(k):k)+' 1개를 만들 목록에 담았습니다.',true);
     briefingSig='';renderCharacterBriefing();
    }
    return;
   }
  });
  sec.addEventListener('change',e=>{
   const chk=e.target.closest('[data-check-toggle]');
   if(chk){
    const id=chk.dataset.checkToggle;
    if(chk.checked)state.checked[id]=true;
    else delete state.checked[id];
    saveState();
    briefingSig='';renderCharacterBriefing();
   }
  });
 }
}

function renderCharacterBriefing(){
 const sec=document.getElementById('character-briefing');
 if(!sec)return;
 if(typeof S==='object'&&S&&S.tab2&&S.tab2!=='character')return;
 const world=(typeof S==='object'&&S?.world)||root.__mapViewWorld?.()||'Terrain_016';
 const worldNames={Terrain_016:'올림푸스',Terrain_017:'스틱스',Terrain_019:'프로메테우스',Terrain_021:'엘리시움',Terrain_022:'지형 022'};
 const caves=root.__mapApi?.CAVEMAP?.[world]||[];
 const mp=typeof S==='object'&&S?.maps?.[world];
 const statusLookup=key=>root.HudMapStatus&&mp?root.HudMapStatus.entry(mp,key):null;
 const goalKey=typeof coachPrevGoal!=='undefined'&&coachPrevGoal?coachPrevGoal:(typeof S==='object'&&S?.goalLock)||null;
 const goalName=goalKey&&typeof nm==='function'?nm(goalKey):'목표 선택 전';
 const shortCount=(()=>{try{return typeof totals==='function'?totals().raw.filter(x=>x[1]>0).length:0;}catch{return 0;}})();
 const bag=(typeof S==='object'&&S?.inv?.bag)||{};

 const sig=JSON.stringify([world,!!S?.explore,S?.pose,S?.home,goalKey,S?.t,shortCount,bag,state.checked,mp?.activeScope&&mp?.progressByScope?.[mp.activeScope]]);
 if(sig===briefingSig)return;
 briefingSig=sig;

 const info=buildBriefing({
  world,
  worldName:worldNames[world]||world,
  pose:typeof S==='object'?S?.pose:null,
  home:typeof S==='object'?S?.home:null,
  caves,
  statusLookup,
  prog:typeof S==='object'?S?.prog:null,
  goalKey,
  goalName,
  craftList:typeof S==='object'?S?.t:[],
  shortCount,
  bag,
  checked:state.checked,
  validRecipes:typeof R==='object'?R:null,
  gridName:root.__mapApi?.gridName,
  allow:exploreAllow(world)
 });

 const escHtml=typeof esc==='function'?esc:s=>String(s);
 sec.innerHTML=`
  <div class="section-intro">
   <span class="eyebrow">FIELD BRIEFING · 원정 상황판</span>
   <h2>오늘의 탐사 브리핑 & 출발 전 점검</h2>
   <p>${escHtml(info.worldName)} · ${escHtml(info.anchorLabel)} · 성장 목표: <b>${escHtml(info.goalName)}</b> (만들 목록 ${info.craftCount}종${info.shortCount?` · 부족 재료 ${info.shortCount}종`:''})</p>
  </div>
  <div class="briefing-grid">
   <div class="briefing-card">
    <h3 style="display:flex;justify-content:space-between;align-items:center;gap:8px">🧭 주변 미방문 알짜 동굴 TOP 3<button type="button" class="mini" data-briefing-course="1">지도에 코스 그리기</button></h3>
    <p class="briefing-sub">가까우면서 광석·심층 광맥이 풍부한 미방문 동굴입니다.</p>
    <div class="briefing-cave-list">
     ${info.topCaves.length?info.topCaves.map(c=>`
      <div class="briefing-cave-item">
       <div>
        <strong>${c.stepNo}. ${escHtml(c.grid?c.grid+' · ':'')}${escHtml(c.lvText)} 동굴 (${c.distMeters>=1000?(c.distMeters/1000).toFixed(1)+'km':c.distMeters+'m'})</strong>
        <small>광석 ${c.oreCount!==null?c.oreCount+'개':'미상'}${c.deepVeins?` · 심층 ${c.deepVeins}곳`:''}${c.underwater?' · 수중 입구':''}${c.through?' · 관통':''} · ${escHtml(c.hazards)}</small>
       </div>
       <div class="briefing-cave-actions">
        <button type="button" data-briefing-cave-map="1" data-x="${c.x}" data-y="${c.y}">지도 보기</button>
        <button type="button" data-briefing-cave-wp="1" data-x="${c.x}" data-y="${c.y}">나침반(F7)</button>
       </div>
      </div>
     `).join(''):(S?.explore?'<div class="empty">탐험 모드: 가 본 곳에서 추천할 동굴이 아직 없습니다.</div>':'<div class="empty">표시할 동굴 데이터가 없습니다.</div>')}
    </div>
   </div>
   <div class="briefing-card">
    <h3>🎒 원정 출발 전 필수 준비물 (${info.readyCount}/${info.checklist.length})</h3>
    <p class="briefing-sub">가방에 있으면 자동으로 체크되며, 없는 물품은 바로 제작 목록에 담을 수 있습니다.</p>
    <div class="prep-list">
     ${info.checklist.map(item=>`
      <div class="prep-item ${item.ready?'ready':''}">
       <label>
        <input type="checkbox" data-check-toggle="${item.id}" ${item.ready?'checked':''}>
        <div>
         <span>${escHtml(item.label)}</span>
         <small>${item.bagCount>0?`<span class="bag-ok">가방 ${item.bagCount}개 ✓</span>`:escHtml(item.sub)}</small>
        </div>
       </label>
       <button type="button" data-check-craft="${escHtml(item.craftKey)}">+ 담기</button>
      </div>
     `).join('')}
    </div>
   </div>
  </div>
 `;
}

// 2. Map Tab: Shortest Cave Course Recommender
function mountCaveRoutePlanner(){
 const routelist=document.getElementById('routelist');
 if(!routelist||document.getElementById('cave-route-box'))return;
 const h2=routelist.previousElementSibling;
 const box=document.createElement('div');
 box.id='cave-route-box';
 box.innerHTML=`
  <h3>⚡ 주변 알짜 동굴 최단 코스 추천</h3>
  <div class="caveroute-controls">
   <select id="caveroute-mode" aria-label="동굴 코스 추천 기준">
    <option value="balanced"${state.courseMode==='balanced'?' selected':''}>균형 코스 (Lv.2+ 4곳)</option>
    <option value="large"${state.courseMode==='large'?' selected':''}>대형·메가 집중 (Lv.3·M 3곳)</option>
    <option value="deep"${state.courseMode==='deep'?' selected':''}>심층 광맥 동굴 (4곳)</option>
   </select>
   <button type="button" id="caveroute-build" class="accent">코스 추천</button>
  </div>
  <div id="caveroute-summary">내 위치(또는 기지·화면 중심)에서 미방문 동굴을 최단 순서로 묶어 지도에 그립니다.</div>
  <div id="caveroute-stops" class="caveroute-stops"></div>
 `;
 if(h2)h2.before(box);else routelist.before(box);

 const modeSel=document.getElementById('caveroute-mode');
 const buildBtn=document.getElementById('caveroute-build');
 const summaryEl=document.getElementById('caveroute-summary');
 const stopsEl=document.getElementById('caveroute-stops');

 modeSel.onchange=e=>{
  state.courseMode=['balanced','large','deep'].includes(e.target.value)?e.target.value:'balanced';
  saveState();
 };

 buildBtn.onclick=()=>{
  const viewWorld=root.__mapViewWorld?.()||'Terrain_016';
  const caves=root.__mapApi?.CAVEMAP?.[viewWorld]||[];
  if(!caves.length){
   summaryEl.textContent='현재 선택한 지도에는 등록된 동굴 목록이 없습니다.';
   stopsEl.innerHTML='';
   return;
  }
  const isCurrent=root.__mapApi?.currentMap?.();
  const origin=(isCurrent&&Array.isArray(S?.pose))?[S.pose[0],S.pose[1]]:(Array.isArray(S?.home)&&S.world===viewWorld)?[S.home[0],S.home[1]]:[S?.mapv?.x||0,S?.mapv?.y||0];
  const mp=(S.maps=S.maps||{})[viewWorld]||(S.maps[viewWorld]={lm:{},ore:{},track:[],pins:[],paths:[],rings:[],notes:{}});
  const statusLookup=key=>root.HudMapStatus?root.HudMapStatus.entry(mp,key):null;
  const maxStops=state.courseMode==='large'?3:4;
  const res=recommendCaveCourse(caves,origin,statusLookup,{
   mode:state.courseMode,
   maxStops,
   gridName:root.__mapApi?.gridName,
   allow:exploreAllow(viewWorld)
  });
  if(!res.stops.length){
   summaryEl.textContent=S?.explore?'탐험 모드: 가 본 곳에서 조건에 맞는 동굴을 찾지 못했습니다.':'조건에 맞는 동굴을 찾지 못했습니다.';
   stopsEl.innerHTML='';
   return;
  }
  const routeName=`[추천 코스] 동굴 ${res.stops.length}곳 (${res.totalMeters>=1000?(res.totalMeters/1000).toFixed(2)+'km':res.totalMeters+'m'})`;
  mp.paths=(mp.paths||[]).filter(p=>!String(p.n||'').startsWith('[추천 코스]'));
  mp.paths.unshift({n:routeName,c:'#72cbb0',pts:res.points});
  root.__mapApi?.setPathsLayer?.(true);
  root.__mapApi?.focus?.(res.stops[0].x,res.stops[0].y,0.26);
  if(typeof addLog==='function')addLog('동굴 최단 코스 생성: '+routeName);
  if(typeof save==='function')save();
  root.__mapRecordsChanged?.();

  const escHtml=typeof esc==='function'?esc:s=>String(s);
  summaryEl.innerHTML=`총 <b>${res.totalMeters>=1000?(res.totalMeters/1000).toFixed(2)+' km':res.totalMeters+' m'}</b> · 예상 광석 <b>${res.totalOres}개</b>${res.totalDeepVeins?` · 심층 <b>${res.totalDeepVeins}곳</b>`:''}<br>생물 요약: ${escHtml(res.hazardSummary)}`;
  stopsEl.innerHTML=res.stops.map(s=>`
   <button type="button" data-caveroute-stop="1" data-x="${s.x}" data-y="${s.y}">
    <span><b>${s.stepNo}번</b> ${escHtml(s.grid?s.grid+' · ':'')}${escHtml(s.lvText)} (광석 ${s.oreCount??'?'}${s.deepVeins?'·심층'+s.deepVeins:''})</span>
    <small>+${s.legMeters}m</small>
   </button>
  `).join('');
  root.__toast?.('지도에 추천 동굴 코스를 표시했습니다!',true);
 };

 stopsEl.addEventListener('click',e=>{
  const b=e.target.closest('[data-caveroute-stop]');
  if(!b)return;
  const x=Number(b.dataset.x),y=Number(b.dataset.y);
  if(Number.isFinite(x)&&Number.isFinite(y)){
   root.__mapApi?.focus?.(x,y,0.35);
  }
 });
}

// 3. Craft Tab: 1-Click Expedition & Base Presets + Custom Kits
function mountCraftKits(){
 const leftsec=document.getElementById('leftsec');
 if(!leftsec||document.getElementById('craft-kits-box'))return;
 const box=document.createElement('div');
 box.id='craft-kits-box';
 leftsec.appendChild(box);

 box.addEventListener('click',e=>{
  const loadBtn=e.target.closest('[data-kit-load],[data-kit-replace]');
  if(loadBtn){
   const id=loadBtn.dataset.kitLoad||loadBtn.dataset.kitReplace;
   const mode=loadBtn.dataset.kitReplace?'replace':'merge';
   // replacing clears the craft list and its check marks, so it asks for a second click
   if(mode==='replace'&&Array.isArray(S?.t)&&S.t.length&&loadBtn.dataset.armed!=='1'){
    loadBtn.dataset.armed='1';loadBtn.textContent='한 번 더 누르면 교체';
    setTimeout(()=>{if(loadBtn.dataset.armed==='1'){loadBtn.dataset.armed='';loadBtn.textContent='교체';}},4000);
    root.__toast?.('교체하면 지금 만들 목록과 체크 표시가 지워집니다. 한 번 더 누르면 교체합니다.');
    return;
   }
   const allKits=[...CRAFT_KITS,...state.customKits];
   const kit=allKits.find(k=>k.id===id);
   if(!kit||typeof S!=='object'||!S)return;
   S.t=applyCraftKit(S.t,kit.items,mode,typeof R==='object'?R:null);
   if(mode==='replace'){S.done={};S.fold={};}
   if(typeof addLog==='function')addLog(`제작 세트 불러오기: ${kit.name}`);
   if(typeof draw==='function')draw();
   root.__toast?.(`「${kit.name}」 아이템을 만들 목록에 ${mode==='replace'?'교체':'추가'}했습니다.`,true);
   return;
  }
  const saveBtn=e.target.closest('[data-kit-save]');
  if(saveBtn){
   const input=document.getElementById('kit-custom-name');
   const name=String(input?.value||'').trim().slice(0,26)||`내 세트 ${state.customKits.length+1}`;
   if(!Array.isArray(S?.t)||!S.t.length){
    root.__toast?.('먼저 만들 목록에 아이템을 1개 이상 담아 주세요.');
    return;
   }
   const items=S.t.map(t=>[t.k,Math.max(1,Number(t.n)||1)]);
   state.customKits=[
    {id:'custom-'+Date.now(),name,items},
    ...state.customKits.filter(k=>k.name!==name)
   ].slice(0,8);
   if(input)input.value='';
   saveState();
   renderCraftKits();
   root.__toast?.(`현재 만들 목록을 「${name}」 세트로 저장했습니다.`,true);
   return;
  }
  const delBtn=e.target.closest('[data-kit-del]');
  if(delBtn){
   const id=delBtn.dataset.kitDel;
   state.customKits=state.customKits.filter(k=>k.id!==id);
   saveState();
   renderCraftKits();
   return;
  }
 });

 renderCraftKits();
}

function renderCraftKits(){
 const box=document.getElementById('craft-kits-box');
 if(!box)return;
 const escHtml=typeof esc==='function'?esc:s=>String(s);
 const itemLabel=([k,n])=>(typeof nm==='function'?nm(k):k)+(n>1?`×${n}`:'');
 box.innerHTML=`
  <h3><span>📦 원정·기지 추천 세트</span><small style="font-size:11px;color:#8fa2b2;font-weight:400">1클릭 묶음 추가</small></h3>
  <div class="kit-list">
   ${CRAFT_KITS.map(kit=>`
    <div class="kit-row">
     <div class="kit-row-info" title="${escHtml(kit.items.map(itemLabel).join(', '))}">
      <strong>${escHtml(kit.name)}</strong>
      <small>${escHtml(kit.items.slice(0,4).map(itemLabel).join(' · '))}${kit.items.length>4?` 외 ${kit.items.length-4}종`:''}</small>
     </div>
     <div class="kit-row-actions">
      <button type="button" data-kit-load="${escHtml(kit.id)}">+ 추가</button>
      <button type="button" data-kit-replace="${escHtml(kit.id)}">교체</button>
     </div>
    </div>
   `).join('')}
   ${state.customKits.map(kit=>`
    <div class="kit-row">
     <div class="kit-row-info" title="${escHtml(kit.items.map(itemLabel).join(', '))}">
      <strong>⭐ ${escHtml(kit.name)}</strong>
      <small>${escHtml(kit.items.slice(0,4).map(itemLabel).join(' · '))}${kit.items.length>4?` 외 ${kit.items.length-4}종`:''}</small>
     </div>
     <div class="kit-row-actions">
      <button type="button" data-kit-load="${escHtml(kit.id)}">+ 추가</button>
      <button type="button" data-kit-replace="${escHtml(kit.id)}">교체</button>
      <button type="button" data-kit-del="${escHtml(kit.id)}" aria-label="${escHtml(kit.name)} 삭제">✕</button>
     </div>
    </div>
   `).join('')}
  </div>
  <div class="kit-save-bar">
   <input id="kit-custom-name" type="text" maxlength="26" placeholder="현재 만들 목록을 내 세트로 저장 (이름)">
   <button type="button" data-kit-save="1">+ 세트 저장</button>
  </div>
 `;
}

// Mount the 3 features and hook cleanly into existing lifecycle without breaking any existing handlers

mountCharacterBriefing();
mountCaveRoutePlanner();
mountCraftKits();
renderCharacterBriefing();

if(typeof root.draw==='function'){
 const prevDraw=root.draw;
 root.draw=function(){
  const r=prevDraw.apply(this,arguments);
  try{renderCharacterBriefing();}catch{}
  return r;
 };
}
if(typeof root.__setTab==='function'){
 const prevSetTab=root.__setTab;
 root.__setTab=function(k){
  const r=prevSetTab.apply(this,arguments);
  if(k==='character')try{briefingSig='';renderCharacterBriefing();}catch{}
  return r;
 };
}
if(typeof root.__icarusLive==='function'){
 const prevLive=root.__icarusLive;
 root.__icarusLive=function(m){
  const r=prevLive.apply(this,arguments);
  try{renderCharacterBriefing();}catch{}
  return r;
 };
}
})(typeof window!=='undefined'?window:globalThis);
