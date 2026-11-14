const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
test('switching crafting plans preserves world memories and live navigation',()=>{
 const code=fs.readFileSync(require.resolve('../mod/hud/layout.js'),'utf8');
 const functions=code.slice(code.indexOf('const profileKeys='),code.indexOf("const coach=$('coachsec')"));
 const world={home:{x:1,y:2},mem:{chest:{items:[1,2]}},box:[{id:1}],ore:[{id:2}],wp:{x:3},wpSel:{x:4},inv:{Wood:20},cls:{bench:1},mapLiveStates:{Olympus:{home:{x:1}}}};
 const S={...structuredClone(world),t:[{k:'Bench',n:1}],built:{Bench:1},log:[]};
 const context={S,save(){},draw(){},coachPrevGoal:null,CAND_KEY:''};vm.createContext(context);
 vm.runInContext(functions+";switchPlan('Second');S.t=[{k:'Other',n:2}];switchPlan('기본 계획');",context);
 for(const k of Object.keys(world))assert.deepEqual(S[k],world[k],k+' must survive a plan switch');
 assert.equal(S.t[0].k,'Bench');assert.equal(S.plans.Second.t[0].k,'Other');
});
