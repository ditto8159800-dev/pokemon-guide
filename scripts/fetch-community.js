#!/usr/bin/env node
/* Community/market ranking of each kept set's 当たり cards from Pokeca-Now (pokecanow.com), which publishes the daily median of
 * actual flea-market sales (メルカリ・Y!フリマ・ヤフオク) per card plus a PSA10 median. Saved to data/community/pokecanow-<set>.json.
 * Usage: node scripts/fetch-community.js [--set=M2] */
const fs=require('fs'),path=require('path');const ROOT=path.join(__dirname,'..');
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const [k,v]=a.replace(/^--/,'').split('=');return [k,v??true];}));
const CFG=JSON.parse(fs.readFileSync(path.join(ROOT,'content/site-config.json'),'utf8'));
const today=new Date().toISOString().slice(0,10);const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function text(h){return h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g,'').replace(/<[^>]+>/g,'\n').replace(/&amp;/g,'&').replace(/&#x27;|&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').split('\n').map(x=>x.trim()).filter(Boolean);}
(async()=>{
 for(const key of Object.keys(CFG.keep.hot)){const id=key.split(':')[1];if(args.set&&args.set!==id)continue;
  const url=`https://pokecanow.com/articles/packs/${id.toLowerCase()}/hits/`;await sleep(1200);
  let r;try{r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124'}});}catch(e){console.log(id,'ERR',e.message);continue;}
  if(!r.ok){console.log(id,'HTTP',r.status);continue;}
  const L=text(await r.text());let i=L.findIndex(x=>x.startsWith('Pokeca-Now が集計しているフリマ実売中央値'));const cards=[];
  if(i<0){console.log(id,'no ranking');continue;}
  for(let j=i+1;j<L.length&&cards.length<20;j++){
   if(/^\d+$/.test(L[j])&&+L[j]===cards.length+1&&(/\//.test(L[j+2]||'')||/\//.test(L[j+3]||''))){
     const rank=+L[j],name=L[j+1];let k=j+2,rarity=null;if(!/\//.test(L[k])){rarity=L[k];k++;}const num=L[k];
     const yen=s=>+String(s).replace(/[¥,\s]/g,'');let price=null,psa10=null;
     for(let m=k+1;m<k+8;m++){if(/^¥[\d,]+$/.test(L[m])&&L[m+1]==='フリマ相場'&&price===null)price=yen(L[m]);if(L[m]==='PSA10'&&/^¥/.test(L[m+1]||''))psa10=yen(L[m+1]);if(L[m]==='PSA10 '||/^PSA10\s*$/.test(L[m])&&/^¥/.test(L[m+1]||''))psa10=yen(L[m+1]);}
     cards.push({rank,name,rarity,num,price,psa10});j=k;}
  }
  fs.writeFileSync(path.join(ROOT,'data/community',`pokecanow-${id}.json`),JSON.stringify({set:id,source:'Pokeca-Now（フリマ実売中央値）',url,fetched:today,cards},null,1));
  console.log(id,cards.length,cards.slice(0,3).map(c=>`${c.name} ${c.rarity} ${c.num} ¥${c.price} psa¥${c.psa10}`).join(' | '));
 }
})();
