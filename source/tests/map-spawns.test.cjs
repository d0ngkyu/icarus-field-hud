const {test}=require('node:test'),assert=require('node:assert/strict');
const api=require('../mod/hud/map-spawns.js');
test('static candidates available offline, separated by map and resource type',()=>{
 assert.deepEqual(Object.fromEntries(Object.entries(api.maps).map(([k,v])=>[k,v.length])),{Terrain_016:626,Terrain_017:892,Terrain_019:727,Terrain_021:379});
 const pro=api.maps.Terrain_019;assert.equal(pro.filter(r=>r[1]==='plant').length,33);assert.equal(pro.filter(r=>r[1]==='red').length,21);
 for(const rows of Object.values(api.maps)){assert.equal(new Set(rows.map(r=>r[0])).size,rows.length);for(const r of rows)assert.ok(r.slice(2,4).every(n=>Number.isFinite(n)&&Math.abs(n)<=403200));}
 const mp={lm:{}};assert.equal(Object.keys(api.view(mp,'Terrain_019')).length,727);assert.equal(Object.keys(mp.lm).length,0);assert.equal(Object.keys(api.view(mp,'Outpost_002')).length,0);
});
test('nearby resource merges once; notes key stable; observation has precedence only when newer',()=>{
 const r=api.maps.Terrain_019.find(r=>r[1]==='plant'),key='intel:'+r[0],o=['r:Plant',r[2]+50,r[3]-25,100,1000,4];
 const mp={lm:{live:o},spawnRev:1,activeScope:'A',progressByScope:{A:{live:{state:'active',at:1000}}}};
 let v=api.view(mp,'Terrain_019');assert.equal(Object.keys(v).length,727);assert.equal(v.live,undefined);assert.equal(v[key][5],4);assert.equal(mp.progressByScope.A[key].state,'active');assert.equal(v,api.view(mp,'Terrain_019'));
 mp.progressByScope.A[key]={state:'farmed',at:2000};mp.spawnRev++;api.view(mp,'Terrain_019');assert.equal(mp.progressByScope.A[key].state,'farmed');
 mp.progressByScope.A.live={state:'reset',at:3000};mp.spawnRev++;api.view(mp,'Terrain_019');assert.equal(mp.progressByScope.A[key].state,'reset');
 assert.equal(o.spawn,undefined);
});
test('clock uses prospect phase, stops offline/stale and never claims guaranteed respawn',()=>{
 assert.match(api.countdown({seconds:10700,at:1000},11000,true),/0시간 1분 30초/);
 assert.match(api.countdown({seconds:10800,at:1000},1000,true),/3시간 0분 0초/);
 assert.match(api.countdown({seconds:10700,at:1000},47000,true),/갱신 대기/);
 assert.match(api.countdown({seconds:10700,at:1000},2000,false),/갱신 대기/);
 assert.match(api.countdown(null,1000,true),/수신 대기/);
 assert.match(api.detail(['r:Plant']),/20% \(Icarus Intel 기준\)/);
});

test("all public resource layer counts included without claiming ore types or presence",()=>{const rows=Object.values(api.maps).flat(),count=t=>rows.filter(r=>r[1]===t).length;assert.equal(count("deep"),1865);assert.equal(count("geyser"),92);assert.equal(count("oil"),82);assert.equal(count("uranium"),8);assert.equal(count("cave"),113);const v=api.view({lm:{}},"Terrain_019");assert.equal(Object.values(v).filter(o=>o[0]==="e:Deposit").length,412);assert.ok(Object.values(v).every(o=>o[4]===0&&o[5]===-1));});

test('red exotic plant shows only when bloomed (plant actor seen with resources)',()=>{
 const now=1e7,b=(o,m)=>api.bloom(o,m||{},now);
 assert.equal(b(['r:Tree',0,0,0,now,5]),null);
 assert.equal(b(['r:Plant',0,0,0,0,-1]).state,'unknown');            // static candidate, never loaded
 assert.equal(b(['r:Plant',0,0,0,now-1000,-1]).state,'none');        // spawn point loaded, no plant
 assert.equal(b(['r:Plant',0,0,0,now-1000,0]).state,'none');         // plant with nothing left
 assert.equal(b(['r:Plant',0,0,0,now-1000,3]).state,'live');
 const old=['r:Plant',0,0,0,now-3600e3,3];
 assert.equal(b(old,{a:old}).state,'seen');                          // not loaded since: last known
 assert.equal(b(old,{a:old,b:['r:Plant',400,0,0,now-60e3,-1]}).state,'none');  // reloaded later without the plant
 assert.equal(b(old,{a:old,b:['r:Plant',5000,0,0,now-60e3,-1]}).state,'seen'); // other spot does not count
});
