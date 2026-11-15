'use strict';
const fs=require('node:fs'),path=require('node:path'),https=require('node:https'),crypto=require('node:crypto');
const FEED='https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=1149460&count=8&maxlength=0&feeds=steam_community_announcements';
const LIMIT=450000;
const decode=s=>String(s).replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(m,k)=>{const n=k[0]==='#'?parseInt(k.slice(k[1]?.toLowerCase()==='x'?2:1),k[1]?.toLowerCase()==='x'?16:10):null;return n!==null?(n>0&&n<=0x10ffff?String.fromCodePoint(n):''):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[k.toLowerCase()];});
function imageURL(s){try{const u=new URL(s.replace('{STEAM_CLAN_IMAGE}','https://clan.akamai.steamstatic.com/images'));return u.protocol==='https:'&&(/(^|\.)steamstatic\.com$/.test(u.hostname)||u.hostname==='steamcdn-a.akamaihd.net')&&!u.username&&!u.password?u.href:null;}catch{return null;}}
function article(x){
 if(x?.feedname!=='steam_community_announcements'||!/^\d+$/.test(x.gid)||typeof x.contents!=='string'||x.contents.length>180000)return null;
 let url;try{url=new URL(x.url);if(url.protocol!=='https:'||!['store.steampowered.com','steamcommunity.com','steamstore-a.akamaihd.net'].includes(url.hostname))return null;}catch{return null;}
 const images=[];let body=x.contents.replace(/<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
 body=body.replace(/\[img\]([\s\S]*?)\[\/img\]|<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi,(_,a,b)=>{const u=imageURL(decode((a||b).trim()));if(u&&!images.includes(u)&&images.length<8)images.push(u);return '\n';});
 body=body.replace(/(?:https:\/\/[^\s<>"']+|\{STEAM_CLAN_IMAGE\}\/[^\s<>"']+)\.(?:png|jpe?g|webp)(?:\?[^\s<>"']*)?/gi,s=>{const u=imageURL(s);if(u&&!images.includes(u)&&images.length<8)images.push(u);return '';});
 body=decode(body.replace(/<br\s*\/?\s*>|<\/(?:p|div|h[1-6]|li)>|\[\/(?:h[1-6]|list|p)\]|\[\*\]/gi,'\n').replace(/<[^>]*>/g,'').replace(/\[\/?[a-z][^\]]*\]/gi,'')).replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
 const title=decode(String(x.title||'').replace(/<[^>]*>/g,'')).slice(0,300),text=title+'\n\n'+body;
 return {id:x.gid,title,text,images,url:url.href,date:Number.isFinite(x.date)?x.date:0,hash:crypto.createHash('sha256').update(text).digest('hex'),characters:Array.from(text).length};
}
function request(url,options={}){return new Promise((resolve,reject)=>{
 const req=https.request(url,{method:options.body?'POST':'GET',headers:{'Accept':'application/json',...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}},res=>{let size=0,chunks=[];res.on('data',b=>{size+=b.length;if(size>3000000){req.destroy();reject(Error('응답 용량이 너무 큽니다.'));}else chunks.push(b);});res.on('error',()=>reject(Error('연결이 중단되었습니다.')));res.on('end',()=>{if(res.statusCode!==200)return reject(Error(res.statusCode===403?'API 사용 설정·키 제한·결제 계정을 확인해 주세요.':res.statusCode===429?'서비스 사용량 제한입니다. 잠시 뒤 다시 시도하세요.':'소식 서비스 응답 오류 ('+res.statusCode+')'));try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))}catch{reject(Error('응답을 읽지 못했습니다.'));}});});
 const timer=setTimeout(()=>req.destroy(Error('소식 서비스 연결 시간이 초과되었습니다.')),15000);req.on('close',()=>clearTimeout(timer));req.on('error',()=>reject(Error('소식 서비스에 연결하지 못했습니다. 인터넷 연결을 확인하세요.')));if(options.body)req.write(JSON.stringify(options.body));req.end();
});}
function create({dir,secure,fetchJSON=request,now=()=>Date.now()}){
 const stateFile=path.join(dir,'game-news.json'),keyFile=path.join(dir,'news-key.dat');let db={items:[],at:0,translations:{},usage:{}},feedFlight=null,translationFlight=null,lastAttempt=0;
 try{if(fs.statSync(stateFile).size<8000000){const x=JSON.parse(fs.readFileSync(stateFile,'utf8'));if(Array.isArray(x.items)&&x.translations&&x.usage)db=x;}}catch{}
 const write=()=>{fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(stateFile+'.tmp',JSON.stringify(db));fs.renameSync(stateFile+'.tmp',stateFile);};
 const month=()=>new Date(now()).toISOString().slice(0,7);
 function status(){return {connected:fs.existsSync(keyFile),used:Number(db.usage[month()])||0,limit:LIMIT,month:month()};}
 function setKey(key){if(translationFlight)throw Error('번역이 끝난 뒤 키를 변경하세요.');if(key===''){if(fs.existsSync(keyFile))fs.unlinkSync(keyFile);return status();}if(typeof key!=='string'||!/^AIza[\w-]{30,100}$/.test(key.trim()))throw Error('Google Cloud API 키 형식을 확인하세요.');if(!secure.isEncryptionAvailable())throw Error('Windows 암호화 저장소를 사용할 수 없습니다.');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(keyFile,secure.encryptString(key.trim()));return status();}
 async function list(force=false){
  if(feedFlight)return feedFlight;
  if(db.items.length&&!force&&now()-db.at<3600000)return snapshot();
  if(now()-lastAttempt<60000)return snapshot('소식 확인은 1분에 한 번 가능합니다.');lastAttempt=now();
  feedFlight=(async()=>{try{const r=await fetchJSON(FEED);if(r?.appnews?.appid!==1149460||!Array.isArray(r.appnews.newsitems))throw Error('공식 소식 응답 형식이 다릅니다.');const items=r.appnews.newsitems.map(article).filter(Boolean).slice(0,8);if(!items.length)throw Error('공식 소식을 찾지 못했습니다.');db.items=items;db.at=now();write();return snapshot();}catch{return snapshot('소식을 불러오지 못했습니다. 저장된 글이 있으면 대신 표시합니다.');}finally{feedFlight=null;}})();return feedFlight;
 }
 function snapshot(error=''){return {items:db.items.map(a=>({...a,translated:!!db.translations[a.hash]})),at:db.at,error,...status()};}
 function read(id){const a=db.items.find(a=>a.id===id);if(!a)throw Error('목록을 새로 불러오세요.');return {...a,translation:db.translations[a.hash]?.text||null,...status()};}
 async function translate(id){
  const a=read(id);if(a.translation)return a;
  if(translationFlight)throw Error('다른 글을 번역 중입니다. 완료 후 다시 눌러 주세요.');
  if(!secure.isEncryptionAvailable()||!fs.existsSync(keyFile))throw Error('번역 설정에서 API 키를 먼저 연결하세요.');
  let key;try{key=secure.decryptString(fs.readFileSync(keyFile));}catch{throw Error('이 Windows 계정에서 키를 읽을 수 없습니다. 다시 연결하세요.');}
  const used=Number(db.usage[month()])||0;if(a.characters>80000)throw Error('글이 너무 깁니다. 공식 원문에서 확인해 주세요.');if(used+a.characters>LIMIT)throw Error('이 PC의 월 번역 제한에 도달했습니다. 저장된 번역은 계속 읽을 수 있습니다.');
  // Reserve before sending: a timeout may already have been billed. Never retry automatically.
  db.usage[month()]=used+a.characters;write();
  translationFlight=(async()=>{try{const chars=Array.from(a.text),out=[];for(let i=0;i<chars.length;i+=4000){const r=await fetchJSON('https://translation.googleapis.com/language/translate/v2',{headers:{'X-goog-api-key':key},body:{q:chars.slice(i,i+4000).join(''),target:'ko',format:'text',model:'nmt'}});const t=r?.data?.translations?.[0]?.translatedText;if(typeof t!=='string')throw Error('번역 응답을 읽지 못했습니다.');out.push(decode(t));}db.translations[a.hash]={text:out.join(''),at:now()};const old=Object.keys(db.translations).sort((a,b)=>db.translations[b].at-db.translations[a].at);for(const h of old.slice(64))delete db.translations[h];write();return read(id);}finally{translationFlight=null;key='';}})();return translationFlight;
 }
 return {list,read,translate,status,setKey};
}
module.exports={create,article,imageURL,request,LIMIT};
