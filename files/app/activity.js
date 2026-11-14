'use strict';
const {spawn}=require('node:child_process');
const path=require('node:path');
const number=n=>Number.isFinite(n)&&n>=0?Math.min(n,Number.MAX_SAFE_INTEGER):0;
const groups=[
 ['clicks','클릭','회',[[100,'클릭 한 스푼'],[1000,'손끝 예열 완료'],[10000,'클릭 폼 올라왔다'],[50000,'클릭에 진심인 편'],[100000,'손끝이 곧 콘텐츠'],[1000000,'클릭계의 고인물']]],
 ['right','우클릭','회',[[100,'우클릭도 소중해'],[1000,'오른쪽 취향 확고'],[10000,'우클릭 맛집']]],
 ['wheel','휠 이동','칸',[[100,'스크롤 시동'],[1000,'스크롤은 못 참지'],[10000,'휠 굴러가유']]],
 ['distance','마우스 이동량','입력 단위',[[10000,'책상 위 첫걸음'],[100000,'패드 산책가'],[1000000,'마우스 택배기사'],[5000000,'책상 위 국토대장정'],[10000000,'패드가 닳도록'],[100000000,'마우스 세계일주']]],
 ['idle','60초 이상 무입력 누적','초',[[60,'잠깐 자리 비움'],[600,'커피 한 잔의 여유'],[1800,'잠깐 쉬어 가는 중'],[3600,'자리만 지키는 중'],[10800,'AFK 장인'],[36000,'쉼도 실력이지']]],
 ['launches','HUD 실행','회',[[3,'일단 켜고 생각함'],[10,'오늘도 접속 폼 좋다'],[50,'여기가 내 아지트']]],
 ['days','집계한 날짜','일',[[3,'출석 폼 올라왔다'],[7,'이제 제법 익숙한 사이'],[30,'이 정도면 정들었지']]]
];
const combos=[
 ['balance','손끝 밸런스 장인',{clicks:50000,right:5000,wheel:5000},'클릭 5만 · 우클릭 5천 · 휠 5천'],
 ['commute','패드 출근 도장',{days:14,distance:10000000},'14일 · 이동 1천만 입력 단위'],
 ['chill','할 땐 하고 쉴 땐 쉼',{clicks:100000,idle:7200},'클릭 10만 · 자리 비움 2시간'],
 ['regular','접속이 루틴이 됨',{days:30,launches:50},'30일 · 실행 50회'],
 ['tour','손목 여행 브이로그',{distance:50000000,wheel:20000},'이동 5천만 · 휠 2만'],
 ['season','계절 하나 함께함',{days:90,clicks:300000},'90일 · 클릭 30만'],
 ['cozy','오늘도 느좋 접속',{days:45,idle:18000},'45일 · 자리 비움 5시간'],
 ['artisan','꾸준함이 치트키',{days:60,clicks:500000,right:50000},'60일 · 클릭 50만 · 우클릭 5만'],
 ['long','이건 거의 장기연애',{days:180,launches:200},'180일 · 실행 200회'],
 ['legend','내 책상 세계관 완성',{clicks:2000000,distance:200000000,days:120},'클릭 200만 · 이동 2억 · 120일']
];
const gameGoals=[['gameMeters','추정 이동거리','m',[[5000,'첫 발자국은 소중해'],[50000,'이 행성 동네 한 바퀴'],[250000,'길 위의 단골손님']]],['sprintMeters','달리기 입력 중 추정 거리','m',[[3000,'일단 달리고 봄'],[30000,'발바닥에 부스터'],[150000,'행성 러닝크루 회장']]],['gameSprint','이동키+Shift 입력','초',[[3600,'달릴 준비는 됐지'],[36000,'오늘도 유산소 모드'],[180000,'달리기 버튼과 한몸']]],['gameTool','도구 사용 추정 · 좌클릭 유지','초',[[1800,'오늘도 손끝 노동'],[18000,'채집 감성 충만'],[90000,'손끝으로 지은 세계']]],['gameClicks','게임 창 좌클릭','회',[[5000,'클릭으로 여는 행성'],[50000,'행성 생활 손에 익음'],[250000,'손끝 개척자']]]];
function achievements(stats={},earned={}){
 const simple=groups.flatMap(([metric,label,unit,levels])=>levels.map(([old,title],i)=>{const goal=Math.ceil(old*(1.5+i*.15));const id='activity-'+metric+'-'+old;return {id,title,goal,value:number(stats[metric]),unlocked:!!earned[id]||number(stats[metric])>=goal,hidden:false,category:'activity',metric,unit,description:label+' '+goal.toLocaleString('ko-KR')+unit};}));
 return simple.concat(combos.map(([id,title,needs,description])=>{id='combo-'+id;const value=Math.min(100,...Object.entries(needs).map(([k,n])=>number(stats[k])/n*100));return {id,title,goal:100,value,unlocked:!!earned[id]||value>=100,hidden:false,category:'activity',metric:'combo',unit:'%',description,needs};}),gameGoals.flatMap(([metric,label,unit,levels])=>levels.map(([goal,title])=>{const id='game-'+metric+'-'+goal;return {id,title,goal,value:number(stats[metric]),unlocked:!!earned[id]||number(stats[metric])>=goal,hidden:false,category:'game',metric,unit,description:label+' '+goal.toLocaleString('ko-KR')+unit};})));
}

