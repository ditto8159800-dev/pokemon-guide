#!/usr/bin/env node
// Find each shown set's Japanese booster box on TCGplayer (product line "Pokemon Japan", sealed) and record its
// official product image + page -> content/box-images.json. Only sets missing from the file are looked up (use --all to redo).
const fs=require('fs');const path=require('path');const ROOT=path.join(__dirname,'..');
const OUT=path.join(ROOT,'content/box-images.json');
const cfg=JSON.parse(fs.readFileSync(path.join(ROOT,'content/site-config.json'),'utf8'));
const out=fs.existsSync(OUT)?JSON.parse(fs.readFileSync(OUT,'utf8')):{};
const sets=JSON.parse(fs.readFileSync(path.join(ROOT,'data/sets.json'),'utf8')).filter(s=>cfg.keep.hot[s.key]);
const all=process.argv.includes('--all');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function search(q){
  const r=await fetch(`https://mp-search-api.tcgplayer.com/v1/search/request?q=${encodeURIComponent(q)}&isList=false`,{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'Mozilla/5.0 pokemon-guide'},
    body:JSON.stringify({algorithm:'sales_synonym_v2',from:0,size:24,filters:{term:{productLineName:['pokemon-japan'],productTypeName:['Sealed Products']},range:{},match:{}},listingSearch:{context:{cart:{}},filters:{term:{sellerStatus:'Live',channelId:0},range:{quantity:{gte:1}},exclude:{channelExclusion:0}}},context:{cart:{},shippingCountry:'US',userProfile:{}},settings:{useFuzzySearch:false,didYouMean:{}},sort:{}})});
  if(!r.ok) return [];const d=await r.json();return d.results?.[0]?.results||[];
}
(async()=>{
  for(const s of sets){
    if(out[s.key]&&!all) continue;
    const code=s.id.toLowerCase();let hit=null;
    for(const q of [`${s.id} booster box`,`${s.translated||s.names?.en||s.name} booster box`]){
      const res=await search(q);await sleep(800);
      const ok=res.filter(x=>String(x.setName||'').toLowerCase().startsWith(code+':'));
      hit=ok.find(x=>/booster box/i.test(x.productName)&&!/case|display|bundle/i.test(x.productName))||ok.find(x=>/box/i.test(x.productName)&&!/case/i.test(x.productName));
      if(hit) break;
    }
    if(!hit){console.log(s.key,'no box found');continue;}
    const id=Math.round(hit.productId);const img=`https://tcgplayer-cdn.tcgplayer.com/product/${id}_in_400x400.jpg`;
    const h=await fetch(img,{method:'HEAD'});if(!h.ok){console.log(s.key,'image not reachable');continue;}
    out[s.key]={img,product:hit.productName,url:`https://www.tcgplayer.com/product/${id}`,source:'TCGplayer'};
    console.log(s.key,'->',hit.productName,id);
  }
  fs.writeFileSync(OUT,JSON.stringify(out,null,1));
})();
