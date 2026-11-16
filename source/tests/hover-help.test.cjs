const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const help=require('../mod/hud/hover-help');
test('dynamic controls resolve immediately, tabs override stale help, unknown targets stay silent',()=>{
 const el={dataset:{tab:'news',tip:'old'},closest(){return this;},matches(){return false;}};
 assert.equal(help.resolve(el).text,help.tabs.news);
 const dynamic={dataset:{},closest(){return this;},matches(s){return s==='[data-news-publish-retry]';}};
 assert.match(help.resolve(dynamic).text,/재번역하지/);
 assert.equal(help.resolve(null),null);
 assert.equal(help.resolve({closest(){return null}}),null);
});
test('existing item effects survive and nested content uses the nearest control',()=>{
 const control={dataset:{},matches(){return false},getAttribute(k){return k==='title'?'이동 속도 +4%':null}};
 const child={closest(){return control}};
 assert.equal(help.resolve(child).text,'이동 속도 +4%');
 assert.equal(help.resolve(child).el,control);
});
function harness(){
 const handlers={},timers=new Map();let next=0;
 const doc={addEventListener(k,f){handlers[k]=f;}};
 const ctx={document:doc,window:{HudHoverHelp:{resolve:target=>target.help}},tipEl:{dataset:{},style:{}},tipFor:null,tipT:null,tipX:0,tipY:0,
 setTimeout(f){timers.set(++next,f);return next;},clearTimeout(id){timers.delete(id);},showTip(t){ctx.shown=t;},hideTip(){timers.delete(ctx.tipT);ctx.tipT=null;ctx.tipFor=null;ctx.shown=null;}};
 const html=fs.readFileSync(require.resolve('../mod/hud/index.html'),'utf8');
 vm.runInNewContext(html.slice(html.indexOf('function controlTip('),html.indexOf("document.addEventListener('mousedown',hideTip")),ctx);
 return {ctx,handlers,timers,flush(){for(const[id,f]of [...timers]){timers.delete(id);f();}}};
}
test('keyboard help, Escape and detached dynamic controls do not leave stale popups',()=>{
 const h=harness(),el={isConnected:true,getBoundingClientRect:()=>({left:10,bottom:20})},target={help:{el,text:'first'}};
 h.handlers.focusin({target});assert.equal(h.ctx.tipX,10);h.flush();assert.equal(h.ctx.shown,'first');
 h.handlers.keydown({key:'Escape'});assert.equal(h.ctx.shown,null);
 h.handlers.focusin({target});el.isConnected=false;h.flush();assert.equal(h.ctx.shown,null);
 el.isConnected=true;h.handlers.mousemove({target,clientX:40,clientY:50});h.handlers.mouseleave();h.flush();assert.equal(h.ctx.shown,null);
});
test('moving within a control keeps one timer, changed text is refreshed',()=>{
 const h=harness(),el={isConnected:true},target={help:{el,text:'first'}},event={target,clientX:1,clientY:2};
 h.handlers.mousemove(event);h.handlers.mousemove(event);assert.equal(h.timers.size,1);h.flush();assert.equal(h.ctx.shown,'first');
 target.help={el,text:'changed'};h.handlers.mousemove(event);h.flush();assert.equal(h.ctx.shown,'changed');
 h.handlers.scroll();assert.equal(h.ctx.shown,null);
});