function create({state,save,platform=process.platform,spawnFn=spawn,now=Date.now,parent=process.pid,onStatus=()=>{}}){
 state.activity=state.activity&&typeof state.activity==='object'&&!Array.isArray(state.activity)?state.activity:{};
 const s=state.activity;for(const k of ['clicks','right','wheel','distance','idle','launches','days','gameMove','gameSprint','gameTool','gameClicks','gameMeters','sprintMeters'])s[k]=number(s[k]);
 const earned=state.activityAwards&&typeof state.activityAwards==='object'&&!Array.isArray(state.activityAwards)?state.activityAwards:{};state.activityAwards=earned;
 if(state.activityAwardsVersion!==2){for(const [k,,,levels] of groups)for(const [old]of levels)if(number(s[k])>=old)earned['activity-'+k+'-'+old]=true;state.activityAwardsVersion=2;}
 function award(){const all=achievements(s,earned);for(const a of all)if(a.unlocked)earned[a.id]=true;return all;}
 let child=null,prev={},lastSave=now(),text='',status='off',generation=0,lastPose=null,sprintHeld=false,inputAt=0;
 function setStatus(value){status=value;onStatus(value);}
 function day(){const d=new Date(now());const key=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();if(s.lastDay!==key){s.days++;s.lastDay=key;}}
 function accept(data){if(!data||typeof data!=='object'||['clicks','right','wheel','distance','idle'].some(k=>!Number.isFinite(data[k])||data[k]<0))return false;
  data={...data};for(const k of ['gameMove','gameSprint','gameTool','gameClicks']){if(data[k]===undefined)data[k]=0;if(!Number.isFinite(data[k])||data[k]<0)return false;}
  // Snapshot counters prevent chunking/duplicate samples from inflating counts.
  if(Object.keys(prev).length&&Object.keys(prev).some(k=>data[k]<prev[k]))return false;
  for(const k of ['clicks','right','wheel','distance','idle','gameMove','gameSprint','gameTool','gameClicks']){s[k]=Math.min(Number.MAX_SAFE_INTEGER,s[k]+data[k]-(prev[k]||0));prev[k]=data[k];}
  sprintHeld=data.sprintHeld===true;inputAt=now();
  day();award();setStatus('on');if(now()-lastSave>=60000){save();lastSave=now();}return true;
 }
 function start(){if(child||state.activityEnabled===false)return;if(platform!=='win32'){setStatus('unavailable');return;}
  const mine=++generation;prev={};text='';setStatus('starting');
  try{child=spawnFn(path.join(__dirname,'ActivityCounter.exe'),[String(parent)],{windowsHide:true,stdio:['pipe','pipe','pipe']});
   child.stdin.on('error',()=>{});child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{if(mine!==generation)return;text+=chunk;if(text.length>8192){stop();setStatus('error');return;}let at;while((at=text.indexOf('\n'))>=0){const line=text.slice(0,at);text=text.slice(at+1);try{accept(JSON.parse(line));}catch{}}});
   child.stderr.on('data',()=>{});child.on('error',()=>{if(mine===generation){child=null;setStatus('error');}});child.on('exit',()=>{if(mine===generation){child=null;save();setStatus(state.activityEnabled===false?'off':'error');}});
  }catch{child=null;setStatus('error');}
 }
 function stop(){generation++;lastPose=null;sprintHeld=false;if(child){child.stdin.end();child.kill();child=null;}save();setStatus('off');}
 function enable(on){state.activityEnabled=!!on;on?start():stop();save();return info();}
 function info(){return {enabled:state.activityEnabled!==false,status,stats:{...s},achievements:award()};}
 function boot(){if(state.activityEnabled!==false){s.launches++;day();award();save();start();}}
 function position(m,gameRunning){
  const t=now();if(state.activityEnabled===false||!gameRunning||!m||typeof m.w!=='string'||!Number.isFinite(m.t)||!Array.isArray(m.p)||m.p.length<3||!m.p.slice(0,3).every(Number.isFinite)){lastPose=null;return;}
  const next={w:m.w,seq:m.t,p:m.p.slice(0,3),at:t,sprint:sprintHeld&&t-inputAt<6000};const old=lastPose;lastPose=next;if(!old||old.w!==next.w||next.seq<=old.seq)return;
  const dt=(t-old.at)/1000,d=Math.hypot(...next.p.map((v,i)=>(v-old.p[i])/100));
  if(dt<=0||dt>5||d>100||d/dt>60)return;
  s.gameMeters+=d;if(old.sprint&&next.sprint)s.sprintMeters+=d;award();
 }
 return {boot,stop,enable,info,accept,position};
}
module.exports={achievements,create};
