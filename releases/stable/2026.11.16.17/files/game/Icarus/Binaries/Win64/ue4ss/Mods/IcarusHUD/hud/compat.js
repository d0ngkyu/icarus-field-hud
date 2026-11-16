/* Game patch compatibility check (settings > 문제 해결).
   Icarus updates weekly. After the game build changes, this records which HUD features have
   received data again and which readers logged a failure, so a broken patch shows up at once.
   No game reads of its own: it only watches messages the HUD already gets. */
(function(root){
'use strict';
const FEATURES=[['p','위치'],['inv','가방·보관함'],['prog','레벨·청사진'],['lm','지도 표시'],['ore','광석 노드'],['fog','게임 지도 탐험 기록'],['animal','동물'],['party','서버원'],['clock','탐사 시간']];
const NAME=Object.fromEntries(FEATURES);NAME.held='손에 든 아이템';

function keysOf(m){const k=[];if(!m||typeof m!=='object')return k;
 if(m.p)k.push('p');if(m.inv)k.push('inv');if(m.prog)k.push('prog');if(m.lm)k.push('lm');
 if(m.ore||m.inv&&m.inv.ore)k.push('ore');if(m.fog)k.push('fog');if(m.animal)k.push('animal');
 if(m.party||m.players)k.push('party');if(m.prospectClock)k.push('clock');return k}

// state: {build, prev, since, ok:{key:time}}; returns {state, changed}
function onBuild(state,build,now){const s=state&&typeof state==='object'?state:{};
 if(!build)return {state:s,changed:false};
 if(s.build===build)return {state:s,changed:false};
 const changed=!!s.build;return {state:{build,prev:s.build||null,since:now,ok:{}},changed}}

function observe(state,m,now){if(!state||!state.build)return state;state.ok=state.ok||{};for(const k of keysOf(m))if(!state.ok[k])state.ok[k]=now;return state}

function summary(state,failures,updatedAt){
 const fail=(failures||[]).map(k=>NAME[k]||k),ok=FEATURES.filter(([k])=>state&&state.ok&&state.ok[k]&&!(failures||[]).includes(k)).map(x=>x[1]);
 const wait=FEATURES.filter(([k])=>!(state&&state.ok&&state.ok[k])&&!(failures||[]).includes(k)).map(x=>x[1]);
 const d=updatedAt?new Date(updatedAt):null,day=d?` (게임 업데이트 ${d.getMonth()+1}월 ${d.getDate()}일)`:'';
 const head=state&&state.build?`게임 빌드 ${state.build}${day}${state.prev?' · 새 버전':''}`:'게임 빌드 확인 대기';
 const level=fail.length?'bad':wait.length?'wait':'ok';
 const lines=[head];
 if(fail.length)lines.push('오류: '+fail.join('·')+' — 문제 보고서를 만들어 보내 주세요');
 if(ok.length)lines.push('수신 확인: '+ok.join('·'));
 if(wait.length)lines.push('아직 못 봄: '+wait.join('·')+' (이번 판에서 안 쓴 기능일 수 있음)');
 return {level,text:lines.join('\n'),fail,ok,wait}}

const api={FEATURES,keysOf,onBuild,observe,summary};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(!root||!root.document)return;
root.HudCompat=api;

const A=root.hudApp,sec=document.getElementById('diagsec');
if(!sec||typeof S!=='object'||!S)return;
const row=document.createElement('div');row.className='set';
row.dataset.tip='새 게임 빌드에서 데이터 수신 여부와 로그 오류를 확인합니다. 수신됨은 기능 전체의 정상 작동을 보장하지 않습니다.';
row.innerHTML='<span class="lb">게임 업데이트 호환<small id="compatinfo" style="white-space:pre-line">게임 연결 후 확인합니다.</small></span>';
const first=sec.querySelector('.set');if(first&&first.parentNode)first.parentNode.insertBefore(row,first.nextSibling);else sec.appendChild(row);
if(root.HudHoverHelp&&root.HudHoverHelp.rules)root.HudHoverHelp.rules['#compatinfo']='새 게임 빌드의 데이터 수신·로그 오류 점검입니다. 실제 기능 전체의 정상 작동을 보장하지 않습니다.';

let failures=[],updatedAt=null,warned=false;
const paint=()=>{const el=document.getElementById('compatinfo');if(!el)return;const r=summary(S.compat,failures,updatedAt);el.textContent=r.text;el.style.color=r.level==='bad'?'var(--bad,#ff8a7a)':r.level==='ok'?'var(--ok,#66d99d)':''};
const refresh=()=>{if(!A||!A.info)return paint();A.info().then(i=>{const c=i&&i.compat;if(!c)return paint();
 updatedAt=c.build&&c.build.updatedAt||null;failures=Array.isArray(c.failures)?c.failures:[];
 const r=onBuild(S.compat,c.build&&c.build.id,Date.now());S.compat=r.state;
 if(r.changed){try{root.__toast&&root.__toast('게임이 업데이트됐어요. HUD 기능 호환을 확인합니다(설정 › 문제 해결).',true)}catch(e){}if(typeof save==='function')save()}
 if(failures.length&&!warned){warned=true;try{root.__toast&&root.__toast('새 게임 버전에서 HUD 일부 기능 오류: '+failures.map(k=>NAME[k]||k).join('·'))}catch(e){}}
 paint()}).catch(paint)};

let dirty=false;
if(typeof root.__icarusLive==='function'){const prev=root.__icarusLive;root.__icarusLive=function(m){const r=prev.apply(this,arguments);
 try{if(S.compat&&S.compat.build){const before=Object.keys(S.compat.ok||{}).length;observe(S.compat,m,Date.now());if(Object.keys(S.compat.ok).length!==before){dirty=true;paint()}}}catch(e){}return r}}
setInterval(()=>{if(dirty){dirty=false;if(typeof save==='function')save()}},15000);
setInterval(refresh,120000);setTimeout(refresh,3000);
})(typeof window!=='undefined'?window:globalThis);
