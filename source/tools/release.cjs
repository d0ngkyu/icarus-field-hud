// Repository-only release builder. No Claude container paths or installed game needed.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const hash=b=>crypto.createHash('sha1').update(b).digest('hex');
const cmp=(a,b)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<Math.max(x.length,y.length);i++){const d=(x[i]||0)-(y[i]||0);if(d)return Math.sign(d);}return 0;};
function validVersion(v){if(typeof v!=='string'||!/^\d{4}\.\d{1,2}\.\d{1,2}\.\d{1,8}$/.test(v))throw Error('Invalid version');return v;}
function validPath(p){if(typeof p!=='string'||! /^(game|app)\//.test(p)||p.split('/').some(s=>!s||s==='.'||s==='..'||/[\\:<>"|?*\x00-\x1f]/.test(s)||/[. ]$/.test(s)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(s)))throw Error('Unsafe path: '+p);return p;}
function validate(man,read){validVersion(man.version);if(!Array.isArray(man.files)||!man.files.length)throw Error('Empty release');const seen=new Set();for(const f of man.files){validPath(f.p);if(seen.has(f.p.toLowerCase()))throw Error('Duplicate path');seen.add(f.p.toLowerCase());const b=read(f.p);if(!Number.isSafeInteger(f.n)||f.n<0||!/^[a-f0-9]{40}$/.test(f.h)||b.length!==f.n||hash(b)!==f.h)throw Error('Checksum: '+f.p);}return true;}
function build({root,source,channel,version,notes}){
 if(!['stable','beta'].includes(channel))throw Error('Invalid channel');validVersion(version);
 if(!/^[a-f0-9]{40}$/.test(source))throw Error('Full source commit required');
 const git=(...args)=>cp.execFileSync('git',args,{cwd:root,maxBuffer:100*1024*1024});
 const read=p=>git('show',source+':'+p);
 const baseline=JSON.parse(read('manifest.json'));validate(baseline,p=>read('files/'+p));
 const mf=channel==='stable'?'manifest.json':'beta/manifest.json';
 const previous=fs.existsSync(path.join(root,mf))?JSON.parse(fs.readFileSync(path.join(root,mf))):null;
 if(previous&&cmp(version,previous.version)<=0)throw Error('Version must increase within channel');
 const priorSource=previous&&(previous.source||git('log','-1','--format=%H','--',mf).toString().trim());
 if(priorSource){try{git('merge-base','--is-ancestor',priorSource,source);}catch{throw Error('Source would discard previous channel history; merge it first');}}
 const prefix='game/Icarus/Binaries/Win64/ue4ss/Mods/IcarusHUD/';
 const listed=new Set(git('ls-tree','-r','--name-only',source,'source/app','source/mod').toString().trim().split('\n'));
 const payloads=new Map();
 for(const f of baseline.files){let p=f.p.startsWith('app/')?'source/'+f.p:f.p.startsWith(prefix)?'source/mod/'+f.p.slice(prefix.length):null;let b=p&&listed.has(p)?read(p):read('files/'+f.p);if(f.p.endsWith('/hud/index.html'))b=Buffer.from(b.toString().replaceAll('__HUD_VERSION__',version));payloads.set(f.p,b);}
 // New source modules/maps/fonts are included without a manual manifest edit.
 for(const p of listed){let dest;if(/^source\/app\/[^/]+\.js$/.test(p))dest=p.slice(7);else if(/^source\/mod\/(Scripts\/.*\.lua|hud\/.*\.(js|css|html|webp|woff2))$/.test(p))dest=prefix+p.slice(11);if(dest&&!payloads.has(dest))payloads.set(dest,read(p));}
 const folder='releases/'+channel+'/'+version;
 if(fs.existsSync(path.join(root,folder)))throw Error('Immutable release already exists');
 const man={version,channel,source,notes:notes||'',config:baseline.config||{},filesPath:folder+'/files',files:[]};
 const put=(p,b)=>{const dst=path.join(root,p);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.writeFileSync(dst,b);};
 for(const [p,b] of payloads){validPath(p);const old=baseline.files.find(f=>f.p===p);man.files.push({p,n:b.length,h:hash(b),...(old?.once?{once:1}:{})});}
 validate(man,p=>payloads.get(p));
 for(const [p,b] of payloads){put(folder+'/files/'+p,b);if(channel==='stable')put('files/'+p,b);}
 put(folder+'/manifest.json',JSON.stringify(man,null,1)+'\n');put(mf,JSON.stringify(man,null,1)+'\n');
 return man;
}
module.exports={build,validate,validVersion,validPath,cmp};
if(require.main===module){const [source,channel,version,...notes]=process.argv.slice(2);const m=build({root:process.cwd(),source,channel,version,notes:notes.join(' ')});console.log(JSON.stringify({version:m.version,channel:m.channel,source:m.source,files:m.files.length}));}
