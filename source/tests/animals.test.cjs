const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../mod/hud/animals.js');
const animal=(id,sex,value=5)=>({id,name:id,species:'Moa',sex,genes:Object.fromEntries(M.keys.map(k=>[k,value])),stats:{Health:'1,200'}});
test('gene values must be complete finite integer observations, never missing-as-zero',()=>{
  assert.ok(M.normalize(animal('a',1,0)));
  for(const v of [null,undefined,NaN,Infinity,'8',-1,11,4.5]){const a=animal('a',1);a.genes.Agility=v;assert.equal(M.normalize(a),null);}
});
test('per-stat low/normal/high thresholds include boundaries and reject reversed limits',()=>{
  assert.equal(M.grade(3), 'low');assert.equal(M.grade(4),'normal');assert.equal(M.grade(8),'high');
  assert.equal(M.grade(6,{low:2,high:6}),'high');
  assert.deepEqual(M.thresholds({low:8,high:2}),{low:3,high:8});
});
test('pair comparison rejects self, different species, same sex and unknown sex',()=>{
  const a=animal('a',1);assert.equal(M.compare(a,a),null);
  assert.equal(M.compare(a,animal('b',1)),null);assert.equal(M.compare(a,animal('b',0)),null);
  const b=animal('b',2);b.species='Horse';assert.equal(M.compare(a,b),null);
});
test('comparison displays parent mean, not an invented offspring probability',()=>{
  const a=animal('a',1,2),b=animal('b',2,8),r=M.compare(a,b);
  assert.equal(r.means.Vitality,5);assert.equal(r.total,35);assert.equal(r.score,5);
  assert.equal(r.probability,undefined);
  b.genes.Agility=10;assert.ok(M.compare(a,b,'Agility').score>M.compare(a,b).score);
});
