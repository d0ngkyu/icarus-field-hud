// Usage: node tools/BuildDetails.cjs <extracted table directory> <Korean locres JSON>
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),dir=process.argv[2],ko=JSON.parse(fs.readFileSync(process.argv[3]));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog.json'))),library=JSON.parse(fs.readFileSync(path.join(root,'assets/library.json')));
function table(name){const d=JSON.parse(fs.readFileSync(path.join(dir,name+'.json')));return {defaults:d.Defaults||{},rows:new Map(d.Rows.map(r=>[r.Name,r]))};}
const stat=table('D_ItemsStatic'),itemable=table('D_Itemable'),tool=table('D_ToolDamage'),durable=table('D_Durable');
function row(t,name){return name&&name!=='None'&&t.rows.has(name)?{...t.defaults,...t.rows.get(name)}:null;}
function loc(text){if(!text)return '';const m=text.match(/^NSLOCTEXT\("([^"]+)",\s*"([^"]+)",\s*"([\s\S]*)"\)$/);return m?(ko[m[1]]?.[m[2]]||''):'';}
function clean(text){return text.replace(/<[^>]+>/g,'').replace(/\\n|\\r|[\r\n]+/g,' ').replace(/\s+/g,' ').trim();}
const fallback={'재료 · 광물':'제작이나 가공에 사용하는 재료입니다.','도구 · 무기':'채집이나 전투에 사용하는 장비입니다.','방어구 · 가방':'캐릭터에 착용하는 장비입니다.','음식 · 음료':'섭취하거나 요리에 사용하는 아이템입니다.','의약품':'생존과 회복에 사용하는 의약품입니다.','건축 · 가구':'건물을 짓거나 꾸밀 때 사용하는 아이템입니다.','작업대 · 설비':'제작이나 기지 운영에 사용하는 설비입니다.','농사 · 동물':'농사 또는 동물 관리에 사용하는 아이템입니다.','기타':'특수 용도의 아이템입니다. 자세한 효과는 게임에서 확인하세요.'};
const details={};let localized=0,toolCount=0;
const fmt=n=>Number(n.toFixed(3)).toLocaleString('en-US',{maximumFractionDigits:3});
for(const i of catalog){
 const s=row(stat,i.static),a=row(itemable,s?.Itemable?.RowName),t=row(tool,s?.ToolDamage?.RowName),d=row(durable,s?.Durable?.RowName);
 let description=clean(loc(a?.Description));const source=description?'게임 한국어 설명':'분류 기반 안내';if(description)localized++;else description=fallback[library.groups[i.id]]||fallback['기타'];
 const stats=[];const add=(label,value)=>stats.push({label,value});
 if(t){toolCount++;if(t.Melee_Damage>0)add('근접 피해',fmt(t.Melee_Damage)+(t.DamageVariationPercentage>0?' (±'+fmt(t.DamageVariationPercentage)+'%)':''));
  if(t.Felling_Damage>0)add('벌목 피해',fmt(t.Felling_Damage));
  for(const [key,label] of [['Felling_Efficiency','벌목 효율'],['Mining_Efficiency','채굴 효율'],['Skinning_Efficiency','가죽 채취 효율'],['Reaping_Efficiency','수확 효율'],['Shattering_Efficiency','파쇄 효율']])if(t[key]>0)add(label,fmt(t[key])+'배');
  if(t.Shattering_Damage>0)add('파쇄 피해',fmt(t.Shattering_Damage));
 }
 if(d&&Number.isFinite(d.Max_Durability))add('최대 내구도',fmt(d.Max_Durability));
 if(a&&Number.isInteger(a.MaxStack)&&a.MaxStack>0)add('한 칸 최대 수량',fmt(a.MaxStack)+'개');
 details[i.id]={description,source,tool:!!t,stats};
}
const hashes={};for(const n of ['D_ItemsStatic','D_Itemable','D_ToolDamage','D_Durable'])hashes[n]=crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,n+'.json'))).digest('hex');
hashes.Korean=crypto.createHash('sha256').update(fs.readFileSync(process.argv[3])).digest('hex');
fs.writeFileSync(path.join(root,'assets/details.json'),JSON.stringify({details,hashes},null,2));
console.log(JSON.stringify({total:catalog.length,localized,fallback:catalog.length-localized,toolCount,examples:['Fiber','Stone_Pickaxe','Titanium_Pickaxe'].map(id=>({id,...details[id]}))},null,2));
