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
  // Independent approximate model of the rules reported by GamesOMG's analysis
  // of server build 25956137 (2026-10-22). Not locally verified engine code.
  // Continuous reservoir odds approximate the engine's finite random stream.
  const birthOrder=['Vitality','Endurance','Muscle','Agility','Toughness','Hardiness','Utility'];
  function simulateGenes(mother,father,mutation=0,trials=12000,seed=123456789,goals=[8,8,8,8,8,8,8]){
    if(!Array.isArray(mother)||!Array.isArray(father)||mother.length!==7||father.length!==7||![...mother,...father].every(v=>Number.isInteger(v)&&v>=0&&v<=10))throw Error('Invalid genes');
    if(!Number.isFinite(mutation)||mutation<0||mutation>100||!Number.isInteger(trials)||trials<1||trials>50000)throw Error('Invalid simulation options');
    const weights=mother.map((v,i)=>v+father[i]),prob=new Array(7).fill(0);
    let total=0;
    for(let i=0;i<7;i++){const next=total+weights[i],keep=total/(next+1);for(let j=0;j<i;j++)prob[j]*=keep;prob[i]=1-keep;total=next;}
    const cumulative=[];prob.reduce((sum,p,i)=>(cumulative[i]=sum+p),0);
    if(!Array.isArray(goals)||goals.length!==7||!goals.every(v=>Number.isInteger(v)&&v>=0&&v<=10))throw Error('Invalid goals');
    const base=Math.ceil(total/2),hist=Array.from({length:7},()=>Array(11).fill(0));
    const parentQuality=[mother,father].map(g=>({floor:Math.min(...g),total:g.reduce((a,b)=>a+b,0)})).sort((a,b)=>b.floor-a.floor||b.total-a.total)[0];
    let state=seed>>>0||1,unfinished=0,improved=0,allGoals=0;
    const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296};
    for(let t=0;t<trials;t++){
      const mut=random()<mutation/100?3:0,bonusRoll=random();
      let remaining=Math.max(12,Math.min(60,base+mut+(bonusRoll<3/101?3:bonusRoll<10/101?1:0)));
      const genes=new Array(7).fill(0);
      for(let round=0;remaining&&round<300;round++){const r=random();let k=0;while(k<6&&r>=cumulative[k])k++;if(genes[k]<10){genes[k]++;remaining--;}}
      if(remaining)unfinished++;
      for(let k=0;k<7;k++)hist[k][genes[k]]++;
      const floor=Math.min(...genes),sum=genes.reduce((a,b)=>a+b,0);
      if(floor>parentQuality.floor||(floor===parentQuality.floor&&sum>parentQuality.total))improved++;
      if(genes.every((v,k)=>v>=goals[k]))allGoals++;
    }
    return {hist,trials,unfinished,improved,allGoals,parentQuality,maxPoints:Math.max(12,Math.min(60,base+(mutation>0?3:0)+3))};
  }
  function birthEstimate(a,b,mutation=0,trials=12000){
    a=normalize(a);b=normalize(b);if(!a||!b||!compare(a,b))return null;
    return simulateGenes(birthOrder.map(k=>a.genes[k]),birthOrder.map(k=>b.genes[k]),mutation,trials);
  }
  function birthChance(result,key,goal,mode='atleast'){
    const i=birthOrder.indexOf(key);if(!result||i<0||!Number.isInteger(goal)||goal<0||goal>10||!['atleast','exact'].includes(mode))return null;
    const counts=result.hist[i],hits=mode==='exact'?counts[goal]:counts.slice(goal).reduce((a,b)=>a+b,0),n=result.trials;
    const percent=hits/n*100,margin=1.96*Math.sqrt(percent/100*(1-percent/100)/n)*100;
    const likely=counts.indexOf(Math.max(...counts));
    return {percent,hits,n,margin,likely,likelyPercent:counts[likely]/n*100};
  }
  const model={labels,keys,normalize,thresholds,grade,compare,observation,observedRate,birthOrder,simulateGenes,birthEstimate,birthChance};
  if(typeof module!=='undefined' && module.exports) module.exports=model;
  if(!root || !root.document) return;
  root.IcarusAnimals=model;
  root.mountAnimalPanel = host => {
    const doc=host.ownerDocument, storageKey='icarus.animals.v1';
    let db={animals:[],limits:{},observations:[]}, current=null, observedAt=0, signature='', selected='', target='', active=false, filter='', pairTimer=null, rankKey='', rankGeneration=0, rankings=null;
    try { const raw=JSON.parse(localStorage.getItem(storageKey)); if(raw){db.limits=Object.fromEntries(keys.map(k=>[k,thresholds(raw.limits?.[k])]));db.animals=(Array.isArray(raw.animals)?raw.animals:[]).slice(0,200).map(normalize).filter(Boolean);} } catch(e){}
    try {const raw=JSON.parse(localStorage.getItem(storageKey));db.context=clean(raw?.context)||'기본';db.mutation=Number.isFinite(raw?.mutation)?Math.max(0,Math.min(100,raw.mutation)):0;db.observations=(Array.isArray(raw?.observations)?raw.observations:[]).slice(0,2000).map(r=>r&&observation(r.mother,r.father,r.child,r.context)).filter(Boolean);}catch(e){}
    const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const sex=a=>a.sex===1?'암컷':a.sex===2?'수컷':'성별 미확인';
    const names={low:'낮음',normal:'보통',high:'높음'};
    const statNames={Health:'체력',Stamina:'스태미나',MeleeDamage:'근접 공격력',MovementSpeed:'이동 속도',SprintSpeed:'질주 속도',WeightCapacity:'운반 중량'};
    const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(db));return true;}catch(e){status('저장 공간이 부족해 저장하지 못했습니다.');return false;}};
    const status=s=>{host.querySelector('[data-status]').textContent=s;};
    const style=doc.createElement('style');style.textContent=`
      #pane-animals{padding:18px;overflow:auto;max-width:1600px;margin:auto}
      #pane-animals .animal-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:4px 0 18px}#pane-animals .animal-head h1{font-size:24px;color:var(--tx,#e6ebee);margin:0}#pane-animals .animal-head p{margin:4px 0}
      #pane-animals section{padding:20px;clip-path:none;border-radius:8px;background:linear-gradient(130deg,#15212a,#10171d)}#pane-animals section>h2{font-size:15px;color:#ffc56b;letter-spacing:.02em}#pane-animals section>h2::before{content:none}
      #pane-animals button{min-height:34px;padding:6px 12px;border-radius:5px;font-size:13px}#pane-animals button.primary{background:#eaa03c;border-color:#eaa03c;color:#111820;font-weight:700}#pane-animals button:disabled{opacity:.4;cursor:not-allowed}
      #pane-animals input:not([type=checkbox]),#pane-animals select{background:#0b1218;color:#e5edf3;border:1px solid #344550;padding:8px 10px;border-radius:5px;min-height:36px}#pane-animals select{width:100%}#pane-animals label{display:block;color:#b7c7d2;font-size:13px}#pane-animals label select{margin-top:5px}
      #pane-animals details{border:1px solid #2b3d48;border-radius:6px;margin:12px 0;background:#0d161c}#pane-animals summary{padding:11px 12px;color:#d9e7ef;cursor:pointer;font-weight:600}#pane-animals details> :not(summary){margin:12px}#pane-animals details>table{width:calc(100% - 24px)}
      #pane-animals .animal-empty{padding:32px 22px;border:1px dashed #3c505e;border-radius:8px;margin:16px 0;background:#0b141b;text-align:center}#pane-animals .animal-empty b{display:block;font-size:18px;color:#e5edf3;margin-bottom:10px}#pane-animals .animal-empty p{max-width:360px;margin:10px auto;color:#a9bac6;font-size:13px;line-height:1.8}
      #pane-animals .animal-title{display:flex;justify-content:space-between;gap:10px;align-items:center;margin:14px 0}#pane-animals .animal-title h3{margin:0;font-size:22px;overflow-wrap:anywhere}#pane-animals .badge{display:inline-flex;padding:4px 9px;border:1px solid #38524d;border-radius:4px;color:#80dfb3;background:#173027;font-size:12px;white-space:nowrap}#pane-animals .badge.saved{color:#c8d7e0;background:#202d36;border-color:#455664}
      #pane-animals .gene-list{display:grid;gap:9px;margin:14px 0}#pane-animals .gene-row{display:grid;grid-template-columns:125px minmax(50px,1fr) 48px 38px;align-items:center;gap:12px;padding:6px 0}#pane-animals .gene-row b{font:700 18px var(--hd,sans-serif);text-align:right}#pane-animals .gene-row em{font-style:normal;font-size:12px}#pane-animals .gene-bar{height:8px;background:#29363e;border-radius:5px;overflow:hidden}#pane-animals .gene-bar i{display:block;height:100%;background:currentColor;border-radius:5px}
      #pane-animals .stat-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}#pane-animals .stat-card{padding:12px;background:#0c151c;border:1px solid #263943;border-radius:5px}#pane-animals .stat-card small{display:block;color:#9fb3c0}#pane-animals .stat-card b{font-size:18px;overflow-wrap:anywhere}#pane-animals [data-status]:not(:empty){padding:10px 12px;color:#bce6d3;border-left:3px solid #5fc48a;background:#14291f}#pane-animals .pair-sub{display:block;font-size:12px;font-weight:400;color:#9db0bd;margin:4px 0 0 16px}#pane-animals .rate{color:#8fdab7;font-weight:700;font-variant-numeric:tabular-nums}#pane-animals [data-count]{color:#c9dbe6;font-size:13px;white-space:nowrap}
      @media(max-width:500px){#pane-animals{padding:10px}#pane-animals section{padding:12px}#pane-animals .gene-row{grid-template-columns:100px 1fr 40px 30px;gap:6px}#pane-animals .animal-head{align-items:flex-start;flex-direction:column}}
      #pane-animals .animal-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:14px;align-items:start}
      #pane-animals table{width:100%;border-collapse:collapse}#pane-animals th,#pane-animals td{padding:8px 5px;text-align:left;border-bottom:1px solid #ffffff16}
      #pane-animals .low{color:#f29583}#pane-animals .normal{color:#dbc99a}#pane-animals .high{color:#6dd7a5}
      #pane-animals meter{width:85px}#pane-animals input[type=number]{width:60px}#pane-animals select{max-width:100%}
      #pane-animals .muted{color:#a5b2bd;font-size:12px;line-height:1.6}#pane-animals .animal-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
      @media(max-width:850px){#pane-animals .animal-grid{grid-template-columns:1fr}}`;
    doc.head.appendChild(style);
    host.innerHTML=`<div class="animal-head"><div><h1>동물 관리</h1><p class="muted">유전 스탯을 살펴보고, 기록을 바탕으로 교배 상대를 비교하세요.</p></div><span data-count></span></div><div class="animal-grid"><section><h2>상세창의 동물</h2><p class="muted">게임에서 동물 상세창을 열면 자동으로 연결됩니다. 유전 스탯과 현재 능력치를 나누어 표시합니다.</p><p data-status role="status"></p><div data-current></div><div class="animal-actions"><button data-save class="primary">현재 동물 저장</button></div><details><summary>스탯별 목표 · 색상 기준</summary><p class="muted">각 수치 이하를 낮음, 이상을 높음으로 표시합니다. ‘높음 이상’이 새끼의 목표 수치입니다. 사이 값은 보통입니다. 내 비교 기준이며 게임 공식 등급이 아닙니다.</p><div data-limits></div></details></section>
      <section><h2>다음 세대 교배 계획</h2><p class="muted">약한 스탯을 보완하고 균형이 더 좋은 새끼를 얻을 확률로 비교합니다. <strong>공개 유전 분석 기반의 모델 추정</strong>이며 실제 출생을 보장하지 않습니다.</p><p data-rank-status class="muted" role="status"></p><label>저장 동물 찾기<input type="search" data-search placeholder="이름 또는 종류 검색" aria-label="저장 동물 찾기"></label>
      <label>기준 동물 <select data-base></select></label><div class="animal-actions"><label>중점 스탯 <select data-target><option value="">전체 균형</option>${keys.map(k=>`<option value="${k}">${labels[k]}</option>`).join('')}</select></label><button data-delete>선택 기록 삭제</button></div><div data-pairs></div><p class="muted">다음 세대: 좋은 새끼를 저장 → 같은 성별의 부모와 비교 → 새 기준 동물로 선택하세요. 기존 부모 기록은 자동 삭제하지 않습니다. 최대 200마리 보관.</p></section></div>`;
    host.querySelector('[data-limits]').innerHTML='<table><tr><th>유전 스탯</th><th>낮음 이하</th><th>높음 이상</th></tr>'+keys.map(k=>{const t=thresholds(db.limits[k]);return `<tr><td>${labels[k]}</td><td><input aria-label="${labels[k]} 낮음" data-limit="${k}" data-bound="low" type="number" min="0" max="9" value="${t.low}"></td><td><input aria-label="${labels[k]} 높음" data-limit="${k}" data-bound="high" type="number" min="1" max="10" value="${t.high}"></td></tr>`;}).join('')+'</table>';
    host.querySelector('[data-pairs]').insertAdjacentHTML('afterend',`<details><summary>추정 조건 · 재능 보정</summary><div><label>양쪽 부모의 유전자 돌연변이 확률 합계 (%)<input type="number" data-mutation min="0" max="100" step="1" value="${db.mutation||0}" aria-label="돌연변이 확률 합계"></label><p class="muted">기본 0%는 추가 재능·혈통 보정이 없다는 가정입니다. 자동으로 읽지 않습니다. Wildcard·Genetic Volatility·혈통 보정을 합산해 입력하세요.</p><label>스탯별 확률 기준<select data-predictmode><option value="atleast">목표 수치 이상</option><option value="exact">목표 수치와 정확히 같음</option></select></label><p class="muted">GamesOMG의 2026-10-22 서버 분석 규칙을 근사 계산합니다. 현재 설치 버전과 일치 여부는 미검증입니다. 유전 합계 상한 60, 개별 상한 10 가정. 화면의 7개 모두 9 이상(합계 63)은 이 모델에서 불가능합니다.</p></div><div><label>관측 조건 이름 <input data-context maxlength="100" value="${esc(db.context||'기본')}" aria-label="관측 조건 이름"></label><p class="muted">게임 버전·교배 재능·혈통 등 조건이 바뀌면 이름을 바꾸세요. 같은 조건 이름·종류·부모 7개 유전 수치가 일치하는 기록만 집계합니다. 목표는 각 스탯의 ‘높음 이상’ 기준입니다.</p></div></details>
      <details><summary>태어난 새끼 관측 기록</summary><p class="muted">위 기준 동물과 아래 상대를 부모로 선택한 뒤, 태어난 새끼의 상세창을 여세요. 부모 정보는 교배 당시 값으로 저장해 두세요. 좋은 결과와 나쁜 결과 모두 기록해야 편향을 줄일 수 있습니다.</p><label>다른 부모 <select data-partner></select></label><p><label><input type="checkbox" data-confirm>지금 상세창의 동물이 이 부모에게 태어난 새끼임을 확인</label></p><button data-record>현재 새끼 결과 기록</button> <button data-undo>마지막 관측 삭제</button><p data-observation-count class="muted"></p></details>`);
    const context=()=>host.querySelector('[data-context]').value.trim();
    const percentage=(p,hits,n)=>n?`${p.toFixed(1)}% (${hits}/${n}마리)`:'관측 부족 (0마리)';
    const simulationCache=new Map(),pendingSimulations=new Map();let predictionWorker=null,workerUrl=null,jobId=0;
    function prediction(a,b,trials=12000){
      const mother=birthOrder.map(k=>a.genes[k]),father=birthOrder.map(k=>b.genes[k]),goals=birthOrder.map(k=>thresholds(db.limits[k]).high);
      const mutation=db.mutation||0,key=JSON.stringify([mother,father,mutation,trials,goals]);
      if(simulationCache.has(key))return simulationCache.get(key);
      const promise=new Promise((resolve,reject)=>{
        try{
          if(!predictionWorker){
            workerUrl=URL.createObjectURL(new Blob(['const simulateGenes=',simulateGenes.toString(),';onmessage=e=>{try{postMessage({id:e.data.id,result:simulateGenes(...e.data.args)})}catch(err){postMessage({id:e.data.id,error:String(err)})}}'],{type:'text/javascript'}));
            predictionWorker=new Worker(workerUrl);URL.revokeObjectURL(workerUrl);workerUrl=null;
            predictionWorker.onmessage=e=>{const job=pendingSimulations.get(e.data.id);if(!job)return;pendingSimulations.delete(e.data.id);e.data.error?job.reject(Error(e.data.error)):job.resolve(e.data.result)};
            predictionWorker.onerror=()=>{for(const job of pendingSimulations.values())job.reject(Error('확률 계산을 시작하지 못했습니다.'));pendingSimulations.clear();predictionWorker.terminate();predictionWorker=null;};
          }
          const id=++jobId;pendingSimulations.set(id,{resolve,reject});predictionWorker.postMessage({id,args:[mother,father,mutation,trials,123456789,goals]});
        }catch(error){if(workerUrl){URL.revokeObjectURL(workerUrl);workerUrl=null;}reject(error);}
      });
      simulationCache.set(key,promise);if(simulationCache.size>32)simulationCache.delete(simulationCache.keys().next().value);
      promise.catch(()=>simulationCache.delete(key));return promise;
    }
    root.addEventListener('beforeunload',()=>{if(predictionWorker)predictionWorker.terminate();});
    const probText=(hits,n)=>hits===0?'<0.1%':hits===n?'>99.9%':'약 '+(hits/n*100).toFixed(1)+'%';
    function rateTable(){return '<h4>새끼 스탯 추정치</h4><div data-prediction><p class="muted">출생 확률 계산 중…</p></div>';}
    async function fillPrediction(detail,base,partner){
      const slot=detail.querySelector('[data-prediction]');if(!slot||slot.dataset.started)return;slot.dataset.started='1';
      const goals=Object.fromEntries(keys.map(k=>[k,thresholds(db.limits[k]).high])),mode=host.querySelector('[data-predictmode]').value;
      const limits=JSON.parse(JSON.stringify(db.limits)),condition=context(),mutationAssumption=db.mutation||0;
      try{
        const result=await prediction(base,partner);
        if(!slot.isConnected)return;
        const impossible=Object.values(goals).reduce((a,b)=>a+b,0)>result.maxPoints;
        slot.innerHTML=`<div class="stat-cards"><div class="stat-card"><small>더 좋은 부모보다 균형 발전</small><b class="high">${esc(probText(result.improved,result.trials))}</b></div><div class="stat-card"><small>7개 목표 모두 이상</small><b>${impossible?'0% · 현재 합계로 불가':esc(probText(result.allGoals,result.trials))}</b></div></div><p class="muted">모델 추정 · ${result.trials.toLocaleString()}회 계산 · 추가 돌연변이 ${mutationAssumption}% 가정 · 최저 스탯이 더 높거나, 최저 스탯이 같고 합계가 높으면 균형 발전으로 봅니다.</p><table><tr><th>유전 스탯</th><th>가장 흔한 예상값</th><th>목표 출생 확률</th></tr>${keys.map(k=>{const c=birthChance(result,k,goals[k],mode);return `<tr><td>${labels[k]}</td><td>${c.likely} <small>(${c.likelyPercent.toFixed(0)}%)</small></td><td class="rate">${esc(probText(c.hits,c.n))}<small style="display:block;color:#a5b2bd">${goals[k]}${mode==='exact'?' 정확히':' 이상'}</small></td></tr>`;}).join('')}</table><p class="muted">재능·혈통·게임 버전이 다르면 달라질 수 있습니다. ‘추정 조건’에서 돌연변이 합계를 맞춰 주세요. 실게임 검증 전인 근사 모델입니다.</p><details data-actual><summary>실제 새끼 기록과 비교</summary><div></div></details>`;
        const actual=slot.querySelector('[data-actual]');let loaded=false;
        actual.addEventListener('toggle',()=>{if(!actual.open||loaded)return;loaded=true;const r=observedRate(db.observations,base,partner,limits,condition);actual.querySelector('div').innerHTML=r&&r.n?`<p class="muted">실제 새끼 ${r.n}마리${r.n<30?' · 표본 적음':''}</p><table><tr><th>목표</th><th>실제 달성률</th></tr>${keys.map(k=>`<tr><td>${labels[k]} ${r.stats[k].goal} 이상</td><td>${percentage(r.stats[k].percent,r.stats[k].hits,r.n)}</td></tr>`).join('')}</table>`:'<p class="muted">새끼 결과를 추가하면 모델과 실제 결과를 비교할 수 있습니다.</p>';});
      }catch(error){if(slot.isConnected)slot.textContent='확률 계산 실패 · 탭을 다시 열어 주세요.';}
    }
    const rankValue=r=>!r?0:target?birthChance(r,target,thresholds(db.limits[target]).high).percent:r.improved/r.trials*100;
    async function startRanking(base){
      const nextKey=JSON.stringify([selected,target,db.mutation,db.limits,db.animals.map(a=>[a.id,a.sex,a.species,a.genes])]);
      if(nextKey===rankKey)return;rankKey=nextKey;const generation=++rankGeneration;rankings=null;
      const candidates=db.animals.map((a,i)=>({a,i})).filter(p=>compare(base,p.a)),out=new Map(),line=host.querySelector('[data-rank-status]');
      for(let i=0;i<candidates.length;i++){
        if(generation!==rankGeneration||!active){if(generation===rankGeneration)rankKey='';return;}
        line.textContent=`교배 후보 확률 비교 중 ${i+1}/${candidates.length} · 화면은 계속 사용할 수 있습니다`;
        try{out.set(candidates[i].i,await prediction(base,candidates[i].a,12000));}catch(error){if(generation===rankGeneration){rankKey='';line.textContent='후보 순위 계산 실패 · 탭을 다시 열어 주세요.';}return;}
      }
      if(generation!==rankGeneration||!active){if(generation===rankGeneration)rankKey='';return;}rankings=out;
      line.textContent=candidates.length?`후보 ${candidates.length}마리 · ${target?'중점 스탯 목표 달성 확률':'균형 발전 확률'} 순 (후보당 12,000회 근사 비교)`:'비교할 같은 종류의 암수가 필요합니다.';
      renderPairs();
    }

    function renderCurrent(){
      const fresh=current && Date.now()-observedAt<12000;
      host.querySelector('[data-save]').disabled=!fresh;
      host.querySelector('[data-record]').disabled=!fresh;
      host.querySelector('[data-count]').textContent='저장 '+db.animals.length+'마리 · 관측 '+db.observations.length+'건';
      const a=fresh?current:(selected!==''?db.animals[Number(selected)]:null);
      if(!a){host.querySelector('[data-current]').innerHTML='<div class="animal-empty"><b>동물을 만나러 가볼까요?</b><p>① 게임에서 길들인 동물을 바라보세요.<br>② 동물 상세창을 열고 잠시 기다리세요.<br>③ 여기에 정보가 나타나면 저장하세요.</p><p>저장된 동물은 오른쪽 목록에서 다시 볼 수 있습니다.</p></div>';return;}
      host.querySelector('[data-current]').innerHTML=`<div class="animal-title"><h3>${esc(a.name)}</h3><span class="badge ${fresh?'':'saved'}">${fresh?'상세창 연결됨':'저장된 기록'}</span></div><p class="muted" style="overflow-wrap:anywhere">${sex(a)} · ${esc(a.species)} · 유전 합계 <strong>${keys.reduce((sum,k)=>sum+a.genes[k],0)} / 70</strong></p><div class="gene-list">${keys.map(k=>{const g=grade(a.genes[k],db.limits[k]);return `<div class="gene-row ${g}"><span>${labels[k]}</span><span class="gene-bar" aria-hidden="true"><i style="width:${a.genes[k]*10}%"></i></span><b>${a.genes[k]}</b><em>${names[g]}</em></div>`;}).join('')}</div><p class="muted">유전 수치 0–10 · 색상은 아래에서 정한 내 기준입니다.</p><details><summary>현재 능력치 · 장비와 버프 포함</summary>${Object.keys(a.stats).length?'<div class="stat-cards">'+Object.entries(a.stats).map(([k,v])=>`<div class="stat-card"><small>${statNames[k]}</small><b>${esc(v)}</b></div>`).join('')+'</div>':'<p class="muted">상세창에서 현재 능력치를 아직 읽지 못했습니다.</p>'}</details>`;
    }

    function renderPairs(){
      const select=host.querySelector('[data-base]');
      select.innerHTML='<option value="">동물을 저장하고 선택하세요</option>'+db.animals.map((a,i)=>(!filter||i===Number(selected)&&selected!==''||(a.name+' '+a.species).toLowerCase().includes(filter))?`<option value="${i}">${esc(a.name)} (${sex(a)} · ${esc(a.species)})</option>`:'').join('');
      select.value=selected;
      const base=selected===''?null:db.animals[Number(selected)];
      host.querySelector('[data-delete]').disabled=!base;
      const partnerSelect=host.querySelector('[data-partner]'),oldPartner=partnerSelect.value;
      partnerSelect.innerHTML='<option value="">부모를 선택하세요</option>'+db.animals.map((a,i)=>base&&compare(base,a)?`<option value="${i}">${esc(a.name)} (${sex(a)})</option>`:'').join('');partnerSelect.value=oldPartner;
      host.querySelector('[data-observation-count]').textContent=`저장된 관측 ${db.observations.length}/2000마리 · 같은 새끼 중복 기록 제외`;
      host.querySelector('[data-undo]').disabled=!db.observations.length;
      host.querySelector('[data-count]').textContent='저장 '+db.animals.length+'마리 · 관측 '+db.observations.length+'건';
      const newRankKey=JSON.stringify([selected,target,db.mutation,db.limits,db.animals.map(a=>[a.id,a.sex,a.species,a.genes])]);if(rankKey!==newRankKey)rankings=null;
      const openPartners=new Set([...host.querySelectorAll('[data-pair][open]')].map(d=>d.dataset.pair));
      const pairs=base?db.animals.map((a,i)=>({a,i,result:i!==Number(selected)?compare(base,a,target):null})).filter(x=>x.result).sort((a,b)=>rankings?rankValue(rankings.get(b.i))-rankValue(rankings.get(a.i))||b.result.score-a.result.score:b.result.score-a.result.score).slice(0,8):[];
      const container=host.querySelector('[data-pairs]');
      container.innerHTML=pairs.length?pairs.map(({a,result,i},rank)=>`<details data-pair="${i}"${openPartners.has(String(i))||(!openPartners.size&&rank===0)?' open':''}><summary>${rank+1}. ${esc(a.name)}<span class="pair-sub">${rankings?(target?'중점 목표 달성 약 '+rankValue(rankings.get(i)).toFixed(1)+'%':'균형 발전 확률 '+probText(rankings.get(i).improved,rankings.get(i).trials)):'확률 계산 준비 중'} · 부모 평균 ${result.total.toFixed(1)}</span></summary><div data-pair-body></div></details>`).join(''):'<div class="animal-empty"><b>교배 비교 준비</b><p>기준 동물을 선택하세요. 같은 종류의 암컷과 수컷을 각각 저장하면 비교 후보가 나타납니다.</p></div>';
      for(const detail of container.querySelectorAll('[data-pair]')){
       const pair=pairs.find(p=>String(p.i)===detail.dataset.pair);let rendered=false;
       const fill=()=>{if(!detail.open||rendered)return;rendered=true;const {a,result}=pair;detail.querySelector('[data-pair-body]').innerHTML=rateTable(base,a)+`<details><summary>부모별 유전 수치 비교</summary><table><tr><th>유전 스탯</th><th>기준</th><th>상대</th><th>평균</th></tr>${keys.map(k=>`<tr><td>${labels[k]}</td><td>${base.genes[k]}</td><td>${a.genes[k]}</td><td class="${grade(result.means[k],db.limits[k])}">${result.means[k].toFixed(1)}</td></tr>`).join('')}</table><p class="muted">부모 평균은 새끼의 보장 수치나 확률이 아닙니다.</p></details>`;};
       detail.addEventListener('toggle',()=>{fill();if(detail.open)fillPrediction(detail,base,pair.a)});fill();if(detail.open)fillPrediction(detail,base,pair.a);
      }
      if(base)startRanking(base);else{rankGeneration++;rankKey='';rankings=null;host.querySelector('[data-rank-status]').textContent='';}

    }
    const schedulePairs=()=>{clearTimeout(pairTimer);pairTimer=setTimeout(()=>{if(active)renderPairs()},180)};
    host.querySelector('[data-search]').oninput=e=>{filter=e.target.value.trim().toLowerCase();schedulePairs()};
    host.querySelector('[data-context]').oninput=()=>{db.context=context();clearConfirmation();schedulePairs();};
    host.querySelector('[data-context]').onchange=()=>save();
    host.querySelector('[data-mutation]').onchange=e=>{const n=Number(e.target.value);if(e.target.value===''||!Number.isInteger(n)||n<0||n>100){status('돌연변이 확률은 0~100 정수로 입력하세요.');return}db.mutation=n;save();rankKey='';rankings=null;renderPairs();};
    host.querySelector('[data-predictmode]').onchange=()=>renderPairs();
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
    const confirmDelete=(selector,key)=>{const b=host.querySelector(selector);if(b.dataset.confirm===key){delete b.dataset.confirm;return true}const label=b.textContent;b.dataset.confirm=key;b.textContent='한 번 더 누르면 삭제';setTimeout(()=>{delete b.dataset.confirm;b.textContent=label},4000);return false};
    host.querySelector('[data-undo]').onclick=()=>{if(!db.observations.length||!confirmDelete('[data-undo]',String(db.observations.length)))return;const r=db.observations.pop();if(!save()){db.observations.push(r);return;}status('마지막 새끼 관측을 삭제했습니다.');renderPairs();};
    host.querySelector('[data-save]').onclick=()=>{
      if(!current || Date.now()-observedAt>=12000)return;
      const old=db.animals.findIndex(a=>a.id===current.id && a.id);
      if(old<0 && db.animals.length>=200){status('저장 한도 200마리입니다. 필요 없는 기록을 삭제해 주세요.');return;}
      const next=normalize(current), previous=db.animals.slice();
      if(old>=0)db.animals[old]=next;else db.animals.push(next);
      if(!save()){db.animals=previous;return;}
      selected=String(old>=0?old:db.animals.length-1);status('동물 정보를 저장했습니다.');clearConfirmation();renderCurrent();renderPairs();
    };
    host.querySelector('[data-base]').onchange=e=>{selected=e.target.value;clearConfirmation();renderCurrent();renderPairs();};
    host.querySelector('[data-target]').onchange=e=>{target=e.target.value;renderPairs();};
    host.querySelector('[data-delete]').onclick=()=>{if(selected===''||!confirmDelete('[data-delete]',selected))return;const previous=db.animals.slice();db.animals.splice(Number(selected),1);if(!save()){db.animals=previous;return;}selected='';clearConfirmation();renderCurrent();renderPairs();};
    host.querySelector('[data-limits]').onchange=e=>{
      const k=e.target.dataset.limit;if(!keys.includes(k))return;
      const inputs=[...host.querySelectorAll('[data-limit]')].filter(x=>x.dataset.limit===k);
      const t=Object.fromEntries(inputs.map(x=>[x.dataset.bound,x.value===''?NaN:Number(x.value)]));
      if(!Number.isInteger(t.low)||!Number.isInteger(t.high)||t.low<0||t.high>10||t.low>=t.high){status('낮음 기준은 높음보다 작아야 하며 0~10 정수여야 합니다.');return;}
      const prior=db.limits[k];db.limits[k]=t;if(!save()){db.limits[k]=prior;return;}status('색상 기준을 저장했습니다.');renderCurrent();renderPairs();
    };
    root.__animalIngest=m=>{
      if(!Object.prototype.hasOwnProperty.call(m,'animal'))return;
      const next=normalize(m.animal), sig=JSON.stringify(next);if(sig!==signature)clearConfirmation();observedAt=Date.now();current=next;
      if(active && !doc.hidden && sig!==signature)renderCurrent();signature=sig;
    };
    root.__animalsShown=()=>{if(active)return;active=true;renderCurrent();renderPairs();};
    const observer=new MutationObserver(()=>{const next=host.classList.contains('on');if(next&&!active)root.__animalsShown();else if(!next){active=false;rankGeneration++;rankKey='';}});observer.observe(host,{attributes:true,attributeFilter:['class']});
    // No background rendering. A cheap freshness check runs only for an open tab.
    setInterval(()=>{if(active && !doc.hidden && current && Date.now()-observedAt>=12000){current=null;signature='';renderCurrent();}},3000);
    doc.addEventListener('visibilitychange',()=>{if(active&&!doc.hidden){renderCurrent();renderPairs();}});
    renderCurrent();renderPairs();
  };
})(typeof window==='undefined'?null:window);
