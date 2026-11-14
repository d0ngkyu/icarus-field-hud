'use strict';
const $=id=>document.getElementById(id), token=location.hash.slice(1)||sessionStorage.getItem('solo-token');
if(token)sessionStorage.setItem('solo-token',token);history.replaceState(null,'',location.pathname);
const fields={health:['최대 체력',25],stamina:['최대 스태미나',25],weight:['무게 한도',25],speed:['이동속도',10]};
let state=null,busy=false,dirty=false;
function message(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
async function api(route,data){const r=await fetch('/api/'+route,{method:data?'POST':'GET',headers:{'X-Solo-Token':token,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});const j=await r.json();if(!r.ok)throw Error(j.error);return j;}
function values(){return Object.fromEntries(Object.keys(fields).map(k=>[k,Number($(k).value)]));}
function paint(){for(const k of Object.keys(fields)){const p=Number($(k).value),base=state?.preview[k].base||0;$(`${k}-pct`).textContent=`+${p}%`;$(`${k}-base`).textContent=base;$(`${k}-value`).textContent=Math.round(base*(1+p/100));}buttons();}
function buttons(){const blocked=busy||!state||state.running!==false||state.foreign;for(const id of ['apply','remove','restore'])$(id).disabled=blocked; $('apply').disabled||= !$('consent').checked||!!state?.conflicts?.length; $('restore').disabled||=!$('backups').value;$('refresh').disabled=busy;}
for(const [key,[label,max]] of Object.entries(fields)){
 const card=document.createElement('div');card.className='card';
 card.innerHTML=`<div class="card-head"><h3><label for="${key}">${label}</label></h3><span class="percent" id="${key}-pct">0%</span></div><input id="${key}" type="range" min="0" max="${max}" step="1" value="0"><div class="readout"><span>기본 <span id="${key}-base">—</span> → <strong id="${key}-value">—</strong></span><span>최대 +${max}%</span></div>`;
 $('sliders').append(card);$(key).addEventListener('input',()=>{dirty=true;paint();});
}
function preset(v){for(const k of Object.keys(fields))$(k).value=v[k];dirty=true;paint();}
async function refresh(preserve=false){try{state=await api('state');if(!preserve||!dirty){preset(state.values);dirty=false;}$('badge').textContent=state.running?'게임 실행 중 · 적용 잠금':state.running===false?'게임 종료 · 설정 가능':'실행 상태 확인 불가';$('path').textContent='게임: '+state.game+' · v'+state.version;$('backups').replaceChildren();for(const b of state.backups){const o=document.createElement('option');o.value=b.id;o.textContent=b.id.slice(0,19).replace('T',' ')+' UTC · '+(b.present?'이전 설정':'모드 없음');$('backups').append(o);}paint();
 if(state.foreign)message('같은 이름의 파일이 외부에서 변경됐습니다. 덮어쓰기를 차단했습니다.',true);
 else if(state.stale)message('게임이 업데이트됐습니다. 기존 모드를 해제하거나 새 기본값으로 다시 적용하세요.',true);
 else if(state.conflicts.length)message('다른 모드 확인 필요: '+state.conflicts.join(', '),true);
 else if(state.error)message(state.error,true);
 else message((state.installed?'능력치 모드가 설치돼 있습니다.':'능력치 모드가 꺼져 있습니다.')+(state.running?' 게임을 종료하면 적용·해제가 가능합니다.':' 설정을 선택하세요.'));
 }catch(e){message(e.message,true);state=null;buttons();}}
async function action(route,data,question){if(!confirm(question))return;busy=true;buttons();message('파일을 확인하고 처리하는 중입니다…');try{const r=await api(route,data);dirty=false;await refresh();message(r.message);}catch(e){message(e.message,true);}finally{busy=false;buttons();}}
$('mild').onclick=()=>preset({health:10,stamina:10,weight:10,speed:5});
$('comfort').onclick=()=>preset({health:20,stamina:20,weight:25,speed:10});
$('zero').onclick=()=>preset({health:0,stamina:0,weight:0,speed:0});
$('consent').onchange=buttons;$('backups').onchange=buttons;
$('refresh').onclick=()=>{if(!dirty||confirm('저장하지 않은 설정을 버리고 다시 읽을까요?'))refresh();};
$('apply').onclick=()=>action('apply',{values:values(),dataHash:state.dataHash,confirmed:$('consent').checked},'게임 재시작용 능력치 모드를 적용할까요?\n현재 설정은 자동 백업됩니다. 멀티플레이 전 해제가 필요합니다.');
$('remove').onclick=()=>action('remove',{},'이 프로그램의 능력치 모드를 해제할까요? 다음 실행부터 기본값을 사용합니다.');
$('restore').onclick=()=>action('restore',{id:$('backups').value},'선택한 이전 설정으로 복원할까요? 현재 설정도 먼저 백업합니다.');
$('quit').onclick=async()=>{try{const r=await api('quit',{});message(r.message);state=null;buttons();}catch(e){message(e.message,true);}};
refresh();
