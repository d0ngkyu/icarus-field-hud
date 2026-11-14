'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const {Tuner,detectGame,fileHash}=require('./core.cjs');
const root=process.env.LOCALAPPDATA||__dirname;
const stateDir=process.env.SOLO_TUNER_STATE||path.join(root,'IcarusSoloComfort');
const game=process.env.SOLO_TUNER_GAME||detectGame();
const tuner=game?new Tuner({game,stateDir,repak:path.join(__dirname,'tools/repak.exe')}):null;
const token=crypto.randomBytes(32).toString('hex');
let origin='',lastUse=Date.now();
const server=http.createServer(async(req,res)=>{
  lastUse=Date.now();
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"};
  function reply(code,data,type='application/json; charset=utf-8'){res.writeHead(code,{...headers,'Content-Type':type});res.end(type.startsWith('application/json')?JSON.stringify(data):data);}
  try {
    if(req.headers.host!==new URL(origin).host)return reply(403,{error:'허용하지 않은 주소입니다.'});
    const url=new URL(req.url,origin);
    if(req.method==='GET'&&['/','/app.js','/style.css'].includes(url.pathname)) {
      const name={'/':'index.html','/app.js':'app.js','/style.css':'style.css'}[url.pathname];
      return reply(200,fs.readFileSync(path.join(__dirname,name)),name.endsWith('html')?'text/html; charset=utf-8':name.endsWith('css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8');
    }
    if(req.headers['x-solo-token']!==token)return reply(403,{error:'앱을 다시 실행하세요.'});
    if(req.headers.origin&&req.headers.origin!==origin)return reply(403,{error:'외부 요청은 허용하지 않습니다.'});
    if(!tuner)throw Error('Steam Icarus 설치 경로를 찾지 못했습니다. 실행 안내를 확인하세요.');
    if(req.method==='GET'&&url.pathname==='/api/state')return reply(200,{...tuner.status(),dataHash:fileHash(tuner.dataPak)});
    if(req.method!=='POST')return reply(404,{error:'잘못된 요청'});
    if(req.headers['content-type']!=='application/json')return reply(415,{error:'JSON 요청만 가능합니다.'});
    let body='';for await(const chunk of req){body+=chunk;if(body.length>8192)throw Error('요청이 너무 큽니다.');}
    const data=JSON.parse(body||'{}');
    if(url.pathname==='/api/apply')return reply(200,tuner.apply(data.values,data.dataHash,data.confirmed));
    if(url.pathname==='/api/remove')return reply(200,tuner.remove());
    if(url.pathname==='/api/restore')return reply(200,tuner.restore(data.id));
    if(url.pathname==='/api/quit'){reply(200,{message:'프로그램을 종료했습니다. 이 창을 닫아도 됩니다.'});setTimeout(()=>process.exit(0),200);return;}
    return reply(404,{error:'잘못된 요청'});
  }catch(e){reply(400,{error:e.message});}
});
server.listen(0,'127.0.0.1',()=>{
  origin='http://127.0.0.1:'+server.address().port;
  const url=origin+'/#'+token;
  fs.mkdirSync(stateDir,{recursive:true});fs.writeFileSync(path.join(stateDir,'session.json'),JSON.stringify({url,pid:process.pid}));
  console.log(url);
  if(!process.argv.includes('--no-open'))cp.execFile('rundll32.exe',['url.dll,FileProtocolHandler',url],{windowsHide:true});
});
setInterval(()=>{if(Date.now()-lastUse>30*60*1000)process.exit(0);},60000).unref();
