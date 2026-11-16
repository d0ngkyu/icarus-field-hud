'use strict';
const fs=require('node:fs'),path=require('node:path'),https=require('node:https');
const ENDPOINT='https://api.github.com/repos/d0ngkyu/icarus-field-hud/contents/news/ko.json';
const SECRET=/(?:AIza[\w-]{30,}|github_pat_[\w]+|gh[pousr]_[\w]{20,})/;
function entries(value){
 if(value?.schema!==1||value.language!=='ko'||!Array.isArray(value.entries)||value.entries.length>64)throw Error('공유 파일 형식을 확인해야 합니다. 덮어쓰지 않았습니다.');
 return value.entries.map(e=>{if(!/^\d{1,30}$/.test(e?.id)||!/^[a-f0-9]{64}$/.test(e?.hash)||typeof e.text!=='string'||!e.text.trim()||e.text.length>180000||!Number.isFinite(e.at)||SECRET.test(e.text))throw Error('공유 글 검증에 실패했습니다.');return {id:e.id,hash:e.hash,text:e.text,at:e.at};});
}
function request(method,token,body){return new Promise((resolve,reject)=>{
 const req=https.request(ENDPOINT+(method==='GET'?'?ref=main':''),{method,headers:{'User-Agent':'IcarusHUD-news','Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Authorization':'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})}},res=>{let n=0,parts=[];res.on('data',b=>{n+=b.length;if(n>2000000)req.destroy();else parts.push(b);});res.on('error',()=>reject(Error('GitHub 연결이 중단되었습니다.')));res.on('end',()=>{let value=null;try{value=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{}resolve({status:res.statusCode,value});});});
 const timer=setTimeout(()=>req.destroy(),15000);req.on('close',()=>clearTimeout(timer));req.on('error',()=>reject(Error('GitHub 업로드 연결 실패 · 번역은 PC에 저장되어 있습니다.')));if(body)req.write(JSON.stringify(body));req.end();
});}
function httpError(status){return Error(status===401||status===403?'GitHub 권한 또는 토큰 만료를 확인하세요. 번역은 보존됩니다.':status===429?'GitHub 요청 제한입니다. 잠시 후 공유 재시도를 누르세요.':'GitHub 공유 실패 ('+status+') · 저장된 번역으로 재시도할 수 있습니다.');}
function create({dir,secure,send=request}){
 const file=path.join(dir,'news-publisher.dat');let flight=null;
 const connected=()=>fs.existsSync(file);
 function setToken(token){
  if(flight)throw Error('공유 업로드가 끝난 뒤 연결을 변경하세요.');
  if(token===''){if(connected())fs.unlinkSync(file);return false;}
  if(typeof token!=='string'||!/^github_pat_[A-Za-z0-9_]{30,255}$/.test(token.trim()))throw Error('이 저장소만 허용한 GitHub fine-grained 토큰을 입력하세요.');
  if(!secure.isEncryptionAvailable())throw Error('Windows 암호화 저장소를 사용할 수 없습니다.');
  fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(file,secure.encryptString(token.trim()));return true;
 }
 async function publish(input){
  if(flight)return flight;
  const local=entries({schema:1,language:'ko',entries:input});if(!local.length)return [];
  if(!connected()||!secure.isEncryptionAvailable())throw Error('자동 공유 연결이 필요합니다.');
  let token;try{token=secure.decryptString(fs.readFileSync(file));}catch{throw Error('업로드 권한을 다시 연결하세요.');}
  flight=(async()=>{try{
   for(let attempt=0;attempt<3;attempt++){
    const get=await send('GET',token);if(get.status!==200)throw httpError(get.status);
    const f=get.value;if(f?.type!=='file'||f.encoding!=='base64'||typeof f.content!=='string'||!/^[a-f0-9]{40}$/.test(f.sha)||f.size>800000)throw Error('공유 파일 응답을 확인해야 합니다.');
    let remote;try{remote=entries(JSON.parse(Buffer.from(f.content,'base64').toString('utf8')));}catch{throw Error('공유 파일 검증 실패 · 기존 파일을 보존했습니다.');}
    const key=e=>e.id+':'+e.hash,map=new Map(remote.map(e=>[key(e),e]));let changed=false;
    for(const e of local)if(!map.has(key(e))){map.set(key(e),e);changed=true;}
    const merged=[...map.values()].sort((a,b)=>b.at-a.at).slice(0,64);
    if(!local.every(e=>merged.some(x=>key(x)===key(e))))throw Error('공유 보관 한도입니다. 최근 소식만 공유해 주세요.');
    if(!changed)return local.map(e=>map.get(key(e)));
    const content=JSON.stringify({schema:1,language:'ko',entries:merged},null,2)+'\n';if(Buffer.byteLength(content)>800000)throw Error('공유 파일 용량 한도입니다. 번역은 PC에 보존됩니다.');
    const put=await send('PUT',token,{message:'Share Korean official news ('+local.map(e=>e.id).join(', ')+')',content:Buffer.from(content).toString('base64'),sha:f.sha,branch:'main'});
    if(put.status===409||put.status===422)continue;
    if(put.status!==200&&put.status!==201)throw httpError(put.status);
    if(!put.value?.commit?.sha)throw Error('공유 완료 확인에 실패했습니다. 재시도로 확인해 주세요.');
    return local.map(e=>map.get(key(e)));
   }
   throw Error('다른 업로드와 겹쳤습니다. 저장된 번역으로 공유 재시도를 눌러 주세요.');
  }finally{token='';flight=null;}})();return flight;
 }
 return {connected,setToken,publish};
}
module.exports={create,entries,ENDPOINT};
