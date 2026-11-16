const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
const app=require('../app/compat.js'),hud=require('../mod/hud/compat.js');
test('game build read from the Steam manifest next to the game folder',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'cmp-')),game=path.join(root,'steamapps','common','Icarus');fs.mkdirSync(game,{recursive:true});
 fs.writeFileSync(path.join(root,'steamapps','appmanifest_1149460.acf'),'"AppState"\n{\n\t"appid"\t\t"1149460"\n\t"LastUpdated"\t\t"1763000000"\n\t"buildid"\t\t"20871234"\n}\n');
 assert.deepEqual(app.gameBuild(game),{id:'20871234',updatedAt:1763000000000});
 assert.equal(app.gameBuild(path.join(root,'nope')),null);assert.equal(app.gameBuild(null),null);
 const log=path.join(game,'Icarus','Binaries','Win64','ue4ss');fs.mkdirSync(log,{recursive:true});
 fs.writeFileSync(path.join(log,'UE4SS.log'),'[Lua] [IcarusHUD] landmark scan failed: x\n[Lua] [IcarusHUD] ok\n[Lua] [IcarusHUD] animal reader disabled for session: y\n');
 assert.deepEqual(app.report(game),{build:{id:'20871234',updatedAt:1763000000000},failures:['animal','lm']});
});
test('log failures map to features; unrelated lines ignored',()=>{
 assert.deepEqual(app.logFailures('[IcarusHUD] inventory scan failed: e\n[IcarusHUD] ore scan failed\n[IcarusHUD] ore scan failed\nsomething else failed'),['inv','ore']);
 assert.deepEqual(app.logFailures(''),[]);
});
test('build change resets the check, data arrival marks features, summary separates fail/ok/wait',()=>{
 let r=hud.onBuild(undefined,'100',1);assert.equal(r.changed,false);assert.equal(r.state.build,'100');
 hud.observe(r.state,{p:[1,2],inv:{bag:{}},lm:[]},5);assert.deepEqual(Object.keys(r.state.ok).sort(),['inv','lm','p']);
 hud.observe(r.state,{p:[3,4]},9);assert.equal(r.state.ok.p,5,'first time kept');
 const same=hud.onBuild(r.state,'100',10);assert.equal(same.changed,false);assert.equal(same.state,r.state);
 const next=hud.onBuild(r.state,'101',20);assert.equal(next.changed,true);assert.equal(next.state.prev,'100');assert.deepEqual(next.state.ok,{});
 hud.observe(next.state,{p:[1,1],inv:{ore:[1]}},21);
 const s=hud.summary(next.state,['lm'],Date.UTC(2026,10,13,12));
 assert.equal(s.level,'bad');assert.deepEqual(s.fail,['지도 표시']);assert.ok(s.ok.includes('위치')&&s.ok.includes('광석 노드'));assert.ok(s.wait.includes('동물'));
 assert.match(s.text,/게임 빌드 101 \(게임 업데이트 11월 13일\) · 새 버전/);
 assert.equal(hud.summary(null,[],null).text.split('\n')[0],'게임 빌드 확인 대기');
 const all={build:'1',ok:Object.fromEntries(hud.FEATURES.map(([k])=>[k,1]))};assert.equal(hud.summary(all,[],null).level,'ok');
});
