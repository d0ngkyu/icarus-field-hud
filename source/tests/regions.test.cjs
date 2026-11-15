const {test}=require('node:test'),assert=require('node:assert/strict');
const r=require('../mod/hud/regions.js');
const measure=(s,n)=>s.length*n;
test('all mapped Korean names match the installed ko-KR D_Biomes extraction',()=>{
 const fixture=require('./fixtures/regions-ko.json');
 for(const rows of Object.values(r.data))for(const row of rows)assert.equal(row[1],fixture[row[0]].ko,row[0]);
 assert.equal(Object.keys(fixture).length,39);
 assert.equal(r.data.Terrain_017.find(row=>row[0]==='Grove')[1],'수풀');
 assert.equal(r.data.Terrain_017.find(row=>row[0]==='Verdant Terraces')[1],'신록 테라스');
});
test('atlas anchors belong to their map; unsupported maps never inherit labels',()=>{
 assert.equal(r.data.Terrain_016.length,6);assert.equal(r.data.Terrain_017.length,13);assert.equal(r.data.Terrain_019.length,20);
 for(const rows of Object.values(r.data))for(const row of rows){assert.ok(row[2]>0&&row[2]<100&&row[3]>0&&row[3]<100);assert.ok(r.world(row).every(Number.isFinite))}
 assert.deepEqual(r.layout('Outpost_002',(x,y)=>[x,y],1000,1000,1,measure),[]);
 const dry=r.world(r.data.Terrain_017.find(x=>x[0]==='Dry Ridge'));
 // North-up game grid F6: columns +X, rows +Y (not transposed texture coordinates).
 assert.equal(String.fromCharCode(65+Math.floor((dry[0]+403200)/50400))+(1+Math.floor((dry[1]+403200)/50400)),'F6');
 assert.deepEqual(r.world(['','',0,100]),[-403200,403200]);
});
test('zoom, viewport clipping and collision suppression in every rotation',()=>{
 for(const scale of [.03,.09,.2,1])for(let rot=0;rot<4;rot++){
  const project=(x,y)=>{const a=x/100*scale,b=y/100*scale;return[[500+a,400+b],[500-b,400+a],[500-a,400-b],[500+b,400-a]][rot]};
  const labels=r.layout('Terrain_017',project,1000,800,scale,measure);
  for(const a of labels){assert.ok(a.box.left>=4&&a.box.right<=996&&a.box.top>=4&&a.box.bottom<=796);assert.equal(a.detail,scale>=.16);for(const b of labels)if(a!==b)assert.ok(a.box.left>=b.box.right||a.box.right<=b.box.left||a.box.top>=b.box.bottom||a.box.bottom<=b.box.top)}
 }
 assert.equal(r.layout('Terrain_017',()=>[100,100],400,400,.1,measure).length,1);
 assert.deepEqual(r.layout('Terrain_017',()=>[NaN,0],400,400,.1,measure),[]);
 assert.deepEqual(r.layout('Terrain_017',()=>[100,100],400,400,0,measure),[]);
});
test('canvas state restored on success and failure; labels use screen coordinates',()=>{
 const calls=[],ctx={save(){calls.push('save')},restore(){calls.push('restore')},measureText(s){return{width:s.length*10}},strokeText(s,x,y){calls.push([s,x,y])},fillText(){}};
 r.draw(ctx,'Terrain_017',()=>[200,150],500,400,.2);
 assert.equal(calls[0],'save');assert.equal(calls.at(-1),'restore');assert.deepEqual(calls[1],['큰 강',200,144]);
 r.draw(ctx,'Terrain_017',()=>[200,150],500,400,.2,()=>false);assert.equal(ctx.globalAlpha,.14);
 ctx.measureText=()=>{throw Error('measure')};assert.throws(()=>r.draw(ctx,'Terrain_017',()=>[200,150],500,400,.2));assert.equal(calls.at(-1),'restore');
});
test('UI loads module before map and dims unknown anchors without new polling',()=>{
 const html=require('node:fs').readFileSync(require('node:path').join(__dirname,'../mod/hud/index.html'),'utf8');
 assert.ok(html.indexOf('src="regions.js"')<html.indexOf('// ===== interactive map:'));
 const block=html.slice(html.indexOf('const hasT=L.terr&&drawTerrain();'),html.indexOf(' if(L.pins)for'));
 assert.ok(block.includes('if(!L.fog)return true;'));assert.ok(block.includes("mp.seen[a+','+b]"));
 assert.ok(block.includes('session.view,toS'));assert.ok(html.includes('if(V.L.regions===undefined)V.L.regions=1;'));
});
