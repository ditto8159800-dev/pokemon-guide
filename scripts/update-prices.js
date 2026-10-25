#!/usr/bin/env node
/*
 * Refresh approximate prices for every set's top-10 chase cards -> data/prices.json
 *   npm run update-prices            (all)
 *   node scripts/update-prices.js --only=ja   (one language)
 * Sources:
 *   - Japanese cards: SNKRDUNK public search endpoint (https://snkrdunk.com/en/v1/search), lowest listed price (US$).
 *     One listing request per set (paged), then cards are matched by "[CODE NNN/MMM]".
 *   - English cards: PriceCharting public product pages (no API token). If PriceCharting refuses automated
 *     requests (HTTP 403 / bot challenge) we stop calling it for the rest of the run and fall back to the
 *     TCGplayer market price that TCGdex publishes for the card (source labelled accordingly).
 *   - zh-tw / zh-cn: no public price source configured -> no price shown.
 * Politeness: ~1 request/second per site, 3 retries with back-off. Never invents prices: when a fetch fails the
 * previous price is kept and marked stale:true.
 */
const fs=require('fs');const path=require('path');
const ROOT=path.join(__dirname,'..');
const PRICES=path.join(ROOT,'data/prices.json');
const SNK_DIR=path.join(ROOT,'data/snkrdunk');
const UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 pokemon-guide-price-bot';
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const [k,v]=a.replace(/^--/,'').split('=');return [k,v??'1'];}));
const today=new Date().toLocaleDateString('sv-SE'); // local date (box TZ)
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const last={};async function polite(host,ms=1100){const t=Date.now()-(last[host]||0);if(t<ms)await sleep(ms-t);last[host]=Date.now();}
async function get(url,{host,json=true,ms=1100}={}){
  for(let i=0;i<3;i++){
    await polite(host,ms);
    try{const r=await fetch(url,{headers:{'User-Agent':UA,'Accept':json?'application/json':'text/html'}});
      if(r.status===403||r.status===429) return {status:r.status,blocked:true};
      if(r.status===404) return {status:404};
      if(!r.ok) throw new Error('HTTP '+r.status);
      return {status:200,body:json?await r.json():await r.text()};
    }catch(e){await sleep(1500*(i+1));}
  }
  return {status:0,error:true};
}
const sets=JSON.parse(fs.readFileSync(path.join(ROOT,'data/sets.json'),'utf8'));
const prices=fs.existsSync(PRICES)?JSON.parse(fs.readFileSync(PRICES,'utf8')):{};
const stat={updated:0,failed:0,stale:0,noSource:0,unmatched:0,bySource:{}};
const RAR=/\s((?:C|U|R|RR|RRR|SR|HR|UR|AR|SAR|CHR|CSR|K|A|S|SSR|PR|ACE|MUR|BWR|TR|PROMO)(?::\s*SA)?)\s*\[/;
function parseSnk(it){const m=it.name.match(/\[\s*([A-Za-z0-9+.\-]+)\s+(?:[A-Z]{2}\s+)?([A-Za-z]*\d+)\/(\d+)\s*\]/);if(!m)return null;
  return {id:it.id,name:it.name,code:m[1].toLowerCase(),num:m[2].replace(/^0+/,''),rarity:(it.name.match(RAR)||[])[1]||null,minPrice:it.minPrice,url:`https://snkrdunk.com/en/trading-cards/${it.id}`,listingCount:+it.listingCount||0};}
async function snkSetListing(code){
  const items=[];let ok=false;
  for(let page=1;page<=4;page++){
    const r=await get(`https://snkrdunk.com/en/v1/search?keyword=${encodeURIComponent(code)}&page=${page}&perPage=100`,{host:'snkrdunk'});
    if(r.status!==200){break;} ok=true;
    const arr=r.body.streetwears||[];items.push(...arr);
    if(arr.length<100) break;
  }
  if(!ok) return null;
  return items.filter(x=>x.isTradingCard!==false&&!/Campaign|BOX|Box|PSA|BGS|ARS|CGC|Pack\)?$|パック/.test(x.name.split('[')[0])).map(parseSnk).filter(x=>x&&x.code===code.toLowerCase());
}
let pcBlocked=false;
async function priceCharting(card,set){
  if(pcBlocked) return null;
  const q=`${card.name.replace(/[^\w\s'-]/g,' ')} ${set.name} ${card.localId}`.replace(/\s+/g,' ').trim();
  const url=`https://www.pricecharting.com/search-products?q=${encodeURIComponent(q)}&type=prices`;
  const r=await get(url,{host:'pricecharting',json:false});
  if(r.blocked||(r.body&&/Just a moment|cf-challenge|challenge-platform/.test(r.body))){pcBlocked=true;console.log('PriceCharting refuses automated requests (HTTP '+r.status+'); skipping it for this run and using the TCGplayer fallback.');return null;}
  if(r.status!==200) return null;
  const m=r.body.match(/id="used_price"[\s\S]*?\$([\d,]+\.\d\d)/);const m10=r.body.match(/id="manual_only_price"[\s\S]*?\$([\d,]+\.\d\d)/);
  const canon=(r.body.match(/<link rel="canonical" href="([^"]+)"/)||[])[1]||url;
  if(!m) return null;
  return {price:+m[1].replace(/,/g,''),currency:'USD',condition:'raw (ungraded)',psa10:m10?+m10[1].replace(/,/g,''):null,source:'PriceCharting',url:canon};
}
async function tcgplayerViaTcgdex(card){
  const id=card.key.split(':')[1];
  const r=await get(`https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(id)}`,{host:'tcgdex',ms:250});
  if(r.status!==200) return null;
  const tp=r.body.pricing?.tcgplayer; if(!tp) return null;
  const variants=['holofoil','normal','reverse-holofoil','1st-edition-holofoil','1st-edition','unlimited-holofoil','unlimited'];
  let best=null;for(const v of Object.keys(tp)){const p=tp[v];if(p&&typeof p==='object'&&p.marketPrice){if(!best||variants.indexOf(v)!==-1&&(best.v==='reverse-holofoil'||variants.indexOf(v)<variants.indexOf(best.v)))best={v,p:p.marketPrice};}}
  if(!best) return null;
  return {price:best.p,currency:'USD',condition:`raw (ungraded, TCGplayer market price, ${best.v})`,source:'TCGplayer（經 TCGdex）',url:`https://www.tcgplayer.com/product/${tp[best.v].productId}`,sourceUpdated:(tp.updated||'').slice(0,10)};
}
function setPrice(key,val){
  if(val){prices[key]={...val,fetched:today,stale:false};stat.updated++;stat.bySource[val.source]=(stat.bySource[val.source]||0)+1;}
  else if(prices[key]){prices[key].stale=true;stat.stale++;}
  else stat.failed++;
}
(async()=>{
  fs.mkdirSync(SNK_DIR,{recursive:true});
  const v1=sets.filter(s=>s.v1&&(!args.only||s.lang===args.only));
  // 1) Japanese: one SNKRDUNK listing per set (also saved for chase ranking fallback)
  for(const s of v1.filter(s=>s.lang==='ja'&&s.tcgdex&&!/-P$|^SVK|^SVL|^SMP/.test(s.id))){
    const code=s.id.toLowerCase();
    const f=path.join(SNK_DIR,`${s.id}.json`);
    const list=args.cache&&fs.existsSync(f)?JSON.parse(fs.readFileSync(f)).items:await snkSetListing(code);
    if(list&&!args.cache){fs.writeFileSync(f,JSON.stringify({set:s.id,fetched:today,source:'SNKRDUNK',items:list}));}
    const cached=list||(fs.existsSync(f)?JSON.parse(fs.readFileSync(f)).items:null);
    process.stdout.write(`ja ${s.id}: ${list?list.length+' listings':'FAILED (using cache: '+!!cached+')'}\n`);
    for(const c of s.chase||[]){
      const num=String(c.localId).replace(/^0+/,'');
      const hits=(list||[]).filter(x=>x.num===num&&x.minPrice>0);
      if(!list){setPrice(c.key,null);continue;}
      if(!hits.length){stat.unmatched++;if(prices[c.key]){prices[c.key].stale=true;stat.stale++;}continue;}
      const h=hits.sort((a,b)=>b.listingCount-a.listingCount)[0];
      setPrice(c.key,{price:h.minPrice,currency:'USD',condition:'raw (ungraded) — SNKRDUNK 最低在售價',source:'SNKRDUNK',url:h.url,listingName:h.name});
    }
  }
  if(args.only==='ja'){fs.writeFileSync(PRICES,JSON.stringify(prices,null,1));console.log('SUMMARY(ja)',JSON.stringify(stat));return;}
  // 2) English: PriceCharting first, TCGplayer-via-TCGdex fallback
  for(const s of v1.filter(s=>s.lang==='en')){
    for(const c of s.chase||[]){
      let v=await priceCharting(c,s); if(!v) v=await tcgplayerViaTcgdex(c);
      setPrice(c.key,v);
    }
  }
  // 3) zh-tw / zh-cn: no configured public source
  for(const s of v1.filter(s=>s.lang==='zh-tw'||s.lang==='zh-cn')) stat.noSource+=(s.chase||[]).length;
  fs.writeFileSync(PRICES,JSON.stringify(prices,null,1));
  const summary={date:today,...stat,pricechartingBlocked:pcBlocked,totalPrices:Object.keys(prices).length};
  fs.writeFileSync(path.join(ROOT,'data/prices-last-run.json'),JSON.stringify(summary,null,1));
  console.log('SUMMARY',JSON.stringify(summary));
})();
