const {test}=require('node:test'),assert=require('node:assert/strict'),party=require('../mod/hud/map-party.js');
const snap=(id='1',n='서버원',p=[1,2,3])=>({complete:true,members:[{id,n,p,self:false}]});
test('party arrival, partial omission, departure, missing location and expiration are distinct',()=>{
 const m={activeScope:'a'};party.ingest(m,snap(),100);const s=party.store(m),e=s.members['1|서버원'];assert.ok(party.fresh(e,100));
 party.ingest(m,{complete:false,members:[]},200);assert.equal(e.present,true);assert.equal(party.fresh(e,13000),false);
 party.ingest(m,snap('1','서버원',null),300);assert.equal(e.present,true);assert.equal(party.fresh(e,300),false);
 party.ingest(m,{complete:true,members:[]},400);assert.equal(e.present,false);party.ingest(m,snap(),500);assert.ok(party.fresh(e,500));
});
test('recording is opt-in, capped, separated at gaps and teleports, without connecting disabled intervals',()=>{
 const m={activeScope:'a'};party.ingest(m,snap(),100);const s=party.store(m),e=s.members['1|서버원'];assert.equal(e.trail.length,0);
 party.recording(s,true);for(let i=0;i<400;i++)party.ingest(m,snap('1','서버원',[i*1000,2,3]),1000+i*3000);assert.equal(e.trail.length,300);
 party.ingest(m,snap('1','서버원',[9000000,2,3]),1300000);assert.equal(e.trail.at(-1)[4],true);
 party.recording(s,false);party.ingest(m,snap('1','서버원',[9001000,2,3]),1303000);const n=e.trail.length;assert.equal(n,300);
 party.recording(s,true);party.ingest(m,snap('1','서버원',[9002000,2,3]),1306000);assert.equal(e.trail.at(-1)[4],true);
});
test('color and histories are server scoped and invalid colors cannot enter markup',()=>{
 const m={activeScope:'a'};party.ingest(m,snap(),1);const a=party.store(m);party.setColor(a,'1|서버원','#aabbcc');assert.equal(a.members['1|서버원'].color,'#aabbcc');party.setColor(a,'1|서버원','red" onclick=bad');assert.equal(a.members['1|서버원'].color,'#aabbcc');
 m.activeScope='b';assert.equal(Object.keys(party.store(m).members).length,0);m.activeScope='a';assert.equal(party.store(m),a);m.activeScope=null;assert.equal(party.store(m),null);
});
test('even incomplete rosters cannot grow saved membership without a bound',()=>{
 const m={activeScope:'a'};for(let i=0;i<100;i++)party.ingest(m,{...snap(String(i)),complete:false},i);assert.equal(Object.keys(party.store(m).members).length,64);
});
