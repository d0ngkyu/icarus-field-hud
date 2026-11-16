(function(root){'use strict';
 if(!root.document)return;
 root.HudOptimization={mount({nav,grid,settings}){
  const section=document.createElement('section');section.hidden=true;section.innerHTML=`<details class="settings-group" open><summary class="category-heading">게임 최적화</summary>
  <div class="opt-guide"><h3>딱 한 번, 이 순서대로 해 주세요</h3><ol>
  <li><strong>이카루스를 완전히 꺼 주세요.</strong> 로비로 나가기만 하면 아직 켜져 있어요. 서버장이라면 친구들에게 알리고, 게임 안에서 정상 종료해 주세요.</li>
  <li><strong>바탕화면에서 HUD만 켜 주세요.</strong> 게임은 아직 켜지 마세요.</li>
  <li><strong>아래 버튼 중 하나만 한 번 눌러 주세요.</strong> 내가 방을 열면 ‘서버장용’, 친구 방에 들어가면 ‘개인용’이에요.</li>
  <li><strong>선택한 쪽이 초록색이면 게임을 켜 주세요.</strong> 다른 쪽은 미적용이어도 괜찮아요. 둘 다 누를 필요 없어요.</li>
  </ol><p class="hint">한 번 적용하면 설정이 유지돼요. 게임을 켤 때마다 누르지 않아도 됩니다.</p></div>
  <div class="opt-cards"><article><h3>서버장용</h3><p>내 PC에서 월드를 열 때. 그림자는 최대 낮음, 후처리·효과는 최대 보통, 최대 60 FPS로 화면 처리 부담을 줄입니다.</p><button data-mode="host">서버장 최적화 적용</button><span data-status="host" class="opt-state" role="status">● 미적용</span></article>
  <article><h3>개인용</h3><p>친구 서버에 접속할 때. 그림자는 최대 보통, 후처리·효과는 최대 높음, 최대 90 FPS로 조절합니다.</p><button data-mode="personal">개인 최적화 적용</button><span data-status="personal" class="opt-state" role="status">● 미적용</span></article></div>
  <details class="opt-guide"><summary>누르기 전 주의사항 · 문제가 생겼을 때</summary><ul>
  <li><strong>두 버튼을 번갈아 누르지 마세요.</strong> 효과가 더해지지 않고, 마지막에 고른 설정으로 바뀌어요. 다른 모드로 바꿀 때도 게임부터 완전히 꺼 주세요.</li>
  <li><strong>‘처리 중’에는 기다려 주세요.</strong> 끝나기 전에 게임을 켜거나 게임 설정 파일을 바꾸지 마세요.</li>
  <li><strong>게임 안에서 그래픽 설정을 바꾸면</strong> HUD에 ‘설정 변경됨’이 뜰 수 있어요. 게임을 끄고 ‘적용 상태 확인’을 눌러 주세요.</li>
  <li><strong>빨간색이나 오류가 뜨면</strong> 계속 누르지 말고, 아래 오류 문구를 확인해 주세요. ‘별도로 바꾼 설정’이라고 나오면 덮어쓰지 않도록 멈춘 상태예요.</li>
  <li><strong>적용 뒤 로딩이 오래 걸리거나 화면이 이상하면</strong> 게임을 정상 종료하고 HUD에서 ‘변경 전으로 복원’을 눌러 주세요. 복원도 실패하면 오류 문구를 알려 주세요.</li>
  </ul><p class="hint">설정을 바꾸기 전에는 자동으로 백업해요. 로딩 문제의 원인이 항상 최적화인 것은 아니며, 복원이 해결을 보장하지는 않아요.</p></details>
  <div class="bt"><button data-action="hardware">내 사양으로 추천</button><button data-action="status">적용 상태 확인</button><button data-action="restore">변경 전으로 복원</button><button data-action="force-restore" hidden title="일반 복원이 거부될 때만 나타납니다. 최적화가 바꾼 항목만 첫 적용 전 백업 값으로 되돌리고, 지금 설정 파일은 사본으로 남깁니다.">백업으로 강제 복원</button></div>
  <p data-hardware class="hint"></p><p data-result role="status" class="opt-state">● 설정 확인 중</p><p data-backup class="hint"></p>
  <p class="hint">🟢 선택한 설정이 저장됐어요 · 🟡 아래 안내를 확인해 주세요 · 🔴 오류 문구를 확인해 주세요. 초록색은 렉이 없어졌다는 뜻이 아니에요.</p>
  <details><summary>무엇이 바뀌나요?</summary><p class="hint">내 PC의 그림자·효과와 최대 FPS를 조절합니다. 서버장용도 서버원 PC까지 바꾸지는 않습니다. 지형·테셀레이션·표시 거리·수풀 품질·동물 AI·월드 저장은 바꾸지 않습니다. 원래 설정보다 품질·FPS 제한을 높이지 않으며, 두 모드는 첫 적용 전 설정을 기준으로 계산합니다. 모든 끊김이 사라지는 것은 아닙니다.</p></details>
  <h3>적용 전후 직접 비교</h3><p class="hint">같은 기지·시야·접속 인원에서 가만히 서서 각각 측정하세요. 적용 전 측정 → 게임 종료 → 최적화 → 재접속 → 같은 자리에서 적용 후 측정. 약 10~40초 동안만 수집합니다.</p>
  <div class="bt"><button data-sample="before">적용 전 측정</button><button data-sample="after">적용 후 측정</button></div><div data-measures></div>
  <p class="hint">CPU는 전체 논리 CPU 대비 게임 사용률, RAM은 게임 작업 집합, GPU는 게임의 가장 바쁜 3D 엔진 사용률입니다. 낮아졌다는 것만으로 성능 향상은 확정할 수 없습니다. FPS·프레임타임·잔끊김은 현재 자동 측정을 지원하지 않습니다.</p>
  </details>`;grid.append(section);settings.push(section);
  const button=document.createElement('button');button.textContent='게임 최적화';nav.append(button);button.onclick=()=>{settings.forEach(s=>s.hidden=s!==section);nav.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===button));section.querySelector('details').open=true;refresh()};
  const style=document.createElement('style');style.textContent='.opt-guide{border:1px solid var(--ln);border-radius:10px;padding:12px 16px;margin:12px 0}.opt-guide h3{margin:0 0 8px}.opt-guide ol,.opt-guide ul{padding-left:22px;margin:8px 0}.opt-guide li{line-height:1.7;margin:8px 0}.opt-guide summary{cursor:pointer;font-weight:600}.opt-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.opt-cards article{border:1px solid var(--ln);border-radius:10px;padding:14px}.opt-cards p{min-height:70px}.opt-state{display:block;margin:8px 0;font-weight:600}.opt-state[data-color=green]{color:#7ddba5}.opt-state[data-color=yellow]{color:#f0cf76}.opt-state[data-color=red]{color:#ff9b9b}[data-measures] table{width:100%;margin-top:12px}[data-backup]{overflow-wrap:anywhere}@media(max-width:800px){.opt-cards{grid-template-columns:1fr}}';document.head.append(style);
  const $=s=>section.querySelector(s),app=root.hudApp;let busy=false,last=null,results={};
  function say(message,color='yellow'){const e=$('[data-result]');e.textContent=({'green':'● ','red':'✕ '}[color]||'● ')+message;e.dataset.color=color}
  // Only an in-flight request locks apply. Backend rechecks game state on every click.
  // A stale canWrite=false must not prevent a retry after the game has exited.
  function controls(){section.querySelectorAll('button').forEach(b=>b.disabled=busy||!app?.optimization);$('[data-action="restore"]').disabled=busy||!app?.optimization||!last?.canRestore;const f=$('[data-action="force-restore"]');if(f)f.hidden=!last?.canForce;}
  function paint(s){
    last=s;if(s.measurements){results=s.measurements;measures();}say(s.message,s.color);
    for(const mode of ['host','personal']){
      const e=$('[data-status="'+mode+'"]');let color='yellow',label='미적용 · 적용 가능';
      if(s.color==='red'){color='red';label=s.message||'확인 실패 · 다시 시도하세요.';}
      else if(s.mode===mode){color=s.color;label=s.color==='green'?'설정 일치 · 다음 게임 실행부터 적용':'설정 변경됨 · 다시 확인하세요.';}
      else if(!s.canWrite)label='게임 실행 중 또는 확인 불가 · 종료 후 다시 눌러 주세요.';
      e.dataset.color=color;e.textContent=(color==='red'?'✕ ':'● ')+label;
    }
    $('[data-backup]').textContent=s.backup?'백업: '+s.backup:'';
    if(s.running)say(s.message+' · 게임을 완전히 종료한 뒤 HUD만 열어 적용하세요.',s.color);
    controls();
  }
  function failure(e){say(e.message,'red');for(const mode of ['host','personal']){const el=$('[data-status="'+mode+'"]');el.dataset.color='red';el.textContent='✕ 확인 실패 · '+e.message;}}
  async function refresh(){
    if(busy)return;if(!app?.optimization){say('데스크톱 HUD를 최신 버전으로 업데이트해 주세요.');controls();return;}
    busy=true;controls();try{paint(await app.optimization('status'));}catch(e){failure(e);}finally{busy=false;controls();}
  }
  async function act(action){
    if(busy)return;busy=true;controls();say('처리 중…');
    try{const r=await app.optimization(action);if(action==='hardware'){$('[data-hardware]').textContent=r.cpu+' · RAM '+r.ramGB+' GB · '+r.gpu.join(', ')+' · 추천: '+(r.recommendation==='host'?'부담을 더 줄이는 서버장 프리셋':'개인용 프리셋')+'. '+r.reason;say('사양 확인 완료. 원하는 프리셋 버튼을 눌러 적용하세요.');}else paint(r);}
    catch(e){failure(e);}finally{busy=false;controls();}
  }
  section.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>act(b.dataset.mode));
  section.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>b.dataset.action==='status'?refresh():act(b.dataset.action));
  root.addEventListener('focus',()=>{if(!section.hidden&&section.offsetParent!==null)refresh();});
  function measures(){const fields=[['cpuPercent','게임 CPU','%'],['ramMB','게임 RAM','MB'],['gpu3DPercent','GPU 3D','%']];const table=document.createElement('table');for(const row of [['측정 항목','적용 전','적용 후','차이'],...fields.map(([k,n,u])=>[n,...['before','after'].map(t=>Number.isFinite(results[t]?.[k])?results[t][k]+' '+u:'측정 없음/불가'),Number.isFinite(results.before?.[k])&&Number.isFinite(results.after?.[k])?((results.after[k]-results.before[k]).toFixed(1))+' '+(u==='%'?'%p':u):'—'])]){const tr=table.insertRow();row.forEach(v=>tr.insertCell().textContent=v)}const dates=document.createElement('p');dates.className='hint';dates.textContent=['before','after'].map(t=>(t==='before'?'전: ':'후: ')+(results[t]?.at?new Date(results[t].at).toLocaleString():'측정 없음')).join(' · ');$('[data-measures]').replaceChildren(table,dates)}
  section.querySelectorAll('[data-sample]').forEach(b=>b.onclick=async()=>{
    if(busy)return;busy=true;controls();say('측정 중… 같은 자리와 시야를 유지해 주세요.');
    try{results[b.dataset.sample]=await app.optimization('sample-'+b.dataset.sample);measures();say('측정 완료. 수치 감소는 참고용이며 FPS 개선 확정은 아닙니다.');}
    catch(e){say(e.message,'red');}finally{busy=false;controls();}
  });measures();controls();
 }};
})(typeof globalThis==='object'?globalThis:this);
