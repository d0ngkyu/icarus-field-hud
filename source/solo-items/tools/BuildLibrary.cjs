// Inputs are locally extracted D_ItemsStatic / D_ProcessorRecipes JSON tables.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog.json')));
const stat=JSON.parse(fs.readFileSync(process.argv[2])),recipes=JSON.parse(fs.readFileSync(process.argv[3]));
const categories=['전체','재료 · 광물','도구 · 무기','방어구 · 가방','음식 · 음료','의약품','건축 · 가구','작업대 · 설비','농사 · 동물','기타'];
const byStatic=new Map(stat.Rows.map(r=>[r.Name,r])),byRecipe=new Map(recipes.Rows.map(r=>[r.Name,r]));
function category(r){
 const tags=(r?.Generated_Tags?.GameplayTags||r?.Manual_Tags?.GameplayTags||[]).map(t=>t.TagName);
 const has=(prefix)=>tags.some(t=>t===prefix||t.startsWith(prefix+'.'));
 if(has('Item.Medicine'))return categories[5];
 if(has('Item.Consumable'))return categories[4];
 if(has('Item.Resource')||has('Item.Fuel'))return categories[1];
 if(r?.Buildable||has('Item.Decoration')||has('Item.BuildingTrim')||has('Item.Rug'))return categories[6];
 if(has('Item.Armor')||has('Item.Envirosuit')||has('Item.Backpack')||has('Item.Bag'))return categories[3];
 if(has('Item.Tool')||has('Item.Weapon')||has('Item.Ammo')||has('Item.Attachment')||has('Item.Shield'))return categories[2];
 if(has('Item.Seed')||has('Item.Plant')||has('Item.Plot')||has('Item.Fertilizer')||has('Item.AnimalFeed')||has('Item.Husbandry')||has('Item.Mount')||has('Item.Meta.Animal')||has('Item.Bee'))return categories[8];
 if(r?.Deployable||has('Item.Bench')||has('Item.Machine')||has('Item.Utility'))return categories[7];
 return categories[9];
}
const groups=Object.fromEntries(catalog.map(i=>[i.id,category(byStatic.get(i.static))]));
function itemForStatic(id){const matches=catalog.filter(i=>i.static===id);const item=matches.find(i=>i.id===id)||matches[0];if(!item)throw Error('No template for '+id);return item;}
const defs=[['기초 공방',['Crafting_Bench','Stone_Furnace','Anvil_Bench']],['목공 작업대',['Carpentry_Bench']],['석공 작업대',['Masonry_Bench']],['방어구 작업대',['Armor_Bench']],['약초 작업대',['Herbalism_Bench']],['가공 작업대',['Machining_Bench']],['전자 제작대',['Fabricator']]];
const sets=defs.map(([name,ids])=>{
 const combined=new Map(),targets=[],benches=new Set();
 for(const id of ids){const r=byRecipe.get(id);if(!r)throw Error('Missing recipe '+id);
  for(const input of r.Inputs){if(input.Element.DataTableName!=='D_ItemsStatic'||!Number.isInteger(input.Count)||input.Count<1)throw Error('Unsupported recipe input');const item=itemForStatic(input.Element.RowName);combined.set(item.id,(combined.get(item.id)||0)+input.Count);}
  for(const output of r.Outputs){const item=catalog.find(i=>i.id===output.Element.RowName);if(!item)throw Error('Unknown output');targets.push(item.name+' '+output.Count+'개');}
  for(const b of r.RecipeSets||[])benches.add(b.RowName);
 }
 const items=[...combined].map(([id,count])=>({id,count}));const total=items.reduce((s,i)=>s+i.count,0);
 if(total>1000||items.length>20)throw Error('Set exceeds request limit');
 return {name,description:targets.join(' + ')+' 제작 재료',recipes:ids,items,total};
});
const sourceHash=crypto.createHash('sha256').update(fs.readFileSync(process.argv[3])).digest('hex');
fs.writeFileSync(path.join(root,'assets/library.json'),JSON.stringify({categories,groups,sets,sourceHash},null,2));
console.log(JSON.stringify({counts:Object.fromEntries(categories.slice(1).map(c=>[c,Object.values(groups).filter(x=>x===c).length])),sets:sets.map(s=>({name:s.name,total:s.total,items:s.items}))},null,2));
