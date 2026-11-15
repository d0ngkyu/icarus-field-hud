// Rebuild from public /map/layers/{name}?clientVersion=1.11.4 JSON snapshots.
// Usage: node source/tools/intel-candidates.cjs <snapshot-directory>
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..'),input=path.resolve(process.argv[2]);
const html=fs.readFileSync(path.join(root,'source/mod/hud/index.html'),'utf8');
const gameCaves=JSON.parse(html.match(/const CAVEMAP=(.*);/)[1]);
const worlds={olympus:'Terrain_016',styx:'Terrain_017',prometheus:'Terrain_019',elysium:'Terrain_021'},maps={},audit={};
const pos=n=>Math.round(n*98.4375-403200);
for(const [name,w]of Object.entries(worlds)){
 const d=JSON.parse(fs.readFileSync(path.join(input,'intel-'+name+'.json'))),rows=[];
 const add=(r,id,type,count=0,variant='')=>rows.push([id,type,pos(r.x),pos(r.y),Number(count)||0,variant]);
 for(const r of d.metaDeposits)add(r,r.code,r.variant==='Plant'?'plant':r.variant==='Volcanic'?'red':r.variant==='Uranium'?'uranium':'exotic',r.extractorCount);
 for(const r of d.ores)add(r,'deep:'+r.code,'deep',0,r.variant);
 for(const r of d.geysers)add(r,'geyser:'+r.code,'geyser');
 for(const r of d.oilGeysers)add(r,'oil:'+r.code,'oil');
 let supplemental=0;
 for(const r of d.caves){if(!gameCaves[w].some(q=>Math.hypot(q[0]-pos(r.x),q[1]-pos(r.y))<6000)){add(r,'cave:'+r.id,'cave',0,r.s||'unknown');supplemental++;}}
 maps[w]=rows;audit[name]={siteCaves:d.caves.length,gameCaves:gameCaves[w].length,supplementalCaves:supplemental,exotic:d.metaDeposits.length,deep:d.ores.length,geyser:d.geysers.length,oil:d.oilGeysers.length};
}
const p=path.join(root,'source/mod/hud/map-spawns.js');let s=fs.readFileSync(p,'utf8');s=s.replace(/ const maps=.*;\n/, ' const maps='+JSON.stringify(maps)+';\n');fs.writeFileSync(p,s);console.log(JSON.stringify(audit,null,2));
