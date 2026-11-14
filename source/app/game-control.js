'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const messages={save_processed:'게임의 저장 처리 종료를 확인했습니다. 디스크 파일 검증과는 별개입니다.',quit_requested:'저장 처리 확인 후 게임의 종료 절차를 요청했습니다.',host_only:'현재 PC가 호스트인 월드에서만 사용할 수 있습니다.',open_escape:'게임에서 Esc 메뉴를 열고 다시 눌러 주세요. 저장 확인 후 게임의 종료 기능을 사용합니다.',disabled:'안전 모드 또는 기능 차단 상태입니다.',saving_busy:'게임이 저장 중입니다. 잠시 뒤 다시 눌러 주세요.',world_changed:'월드가 바뀌어 요청을 중단했습니다.',save_failed:'게임 저장 실패가 감지되었습니다. 종료하지 않았습니다.',cooldown:'요청 간격은 최소 10초입니다.',expired:'요청이 만료되었습니다. 게임 로딩이 끝난 뒤 다시 눌러 주세요.',timeout:'저장 완료를 확인하지 못했습니다. 게임을 강제로 종료하지 않습니다.'};
function createControl({modDir,gameUp,openExternal,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms))}){
 let busy=false;
 return async action=>{
  if(!['start','save','exit'].includes(action))throw Error('지원하지 않는 게임 동작');
  if(busy)throw Error('다른 게임 요청을 처리 중입니다.');busy=true;
  try{
   const up=await gameUp();if(up===null)throw Error('게임 실행 상태를 확인하지 못했습니다.');
   if(action==='start'){if(up)return {message:'이미 게임이 실행 중입니다.'};await openExternal('steam://rungameid/1149460');return{message:'Steam에 게임 시작을 요청했습니다.'};}
   if(!up)throw Error('게임이 실행 중이 아닙니다.');
   const dir=modDir();if(!dir)throw Error('게임 설치 경로를 확인하지 못했습니다.');
   const id=crypto.randomBytes(12).toString('hex'),request=path.join(dir,'control-request.txt'),response=path.join(dir,'control-response.txt');
   fs.writeFileSync(request+'.tmp',id+'|'+Math.floor(now()/1000)+'|'+action);fs.renameSync(request+'.tmp',request);
   const start=now();while(now()-start<50000){await sleep(500);let raw='';try{raw=fs.readFileSync(response,'utf8')}catch{}const [got,status]=raw.split('|');if(got!==id||status==='save_requested')continue;if(!messages[status])throw Error('알 수 없는 게임 응답');return {status,message:messages[status]};}
   // Expired requests are removed, never replayed on a future session.
   try{if(fs.readFileSync(request,'utf8').startsWith(id+'|'))fs.unlinkSync(request)}catch{}
   return {status:'timeout',message:messages.timeout};
  }finally{busy=false}
 };
}
module.exports={createControl,messages};
