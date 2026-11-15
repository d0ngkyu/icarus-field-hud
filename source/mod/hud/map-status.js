/* Observation history only. Missing/unloaded actors are never proof of depletion. */
(function(root){
 'use strict';
 const supported=new Set(['cave','boss','ore','exo','deep','dep','gey']);
 const labels={unknown:'상태 미확인',active:'자원 확인',depleted:'소진 확인',killed:'처치 확인',visited:'방문 확인',farmed:'파밍 체크',completed:'완료 기록',reset:'다시 활성화',installed:'추출기 설치됨'};
 const colors={unknown:'#98a6b3',active:'#66d99d',depleted:'#a0a7b0',killed:'#a0a7b0',visited:'#75c9e8',farmed:'#d8b56e',completed:'#d8b56e',reset:'#66d99d',installed:'#75c9e8'};
 const valid=o=>Array.isArray(o)&&typeof o[0]==='string'&&Number.isFinite(o[1])&&Number.isFinite(o[2]);
 const key=o=>o[0][0]==='b'?o[0]:(['d','c'].includes(o[0][0])?o[0][0]:o[0])+'@'+Math.round(o[1]/500)+','+Math.round(o[2]/500);
 function records(mp){if(!mp.activeScope)return null;mp.progressByScope=mp.progressByScope||{};return mp.progressByScope[mp.activeScope]||(mp.progressByScope[mp.activeScope]={});}
 function entry(mp,k){const r=records(mp);return r&&r[k]||null;}
 function update(mp,k,state,now,extra={}){const r=records(mp);if(!r)return;const old=r[k]||{};r[k]={...old,...extra,state,at:now};if(state!==old.state)r[k].changedAt=now;}
 function observe(mp,o,now){if(!valid(o))return;const k=key(o),t=o[0][0],n=o[4],old=entry(mp,k);let state;
  if(t==='b'&&(n===0||n===1))state=n?'killed':old&&old.state==='killed'?'reset':'active';
  if(t==='v'&&(n===0||n===1))state=n?'depleted':old&&['depleted','farmed'].includes(old.state)?'reset':'active';
  if(t==='d'&&Number.isFinite(n)&&n>=0)state=n===0?'depleted':old&&old.quantity===0?'reset':'active';
  if(t==='g'&&o[0]==='g:Enzyme'&&Number.isFinite(n)&&n>=0)state=old&&Number.isFinite(old.quantity)&&n<old.quantity?'reset':n>0?'completed':'active';
  if(t==='g'&&o[0]==='g:Oil'&&(n===0||n===1))state=n?'installed':'active';
  if(state){if(old&&old.manual&&state==='active'&&old.state==='farmed')state='farmed';update(mp,k,state,now,{manual:state==='farmed',quantity:n,observed:true});}
 }
 function manual(mp,k,state,now){if(!['visited','farmed','unknown'].includes(state))return;update(mp,k,state,now,{manual:true});}
 function visits(mp,players,caves,now){if(!records(mp)||!Array.isArray(players))return;
  for(const p of players.slice(0,64)){if(!Array.isArray(p)||p[3]!==1||!p.slice(0,3).every(Number.isFinite))continue;
   // The game confirms cave presence; assignment to the closest mapped cave is approximate.
   let best=null,dist=15000;for(const c of caves){const d=Math.hypot(c.x-p[0],c.y-p[1]);if(d<dist&&(!Number.isFinite(c.z)||Math.abs(c.z-p[2])<6000)){best=c;dist=d}}
   if(best){const old=entry(mp,best.key);if(!old)update(mp,best.key,'visited',now,{visitAt:now,approximate:true});else if(!old.visitAt)old.visitAt=now;}
  }
 }
 function aggregate(mp,caves,now){const r=records(mp);if(!r)return;
  const grouped={};for(const [k,o]of Object.entries(mp.ore||{})){const e=r[k];if(!e||!e.observed||now-e.at>=90000)continue;let best=null,dist=10000;
   for(const c of caves){const d=Math.hypot(o[1]-c.x,o[2]-c.y);if(d<dist&&(!Number.isFinite(c.z)||Math.abs(o[3]-c.z)<6000)){best=c;dist=d}}
   if(best)(grouped[best.key]||(grouped[best.key]=[])).push(e);
  }
  for(const c of caves){const nodes=grouped[c.key]||[];
   if(!nodes.length)continue;const old=r[c.key];const remaining=nodes.filter(e=>e.state!=='depleted').length;
   if(!remaining)update(mp,c.key,'depleted',now,{partial:true,observed:true,knownNodes:nodes.length});
   else if(old&&old.state==='depleted')update(mp,c.key,'reset',now,{partial:true,observed:true,knownNodes:nodes.length});
  }
  // Static exotic/deep spawn points are locations, not proof that a resource exists.
  for(const [k,o] of Object.entries(mp.lm||{})){if(!['x','e'].includes(o[0][0]))continue;
   const candidates=Object.entries(o[0][0]==='x'?{...mp.ore,...mp.lm}:mp.lm).filter(([id,v])=>id!==k&&(['v','d'].includes(v[0][0]))&&(o[0][0]!=='x'||/exotic/i.test(v[0]))&&Math.hypot(v[1]-o[1],v[2]-o[2])<2500&&r[id]&&now-r[id].at<90000);
   if(candidates.length){candidates.sort((a,b)=>Math.hypot(a[1][1]-o[1],a[1][2]-o[2])-Math.hypot(b[1][1]-o[1],b[1][2]-o[2]));const e=r[candidates[0][0]];r[k]={...e};}
  }
 }
 function describe(e){if(!e)return labels.unknown;let text=labels[e.state]||labels.unknown;
  if(e.partial)text=e.state==='depleted'?'인근 관측 광석 소진 (추정)':'인근 광석 재확인';
  if(e.approximate&&e.state==='visited')text='동굴 방문 (위치 추정)';
  if(e.manual)text+=' · 직접 체크';return text;
 }
 const api={supported,labels,colors,key,entry,observe,manual,visits,aggregate,describe};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HudMapStatus=api;
})(typeof window!=='undefined'?window:globalThis);
