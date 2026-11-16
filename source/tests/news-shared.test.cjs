const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {create,article}=require('../app/news.js'),{exportNews}=require('../tools/export-news.cjs');
const item={gid:'123',feedname:'steam_community_announcements',title:'Official',url:'https://store.steampowered.com/news/app/1149460/view/123',date:123,contents:'Hello'};
const a=article(item),pack=(text='공유 번역',at=1)=>({schema:1,language:'ko',entries:[{id:a.id,hash:a.hash,text,at}]});
const secure={isEncryptionAvailable:()=>false};
function setup(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'shared-news-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}
test('a friend without a key reads shared Korean with zero Google calls, persists offline',async t=>{
 const dir=setup(t);let sharedCalls=0,googleCalls=0;
 const svc=create({dir,secure,bundled:pack(),fetchJSON:async url=>{if(!url.includes('ISteamNews')){googleCalls++;throw Error('Unexpected Google call');}return {appnews:{appid:1149460,newsitems:[item]}};},sharedFetch:async()=>{sharedCalls++;return pack('최신 번역',2);}});
 const list=await svc.list();assert.equal(list.items[0].shared,true);assert.equal(list.connected,false);
 assert.equal((await svc.translate('123')).translation,'최신 번역');await svc.list();assert.equal(svc.read('123').translation,'최신 번역');assert.equal(sharedCalls,1);assert.equal(googleCalls,0);assert.equal(svc.status().used,0);
 const offline=create({dir,secure,bundled:pack(),fetchJSON:async()=>{throw Error('offline')},sharedFetch:async()=>{throw Error('offline')}});await offline.list(true);assert.equal(offline.read('123').translation,'최신 번역');assert.equal(offline.status().used,0);assert(offline.status().sharedError);
});
test('wrong article id, changed source hash and malformed shared responses never attach translations',async t=>{
 const dir=setup(t),bad=pack();bad.entries[0].id='456';
 const svc=create({dir,secure,bundled:bad,fetchJSON:async()=>({appnews:{appid:1149460,newsitems:[{...item,contents:'Changed official text'}]}}),sharedFetch:async()=>pack()});await svc.list();assert.equal(svc.read('123').translation,null);
 const malformed=create({dir,secure,bundled:{schema:1,language:'ko',entries:[]},sharedFetch:async()=>({schema:2,entries:[]})});await malformed.list();assert(malformed.status().sharedError);assert.equal(malformed.read('123').translation,null);
});
test('export whitelist excludes keys, usage, unrelated cache and invalid article matches',()=>{
 const db={items:[a],translations:{[a.hash]:{text:'공유 번역',at:1},unrelated:{text:'private'}},apiKey:'secret',usage:{month:99},private:'do not export'};
 const out=exportNews(db);assert.deepEqual(out,pack());const json=JSON.stringify(out);for(const s of ['secret','usage','private','unrelated'])assert(!json.includes(s));
 assert.equal(exportNews({...db,items:[{...a,text:'tampered'}]}).entries.length,0);
 db.translations[a.hash].text='AIza'+'x'.repeat(35);assert.equal(exportNews(db).entries.length,0);
});
test('published bundle is identical to public data and contains no account fields',()=>{
 const bundle=require('../app/news-ko.js'),publicData=require('../../news/ko.json');assert.deepEqual(bundle,publicData);assert(bundle.entries.length>0);assert.deepEqual(Object.keys(bundle).sort(),['entries','language','schema']);for(const e of bundle.entries)assert.deepEqual(Object.keys(e).sort(),['at','hash','id','text']);
});
