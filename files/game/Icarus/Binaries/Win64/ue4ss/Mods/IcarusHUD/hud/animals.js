(function (root) {
  'use strict';
  const labels = { Vitality:'활력 (VIR)', Endurance:'체력 (FIT)', Muscle:'체격 (PHY)', Agility:'반사 (REF)', Hardiness:'적응 (ADP)', Toughness:'강인함 (TGH)', Utility:'본능 (INS)' };
  const keys = Object.keys(labels);
  const clean = s => typeof s === 'string' ? s.slice(0, 300) : '';
  function normalize(a) {
    if (!a || typeof a !== 'object' || !clean(a.species) || !a.genes) return null;
    const genes = {};
    for (const k of keys) {
      const v = a.genes[k];
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 10) return null;
      genes[k] = v;
    }
    const stats = {};
    for (const k of ['Health','Stamina','MeleeDamage','MovementSpeed','SprintSpeed','WeightCapacity']) if (typeof a.stats?.[k] === 'string') stats[k] = clean(a.stats[k]);
    return { id:clean(a.id), name:clean(a.name)||'이름 없는 동물', species:clean(a.species), sex:[1,2].includes(a.sex)?a.sex:0, genes, stats };
  }
  function thresholds(t) {
    return t && Number.isInteger(t.low) && Number.isInteger(t.high) && t.low >= 0 && t.low < t.high && t.high <= 10 ? {low:t.low, high:t.high} : {low:3,high:8};
  }
  const grade = (n,t) => { t=thresholds(t); return n<=t.low?'low':n>=t.high?'high':'normal'; };
  function compare(a,b,target) {
    a=normalize(a); b=normalize(b);
    if (!a || !b || a.species!==b.species || !a.sex || !b.sex || a.sex===b.sex || (a.id && a.id===b.id)) return null;
    const means={};let weighted=0,weight=0;
    for(const k of keys){means[k]=(a.genes[k]+b.genes[k])/2;const w=k===target?3:1;weighted+=means[k]*w;weight+=w;}
    // Parent means are a transparent comparison heuristic, not a distribution
    // of offspring: mutation, talents and inheritance rules are not verified.
    return {means,score:weighted/weight,total:keys.reduce((s,k)=>s+means[k],0)};
  }
  function observation(a,b,child,context) {
    a=normalize(a);b=normalize(b);child=normalize(child);context=clean(context).trim();
    if(!a||!b||!child||!context||!compare(a,b)||!a.id||!b.id||!child.id||child.species!==a.species||[a.id,b.id].includes(child.id))return null;
    return {mother:a.sex===1?a:b,father:a.sex===2?a:b,child,context};
  }
  function observedRate(records,a,b,limits,context) {
    a=normalize(a);b=normalize(b);context=clean(context).trim();
    if(!a||!b||!compare(a,b)||!context)return null;
    const mother=a.sex===1?a:b,father=a.sex===2?a:b,seen=new Set(),samples=[];
    for(const raw of Array.isArray(records)?records:[]){
      const r=raw&&observation(raw.mother,raw.father,raw.child,raw.context);
      if(!r||seen.has(r.child.id)||r.context!==context||r.mother.species!==mother.species)continue;
      if(!keys.every(k=>r.mother.genes[k]===mother.genes[k]&&r.father.genes[k]===father.genes[k]))continue;
      seen.add(r.child.id);samples.push(r.child);
    }
    const n=samples.length, stats={};
    for(const k of keys){const goal=thresholds(limits?.[k]).high,hits=samples.filter(c=>c.genes[k]>=goal).length;stats[k]={goal,hits,percent:n?hits/n*100:null};}
    const hits=samples.filter(c=>keys.every(k=>c.genes[k]>=stats[k].goal)).length;
    return {n,stats,all:{hits,percent:n?hits/n*100:null}};
  }
  const model={labels,keys,normalize,thresholds,grade,compare,observation,observedRate};
  if(typeof module!=='undefined' && module.exports) module.exports=model;
  if(!root || !root.document) return;
  root.IcarusAnimals=model;
  root.mountAnimalPanel = host => {
    const doc=host.ownerDocument, storageKey='icarus.animals.v1';
    let db={animals:[],limits:{},observations:[]}, current=null, observedAt=0, signature='', selected='', target='', active=false;
    try { const raw=JSON.parse(localStorage.getItem(storageKey)); if(raw){db.limits=Object.fromEntries(keys.map(k=>[k,thresholds(raw.limits?.[k])]));db.animals=(Array.isArray(raw.animals)?raw.animals:[]).slice(0,200).map(normalize).filter(Boolean);} } catch(e){}
    try {const raw=JSON.parse(localStorage.getItem(storageKey));db.context=clean(raw?.context)||'기본';db.observations=(Array.isArray(raw?.observations)?raw.observations:[]).slice(0,2000).map(r=>r&&observation(r.mother,r.father,r.child,r.context)).filter(Boolean);}catch(e){}
    const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const sex=a=>a.sex===1?'암컷':a.sex===2?'수컷':'성별 미확인';
    const names={low:'낮음',normal:'보통',high:'높음'};
    const statNames={Health:'체력',Stamina:'스태미나',MeleeDamage:'근접 공격력',MovementSpeed:'이동 속도',SprintSpeed:'질주 속도',WeightCapacity:'운반 중량'};
    const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(db));return true;}catch(e){status('저장 공간이 부족해 저장하지 못했습니다.');return false;}};
    const status=s=>{host.querySelector('[data-status]').textContent=s;};
    const style=doc.createElement('style');style.textContent=`
      #pane-animals{padding:16px;overflow:auto}#pane-animals .animal-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:14px}
      #pane-animals table{width:100%;border-collapse:collapse}#pane-animals th,#pane-animals td{padding:8px 5px;text-align:left;border-bottom:1px solid #ffffff16}
      #pane-animals .low{color:#f29583}#pane-animals .normal{color:#dbc99a}#pane-animals .high{color:#6dd7a5}
      #pane-animals meter{width:85px}#pane-animals input[type=number]{width:60px}#pane-animals select{max-width:100%}
      #pane-animals .muted{color:#a5b2bd;font-size:12px;line-height:1.6}#pane-animals .animal-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
      @media(max-width:850px){#pane-animals .animal-grid{grid-template-columns:1fr}}`;
    doc.head.appendChild(style);
    host.innerHTML=`<div class="animal-grid"><section><h2>동물 상세</h2><p class="muted">게임에서 동물의 상세창을 열면 약 3초 안에 표시됩니다. 교배 비교는 유전 스탯을 사용하며, 장비·레벨·버프가 반영된 전투 수치와 구분합니다.</p><p data-status role="status"></p><div data-current></div><div class="animal-actions"><button data-save>현재 동물 저장</button></div><details><summary>스탯별 색상 기준</summary><p class="muted">각 수치 이하를 낮음, 이상을 높음으로 표시합니다. 사이 값은 보통입니다. 내 비교 기준이며 게임 공식 등급이 아닙니다.</p><div data-limits></div></details></section>
      <section><h2>교배 상대 비교</h2><p class="muted">저장한 같은 종류의 암수만 비교합니다. 순서는 부모 평균 기준입니다. <strong>퍼센트는 기록한 새끼의 관측 달성률입니다.</strong> 부모 평균 자체는 확률이 아니며, 유전 공식으로 계산한 예측도 아닙니다.</p>
      <label>기준 동물 <select data-base></select></label><div class="animal-actions"><label>중점 스탯 <select data-target><option value="">전체 균형</option>${keys.map(k=>`<option value="${k}">${labels[k]}</option>`).join('')}</select></label><button data-delete>선택 기록 삭제</button></div><div data-pairs></div><p class="muted">저장 목록은 이 PC에 최대 200마리까지 보관합니다. 서로 다른 종류의 교배 가능 여부가 확인되지 않으면 추천하지 않습니다.</p></section></div>`;
    host.querySelector('[data-limits]').innerHTML='<table><tr><th>유전 스탯</th><th>낮음 이하</th><th>높음 이상</th></tr>'+keys.map(k=>{const t=thresholds(db.limits[k]);return `<tr><td>${labels[k]}</td><td><input aria-label="${labels[k]} 낮음" data-limit="${k}" data-bound="low" type="number" min="0" max="9" value="${t.low}"></td><td><input aria-label="${labels[k]} 높음" data-limit="${k}" data-bound="high" type="number" min="1" max="10" value="${t.high}"></td></tr>`;}).join('')+'</table>';
    host.querySelector('[data-pairs]').insertAdjacentHTML('beforebegin',`<div><label>관측 조건 이름 <input data-context maxlength="100" value="${esc(db.context||'기본')}" aria-label="관측 조건 이름"></label><p class="muted">게임 버전·교배 재능·혈통 등 조건이 바뀌면 이름을 바꾸세요. 같은 조건 이름·종류·부모 7개 유전 수치가 일치하는 기록만 집계합니다. 목표는 각 스탯의 ‘높음 이상’ 기준입니다.</p></div>
      <details><summary>태어난 새끼 관측 기록</summary><p class="muted">위 기준 동물과 아래 상대를 부모로 선택한 뒤, 태어난 새끼의 상세창을 여세요. 부모 정보는 교배 당시 값으로 저장해 두세요. 좋은 결과와 나쁜 결과 모두 기록해야 편향을 줄일 수 있습니다.</p><label>다른 부모 <select data-partner></select></label><p><label><input type="checkbox" data-confirm>지금 상세창의 동물이 이 부모에게 태어난 새끼임을 확인</label></p><button data-record>현재 새끼 결과 기록</button> <button data-undo>마지막 관측 삭제</button><p data-observation-count class="muted"></p></details>`);
    const context=()=>host.querySelector('[data-context]').value.trim();
    const percentage=(p,hits,n)=>n?`${p.toFixed(1)}% (${hits}/${n}마리)`:'관측 부족 (0마리)';
    function rateTable(base,partner){
      const r=observedRate(db.observations,base,partner,db.limits,context());
      if(!r)return '<p class="muted">관측 조건 이름을 입력해 주세요.</p>';
      return `<h4>관측 추정치 · ${r.n}마리${r.n>0&&r.n<30?' · 표본 적음':''}</h4><table><tr><th>목표</th><th>관측 달성률</th></tr>${keys.map(k=>`<tr><td>${labels[k]} ${r.stats[k].goal} 이상</td><td>${percentage(r.stats[k].percent,r.stats[k].hits,r.n)}</td></tr>`).join('')}<tr><td>7개 목표 모두 달성</td><td>${percentage(r.all.percent,r.all.hits,r.n)}</td></tr></table><p class="muted">실제 새끼 기록의 성공 비율입니다. 100% 관측도 다음 새끼의 성공을 보장하지 않습니다. 조건 이름에 포함하지 않은 차이는 보정하지 않습니다.</p>`;
    }
    function renderCurrent(){
      const fresh=current && Date.now()-observedAt<12000;
      host.querySelector('[data-save]').disabled=!fresh;
      host.querySelector('[data-record]').disabled=!fresh;
      if(!fresh){host.querySelector('[data-current]').textContent='동물 상세창에서 읽은 최신 정보가 없습니다. 상세창을 열어 주세요.';return;}
      const a=current;
      host.querySelector('[data-current]').innerHTML=`<h3>${esc(a.name)} · ${sex(a)}</h3><p class="muted">종류: ${esc(a.species)} · 유전 합계 ${keys.reduce((s,k)=>s+a.genes[k],0)}</p><table><tr><th>유전 스탯</th><th>수치</th><th>내 기준</th></tr>${keys.map(k=>{const g=grade(a.genes[k],db.limits[k]);return `<tr><td>${labels[k]}</td><td>${a.genes[k]} / 10</td><td class="${g}">${names[g]} <meter min="0" max="10" value="${a.genes[k]}"></meter></td></tr>`;}).join('')}</table><h3>상세창의 현재 능력치</h3>${Object.keys(a.stats).length?'<table>'+Object.entries(a.stats).map(([k,v])=>`<tr><td>${statNames[k]}</td><td>${esc(v)}</td></tr>`).join('')+'</table>':'<p class="muted">현재 능력치는 아직 읽지 못했습니다.</p>'}`;
    }
    function renderPairs(){
      const select=host.querySelector('[data-base]');
      select.innerHTML='<option value="">동물을 저장하고 선택하세요</option>'+db.animals.map((a,i)=>`<option value="${i}">${esc(a.name)} (${sex(a)} · ${esc(a.species)})</option>`).join('');
      select.value=selected;
      const base=selected===''?null:db.animals[Number(selected)];
      host.querySelector('[data-delete]').disabled=!base;
      const partnerSelect=host.querySelector('[data-partner]'),oldPartner=partnerSelect.value;
      partnerSelect.innerHTML='<option value="">부모를 선택하세요</option>'+db.animals.map((a,i)=>base&&compare(base,a)?`<option value="${i}">${esc(a.name)} (${sex(a)})</option>`:'').join('');partnerSelect.value=oldPartner;
      host.querySelector('[data-observation-count]').textContent=`저장된 관측 ${db.observations.length}/2000마리 · 같은 새끼 중복 기록 제외`;
      host.querySelector('[data-undo]').disabled=!db.observations.length;
      const pairs=base?db.animals.map((a,i)=>({a,i,result:i!==Number(selected)?compare(base,a,target):null})).filter(x=>x.result).sort((a,b)=>b.result.score-a.result.score).slice(0,8):[];
      host.querySelector('[data-pairs]').innerHTML=pairs.length?pairs.map(({a,result},i)=>`<details${i===0?' open':''}><summary>${i+1}. ${esc(a.name)} · 부모 평균 합계 ${result.total.toFixed(1)}</summary>${rateTable(base,a)}<p class="muted">아래는 두 부모의 평균입니다. 새끼 스탯의 보장 범위가 아닙니다.</p><table>${keys.map(k=>`<tr><td>${labels[k]}</td><td class="${grade(result.means[k],db.limits[k])}">${result.means[k].toFixed(1)} <small>(${base.genes[k]} + ${a.genes[k]}) ÷ 2</small></td></tr>`).join('')}</table></details>`).join(''):'<p class="muted">같은 종류의 암컷과 수컷을 각각 저장하면 비교할 수 있습니다. 성별 미확인 동물은 제외됩니다.</p>';
    }
    host.querySelector('[data-context]').oninput=()=>{db.context=context();renderPairs();};
    host.querySelector('[data-context]').onchange=()=>save();
    const clearConfirmation=()=>{host.querySelector('[data-confirm]').checked=false;};
    host.querySelector('[data-partner]').onchange=clearConfirmation;
    host.querySelector('[data-record]').onclick=()=>{
      const p=host.querySelector('[data-partner]').value;
      if(!current||Date.now()-observedAt>=12000||selected===''||p===''||!host.querySelector('[data-confirm]').checked){status('부모 둘과 최신 새끼 상세창을 확인하고 체크해 주세요.');return;}
      const r=observation(db.animals[Number(selected)],db.animals[Number(p)],current,context());
      if(!r){status('종류·성별·부모와 새끼 식별 정보·관측 조건을 확인해 주세요.');return;}
      if(db.observations.some(x=>x.child.id===r.child.id)){status('이미 기록한 새끼입니다. 재접속 뒤에도 같은 새끼를 다시 기록하지 마세요.');return;}
      if(db.observations.length>=2000){status('관측 저장 한도 2000마리입니다.');return;}
      db.observations.push(r);if(!save()){db.observations.pop();return;}clearConfirmation();status('새끼 관측을 기록하고 달성률을 갱신했습니다.');renderPairs();
    };
    host.querySelector('[data-undo]').onclick=()=>{if(!db.observations.length)return;const r=db.observations.pop();if(!save()){db.observations.push(r);return;}status('마지막 새끼 관측을 삭제했습니다.');renderPairs();};
    host.querySelector('[data-save]').onclick=()=>{
      if(!current || Date.now()-observedAt>=12000)return;
      const old=db.animals.findIndex(a=>a.id===current.id && a.id);
      if(old<0 && db.animals.length>=200){status('저장 한도 200마리입니다. 필요 없는 기록을 삭제해 주세요.');return;}
      const next=normalize(current), previous=db.animals.slice();
      if(old>=0)db.animals[old]=next;else db.animals.push(next);
      if(!save()){db.animals=previous;return;}
      selected=String(old>=0?old:db.animals.length-1);status('동물 정보를 저장했습니다.');renderPairs();
    };
    host.querySelector('[data-base]').onchange=e=>{selected=e.target.value;clearConfirmation();renderPairs();};
    host.querySelector('[data-target]').onchange=e=>{target=e.target.value;renderPairs();};
    host.querySelector('[data-delete]').onclick=()=>{if(selected==='')return;const previous=db.animals.slice();db.animals.splice(Number(selected),1);if(!save()){db.animals=previous;return;}selected='';renderPairs();};
    host.querySelector('[data-limits]').onchange=e=>{
      const k=e.target.dataset.limit;if(!keys.includes(k))return;
      const inputs=[...host.querySelectorAll('[data-limit]')].filter(x=>x.dataset.limit===k);
      const t=Object.fromEntries(inputs.map(x=>[x.dataset.bound,x.value===''?NaN:Number(x.value)]));
      if(!Number.isInteger(t.low)||!Number.isInteger(t.high)||t.low<0||t.high>10||t.low>=t.high){status('낮음 기준은 높음보다 작아야 하며 0~10 정수여야 합니다.');return;}
      const prior=db.limits[k];db.limits[k]=t;if(!save()){db.limits[k]=prior;return;}status('색상 기준을 저장했습니다.');renderCurrent();renderPairs();
    };
    root.__animalIngest=m=>{
      if(!Object.prototype.hasOwnProperty.call(m,'animal'))return;
      const next=normalize(m.animal), sig=JSON.stringify(next);if(next?.id!==current?.id)clearConfirmation();observedAt=Date.now();current=next;
      if(active && sig!==signature)renderCurrent();signature=sig;
    };
    root.__animalsShown=()=>{active=true;renderCurrent();renderPairs();};
    const observer=new MutationObserver(()=>{active=host.classList.contains('on');if(active){renderCurrent();renderPairs();}});observer.observe(host,{attributes:true,attributeFilter:['class']});
    // No background rendering. A cheap freshness check runs only for an open tab.
    setInterval(()=>{if(active && current && Date.now()-observedAt>=12000){current=null;signature='';renderCurrent();}},3000);
    renderCurrent();renderPairs();
  };
})(typeof window==='undefined'?null:window);
