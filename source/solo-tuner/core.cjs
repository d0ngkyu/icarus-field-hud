'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const pak = require('./pak-reader.cjs');
const MOD = '997-IcarusSoloComfort_P.pak';
const TABLE = 'Stats/D_CharacterStartingStats.json';
const MOUNT = '../../../Icarus/Content/data/';
const LIMITS = { health: ['BaseMaximumHealth_+', 25], stamina: ['BaseMaximumStamina_+', 25], weight: ['BaseWeightCapacity_+', 25], speed: ['BaseMovementSpeed_+', 10] };
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const fileHash = p => fs.existsSync(p) ? hash(fs.readFileSync(p)) : null;
const json = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
function atomic(file, data) {
  fs.mkdirSync(path.dirname(file), {recursive:true});
  const tmp = file + '.' + crypto.randomUUID() + '.tmp';
  try { fs.writeFileSync(tmp, data, {flag:'wx'}); fs.renameSync(tmp, file); }
  finally { if(fs.existsSync(tmp)) fs.unlinkSync(tmp); }
}
function gameState() {
  const output = cp.execFileSync('tasklist.exe', ['/FO','CSV','/NH'], {encoding:'utf8',windowsHide:true,timeout:10000});
  if(!output.includes('","')) throw Error('게임 실행 상태를 확인하지 못했습니다. 적용을 중단합니다.');
  return /"Icarus(?:-Win64-Shipping|Server(?:-Win64-Shipping)?)?\.exe"/i.test(output);
}
function validate(values) {
  if(!values || Object.keys(values).length!==4) throw Error('네 가지 조정값을 확인하세요.');
  for(const [key,[,max]] of Object.entries(LIMITS)) if(!Number.isInteger(values[key]) || values[key]<0 || values[key]>max) throw Error(`${key}: 0~${max}% 범위만 가능합니다.`);
  return values;
}
function modifiedTable(source, values) {
  validate(values);
  const result=structuredClone(source), row=result.Rows?.find(r=>r.Name==='Base_Stats');
  if(!row?.StatsGranted) throw Error('현재 게임 데이터 형식이 지원되지 않습니다.');
  const preview={};
  for(const [key,[stat]] of Object.entries(LIMITS)) {
    const name=`(Value="${stat}")`, base=row.StatsGranted[name];
    if(!Number.isSafeInteger(base)||base<=0) throw Error('게임 기본값을 확인할 수 없습니다: '+key);
    const value=Math.round(base*(1+values[key]/100));
    row.StatsGranted[name]=value;
    preview[key]={base,value,percent:values[key]};
  }
  return {table:result,preview};
}
function readTable(dataPak) {
  const p=pak.openPak(dataPak);
  try {const f=p.files.find(f=>f.dir+f.name===TABLE); if(!f) throw Error('능력치 테이블이 없습니다.'); return JSON.parse(pak.readEntry(p,f.eo).toString('utf8'));}
  finally { fs.closeSync(p.fd); }
}
function detectGame() {
  const base=path.join(process.env['ProgramFiles(x86)']||'C:/Program Files (x86)','Steam');
  const roots=[base];
  try {for(const m of fs.readFileSync(path.join(base,'steamapps/libraryfolders.vdf'),'utf8').matchAll(/"path"\s+"([^"]+)"/g)) roots.push(m[1].replace(/\\\\/g,'\\'));}catch{}
  return roots.map(r=>path.join(r,'steamapps/common/Icarus')).find(r=>fs.existsSync(path.join(r,'Icarus/Content/Data/data.pak'))) || '';
}
class Tuner {
  constructor({game, stateDir, repak, guard=gameState}) {
    this.game=path.resolve(game); this.stateDir=stateDir; this.repak=repak; this.guard=guard;
    this.dataPak=path.join(this.game,'Icarus/Content/Data/data.pak');
    this.modDir=path.join(this.game,'Icarus/Content/Paks/mods');
    this.target=path.join(this.modDir,MOD);
    this.manifest=path.join(stateDir,'installed.json');
    fs.mkdirSync(stateDir,{recursive:true});
  }
  run(args) { return cp.execFileSync(this.repak,args,{encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:8*1024*1024}); }
  stopped() {if(this.guard()) throw Error('Icarus 또는 전용 서버가 실행 중입니다. 게임을 완전히 종료한 뒤 다시 누르세요.');}
  state() {return fs.existsSync(this.manifest)?json(this.manifest):null;}
  owned() {
    const s=this.state();
    if(fs.existsSync(this.target) && (!s || s.game!==this.game || fileHash(this.target)!==s.modHash)) throw Error('이 프로그램이 기록한 모드와 현재 파일이 다릅니다. 덮어쓰지 않습니다.');
    return s;
  }
  conflicts() {
    const hits=[];
    const walk=d=>{if(!fs.existsSync(d))return; for(const f of fs.readdirSync(d,{withFileTypes:true})) {const p=path.join(d,f.name); if(f.isDirectory())walk(p); else if(/\.pak$/i.test(f.name)&&path.resolve(p)!==path.resolve(this.target)) {
      try { if(/D_CharacterStartingStats\.json/i.test(this.run(['list',p]))) hits.push(f.name+' (능력치 테이블 중복)'); }
      catch { hits.push(f.name+' (호환성 확인 실패)'); }
    }}};
    walk(this.modDir); return hits;
  }
  status() {
    const source=readTable(this.dataPak), s=this.state();
    let running=null, error='';try{running=this.guard();}catch(e){error=e.message;}
    const exists=fs.existsSync(this.target), matches=exists&&s&&s.game===this.game&&fileHash(this.target)===s.modHash;
    return {game:this.game,running,error,installed:!!matches,foreign:exists&&!matches,stale:!!(matches&&s.dataHash!==fileHash(this.dataPak)),values:matches?s.values:{health:0,stamina:0,weight:0,speed:0},preview:modifiedTable(source,{health:0,stamina:0,weight:0,speed:0}).preview,backups:this.backups(),conflicts:this.conflicts(),version:'1.0.0'};
  }
  backup() {
    const id=new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID().slice(0,8), dir=path.join(this.stateDir,'backups',id);
    fs.mkdirSync(dir,{recursive:true});
    const s=this.state(), present=fs.existsSync(this.target);
    if(present) fs.copyFileSync(this.target,path.join(dir,MOD));
    fs.writeFileSync(path.join(dir,'record.json'),JSON.stringify({id,game:this.game,present,state:s,hash:present?fileHash(this.target):null},null,2));
    return id;
  }
  backups() {
    const root=path.join(this.stateDir,'backups');if(!fs.existsSync(root))return [];
    return fs.readdirSync(root).sort().reverse().flatMap(id=>{try{const r=json(path.join(root,id,'record.json'));return r.game===this.game?[{id,present:r.present,values:r.state?.values}]:[];}catch{return [];}});
  }
  locked(fn) {
    const lock=path.join(this.stateDir,'write.lock');let fd;
    try{fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,String(process.pid));}catch{throw Error('다른 조정 작업이 진행 중이거나 이전 작업이 중단됐습니다. 중복 적용을 막았습니다.');}
    try{return fn();}finally{fs.closeSync(fd);fs.unlinkSync(lock);}
  }
  apply(values, expectedHash, confirmed) {return this.locked(()=>{
    validate(values);if(confirmed!==true)throw Error('싱글 전용 사용 확인이 필요합니다.');
    this.stopped();this.owned();
    const conflicts=this.conflicts();if(conflicts.length)throw Error('다른 모드와 충돌 가능성이 있습니다: '+conflicts.join(', '));
    if(fileHash(this.dataPak)!==expectedHash)throw Error('게임 데이터가 바뀌었습니다. 새로 읽고 다시 적용하세요.');
    if(Object.values(values).every(v=>v===0))return this.removeInternal();
    const source=readTable(this.dataPak), {table,preview}=modifiedTable(source,values);
    const dir=fs.mkdtempSync(path.join(this.stateDir,'build-'));
    const input=path.join(dir,'input'), packed=path.join(dir,MOD);
    fs.mkdirSync(path.join(input,'Stats'),{recursive:true});
    fs.writeFileSync(path.join(input,TABLE),JSON.stringify(table,null,2));
    this.run(['pack',input,packed,'--mount-point',MOUNT,'--version','V11']);
    // Independently read the newly built archive using our existing game pak reader.
    const p=pak.openPak(packed);
    try{if(p.mount!==MOUNT||p.files.length!==1)throw Error('모드 패키지 구조 검증 실패');const f=p.files[0];if(f.dir+f.name!==TABLE||!pak.readEntry(p,f.eo).equals(fs.readFileSync(path.join(input,TABLE))))throw Error('모드 내용 검증 실패');}finally{fs.closeSync(p.fd);}
    const backup=this.backup(), bytes=fs.readFileSync(packed);
    this.stopped();this.owned();
    if(fileHash(this.dataPak)!==expectedHash)throw Error('적용 준비 중 게임이 업데이트됐습니다. 중단합니다.');
    atomic(this.target,bytes);
    try{atomic(this.manifest,JSON.stringify({game:this.game,modHash:hash(bytes),dataHash:expectedHash,values,preview,time:new Date().toISOString()},null,2));}
    catch(e){this.rollback(backup);throw e;}
    return {message:'설정 파일 적용 완료. 다음 게임 실행부터 사용합니다. 인게임 반영은 아직 확인하지 않았습니다.',backup,preview};
  });}
  rollback(id) {
    const dir=path.join(this.stateDir,'backups',id),r=json(path.join(dir,'record.json'));
    if(r.present)atomic(this.target,fs.readFileSync(path.join(dir,MOD)));else if(fs.existsSync(this.target))fs.unlinkSync(this.target);
    if(r.state)atomic(this.manifest,JSON.stringify(r.state));else if(fs.existsSync(this.manifest))fs.unlinkSync(this.manifest);
  }
  removeInternal() {
    this.stopped();this.owned();const backup=this.backup();this.stopped();this.owned();
    if(fs.existsSync(this.target))fs.unlinkSync(this.target);
    if(fs.existsSync(this.manifest))fs.unlinkSync(this.manifest);
    return {message:'이 프로그램의 능력치 모드를 해제했습니다. 다음 실행부터 원래 게임 기본값을 사용합니다.',backup};
  }
  remove(){return this.locked(()=>this.removeInternal());}
  restore(id){return this.locked(()=>{
    if(!this.backups().some(b=>b.id===id))throw Error('유효한 백업을 선택하세요.');
    this.stopped();this.owned();
    const r=json(path.join(this.stateDir,'backups',id,'record.json'));
    if(r.present && (r.hash!==fileHash(path.join(this.stateDir,'backups',id,MOD)) || !r.state || r.state.dataHash!==fileHash(this.dataPak)))throw Error('백업이 손상됐거나 다른 게임 버전의 백업입니다. 새로 설정하세요.');
    const conflicts=this.conflicts();if(r.present&&conflicts.length)throw Error('다른 모드와 중복됩니다: '+conflicts.join(', '));
    const backup=this.backup();this.stopped();this.owned();this.rollback(id);
    return {message:'선택한 이전 설정으로 복원했습니다. 다음 게임 실행부터 반영됩니다.',backup};
  });}
}
module.exports={Tuner,validate,modifiedTable,detectGame,readTable,gameState,fileHash,LIMITS,MOD,TABLE,MOUNT};
