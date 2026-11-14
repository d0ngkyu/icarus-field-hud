'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const evidence=require('./save-evidence.js');
const messages={accepted_unverified:'저장 요청은 전달됐지만 완료 신호를 확인하지 못했습니다. 반복 요청 대신 게임의 저장 상태를 확인해 주세요.',file_updated:'요청 이후 월드 저장 파일 갱신을 확인했습니다. 자동 저장과 구분되지 않아 이 요청의 완료로 확정하지 않습니다.',save_processed:'게임의 저장 처리 종료를 확인했습니다. 디스크 파일 검증과는 별개입니다.',quit_requested:'저장 처리 확인 후 게임의 종료 절차를 요청했습니다.',host_only:'현재 PC가 호스트인 월드에서만 사용할 수 있습니다.',open_escape:'게임에서 Esc 메뉴를 열고 다시 눌러 주세요. 저장 확인 후 게임의 종료 기능을 사용합니다.',disabled:'수동 게임 제어가 개별 차단된 상태입니다.',saving_busy:'게임이 저장 중입니다. 잠시 뒤 다시 눌러 주세요.',world_changed:'월드가 바뀌어 요청을 중단했습니다.',save_failed:'게임 저장 실패가 감지되었습니다. 종료하지 않았습니다.',cooldown:'요청 간격은 최소 10초입니다.',expired:'요청이 만료되었습니다. 게임 로딩이 끝난 뒤 다시 눌러 주세요.',timeout:'저장 완료를 확인하지 못했습니다. 게임을 강제로 종료하지 않습니다.'};
function createControl({modDir,gameUp,openExternal,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms)),progress=()=>{},saveRoot=null,snapshot=()=>evidence.snapshot(saveRoot)}){
 let busy=false;
 return async action=>{
  if(!['start','save','exit'].includes(action))throw Error('지원하지 않는 게임 동작');
  if(busy)throw Error('다른 게임 요청을 처리 중입니다.');busy=true;
  try{
   const up=await gameUp();if(up===null)throw Error('게임 실행 상태를 확인하지 못했습니다.');
   if(action==='start'){if(up)return {message:'이미 게임이 실행 중입니다.'};await openExternal('steam://rungameid/1149460');return{message:'Steam에 게임 시작을 요청했습니다.'};}
   if(!up)throw Error('게임이 실행 중이 아닙니다.');
   const dir=modDir();if(!dir)throw Error('게임 설치 경로를 확인하지 못했습니다.');
   // Manual host requests are independent of the broad scan safety mode.
   let off='';try{off=fs.readFileSync(path.join(dir,'features_off.txt'),'utf8')}catch{}
   if(off.split(/\s+/).includes('game_control'))throw Error(messages.disabled);
   const baseline=action==='save'?await snapshot():new Map();
   const id=crypto.randomBytes(12).toString('hex'),request=path.join(dir,'control-request.txt'),response=path.join(dir,'control-response.txt');
   fs.writeFileSync(request+'.tmp',id+'|'+Math.floor(now()/1000)+'|'+action);fs.renameSync(request+'.tmp',request);
   const start=now();let accepted=false,diskChanged=false,lastProbe=0;
   while(now()-start<50000){
    await sleep(500);let raw='';try{raw=fs.readFileSync(response,'utf8')}catch{}
    const [got,status]=raw.trim().split('|');const elapsed=Math.floor((now()-start)/1000);
    if(got===id&&!status)continue; // writer may be between truncate and write
    if(got===id&&status==='save_requested')accepted=true;
    if(accepted&&action==='save'&&now()-lastProbe>=2000){lastProbe=now();diskChanged=diskChanged||evidence.changed(baseline,await snapshot());}
    progress({action,elapsed,message:accepted?(diskChanged?'월드 저장 파일 갱신 확인 · 게임 응답 확인 중':'게임이 저장 요청을 접수했습니다 · 완료 확인 중'):'게임에 저장 요청 전달 중'});
    if(got===id&&status!=='save_requested'){
     if(!messages[status])throw Error('알 수 없는 게임 응답');
     const result=action==='save'&&diskChanged&&['accepted_unverified','timeout'].includes(status)?'file_updated':status;
     return {status:result,message:messages[result]};
    }
    // A save-only request cannot later quit the game. Stop holding the UI after
    // ten seconds of acknowledgement; do not interpret elapsed time as success.
    if(action==='save'&&accepted&&elapsed>=10){const status=diskChanged?'file_updated':'accepted_unverified';return {status,message:messages[status]};}
   }
   // Expired requests are removed, never replayed on a future session.
   try{if(fs.readFileSync(request,'utf8').startsWith(id+'|'))fs.unlinkSync(request)}catch{}
   return {status:'timeout',message:messages.timeout};
  }finally{busy=false}
 };
}
module.exports={createControl,messages};
