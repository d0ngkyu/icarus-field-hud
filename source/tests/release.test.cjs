const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const {build,validate,validPath}=require('../tools/release.cjs');
test('release rejects traversal, duplicate files and altered payloads',()=>{
 for(const p of ['game/../oops','app/a:b','app/CON','game/x\\y','app/a.'])assert.throws(()=>validPath(p));
 const f={p:'app/a.js',n:1,h:crypto.createHash('sha1').update('x').digest('hex')};
 assert.throws(()=>validate({version:'2026.11.14.26',files:[f,f]},()=>Buffer.from('x')));
 assert.throws(()=>validate({version:'2026.11.14.26',files:[f]},()=>Buffer.from('y')));
});
test('release uses pinned Git bytes, preserves stable during beta, and refuses version/history rollback',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hud-release-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const git=(...a)=>cp.execFileSync('git',a,{cwd:root,stdio:['ignore','pipe','pipe']}).toString().trim();
 const put=(p,b)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),b);};
 const f={p:'app/main.js',n:3,h:crypto.createHash('sha1').update('old').digest('hex')};
 put('manifest.json',JSON.stringify({version:'2026.11.14.25',files:[f]}));put('files/app/main.js','old');put('source/app/main.js','new');put('source/mod/hud/layout.css','body{color:white}');put('source/mod/hud/layout.js','void 0;');
 git('init');git('add','.');git('-c','user.name=Test','-c','user.email=test@localhost','commit','-m','base');const source=git('rev-parse','HEAD');
 put('source/app/main.js','dirty');
 const beta=build({root,source,channel:'beta',version:'2026.11.14.100'});
 assert.ok(beta.files.some(f=>f.p.endsWith('/hud/layout.css')));assert.ok(beta.files.some(f=>f.p.endsWith('/hud/layout.js')));
 assert.equal(fs.readFileSync(path.join(root,'files/app/main.js'),'utf8'),'old');
 assert.equal(fs.readFileSync(path.join(root,beta.filesPath,'app/main.js'),'utf8'),'new');
 assert.throws(()=>build({root,source,channel:'beta',version:'2026.11.14.99'}));
 const stable=build({root,source,channel:'stable',version:'2026.11.14.26'});
 assert.equal(fs.readFileSync(path.join(root,'files/app/main.js'),'utf8'),'new');
 validate(stable,p=>fs.readFileSync(path.join(root,stable.filesPath,p)));
 assert.throws(()=>build({root,source,channel:'stable',version:'2026.11.14.26'}));
 const m=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));m.source='f'.repeat(40);put('manifest.json',JSON.stringify(m));
 assert.throws(()=>build({root,source,channel:'stable',version:'2026.11.14.27'}),/history/);
});
