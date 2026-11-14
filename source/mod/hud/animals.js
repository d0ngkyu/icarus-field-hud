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
  const model={labels,keys,normalize,thresholds,grade,compare};
  if(typeof module!=='undefined' && module.exports) module.exports=model;
  if(!root || !root.document) return;
  root.IcarusAnimals=model;
  root.mountAnimalPanel = host => {
    const doc=host.ownerDocument, storageKey='icarus.animals.v1';
    let db={animals:[],limits:{}}, current=null, observedAt=0, signature='', selected='', target='', active=false;
    try { const raw=JSON.parse(localStorage.getItem(storageKey)); if(raw){db.limits=Object.fromEntries(keys.map(k=>[k,thresholds(raw.limits?.[k])]));db.animals=(Array.isArray(raw.animals)?raw.animals:[]).slice(0,200).map(normalize).filter(Boolean);} } catch(e){}
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
      <section><h2>교배 상대 비교</h2><p class="muted">저장한 같은 종류의 암수만 비교합니다. 부모 평균이 높은 조합을 우선 보여 줍니다. <strong>새끼의 확정 수치나 확률은 아닙니다.</strong> 돌연변이·혈통·특성·육종 재능은 계산에 포함되지 않습니다.</p>
      <label>기준 동물 <select data-base></select></label><div class="animal-actions"><label>중점 스탯 <select data-target><option value="">전체 균형</option>${keys.map(k=>`<option value="${k}">${labels[k]}</option>`).join('')}</select></label><button data-delete>선택 기록 삭제</button></div><div data-pairs></div><p class="muted">저장 목록은 이 PC에 최대 200마리까지 보관합니다. 서로 다른 종류의 교배 가능 여부가 확인되지 않으면 추천하지 않습니다.</p></section></div>`;
    host.querySelector('[data-limits]').innerHTML='<table><tr><th>유전 스탯</th><th>낮음 이하</th><th>높음 이상</th></tr>'+keys.map(k=>{const t=thresholds(db.limits[k]);return `<tr><td>${labels[k]}</td><td><input aria-label="${labels[k]} 낮음" data-limit="${k}" data-bound="low" type="number" min="0" max="9" value="${t.low}"></td><td><input aria-label="${labels[k]} 높음" data-limit="${k}" data-bound="high" type="number" min="1" max="10" value="${t.high}"></td></tr>`;}).join('')+'</table>';
    function renderCurrent(){
      const fresh=current && Date.now()-observedAt<12000;
      host.querySelector('[data-save]').disabled=!fresh;
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
      const pairs=base?db.animals.map((a,i)=>({a,i,result:i!==Number(selected)?compare(base,a,target):null})).filter(x=>x.result).sort((a,b)=>b.result.score-a.result.score).slice(0,8):[];
      host.querySelector('[data-pairs]').innerHTML=pairs.length?pairs.map(({a,result},i)=>`<details${i===0?' open':''}><summary>${i+1}. ${esc(a.name)} · 부모 평균 합계 ${result.total.toFixed(1)}</summary><p class="muted">아래는 두 부모의 평균입니다. 새끼 스탯의 보장 범위가 아닙니다.</p><table>${keys.map(k=>`<tr><td>${labels[k]}</td><td class="${grade(result.means[k],db.limits[k])}">${result.means[k].toFixed(1)} <small>(${base.genes[k]} + ${a.genes[k]}) ÷ 2</small></td></tr>`).join('')}</table></details>`).join(''):'<p class="muted">같은 종류의 암컷과 수컷을 각각 저장하면 비교할 수 있습니다. 성별 미확인 동물은 제외됩니다.</p>';
    }
    host.querySelector('[data-save]').onclick=()=>{
      if(!current || Date.now()-observedAt>=12000)return;
      const old=db.animals.findIndex(a=>a.id===current.id && a.id);
      if(old<0 && db.animals.length>=200){status('저장 한도 200마리입니다. 필요 없는 기록을 삭제해 주세요.');return;}
      const next=normalize(current), previous=db.animals.slice();
      if(old>=0)db.animals[old]=next;else db.animals.push(next);
      if(!save()){db.animals=previous;return;}
      selected=String(old>=0?old:db.animals.length-1);status('동물 정보를 저장했습니다.');renderPairs();
    };
    host.querySelector('[data-base]').onchange=e=>{selected=e.target.value;renderPairs();};
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
      const next=normalize(m.animal), sig=JSON.stringify(next);observedAt=Date.now();current=next;
      if(active && sig!==signature)renderCurrent();signature=sig;
    };
    root.__animalsShown=()=>{active=true;renderCurrent();renderPairs();};
    const observer=new MutationObserver(()=>{active=host.classList.contains('on');if(active){renderCurrent();renderPairs();}});observer.observe(host,{attributes:true,attributeFilter:['class']});
    // No background rendering. A cheap freshness check runs only for an open tab.
    setInterval(()=>{if(active && current && Date.now()-observedAt>=12000){current=null;signature='';renderCurrent();}},3000);
    renderCurrent();renderPairs();
  };
})(typeof window==='undefined'?null:window);
