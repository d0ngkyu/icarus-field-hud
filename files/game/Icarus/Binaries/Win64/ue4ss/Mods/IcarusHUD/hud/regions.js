/* Static atlas labels. No telemetry, polling or game-memory reads.
 * Anchors: Icarus Field Guide interactive maps, 2026-11-16 (see MAP-REGIONS.md).
 * Coordinates are percentages of the north-up 806400 cm map. Korean labels are
 * HUD translations; English game names remain available when zoomed in.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HudRegions=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const data={
  Terrain_016:[
   ['Forest','삼림',69.455,69.126],['River Lands','강 유역',30.943,21.639],
   ['Arctic','극지',44.243,54.038],['Desert','사막',17.777,65.082],
   ['Desert Canyons','사막 협곡',79.018,24.693],['Southern Glacier','남부 빙하',84.271,87.938]
  ],
  Terrain_017:[
   ['The Great River','큰 강',44.117,50.489],['Dry Ridge','드라이 릿지',31.482,33.412],
   ['Enclosed Wood','막힌 숲',56.046,67.177],['Oasis','오아시스',79.066,78.011],
   ['The Wall','장벽',14.248,61.371],['Alpine Valley','고산 계곡',61.936,10.498],
   ['Frozen Traverse','얼어붙은 길',71.009,48.397],['Grove','작은 숲',32.839,15.238],
   ['Ice Flats','얼음 평원',12.261,16.927],['Ring Lake','고리 호수',90.773,43.128],
   ['Snowy Plateau','눈 덮인 고원',46.853,82.986],['Verdant Terraces','푸른 단구',7.487,27.514],
   ['Dusty Barrens','먼지 황무지',90.963,64.254]
  ],
  Terrain_019:[
   ['Alpine Steppe','고산 초원',33.26,54.273],['Ashlands','잿빛 땅',85.832,62.676],
   ['Ice Sheet','빙상',33.853,73.428],['Marshlands','습지대',69.706,25.389],
   ['Basalt Expansion','현무암 지대',59.891,8.897],['Basalt Valley','현무암 계곡',78.342,19.359],
   ['Frigid Lowlands','혹한 저지대',45.261,62.084],['Glacial Cascade','빙하 폭포',16.584,11.465],
   ['Grassy Plains','풀밭 평원',49.105,36.396],['Lava Flows','용암 지대',89.936,16.042],
   ['Lava Pool','용암 웅덩이',81.911,92.434],['Middle Ice Sheet','중부 빙상',44.207,89.422],
   ['Rolling Tundra','툰드라 구릉',34.567,16.344],['Shallow Mire','얕은 늪',72.672,23.426],
   ['Still Water','고요한 물가',8.926,33.1],['Sylvan Range','삼림 산맥',60.041,52.591],
   ['The Pillars','기둥 지대',27.044,40.483],['Upper Ice Sheet','상부 빙상',35.576,74.955],
   ['Wetlands','습지',13.856,53.425],['Wildwoods','야생 숲',35.098,28.693]
  ]
 };
 for(const rows of Object.values(data)){for(const row of rows)Object.freeze(row);Object.freeze(rows)}Object.freeze(data);
 function world(row){return[(row[2]/100-.5)*806400,(row[3]/100-.5)*806400]}
 function overlaps(a,b){return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top}
 function layout(map,project,width,height,scale,measure){
  if(!Number.isFinite(scale)||scale<=0||width<=0||height<=0)return[];
  const font=Math.max(12,Math.min(18,12+scale*12)),detail=scale>=.16,out=[];
  for(const row of data[map]||[]){const [x,y]=world(row),[sx,sy]=project(x,y);
   if(!Number.isFinite(sx)||!Number.isFinite(sy))continue;
   const w=Math.max(measure(row[1],font),detail?measure(row[0],10):0)+16,h=detail?font+22:font+10;
   const box={left:sx-w/2,right:sx+w/2,top:sy-h/2,bottom:sy+h/2};
   // Keep edge labels whole; fixed priority prevents flickering during small pans.
   if(box.left<4||box.top<4||box.right>width-4||box.bottom>height-4||out.some(o=>overlaps(box,o.box)))continue;
   out.push({name:row[1],english:row[0],worldX:x,worldY:y,x:sx,y:sy,font,detail,box});
  }return out;
 }
 function draw(ctx,map,project,width,height,scale,visible=()=>true){
  ctx.save();
  try{
   const labels=layout(map,project,width,height,scale,(s,size)=>{ctx.font='600 '+size+'px "Noto Sans KR",sans-serif';return ctx.measureText(s).width});
   ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=3.5;ctx.strokeStyle='rgba(8,13,17,.92)';
   for(const l of labels){ctx.globalAlpha=visible(l.worldX,l.worldY)?1:.14;const y=l.y-(l.detail?6:0);ctx.font='600 '+l.font+'px "Noto Sans KR",sans-serif';ctx.fillStyle='#f3e8cb';ctx.strokeText(l.name,l.x,y);ctx.fillText(l.name,l.x,y);
    if(l.detail){ctx.font='600 10px "Noto Sans KR",sans-serif';ctx.fillStyle='#c3cdd0';ctx.strokeText(l.english,l.x,y+l.font+2);ctx.fillText(l.english,l.x,y+l.font+2)}
   }return labels;
  }finally{ctx.restore()}
 }
 return{data,world,layout,draw};
});
