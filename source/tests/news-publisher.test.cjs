const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {create:publisher}=require('../app/news-publisher'),{create,article}=require('../app/news');
const secure={isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from('sealed:'+Buffer.from(s).toString('base64')),decryptString:b=>Buffer.from(b.toString().slice(7),'base64').toString()};
const token='github_pat_'+'x'.repeat(50),entry=(id='1')=>({id,hash:id.padStart(64,'a'),text:'한국어 '+id,at:Number(id)}),pack=entries=>({schema:1,language:'ko',entries});
const response=entries=>({status:200,value:{type:'file',sha:'b'.repeat(40),encoding:'base64',size:100,content:Buffer.from(JSON.stringify(pack(entries))).toString('base64')}});
function dir(t){const d=fs.mkdtempSync(path.join(os.tmpdir(),'news-publish-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));return d;}
test('publisher merges concurrent remote additions, writes only public fields and encrypts credential',async t=>{
 let gets=0,puts=0,last;const d=dir(t),pub=publisher({dir:d,secure,send:async(method,key,body)=>{assert.equal(key,token);if(method==='GET')return response(++gets===1?[entry('2')]:[entry('2'),entry('3')]);puts++;last=body;return puts===1?{status:409}:{status:200,value:{commit:{sha:'c'.repeat(40)}}};}});
 pub.setToken(token);assert(!fs.readFileSync(path.join(d,'news-publisher.dat'),'utf8').includes(token));
 await pub.publish([{...entry(),usage:99,apiKey:'private'}]);const data=JSON.parse(Buffer.from(last.content,'base64'));assert.deepEqual(data.entries.map(e=>e.id),['3','2','1']);assert.equal(last.branch,'main');assert.equal(last.sha,'b'.repeat(40));assert(!JSON.stringify(last).includes('private'));assert(!JSON.stringify(last).includes(token));pub.setToken('');assert.equal(pub.connected(),false);
});
test('already published translation is idempotent; malformed remote never gets overwritten',async t=>{
 const d=dir(t);let writes=0;const pub=publisher({dir:d,secure,send:async method=>{if(method==='PUT')writes++;return response([entry()]);}});pub.setToken(token);await pub.publish([entry()]);assert.equal(writes,0);
 const bad=publisher({dir:d,secure,send:async method=>{if(method==='PUT')writes++;return response([{...entry(),hash:'invalid'}]);}});await assert.rejects(bad.publish([entry('2')]),/검증 실패/);assert.equal(writes,0);
});
test('credential changes are blocked during publication and invalid credentials are never stored',async t=>{
 const d=dir(t);let finish;const pub=publisher({dir:d,secure,send:async()=>new Promise(resolve=>{finish=resolve;})});assert.throws(()=>pub.setToken('ghp_classic'),/fine-grained/);pub.setToken(token);const flight=pub.publish([entry()]);assert.throws(()=>pub.setToken(''),/끝난 뒤/);finish({status:401});await assert.rejects(flight,/권한|만료/);pub.setToken('');assert.equal(pub.connected(),false);
});
test('failed automatic publication preserves translation; restart retries without Google request',async t=>{
 const d=dir(t);let google=0,uploads=0,fail=true;
 const item={gid:'123',feedname:'steam_community_announcements',title:'Official',url:'https://store.steampowered.com/news/app/1149460/view/123',date:123,contents:'Hello'};
 const pub={connected:()=>true,setToken(){},publish:async entries=>{uploads++;if(fail)throw Error('offline');return entries;}};
 const opts={dir:d,secure,publisher:pub,bundled:pack([]),sharedFetch:async()=>pack([]),fetchJSON:async url=>{if(url.includes('ISteamNews'))return {appnews:{appid:1149460,newsitems:[item]}};google++;return {data:{translations:[{translatedText:'저장한 번역'}]}};}};
 const svc=create(opts);await svc.list();svc.setKey('AIza'+'x'.repeat(35));const first=await svc.translate('123');assert.equal(first.translation,'저장한 번역');assert.equal(first.shared,false);assert.equal(first.publishPending,1);assert.equal(first.publishError,'offline');assert.equal(google,1);
 fail=false;const restarted=create(opts);await restarted.list();const after=await restarted.translate('123');assert.equal(after.shared,true);assert.equal(after.publishPending,0);assert.equal(after.publishError,'');assert.equal(google,1);assert.equal(uploads,2);
 assert(!fs.readFileSync(path.join(d,'game-news.json'),'utf8').includes('github_pat_'));assert.equal(after.used,article(item).characters);
});
test('disconnect disables future upload and a token cannot be exported inside a translation',async t=>{
 const pub=publisher({dir:dir(t),secure,send:async()=>{throw Error('must not send')}});pub.setToken(token);await assert.rejects(pub.publish([{...entry(),text:token}]),/검증/);pub.setToken('');await assert.rejects(pub.publish([entry()]),/연결/);
});
