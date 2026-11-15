const {test}=require('node:test'),assert=require('node:assert/strict');
const api=require('../mod/hud/map-spawns.js');
test('static candidates available offline, separated by map and resource type',()=>{
 assert.deepEqual(Object.fromEntries(Object.entries(api.maps).map(([k,v])=>[k,v.length])),{Terrain_016:72,Terrain_017:69,Terrain_019:207,Terrain_021:116});
 const pro=api.maps.Terrain_019;assert.equal(pro.filter(r=>r[1]==='plant').length,33);assert.equal(pro.filter(r=>r[1]==='red').length,21);
 for(const rows of Object.values(api.maps)){assert.equal(new Set(rows.map(r=>r[0])).size,rows.length);for(const r of rows)assert.ok(r.slice(2,4).every(n=>Number.isFinite(n)&&Math.abs(n)<=403200));}
 const mp={lm:{}};assert.equal(Object.keys(api.view(mp,'Terrain_019')).length,207);assert.equal(Object.keys(mp.lm).length,0);assert.equal(Object.keys(api.view(mp,'Outpost_002')).length,0);
});
test('nearby resource merges once; notes key stable; observation has precedence only when newer',()=>{
 const r=api.maps.Terrain_019.find(r=>r[1]==='plant'),key='intel:'+r[0],o=['r:Plant',r[2]+50,r[3]-25,100,1000,4];
 const mp={lm:{live:o},spawnRev:1,activeScope:'A',progressByScope:{A:{live:{state:'active',at:1000}}}};
 let v=api.view(mp,'Terrain_019');assert.equal(Object.keys(v).length,207);assert.equal(v.live,undefined);assert.equal(v[key][5],4);assert.equal(mp.progressByScope.A[key].state,'active');assert.equal(v,api.view(mp,'Terrain_019'));
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
