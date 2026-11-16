// Reuse the matching HUD atlas and its embedded data; never infer icons from item names.
// Usage: node tools/BuildItemImages.cjs <hud index.html> <icons.webp>
const fs=require('fs'),path=require('path'),sharp=require('sharp');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const html=fs.readFileSync(process.argv[2],'utf8');
 const data=JSON.parse(html.match(/<script id="d" type="application\/json">([\s\S]*?)<\/script>/)[1]);
 const input=process.argv[3], meta=await sharp(input).metadata();
 if(meta.width!==2304||meta.height%48)throw Error('Unexpected HUD atlas geometry');
 const catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog.json')));
 const map={},limit=meta.width/48*(meta.height/48);
 for(const item of catalog){const index=data.items[item.static]?.[2];if(Number.isInteger(index)&&index>=0&&index<limit)map[item.id]=index;}
 await sharp(input).png({palette:true,colours:256,effort:7,compressionLevel:9}).toFile(path.join(root,'assets/items.png'));
 fs.writeFileSync(path.join(root,'assets/item-images.json'),JSON.stringify(map));
 console.log(JSON.stringify({catalog:catalog.length,mapped:Object.keys(map).length,missing:catalog.filter(x=>map[x.id]==null).length,atlasBytes:fs.statSync(path.join(root,'assets/items.png')).size}));
})().catch(e=>{console.error(e);process.exitCode=1;});
