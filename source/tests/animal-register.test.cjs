const {test}=require('node:test'),assert=require('node:assert/strict');
const m=require('../mod/hud/animals.js');
const a=(extra={})=>({id:'animal1',scope:'serverA',name:'Moa',species:'Moa',sex:1,genes:Object.fromEntries(m.keys.map(k=>[k,4])),...extra});
test('auto registration requires stable server identity and valid complete genetics',()=>{
 assert.equal(m.registration([],a()).action,'add');assert.equal(m.registration([],a({scope:''})).action,'wait');assert.equal(m.registration([],a({genes:{}})).action,'wait');
 assert.equal(m.registration([a()],a()).action,'update');assert.equal(m.registration([a()],a({scope:'serverB'})).action,'add');
 assert.equal(m.registration([a()],a({id:'newid'})).action,'confirm');assert.equal(m.registration([a({scope:''})],a()).action,'confirm');
 assert.equal(m.registration([],a(),[m.animalKey(a())]).action,'ignored');assert.equal(m.registration(Array.from({length:200},(_,i)=>a({id:String(i),scope:'other'})),a()).action,'full');
});
test('ownership is never inferred from names; metadata persists and remains plain text',()=>{
 const x=m.normalize(a({ownerName:'<b>Friend</b>',ownerMine:false,lineage:'Alpha',phenotype:7,lineageEffects:'<b>+20%</b>'}));
 assert.equal(x.ownerName,'Friend');assert.equal(m.ownerLabel(x),'다른 사람의 동물 · Friend');assert.equal(x.phenotype,7);assert.equal(x.lineageEffects,'+20%');
 assert.equal(m.ownerLabel(m.normalize(a())),'소유자 미확인');assert.equal(m.ownerLabel(m.normalize(a({ownerMine:true}))),'내 동물');assert.equal(m.normalize(a()).phenotype,null);
 assert.equal(m.compare(a(),a({id:'mate',sex:2,scope:'serverB'})),null);
});
