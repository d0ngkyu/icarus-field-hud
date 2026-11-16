const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const flush=()=>new Promise(r=>setImmediate(r));
function harness(api){
 const fields=new Map(),buttons=[],events={};
 function element(){return{hidden:false,offsetParent:{},dataset:{},disabled:false,textContent:'',classList:{toggle(){}},append(){},replaceChildren(){},insertRow(){return{insertCell(){return{}}}}}}
 const section=element(),details=element();
 for(const [key,values]of [['mode',['host','personal']],['action',['hardware','status','restore','force-restore']],['sample',['before','after']],['status',['host','personal']]])for(const value of values){const e=element();e.dataset[key]=value;fields.set('[data-'+key+'="'+value+'"]',e);if(key!=='status')buttons.push(e)}
 for(const key of ['result','backup','hardware','measures'])fields.set('[data-'+key+']',element());
 section.querySelector=s=>s==='details'?details:fields.get(s);
 section.querySelectorAll=s=>s==='button'?buttons:buttons.filter(b=>Object.hasOwn(b.dataset,s.slice(6,-1)));
 let navButton;const nav={append:b=>navButton=b,querySelectorAll:()=>[navButton]},grid={append(){}};
 const document={head:{append(){}},createElement:tag=>tag==='section'?section:element()};
 const context={document,hudApp:{optimization:api},addEventListener:(k,f)=>events[k]=f};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../mod/hud/optimization.js'),'utf8'),context);context.HudOptimization.mount({nav,grid,settings:[]});
 return{fields,buttons,events,open:async()=>{navButton.onclick();await flush();},click:async(key,value)=>{const e=fields.get('[data-'+key+'="'+value+'"]');assert.equal(e.disabled,false);await e.onclick();},card:mode=>fields.get('[data-status="'+mode+'"]')};
}
const running={color:'yellow',mode:null,canWrite:false,canRestore:false,running:true,message:'게임 종료 필요'};
test('running rejection explains reason beside buttons and permits retry after exit without refresh',async()=>{
 let up=true,writes=0;const h=harness(async action=>{if(up)return running;if(action==='host')writes++;return{color:'green',mode:'host',canWrite:true,canRestore:true,message:'저장 확인'}});
 await h.open();assert.match(h.card('host').textContent,/게임 실행 중/);await h.click('mode','host');assert.equal(writes,0);assert.equal(h.buttons.some(b=>b.dataset.mode&&b.disabled),false);
 up=false;await h.click('mode','host');assert.equal(writes,1);assert.equal(h.card('host').dataset.color,'green');assert.equal(h.fields.get('[data-action="restore"]').disabled,false);
});
test('read/IPC failure stays visible and releases both apply buttons for retry',async()=>{
 let fail=true;const h=harness(async()=>{if(fail)throw Error('설정 읽기 실패');return{...running,running:false,canWrite:true}});
 await h.open();assert.equal(h.card('personal').dataset.color,'red');assert.match(h.card('personal').textContent,/설정 읽기 실패/);
 fail=false;await h.click('mode','personal');assert.equal(h.card('personal').dataset.color,'yellow');assert.equal(h.buttons.some(b=>b.dataset.mode&&b.disabled),false);
});
test('pending request blocks double clicks only until completion',async()=>{
 let resolve,calls=0;const h=harness(()=>{calls++;return new Promise(r=>resolve=r)});const request=h.click('mode','host');assert.equal(h.buttons.every(b=>b.disabled),true);
 h.fields.get('[data-mode="personal"]').onclick();assert.equal(calls,1);resolve(running);await request;assert.equal(h.fields.get('[data-mode="personal"]').disabled,false);
});
test('focus refreshes visible optimization pane after game exits',async()=>{
 let current=running;const h=harness(async()=>current);await h.open();current={...running,canWrite:true,running:false};h.events.focus();await flush();assert.match(h.card('personal').textContent,/적용 가능/);
});

test('force restore button appears only when the backend says the normal restore is stuck',async()=>{
 let state={color:'red',canWrite:true,canRestore:false,canForce:true,message:'stuck'};const calls=[];
 const h=harness(async a=>{calls.push(a);if(a==='force-restore')state={color:'yellow',canWrite:true,canRestore:false,canForce:false,message:'ok'};return state});
 await h.open();await flush();const b=h.fields.get('[data-action="force-restore"]');assert.equal(b.hidden,false);
 await b.onclick();await flush();assert.ok(calls.includes('force-restore'));assert.equal(b.hidden,true);
});
