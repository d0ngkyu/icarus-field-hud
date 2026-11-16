(function(root){'use strict';
 const palette=['#63d2ff','#ffb86b','#c49aff','#78df9b','#ff85a6','#ffe17d'];
 const fresh=(p,now)=>p&&p.present&&Array.isArray(p.p)&&now-p.at<=12000;
 function store(mp){if(!mp.activeScope)return null;mp.partyByScope=mp.partyByScope||{};return mp.partyByScope[mp.activeScope]||(mp.partyByScope[mp.activeScope]={members:{},record:false,showTrails:false});}
 function ingest(mp,snapshot,now){const s=store(mp);if(!s||!snapshot||!Array.isArray(snapshot.members)||snapshot.members.length>64)return;
  const seen=new Set();for(const p of snapshot.members){if(!p||typeof p.id!=='string'||typeof p.n!=='string'||p.id.length>80||p.n.length>160)continue;
   const k=p.id+'|'+p.n;seen.add(k);const prev=s.members[k];const e=prev||{id:p.id,n:p.n,color:palette[Object.keys(s.members).length%palette.length],trail:[]};
   const pos=Array.isArray(p.p)&&p.p.length===3&&p.p.every(Number.isFinite)?p.p.slice():null;
   const was=fresh(e,now),old=e.p;e.self=!!p.self;e.present=true;e.at=now;e.p=pos;e.n=p.n;
   if(s.record&&pos&&!e.self){const last=e.trail[e.trail.length-1];const jump=old&&Math.hypot(pos[0]-old[0],pos[1]-old[1])>100000;
    if(!last||!was||jump||now-last[3]>15000||Math.hypot(pos[0]-last[0],pos[1]-last[1])>=1000){e.trail.push([...pos,now,!was||!!jump]);if(e.trail.length>300)e.trail.splice(0,e.trail.length-300)}}
   s.members[k]=e;
  }
  if(snapshot.complete===true)for(const[k,e]of Object.entries(s.members))if(!seen.has(k)){e.present=false;e.p=null;}
  const keys=Object.keys(s.members);if(keys.length>64)for(const k of keys.sort((a,b)=>Number(s.members[a].present)-Number(s.members[b].present)||s.members[a].at-s.members[b].at)){if(Object.keys(s.members).length<=64)break;delete s.members[k]}
  s.at=now;
 }
 function setColor(s,key,color){if(s&&s.members[key]&&/^#[0-9a-f]{6}$/i.test(color))s.members[key].color=color;}
 function recording(s,on){if(!s)return;s.record=!!on;for(const e of Object.values(s.members))e.p=null;}
 function draw(ctx,s,toS,now,trails){if(!s)return;ctx.save();try{for(const e of Object.values(s.members)){if(e.self)continue;
  if(trails&&s.showTrails&&e.trail.length){ctx.strokeStyle=e.color;ctx.lineWidth=2;ctx.globalAlpha=.6;ctx.beginPath();e.trail.forEach((p,i)=>{const[x,y]=toS(p[0],p[1]);if(!i||p[4])ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.stroke();ctx.globalAlpha=1;}
  if(!fresh(e,now))continue;const[x,y]=toS(e.p[0],e.p[1]);ctx.fillStyle=e.color;ctx.strokeStyle='#08131c';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.stroke();ctx.fill();ctx.font='bold 12px sans-serif';ctx.strokeText(e.n,x+10,y-8);ctx.fillText(e.n,x+10,y-8);
 }}finally{ctx.restore()}}
 const api={store,ingest,fresh,setColor,recording,draw};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HudMapParty=api;
})(typeof window!=='undefined'?window:globalThis);
