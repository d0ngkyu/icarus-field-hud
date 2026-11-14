'use strict';
const {spawn}=require('node:child_process');
const path=require('node:path');
const number=n=>Number.isFinite(n)&&n>=0?Math.min(n,Number.MAX_SAFE_INTEGER):0;
const groups=[
 ['clicks','클릭','회',[[100,'클릭 입문자'],[1000,'손가락 워밍업'],[10000,'클릭 장인'],[50000,'마우스 학대범'],[100000,'왼손은 거들 뿐'],[1000000,'스위치 장례위원장']]],
 ['right','우클릭','회',[[100,'오른쪽도 있어요'],[1000,'우클릭 애호가'],[10000,'오른손의 오른손']]],
 ['wheel','휠 이동','칸',[[100,'스크롤 시동'],[1000,'휠 굴리는 사나이'],[10000,'손가락 햄스터']]],
 ['distance','마우스 이동량','입력 단위',[[10000,'책상 위 첫걸음'],[100000,'패드 산책가'],[1000000,'마우스 택배기사'],[5000000,'책상 위 국토대장정'],[10000000,'패드가 닳도록'],[100000000,'마우스 세계일주']]],
 ['idle','60초 이상 무입력 누적','초',[[60,'잠깐 자리 비움'],[600,'커피 한 잔의 여유'],[1800,'켜 놓고 뭐 하세요'],[3600,'의자만 접속 중'],[10800,'AFK 장인'],[36000,'컴퓨터가 집주인']]],
 ['launches','HUD 실행','회',[[3,'또 왔네'],[10,'출석 도장 수집가'],[50,'바탕화면 단골']]],
 ['days','집계한 날짜','일',[[3,'작심삼일 성공'],[7,'일주일째 동거 중'],[30,'이쯤 되면 가족']]]
];
function achievements(stats={}){return groups.flatMap(([metric,label,unit,levels])=>levels.map(([goal,title])=>({id:'activity-'+metric+'-'+goal,title,goal,value:number(stats[metric]),unlocked:number(stats[metric])>=goal,hidden:false,category:'activity',metric,unit,description:label+' '+goal.toLocaleString('ko-KR')+unit})));}
function create({state,save,platform=process.platform,spawnFn=spawn,now=Date.now,parent=process.pid,onStatus=()=>{}}){
 state.activity=state.activity&&typeof state.activity==='object'&&!Array.isArray(state.activity)?state.activity:{};
 const s=state.activity;for(const k of ['clicks','right','wheel','distance','idle','launches','days'])s[k]=number(s[k]);
 let child=null,prev={},lastSave=now(),text='',status='off',generation=0;
 function setStatus(value){status=value;onStatus(value);}
 function day(){const d=new Date(now());const key=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();if(s.lastDay!==key){s.days++;s.lastDay=key;}}
 function accept(data){if(!data||typeof data!=='object'||['clicks','right','wheel','distance','idle'].some(k=>!Number.isFinite(data[k])||data[k]<0))return false;
  // Snapshot counters prevent chunking/duplicate samples from inflating counts.
  if(Object.keys(prev).length&&Object.keys(prev).some(k=>data[k]<prev[k]))return false;
  for(const k of ['clicks','right','wheel','distance','idle']){s[k]=Math.min(Number.MAX_SAFE_INTEGER,s[k]+data[k]-(prev[k]||0));prev[k]=data[k];}
  day();setStatus('on');if(now()-lastSave>=60000){save();lastSave=now();}return true;
 }
 function start(){if(child||state.activityEnabled===false)return;if(platform!=='win32'){setStatus('unavailable');return;}
  const mine=++generation;prev={};text='';setStatus('starting');
  try{child=spawnFn(path.join(__dirname,'ActivityCounter.exe'),[String(parent)],{windowsHide:true,stdio:['pipe','pipe','pipe']});
   child.stdin.on('error',()=>{});child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{if(mine!==generation)return;text+=chunk;if(text.length>8192){stop();setStatus('error');return;}let at;while((at=text.indexOf('\n'))>=0){const line=text.slice(0,at);text=text.slice(at+1);try{accept(JSON.parse(line));}catch{}}});
   child.stderr.on('data',()=>{});child.on('error',()=>{if(mine===generation){child=null;setStatus('error');}});child.on('exit',()=>{if(mine===generation){child=null;save();setStatus(state.activityEnabled===false?'off':'error');}});
  }catch{child=null;setStatus('error');}
 }
 function stop(){generation++;if(child){child.stdin.end();child.kill();child=null;}save();setStatus('off');}
 function enable(on){state.activityEnabled=!!on;on?start():stop();save();return info();}
 function info(){return {enabled:state.activityEnabled!==false,status,stats:{...s},achievements:achievements(s)};}
 function boot(){if(state.activityEnabled!==false){s.launches++;day();save();start();}}
 return {boot,stop,enable,info,accept};
}
module.exports={achievements,create};
