#!/usr/bin/env node
/*
 * Refresh approximate prices for every set's top-10 chase cards -> data/prices.json
 *   npm run update-prices            (all)
 *   node scripts/update-prices.js --only=ja   (one language)
 *   Only sets shown on the site (content/site-config.json: languages + keep list) are refreshed; pass --all to ignore that.
 * Sources:
 *   - Japanese cards: raw = TCGplayer market price of the exact Japanese product (found via TCGplayer search, verified by
 *     product line + set code + card number; product page must resolve), fallback SNKRDUNK lowest condition-A listing.
 *     PSA 10 = SNKRDUNK lowest PSA 10 listing on sale. Card image link = TCGplayer product page, fallback SNKRDUNK page.
 *     SNKRDUNK public search endpoint (https://snkrdunk.com/en/v1/search) is still used per set to find each card.
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

// ---- per-card helpers (Japanese cards) ----
async function snkUsedLowest(id,conditionID){ // conditionID: 22 = PSA 10, 18 = A (near mint, ungraded)
  const r=await get(`https://snkrdunk.com/en/v1/products/SW---${id}/used-listings?perPage=20&page=1&conditionID=${conditionID}&isOnlyOnSale=true&sortType=price_asc`,{host:'snkrdunk'});
  if(r.status!==200) return null;
  const xs=(r.body.usedListings||[]).filter(x=>!x.isSold&&x.currency==='USD'&&x.priceAmount>0).map(x=>x.priceAmount);
  return xs.length?Math.min(...xs):null;
}
async function tcgSearch(q,from=0,type=null){
  await polite('tcgplayer',800);
  try{const r=await fetch(`https://mp-search-api.tcgplayer.com/v1/search/request?q=${encodeURIComponent(q)}&isList=false`,{method:'POST',headers:{'User-Agent':UA,'Content-Type':'application/json'},
    body:JSON.stringify({algorithm:'sales_synonym_v2',from,size:24,filters:{term:{productLineName:['pokemon-japan'],...(type?{productTypeName:[type]}:{})},range:{},match:{}},listingSearch:{context:{cart:{}},filters:{term:{sellerStatus:'Live',channelId:0},range:{quantity:{gte:1}},exclude:{channelExclusion:0}}},context:{cart:{},shippingCountry:'US',userProfile:{}},settings:{useFuzzySearch:false,didYouMean:{}},sort:{}})});
    if(!r.ok) return [];const d=await r.json();return d.results?.[0]?.results||[];}catch(e){return [];}
}
async function tcgplayerJapan(set,card,enName){
  const code=set.id.toLowerCase();const n=String(card.localId).replace(/^0+/,'');
  const ok=x=>String(x.setName||'').toLowerCase().startsWith(code+':')&&String(x.customAttributes?.number||'').split('/')[0].replace(/^0+/,'')===n;
  let hit=null;
  for(const q of [enName&&`${enName} ${card.num}`,`${set.id} ${card.num}`,enName&&`${enName} ${set.id}`].filter(Boolean)){
    hit=(await tcgSearch(q)).find(ok);if(hit) break;}
  if(!hit) return null;
  const id=Math.round(hit.productId);
  // verify: product detail must exist, be the Japanese product line, and carry the same number; product page must resolve
  const d=await get(`https://mp-search-api.tcgplayer.com/v2/product/${id}/details`,{host:'tcgplayer',ms:800});
  if(d.status!==200||d.body.productLineUrlName!=='Pokemon Japan'||String(d.body.customAttributes?.number||'').split('/')[0].replace(/^0+/,'')!==n) return null;
  const pg=await get(`https://www.tcgplayer.com/product/${id}`,{host:'tcgplayer-web',json:false,ms:800});
  if(pg.status!==200) return null;
  return {productId:id,url:`https://www.tcgplayer.com/product/${id}`,marketPrice:d.body.marketPrice??hit.marketPrice??null,name:d.body.productName||hit.productName};
}
function setPrice(key,val){
  if(val){prices[key]={...val,fetched:today,stale:false};stat.updated++;stat.bySource[val.source]=(stat.bySource[val.source]||0)+1;}
  else if(prices[key]){prices[key].stale=true;stat.stale++;}
  else stat.failed++;
}
(async()=>{
  fs.mkdirSync(SNK_DIR,{recursive:true});
  // only refresh languages shown on the site (content/site-config.json); --only=xx narrows further, --all ignores the config
  const CFG=JSON.parse(fs.readFileSync(path.join(ROOT,'content/site-config.json'),'utf8'));
  const SHOWN=CFG.languages;const KEEP=CFG.keep?new Set(Object.keys(CFG.keep.hot)):null; // same kept list as the site
  const v1=sets.filter(s=>(!args.set||s.id===args.set)&&s.v1&&(args.all||SHOWN.includes(s.lang)&&(!KEEP||KEEP.has(s.key)))&&(!args.only||s.lang===args.only));
  // 1) Japanese: one SNKRDUNK listing per set (also saved for chase ranking fallback)
  // sets not in TCGdex yet (content/manual-sets.json): take the card list from TCGplayer's Japanese product line
  for(const s of v1.filter(s=>s.lang==='ja'&&!s.tcgdex&&/^manual|官方/.test(s.src||'')||s.lang==='ja'&&!s.tcgdex&&s.manualNote)){
    const f=path.join(ROOT,'data/tcgplayer');fs.mkdirSync(f,{recursive:true});
    const code=s.id.toLowerCase();const seen=new Map();
    if(!(args.cache&&fs.existsSync(path.join(f,s.id+'.json')))){
      for(const q of [s.id,`${s.id} SAR`,`${s.id} AR`,`${s.id} SR`,`${s.id} UR`,`${s.translated||s.name}`]){
        for(let from=0;from<96;from+=24){const res=await tcgSearch(q,from,'Cards');const hits=res.filter(x=>String(x.setName||'').toLowerCase().startsWith(code+':'));
          hits.forEach(x=>seen.set(Math.round(x.productId),x));if(res.length<24)break;}
      }
      const cards=[...seen.values()].map(x=>({productId:Math.round(x.productId),name:String(x.productName).replace(/\s*-\s*[\w]+\/\d+.*$/,'').trim(),number:x.customAttributes?.number||'',rarity:x.rarityName||'',marketPrice:x.marketPrice||null,setName:x.setName}));
      if(cards.length) fs.writeFileSync(path.join(f,s.id+'.json'),JSON.stringify({set:s.id,fetched:today,source:'TCGplayer',cards},null,1));
      process.stdout.write(`ja ${s.id}: TCGplayer card list ${cards.length}\n`);
    }
  }
  for(const s of v1.filter(s=>s.lang==='ja'&&(s.tcgdex||s.manualNote)&&!/-P$|^SVK|^SVL|^SMP/.test(s.id))){
    const code=s.id.toLowerCase();
    const f=path.join(SNK_DIR,`${s.id}.json`);
    const list=args.cache&&fs.existsSync(f)?JSON.parse(fs.readFileSync(f)).items:await snkSetListing(code);
    if(list&&!args.cache){fs.writeFileSync(f,JSON.stringify({set:s.id,fetched:today,source:'SNKRDUNK',items:list}));}
    const cached=list||(fs.existsSync(f)?JSON.parse(fs.readFileSync(f)).items:null);
    process.stdout.write(`ja ${s.id}: ${list?list.length+' listings':'FAILED (using cache: '+!!cached+')'}\n`);
    for(const c of s.chase||[]){
      const num=String(c.localId).replace(/^0+/,'');
      if(!cached){setPrice(c.key,null);continue;}
      // second pass of `npm run update-prices` (--cache) reuses today's card-level results instead of re-requesting
      if(args.cache&&prices[c.key]?.fetched===today&&prices[c.key]?.cardCheck===today){stat.reused=(stat.reused||0)+1;continue;}
      const cands=cached.filter(x=>x.num===num&&!/^【/.test(x.name)).sort((a,b)=>b.listingCount-a.listingCount||b.minPrice-a.minPrice);
      const snk=cands[0]||null;
      const enName=snk?snk.name.split('[')[0].replace(/\s+(?:C|U|R|RR|RRR|SR|HR|UR|AR|SAR|CHR|CSR|K|A|S|SSR|PR|ACE|MUR|BWR|MA|TR)(?::\s*SA)?\s*$/,'').trim():null;
      const tp=await tcgplayerJapan(s,c,enName);           // exact Japanese product on TCGplayer (verified)
      const psa=snk?await snkUsedLowest(snk.id,22):null;   // SNKRDUNK lowest PSA 10 listing on sale
      let raw=null;
      if(tp&&tp.marketPrice>0) raw={price:tp.marketPrice,currency:'USD',condition:'raw (ungraded) — TCGplayer market price',source:'TCGplayer',url:tp.url};
      else if(snk){const a=await snkUsedLowest(snk.id,18);if(a) raw={price:a,currency:'USD',condition:'raw (ungraded, 狀態 A) — SNKRDUNK 最低在售價',source:'SNKRDUNK',url:snk.url};}
      const prev=prices[c.key]||{};
      const link=tp?{url:tp.url,kind:'TCGplayer'}:snk?{url:snk.url,kind:'SNKRDUNK'}:(prev.link||null);
      if(raw) setPrice(c.key,raw); else {stat.noRaw=(stat.noRaw||0)+1; if(prices[c.key]){prices[c.key].stale=true;} else prices[c.key]={price:null};}
      const p=prices[c.key];
      p.psa10=psa?{price:psa,currency:'USD',source:'SNKRDUNK',url:snk.url+'/used?condition=psa_10',fetched:today,note:'PSA 10 最低在售價'}:(prev.psa10?{...prev.psa10,stale:true}:null);
      p.link=link;p.cardCheck=today;if(tp) p.tcgplayerId=tp.productId;
      stat.psa10=(stat.psa10||0)+(psa?1:0);stat.tcgLink=(stat.tcgLink||0)+(tp?1:0);stat.snkLink=(stat.snkLink||0)+(!tp&&snk?1:0);
      process.stdout.write(`  ${c.key} raw:${raw?raw.source+' '+raw.price:'-'} psa10:${psa??'-'} link:${link?link.kind:'-'}\n`);
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
