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

test('no observations never becomes a made-up percentage',()=>{
  const r=M.observedRate([],animal('m',1),animal('f',2),{},'v1');
  assert.equal(r.n,0);assert.equal(r.stats.Agility.percent,null);assert.equal(r.all.percent,null);
});

test('observed rates count actual threshold hits and joint outcomes, not products',()=>{
  const m=animal('m',1,4),f=animal('f',2,8),children=[animal('c1',0,8),animal('c2',0,6),animal('c3',0,9),animal('c4',0,2)];
  const records=children.map(c=>M.observation(m,f,c,'v1'));
  const r=M.observedRate(records,f,m,{},'v1');
  assert.equal(r.n,4);assert.equal(r.stats.Agility.percent,50);assert.equal(r.all.percent,50);
  assert.equal(M.observedRate(records,m,f,{Agility:{low:1,high:6}},'v1').stats.Agility.percent,75);
});

test('different conditions, species, or parental gene vectors are not pooled',()=>{
  const m=animal('m',1,4),f=animal('f',2,8),c=animal('c',0,8),r=M.observation(m,f,c,'v1');
  assert.equal(M.observedRate([r],m,f,{},'v2').n,0);
  const changed=animal('m2',1,4);changed.genes.Utility=5;
  assert.equal(M.observedRate([r],changed,f,{},'v1').n,0);
  const otherM={...m,species:'Horse'},otherF={...f,species:'Horse'};
  assert.equal(M.observedRate([r],otherM,otherF,{},'v1').n,0);
  assert.equal(M.observedRate([r],animal('m2',1,4),animal('f2',2,8),{},'v1').n,1);
});

test('observations snapshot genes and exclude duplicate children or invalid records',()=>{
  const m=animal('m',1,4),f=animal('f',2,8),c=animal('c',0,8),r=M.observation(m,f,c,'v1');
  c.genes.Agility=0;
  const result=M.observedRate([null,{},r,r],m,f,{},'v1');
  assert.equal(result.n,1);assert.equal(result.stats.Agility.percent,100);
  assert.equal(M.observation(m,f,m,'v1'),null);
  assert.equal(M.observation(m,f,animal('',0),'v1'),null);
  assert.equal(M.observation(m,f,c,' '),null);
});

test('zero successes is 0%, distinct from no data',()=>{
  const m=animal('m',1,4),f=animal('f',2,8),r=M.observation(m,f,animal('c',0,0),'v1');
  assert.equal(M.observedRate([r],m,f,{},'v1').all.percent,0);
});
