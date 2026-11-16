const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path'),zlib=require('zlib');
const ps=require('../app/prospect-save.js');
const f32=(...v)=>{const b=Buffer.alloc(4*v.length);v.forEach((x,i)=>b.writeFloatLE(x,i*4));return b};
const L=s=>Buffer.from(s,'latin1'),Z=n=>Buffer.alloc(n);
function deposit(name,x,y,z){const nm=Buffer.alloc(4);nm.writeUInt32LE(name.length+1);
 return Buffer.concat([L('Script/Icarus.ResourceDeposit'),Z(40),L('NameProperty'),Z(10),nm,L(name),Z(1),Z(30),L('Vector'),Z(18),f32(x,y,z),Z(20)])}
function plant(x,y,z){return Buffer.concat([L('Translation'),Z(15),L('Vector'),Z(18),f32(x,y,z),Z(60),L('/Game/Maps/Terrain_019_DLC/Terrain_019.Terrain_019:PersistentLevel.BP_Exotic_Plant_C_7'),Z(30)])}
function saveFile(blob,utf16){const b64=zlib.deflateSync(blob).toString('base64');const json=`{\n  "ProspectInfo": {"ProspectID": "Test"},\n  "ProspectBlob": {\n    "BinaryBlob": "${b64}"\n  }\n}\n`;
 return utf16?Buffer.concat([Buffer.from([0xff,0xfe]),Buffer.from(json,'utf16le')]):Buffer.from(json)}
const blob=Buffer.concat([Z(20),L('/Game/Maps/Terrain_019/Terrain_019'),Z(10),deposit('Iron',-120000.5,50000,300),deposit('Exotic_Red_Raw',10000,-20000,0),plant(150000,-90000,1200),plant(1e9,0,0),deposit('Bad Name!',1,1,1),L('/Game/Maps/Terrain_016/x')]);
test('parses world, deep veins with ore type, and spawned red exotic plants (UTF-8 and UTF-16)',()=>{
 for(const u of [false,true]){const r=ps.parse(saveFile(blob,u));
  assert.equal(r.world,'Terrain_019');assert.equal(r.scope,'Test');
  assert.deepEqual(r.veins,[['Iron',-120000,50000,300],['Exotic_Red_Raw',10000,-20000,0]]);
  assert.deepEqual(r.plants,[[150000,-90000,1200]],'out-of-map positions dropped');}
 assert.equal(ps.parse(Buffer.from('{"nothing":1}')),null);
 assert.equal(ps.parse(Buffer.from('{"BinaryBlob": "not-zlib"}')),null);
});
test('latest save only, read-only, cached per file version, stale saves ignored',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ps-')),dir=path.join(root,'Icarus','Saved','PlayerData','123','Prospects');fs.mkdirSync(dir,{recursive:true});
 const a=path.join(dir,'Old.json'),b=path.join(dir,'Mine.json');fs.writeFileSync(a,'{}');fs.writeFileSync(b,saveFile(blob));
 const t=Date.now()/1000;fs.utimesSync(a,t-3600,t-3600);fs.utimesSync(b,t-60,t-60);const before=fs.readFileSync(b);
 const r=await ps.latest(root,Date.now());assert.equal(r.name,'Mine');assert.equal(r.world,'Terrain_019');assert.equal(r.veins.length,2);assert.ok(Math.abs(r.savedAt-(t-60)*1000)<2000);
 assert.equal(await ps.latest(root,Date.now()),r,'cached');assert.deepEqual(fs.readFileSync(b),before,'file untouched');
 assert.equal(await ps.latest(root,Date.now()+2*3600e3),null,'too old: probably not the world being played');
 assert.equal(await ps.latest(path.join(root,'none')),null);
 assert.deepEqual(await ps.parseAsync(saveFile(blob)),ps.parse(saveFile(blob)));
});

 test('missing or malformed prospect identity is never guessed from a filename',()=>{
 const original=saveFile(blob).toString('utf8');for(const id of [null,{},'','other/server']){const data=JSON.parse(original);data.ProspectInfo.ProspectID=id;assert.equal(ps.parse(Buffer.from(JSON.stringify(data))).scope,null);}
 });
