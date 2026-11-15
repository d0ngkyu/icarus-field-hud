const {test}=require('node:test'),assert=require('node:assert/strict');
const life=require('../mod/hud/map-status.js');
const map=()=>({activeScope:'serverA',ore:{},lm:{}});
test('unknown/absent/truncated observations cannot invent depletion; retained marker recovers',()=>{
 const m=map(),o=['v:Iron',100,200,300,0],k=life.key(o);m.ore[k]=o;
 life.observe(m,o,100);assert.equal(life.entry(m,k).state,'active');
 life.observe(m,[...o.slice(0,4),-1],200);assert.equal(life.entry(m,k).at,100);
 life.observe(m,[...o.slice(0,4),1],300);assert.equal(life.entry(m,k).state,'depleted');assert.ok(m.ore[k]);
 life.observe(m,o,400);assert.equal(life.entry(m,k).state,'reset');
});
test('same terrain in different prospects cannot share completion state',()=>{
 const m=map(),o=['b:Wolf#1',1,2,3,1],k=life.key(o);life.observe(m,o,1);m.activeScope='serverB';assert.equal(life.entry(m,k),null);
 life.observe(m,[...o.slice(0,4),0],2);assert.equal(life.entry(m,k).state,'active');m.activeScope='serverA';assert.equal(life.entry(m,k).state,'killed');
 m.activeScope=null;life.observe(m,o,3);assert.equal(life.entry(m,k),null);
});
test('party cave presence can mark visit without local player or installed client HUD',()=>{
 const m=map(),c=[{key:'cave1',x:100,y:100,z:0}];life.visits(m,[[100,100,0,0]],c,1);assert.equal(life.entry(m,'cave1'),null);
 life.visits(m,[[100,100,9000,1]],c,2);assert.equal(life.entry(m,'cave1'),null);
 life.visits(m,[[100,100,0,1]],c,3);assert.equal(life.entry(m,'cave1').state,'visited');assert.match(life.describe(life.entry(m,'cave1')),/추정/);
});
test('deposit zero and positive transitions, geyser completion reset and oil installation differ',()=>{
 const m=map();for(const [tag,values,states]of [['d:Iron',[12,0,22],['active','depleted','reset']],['g:Enzyme',[0,1,0],['active','completed','reset']],['g:Oil',[0,1,0],['active','installed','active']]]){
 values.forEach((v,i)=>{const o=[tag,1,2,3,v];life.observe(m,o,i+1);assert.equal(life.entry(m,life.key(o)).state,states[i])});}
});
test('manual farm checks persist through mere presence, reset requires useful evidence',()=>{
 const m=map(),o=['g:Oil',1,2,3,0],k=life.key(o);life.manual(m,k,'farmed',1);life.observe(m,o,2);assert.equal(life.entry(m,k).state,'farmed');
 life.manual(m,k,'unknown',3);assert.equal(life.entry(m,k).state,'unknown');
});
test('cave depletion label is limited to observed nodes, no timer-based replenishment',()=>{
 const m=map(),o=['v:Iron',100,100,0,1],k=life.key(o),c=[{key:'cave1',x:100,y:100}];m.ore[k]=o;life.observe(m,o,100);life.aggregate(m,c,101);
 assert.match(life.describe(life.entry(m,'cave1')),/관측 광석 소진/);life.aggregate(m,c,999999);assert.equal(life.entry(m,'cave1').state,'depleted');
 life.observe(m,[...o.slice(0,4),0],1000000);life.aggregate(m,c,1000001);assert.equal(life.entry(m,'cave1').state,'reset');
});
test('exotic static spawn retains unknown until matching actual exotic observation',()=>{
 const m=map(),spot=['x:Exotic',100,100,0],sk=life.key(spot);m.lm[sk]=spot;life.aggregate(m,[],1);assert.equal(life.entry(m,sk),null);
 const o=['v:Exotic',100,100,0,1],k=life.key(o);m.ore[k]=o;life.observe(m,o,2);life.aggregate(m,[],3);assert.equal(life.entry(m,sk).state,'depleted');
});
