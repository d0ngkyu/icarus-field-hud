const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../mod/hud/animals.js');
const animal=(id,sex,values)=>({id,sex,name:id,species:'Moa',genes:Object.fromEntries(M.birthOrder.map((k,i)=>[k,values[i]]))});
test('approximate birth model produces normalized histograms and deterministic results',()=>{
 const a=[8,6,9,4,3,8,7],b=[6,9,7,8,5,9,8],r=M.simulateGenes(a,b,0,3000);
 assert.deepEqual(r,M.simulateGenes(a,b,0,3000));assert.equal(r.hist.length,7);
 for(const h of r.hist){assert.equal(h.length,11);assert.equal(h.reduce((x,y)=>x+y,0),3000)}
 assert.ok(r.improved>=0&&r.improved<=r.trials);assert.ok(r.allGoals>=0&&r.allGoals<=r.trials);
 assert.equal(r.maxPoints,52);assert.equal(r.allGoals,0); // seven 8s require 56, impossible for this pair at 0% mutation.
});
test('probabilities refer to actual simulated outcomes, not mean / ten',()=>{
 const a=animal('m',1,[6,6,6,6,6,6,6]),b=animal('f',2,[8,8,8,8,8,8,8]),r=M.birthEstimate(a,b,0,4000);
 const c=M.birthChance(r,'Vitality',8);assert.notEqual(c.percent,70);assert.equal(c.percent,c.hits/c.n*100);
 assert.equal(M.birthChance(r,'Vitality',0).percent,100);
 assert.ok(M.birthChance(r,'Vitality',8,'exact').percent<=c.percent);
 assert.equal(M.birthChance(r,'Vitality',11),null);
});
test('caps, zero-rate mutation, goals and input bounds are honored',()=>{
 const max=M.simulateGenes(Array(7).fill(10),Array(7).fill(10),100,1000,1,Array(7).fill(9));
 assert.equal(max.maxPoints,60);assert.equal(max.allGoals,0);assert.equal(max.improved,0);
 for(const mutation of [-1,101,NaN])assert.throws(()=>M.simulateGenes(Array(7).fill(5),Array(7).fill(5),mutation));
 assert.throws(()=>M.simulateGenes([1],Array(7).fill(5)));
 assert.throws(()=>M.simulateGenes(Array(7).fill(5),Array(7).fill(5),0,Infinity));
 const low=M.simulateGenes(Array(7).fill(3),Array(7).fill(3),0,2000),high=M.simulateGenes(Array(7).fill(3),Array(7).fill(3),100,2000);
 const mean=r=>r.hist.reduce((sum,h)=>sum+h.reduce((s,c,i)=>s+c*i,0)/r.trials,0);
 assert.ok(mean(high)>mean(low)+2.8);
});
test('simulation rejects incompatible parents through the public model',()=>{
 const a=animal('a',1,Array(7).fill(5)),b=animal('b',1,Array(7).fill(5));assert.equal(M.birthEstimate(a,b),null);
});
test('1–8 stages are exact-value frequencies, not cumulative or renormalized',()=>{
 const model=require('../mod/hud/animals.js');
 const r=model.simulateGenes([6,6,6,6,6,6,6],[8,8,8,8,8,8,8],0,12000,123456789,[8,8,8,8,8,8,8]);
 for(const k of model.keys){const stages=model.exactStages(r,k);assert.deepEqual(stages.map(s=>s.value),[1,2,3,4,5,6,7,8]);for(const s of stages)assert.equal(s.hits,model.birthChance(r,k,s.value,'exact').hits);const omitted=[0,9,10].reduce((n,v)=>n+model.birthChance(r,k,v,'exact').hits,0);assert.equal(stages.reduce((n,s)=>n+s.hits,0)+omitted,r.trials);}
});
