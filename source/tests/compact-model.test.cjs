const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../mod/hud/animals.js');
const animal=(id,sex,genes)=>({id,sex,name:id,species:'Moa',genes:Object.fromEntries(M.keys.map((k,i)=>[k,genes[i]]))});
test('offspring means and weak-stat improvement use actual histogram counts',()=>{
 const a=animal('a',1,[2,2,8,8,8,8,8]);const h=Array.from({length:7},()=>[0,0,1,2,1,0,0,0,0,0,0]);const r=M.offspringSummary({hist:h,trials:4},a);
 assert.equal(r.stats.Vitality.mean,3);assert.equal(r.weakGain,1);assert.equal(r.weakChance,75);assert.equal(r.stats.Muscle.delta,-5);assert.equal(r.stats.Muscle.improve,0);
});
test('reconnection suggestions require exact species, sex and all genes, but do not assume identity',()=>{
 const a=animal('old',1,[1,2,3,4,5,6,7]),b={...a,id:'other',name:'Same genes'},current={...a,id:'new'};
 assert.deepEqual(M.reconnectionCandidates([a,b,{...a,sex:2},{...a,species:'Horse'}],current),[0,1]);
 assert.deepEqual(M.reconnectionCandidates([a],{...current,genes:{...current.genes,Utility:8}}),[]);
 assert.deepEqual(M.normalize({...a,aliases:['previous']}).aliases,['previous']);
});
