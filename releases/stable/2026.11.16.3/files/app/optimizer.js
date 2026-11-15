'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const SECTION='/Game/BP/Systems/BP_IcarusGameUserSettings.BP_IcarusGameUserSettings_C';
const levels=['Low','Medium','High','Epic'];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function parse(text){const values={},lines=text.split(/\r?\n/);let section='';for(let i=0;i<lines.length;i++){const s=lines[i].match(/^\s*\[([^\]]+)\]\s*$/);if(s){section=s[1];continue}const m=lines[i].match(/^(\s*([^;#=]+?)\s*=)(.*)$/);if(m){const id=section+'|'+m[2].trim();if(values[id])throw Error('중복 설정 항목이 있어 변경하지 않았습니다.');values[id]={value:m[3].trim(),line:i,prefix:m[1]}}}return{values,lines,newline:text.includes('\r\n')?'\r\n':'\n'}}
function plan(text,mode){if(!['host','personal'].includes(mode))throw Error('알 수 없는 최적화 모드입니다.');const doc=parse(text),changes={};
 const put=(section,key,value)=>{const id=section+'|'+key,old=doc.values[id];if(!old)throw Error('지원 설정을 찾지 못했습니다: '+key+' · 게임을 한 번 실행한 뒤 다시 확인하세요.');changes[id]=String(value)};
 for(const [key,cap]of Object.entries(mode==='host'?{ViewDistance:1,Shadows:0,PostProcessing:1,Effects:1,Foliage:1}:{ViewDistance:2,Shadows:1,PostProcessing:2,Effects:2,Foliage:2})){
  const group={Shadows:'Shadow',PostProcessing:'PostProcess'}[key]||key;
  const a=doc.values[SECTION+'|'+key],b=doc.values['ScalabilityGroups|sg.'+group+'Quality'];
  if(!a||!b||!levels.includes(a.value)||!/^\d$/.test(b.value)||+b.value>3)throw Error('품질 설정 형식을 확인할 수 없습니다: '+key);
  const target=Math.min(cap,levels.indexOf(a.value),+b.value);put(SECTION,key,levels[target]);put('ScalabilityGroups','sg.'+group+'Quality',target);
 }
 for(const [key,value]of Object.entries({Overall:'Custom',bContactShadows:'False',bUseSimpleBuildingShadows:'True',bDisableGrassShadows:'True',bTessellation:'False',bTerrainDeformationExperimental:'False'}))put(SECTION,key,value);
 for(const [key,cap]of [['MaxShadowCascades',mode==='host'?1:2],['FrameLimit',mode==='host'?60:90]]){const old=doc.values[SECTION+'|'+key];if(!old||!Number.isFinite(+old.value)||+old.value<0)throw Error('숫자 설정을 확인할 수 없습니다: '+key);put(SECTION,key,(key==='FrameLimit'&&+old.value===0?cap:Math.min(+old.value,cap)).toFixed(6));}
 return{doc,changes};
}
function patch(doc,changes){const lines=[...doc.lines];for(const[id,value]of Object.entries(changes)){const row=doc.values[id];if(!row)throw Error('설정 항목이 사라졌습니다.');lines[row.line]=row.prefix+value}return lines.join(doc.newline)}
function decode(b){if(b[0]===255&&b[1]===254)return{text:b.subarray(2).toString('utf16le'),encode:s=>Buffer.concat([Buffer.from([255,254]),Buffer.from(s,'utf16le')])};if(b[0]===254&&b[1]===255)throw Error('지원하지 않는 설정 파일 인코딩입니다.');const bom=b[0]===239&&b[1]===187&&b[2]===191;return{text:b.subarray(bom?3:0).toString('utf8'),encode:s=>Buffer.from((bom?'\ufeff':'')+s,'utf8')}}
function create({configFile,storeDir,gameUp,io=fs}){let busy=false;const journal=path.join(storeDir,'optimization.json');
 function read(){const stat=io.lstatSync(configFile);if(stat.isSymbolicLink()||!stat.isFile()||stat.size>1048576)throw Error('설정 파일 경로나 크기를 확인해 주세요.');return io.readFileSync(configFile)}
 function state(){try{const s=JSON.parse(io.readFileSync(journal,'utf8'));if(s.pending){const actual=hash(read());if(actual===s.beforeHash)return s.previous;if(actual===s.afterHash)return s.next;throw Error('중단된 변경과 현재 설정이 다릅니다.')}return s}catch(e){if(e.code==='ENOENT')return null;throw Error('최적화 기록을 읽지 못했습니다. 백업 파일은 보존했습니다.')}}
 function save(s){io.mkdirSync(storeDir,{recursive:true});const temp=journal+'.tmp';io.writeFileSync(temp,JSON.stringify(s,null,2));io.renameSync(temp,journal)}
 async function status(){try{const up=await gameUp(),s=state(),doc=parse(decode(read()).text);const same=s&&Object.entries(s.applied||{}).every(([k,v])=>doc.values[k]?.value===v);return{color:s?.mode&&same?'green':'yellow',mode:s?.mode||null,canWrite:up===false,canRestore:!!s&&Object.keys(s.original||{}).length>0,message:s?.mode?(same?'설정 저장·일치 확인 · 실제 FPS 개선은 별도 확인':'게임 설정이 바뀌었습니다. 다시 적용하거나 복원하세요.'):'아직 최적화를 적용하지 않았습니다.',running:up!==false,backup:s?.backup||null}}catch(e){return{color:'red',canWrite:false,canRestore:false,message:e.message}}}
 async function run(action){if(busy)return{color:'yellow',message:'다른 요청을 처리 중입니다.'};busy=true;try{
  if(await gameUp()!==false)return{...(await status()),color:'yellow',message:'게임을 완전히 종료한 뒤 눌러 주세요. 실행 중에는 변경하지 않습니다.'};
  const before=read(),codec=decode(before),doc=parse(codec.text),old=state();let next,changes;
  if(action==='restore'){
   if(!old||!Object.keys(old.original||{}).length)throw Error('복원할 백업 기록이 없습니다.');changes={};
   for(const [k,v]of Object.entries(old.original)){if(doc.values[k]?.value!==old.applied[k])throw Error('게임에서 별도로 바꾼 설정이 있습니다. 덮어쓰지 않았습니다. 백업 위치를 확인해 주세요.');changes[k]=v}
   next={...old,mode:null,original:{},applied:{},restoredAt:Date.now()};
  }else{changes=plan(codec.text,action).changes;const original={...(old?.original||{})};for(const k of Object.keys(changes))if(!(k in original))original[k]=doc.values[k].value;
   io.mkdirSync(storeDir,{recursive:true});const backup=old?.mode?old.backup:path.join(storeDir,'GameUserSettings-'+Date.now()+'-'+crypto.randomBytes(4).toString('hex')+'.ini');if(!old?.mode)io.writeFileSync(backup,before,{flag:'wx'});
   next={version:1,mode:action,original,applied:changes,backup,at:Date.now()};
  }
  const output=codec.encode(patch(doc,changes));
  // Persist recovery metadata before mutation, including an interrupted write.
  save({pending:true,previous:old,next,beforeHash:hash(before),afterHash:hash(output),backup:next.backup});
  if(await gameUp()!==false||hash(read())!==hash(before)){save(old||{mode:null,original:{},applied:{}});throw Error('게임이 실행됐거나 설정이 바뀌어 변경을 중단했습니다.');}
  const temp=configFile+'.hud-opt.tmp';io.writeFileSync(temp,output,{flag:'wx'});
  try{if(await gameUp()!==false||hash(read())!==hash(before))throw Error('상태가 바뀌어 적용을 중단했습니다.');io.renameSync(temp,configFile)}finally{try{io.unlinkSync(temp)}catch{}}
  if(hash(read())!==hash(output))throw Error('저장 후 검증에 실패했습니다. 백업을 보존했습니다.');save({...next,pending:false});return{...(await status()),message:action==='restore'?'변경 전 설정을 복원했습니다. 다음 게임 실행부터 사용됩니다.':'설정 저장·재확인 완료. 다음 게임 실행부터 적용됩니다. FPS 개선 보장은 아닙니다.'};
 }catch(e){return{...await status(),color:'red',message:e.message}}finally{busy=false}}
 return{status,run};
}
module.exports={create,plan,parse,patch,decode,SECTION};
