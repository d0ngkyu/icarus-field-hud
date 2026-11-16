'use strict';
const fs=require('fs/promises'),path=require('path');
// Metadata only: never read/upload personal world contents. No recursive scan.
async function snapshot(root){
 const out=new Map();if(!root)return out;
 try{for(const account of (await fs.readdir(root,{withFileTypes:true})).filter(x=>x.isDirectory()).slice(0,32)){
  const dir=path.join(root,account.name,'Prospects');
  try{for(const name of (await fs.readdir(dir)).filter(x=>/\.json$/i.test(x)).slice(0,2000)){
   const file=path.join(dir,name);try{const s=await fs.stat(file);if(s.isFile())out.set(file,{mtime:s.mtimeMs,size:s.size});}catch{}
  }}catch{}
 }}catch{}return out;
}
function changed(before,after){return [...after].some(([p,s])=>s.size>0&&before.has(p)&&s.mtime>before.get(p).mtime);}
module.exports={snapshot,changed};
