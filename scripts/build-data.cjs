// Build site/data/*.js from cached TCGdex + Bulbapedia data. Run: node scripts/build-data.cjs
const fs=require('fs');const path=require('path');
const {RANK,popScore}=require('./lib-rarity.cjs');
const R=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const LANGS=['en','ja','zh-tw','zh-cn'];
const LANG_LABEL={en:'美版（英文）',ja:'日版',"zh-tw":'繁中版',"zh-cn":'簡中版'};
const curated=R('content/curated.json');
const SHOWN=R('content/site-config.json').languages; // languages shown on the site (currently ja only)
const prices=fs.existsSync('data/prices.json')?R('data/prices.json'):{};
const bulbaJp=R('data/sources/bulba-jp.json');
const bulbaTw=R('data/sources/bulba-zhtw.json').filter(x=>!/Simplified/.test(x.zh_tw));
const raw={},cards={};
for(const l of LANGS){raw[l]=R(`data/raw/${l}-sets.json`);cards[l]=R(`data/raw/cards-${l}.json`);}
const norm=s=>(s||'').normalize('NFKC').replace(/\s+/g,'').replace(/[・•]/g,'').toLowerCase();
const toDate=s=>{const d=new Date(s+' UTC');return isNaN(d)?null:d.toISOString().slice(0,10)};

// ---- era mapping (unified) ----
const ERA=[['classic','初代（1996–2000）'],['neo','Neo 系列'],['ecard','e 卡系列'],['ex','EX / ADV / PCG 系列'],['dp','鑽石&珍珠 / 白金'],['hgss','心金魂銀 / LEGEND'],['bw','黑白（BW）'],['xy','XY / XY BREAK'],['sm','太陽&月亮（SM）'],['swsh','劍&盾（S）'],['sv','朱&紫（SV）'],['mega','MEGA 進化'],['other','促銷 / 牌組 / 其他']];
const SERIE2ERA={base:'classic',gym:'classic',PMCG:'classic',neo:'neo',lc:'neo',ecard:'ecard',e:'ecard',VS:'ecard',web:'ecard',ex:'ex',ADV:'ex',PCG:'ex',dp:'dp',pl:'dp',hgss:'hgss',col:'hgss',L:'hgss',bw:'bw',xy:'xy',XY:'xy',XYb:'xy',sm:'sm',SM:'sm',swsh:'swsh',S:'swsh',sv:'sv',SV:'sv',me:'mega',M:'mega',pop:'other',tk:'other',mc:'other',misc:'other'};
const BULBA_ERA={'Original Era':'classic','neo Era':'neo','VS Era':'ecard','web Era':'ecard','e-Card Era':'ecard','ADV Era':'ex','PCG Era':'ex','DP Era':'dp','DPt Era':'dp','LEGEND Era':'hgss','BW Era':'bw','XY Era':'xy','XY BREAK Era':'xy','Sun & Moon Era':'sm','Sword & Shield Era':'swsh','Scarlet & Violet Era':'sv','MEGA Series':'mega'};
const KIND_ZH={'Main':'主要擴充包','Subset':'特別擴充包','Concept Packs':'概念包','Enhanced Expansion Packs':'強化擴充包','High Class Expansion Packs':'高級擴充包（ハイクラスパック）'};
const isOtherByName=n=>/promo|プロモ|特典|trainer kit|mcdonald|jumbo|sample|best of game|starter|スターター|デッキ|牌組|組合|futsal|rumble|energy$|energy\b|my first battle|collection 20\d\d|unown|card creator|w promotional|家庭|收藏箱|exu$/i.test(n||'');

// ---- assemble set records ----
const sets=[];const byKey={};
function add(s){s.key=`${s.lang}:${s.id}`;if(byKey[s.key])return;byKey[s.key]=s;sets.push(s);}
for(const l of LANGS){
  for(const s of raw[l]){
    if(s.serie?.id==='tcgp') continue;                       // TCG Pocket = digital game, excluded
    if((l==='ja'||l==='zh-tw')&&/^CS/.test(s.id)) continue;   // TCGdex mislabelled Simplified-Chinese CS sets
    if(l==='zh-cn'&&(/^csm/.test(s.id)||/^SV/.test(s.id))) continue; // machine-named duplicates / Trad.-Chinese duplicates
    if(l==='ja'&&/^SM\dp$|^SM2p$/i.test(s.id)) continue;      // duplicates of SM1+/SM2+/... in TCGdex
    const NAME_FIX={'ja:SV4a':'シャイニートレジャーex'}; // TCGdex mislabels SV4a as レイジングサーフ (Bulbapedia: Shiny Treasure ex)
    if(NAME_FIX[l+':'+s.id]) s.name=NAME_FIX[l+':'+s.id];
    let era=SERIE2ERA[s.serie?.id]||'other';
    if(isOtherByName(s.name)||/p$/.test(s.id)&&/promo/i.test(s.name)) era='other';
    const lg=s.logo?s.logo+'.png':null, sy=s.symbol?s.symbol+'.png':null;
    add({lang:l,id:s.id,name:s.name,date:s.releaseDate||null,dateConfirmed:!!s.releaseDate,era,serie:s.serie?.name||'',official:s.cardCount?.official??null,total:s.cardCount?.total??null,logo:lg,symbol:sy,src:'TCGdex',tcgdex:true,cards:(s.cards||[]).map(c=>c.id)});
  }
}
// ja: Bulbapedia main/sub sets missing from TCGdex
const jaByName={};for(const s of sets.filter(s=>s.lang==='ja'))(jaByName[norm(s.name)]??=[]).push(s);
let bulbaAdded=0;const bulbaMap=[];
bulbaJp.forEach((b,bi)=>{
  const names=b.ja.split(/\s*(?: \/ |•)\s*/).map(x=>x.trim()).filter(Boolean);
  const date=toDate(b.date);
  names.forEach((nm,i)=>{
    const n2=nm.replace(/^強化拡張パックex1/,'');
    let hit=(jaByName[norm(nm)]||jaByName[norm(n2)]||[]).find(s=>!date||!s.date||Math.abs(new Date(s.date)-new Date(date))<200*864e5);
    if(!hit){
      const counts=b.count.split(' / ');
      hit={lang:'ja',id:`bp-${bi}${names.length>1?'-'+i:''}`,name:nm,date,dateConfirmed:!!date,era:BULBA_ERA[b.era]||'other',serie:b.era,official:parseInt(counts[i]||counts[0])||null,total:null,logo:null,symbol:null,src:'Bulbapedia',tcgdex:false,cards:[]};
      add(hit);bulbaAdded++;
    }
    hit.kind=b.kind; hit.translated=(b.translated.split('/')[i]||b.translated).trim(); hit.enEquivText=b.en_equiv;
    bulbaMap.push({ja:hit,b});
  });
});
// zh-tw: Bulbapedia names missing from TCGdex zh-tw
const twByName={};for(const s of sets.filter(s=>s.lang==='zh-tw'))(twByName[norm(s.name)]??=[]).push(s);
const jaAll=sets.filter(s=>s.lang==='ja');
bulbaTw.forEach((t,ti)=>{
  const ja=t.ja?jaAll.find(s=>norm(s.name)===norm(t.ja)):null;
  let tw=(twByName[norm(t.zh_tw)]||[])[0]||(ja&&byKey['zh-tw:'+ja.id]);
  if(!tw){
    tw={lang:'zh-tw',id:`bp-tw-${ti}`,name:t.zh_tw,date:null,dateConfirmed:false,approxDate:ja?.date||null,era:ja?.era||'sm',serie:ja?.serie||'',official:ja?.official??null,total:ja?.total??null,logo:null,symbol:null,src:'Bulbapedia',tcgdex:false,cards:[]};
    if(!ja&&/All Stars|Dreams Come True|Double Burst|Legendary Clash/.test(t.translated)){tw.era='sm';}
    if(!ja&&/Sword & Shield|Infinite Power/.test(t.translated)){tw.era='swsh';}
    add(tw);
  }
  tw.translated=t.translated;
  if(ja){tw.links=tw.links||new Set();ja.links=ja.links||new Set();tw.links.add(ja.key);ja.links.add(tw.key);}
});
// zh-cn: names/dates/card lists from Bulbapedia ATCG pages (TCGdex zh-cn card lists are mostly empty)
const bulbaCn=R('data/sources/bulba-zhcn-sets.json');
for(const b of bulbaCn){
  const id=b.code.replace(/^(CSM?)(\d)5$/,'$1$2.5')+'C';
  let s=byKey['zh-cn:'+id];
  const zh=(b.zh||'').includes('}')?null:b.zh;
  const date=toDate(b.release);
  if(!s){s={lang:'zh-cn',id:'bp-'+b.code,name:zh||b.page,date,dateConfirmed:!!date,era:/^CSV|^CBB/.test(b.code)?'sv':/^CSM/.test(b.code)?'sm':'swsh',serie:'',official:null,total:b.entries.length||null,logo:null,symbol:null,src:'Bulbapedia',tcgdex:false,cards:[]};add(s);}
  if(zh) s.name=zh;
  if(date){s.date=date;s.dateConfirmed=true;}
  s.era=/^CSV|^CBB/.test(b.code)?'sv':/^CSM/.test(b.code)?'sm':'swsh';
  if(/^CBB|^CSVL|^CSVN/.test(b.code)) s.kind='Subset';
  s.translated=b.label; s.bulbaPage=b.page+' (ATCG)'; s.bulbaCards=b.entries; s.total=b.entries.length||s.total;
  const sec=(b.cardsInfo.match(/incl\. (\d+) secret/)||[])[1]; if(sec) s.official=s.total-(+sec);
}
// ---- cross-language links ----
const L=(a,b)=>{if(!a||!b||a===b)return;(a.links??=new Set()).add(b.key);(b.links??=new Set()).add(a.key);};
for(const s of sets.filter(s=>s.lang==='zh-tw'&&s.tcgdex)) L(s,byKey['ja:'+s.id]);
const enSets=sets.filter(s=>s.lang==='en'&&s.era!=='other').sort((a,b)=>b.name.length-a.name.length);
for(const {ja,b} of bulbaMap){
  const txt=(b.en_equiv||'').replace(/^EX /,'').replace(/ EX /g,' ');
  const found=[];let rest=txt;
  for(const e of enSets){const n=e.name.replace(/^EX /,'');if(rest.includes(n)&&!found.includes(e)){found.push(e);rest=rest.replace(n,'');}}
  const part=/Part|⅓|⅔|Parts/.test(b.en_equiv);
  for(const e of found){L(ja,e);if(part){ja.partial=true;(e.partialLinks??=new Set()).add(ja.key);(ja.partialLinks??=new Set()).add(e.key);}}
}
for(const s of sets) s.links=[...(s.links||[])].sort();
// counterpart Chinese name for display
for(const s of sets){
  s.names={[s.lang]:s.name};
  const pl=s.partialLinks||new Set();
  const prim=s.links.filter(k=>!pl.has(k)); // whole-set counterparts first
  for(const k of prim){const o=byKey[k];if(o&&!s.names[o.lang])s.names[o.lang]=o.name;}
  // second hop (en -> ja -> zh-tw), only through whole-set counterparts
  const hop=new Set();
  for(const k of prim){const o=byKey[k];for(const k2 of (o?.links||[])){if(new Set(o.partialLinks||[]).has(k2))continue;const o2=byKey[k2];if(o2&&o2.key!==s.key){hop.add(o2.key);if(!s.names[o2.lang])s.names[o2.lang]=o2.name;}}}
  s.hopLinks=[...hop].filter(k=>!s.links.includes(k));
  s.partialLinks=[...pl];
}
// ---- chase cards (2018-2026 only) ----
const yearOf=s=>+(s.date||s.approxDate||'0').slice(0,4);
const cardRec=(l,id)=>{const c=cards[l][id];return c?{...c,id,lang:l}:null;};
function rankCards(list,official){
  return list.map(c=>{let r=RANK[c.r];const num=parseInt(String(c.l).replace(/\D/g,''))||0;
     if(r===undefined||r===0){r=(official&&num>official)?70:15;}
     return {...c,score:r,num};})
    .sort((a,b)=>b.score-a.score||popScore(b.n)-popScore(a.n)||b.num-a.num);
}
let full=0;
const order=['en','ja','zh-cn','zh-tw'];
for(const s of [...sets].sort((a,b)=>order.indexOf(a.lang)-order.indexOf(b.lang))){
  const y=yearOf(s);s.year=y||null;
  s.v1=y>=2018&&y<=2026;
  if(!s.v1){s.status='basic';continue;}
  let list=s.cards.map(id=>cardRec(s.lang,id)).filter(Boolean);
  let borrowed=null; let chaseB=null;
  // borrow rarity / cards from Japanese counterpart for zh-tw
  const jaTwin=s.lang==='zh-tw'?s.links.map(k=>byKey[k]).find(o=>o?.lang==='ja'&&o.tcgdex):null;
  if(s.lang==='zh-tw'&&jaTwin){
    if(!list.length){list=jaTwin.cards.map(id=>cardRec('ja',id)).filter(Boolean);borrowed=jaTwin.key;}
    else list=list.map(c=>{if(!c.r||c.r==='null'||c.r==='None'){const jc=cards.ja[`${jaTwin.id}-${c.l}`];if(jc){c.r=jc.r;if(!c.i)c.i=jc.i;}}return c;});
  }
  if(s.bulbaCards?.length){
    const BR={HR:95,SAR:92,UR:90,SSR:82,CSR:80,SR:78,AR:75,A:71,CHR:68,K:66,S:64,'ACE':58,RRR:60,'Gem RRR':55,RR:50,'Gem RR':45,PR:10,R:20,U:5,C:1};
    list=s.bulbaCards.map(e=>{const lid=String(parseInt(e.num)||e.num);const tc=cards['zh-cn'][`${s.id}-${e.num.split('/')[0]}`]||cards['zh-cn'][`${s.id}-${lid}`];
      return {n:tc?.n?`${tc.n}（${e.name}）`:e.name,l:e.num.split('/')[0],r:e.rarity,i:tc?.i||null,id:`${s.id}-${e.num.split('/')[0]}`,lang:'zh-cn',score:BR[e.rarity]??15};});
    s.chaseMethod='auto-bulbapedia';
    chaseB=list.filter(c=>c.score>=50).sort((a,b)=>b.score-a.score||popScore(b.n)-popScore(a.n)||parseInt(b.l)-parseInt(a.l)).slice(0,10);
  }
  // ja fallback: rank by SNKRDUNK lowest listed price when TCGdex has no rarity data
  const snkFile=`data/snkrdunk/${s.id}.json`;
  if(s.lang==='ja'&&fs.existsSync(snkFile)&&!list.some(c=>(RANK[c.r]||0)>=40)){
    const items=R(snkFile).items.filter(x=>x.minPrice>0);const seen=new Set();
    chaseB=items.sort((a,b)=>b.minPrice-a.minPrice).filter(x=>!seen.has(x.num)&&seen.add(x.num)).slice(0,10).map(x=>{
      const tc=list.find(c=>String(c.l).replace(/^0+/,'')===x.num);
      return {n:tc?.n||x.name.split('[')[0].trim(),l:tc?.l||x.num,r:(x.rarity||'待確認')+'（SNKRDUNK 標示）',i:tc?.i||null,id:tc?.id||`${s.id}-${x.num}`,lang:'ja'};});
    s.chaseMethod='snkrdunk';s.snkDate=R(snkFile).fetched;
  }
  // zh-tw: reuse the Japanese twin's chase list when own data has no rarity
  if(s.lang==='zh-tw'&&jaTwin&&byKey[jaTwin.key].chase?.length&&!list.some(c=>(RANK[c.r]||0)>=40)&&['snkrdunk','curated','auto'].includes(byKey[jaTwin.key].chaseMethod)){
    s.chase=byKey[jaTwin.key].chase.map(c=>({...c,price:null}));s.chaseMethod='twin';s.borrowedFrom=jaTwin.key;
    s.notes=[`繁中版與日版《${jaTwin.name}》卡表相同；大獎卡依日版資料列出，卡圖暫用日版，價格僅供日版參考。`];
    s.status='full';full++;continue;
  }
  const cur=curated[s.key];
  let chase;
  if(cur?.chase){chase=cur.chase.map(lid=>list.find(c=>c.l===lid)).filter(Boolean);s.chaseMethod='curated';}
  else if(chaseB){chase=chaseB;}
  else {chase=rankCards(list,s.official).filter(c=>c.score>=40).slice(0,10);s.chaseMethod='auto';
    if(!chase.length){ // no rarity data: fall back to rule-box Pokémon by card name, flagged 待確認
      chase=list.filter(c=>/(VMAX|VSTAR|V|GX|ex|EX|BREAK)$/.test(c.n)).map(c=>({...c,num:parseInt(c.l)||0})).sort((a,b)=>popScore(b.n)-popScore(a.n)||b.num-a.num).slice(0,10);
      if(chase.length) s.chaseMethod='heuristic';
    }}
  chase=chase.slice(0,10);
  s.chase=chase.map(c=>{const key=`${c.lang}:${c.id}`;return {key,name:c.n,num:`${c.l}${s.official?'/'+String(s.official).padStart(3,'0'):''}`,localId:c.l,rarity:c.r&&c.r!=='null'?c.r:'待確認',img:c.i?c.i+'/low.webp':null,imgHigh:c.i?c.i+'/high.webp':null,price:(c.lang===s.lang&&prices[key])||null};});
  s.borrowedFrom=borrowed;
  s.notes=[];
  if(borrowed) s.notes.push(`TCGdex 尚無此繁中版卡表；大獎卡依對應日版《${byKey[borrowed].name}》列出（亞洲版與日版卡表通常相同，卡圖暫用日版）。`);
  if(s.lang==='zh-cn') s.notes.push('TCGdex 的簡中卡表多半不含秘密稀有卡，大獎卡清單可能不完整（待確認）。');
  if(!s.date) s.notes.push('發售日待確認。');
  if(s.chaseMethod==='snkrdunk') s.notes.push(`TCGdex 缺少此彈的稀有度資料；以下依 SNKRDUNK 最低在售價由高到低排序（${s.snkDate} 擷取），反映當時市場熱度。`);
  if(s.chaseMethod==='heuristic') s.notes.push('TCGdex 缺少此彈的稀有度資料，以下依卡名（V／VMAX／ex 等規則卡）推估，排序與是否為大獎卡皆待確認。');
  if(s.chaseMethod==='auto-bulbapedia') s.notes.push('卡表與稀有度取自 Bulbapedia（簡中版頁面），卡名以英文標示；依稀有度自動排序，非市場熱度。');
  if(s.chaseMethod==='auto'&&chase.length) s.notes.push('大獎卡依 TCGdex 官方稀有度由高到低自動排序（同稀有度以人氣寶可夢優先），非市場熱度排行。');
  if(!chase.length) s.notes.push('此彈在 TCGdex 中沒有可用的高稀有度卡資料（例如促銷卡、牌組），大獎卡待確認。');
  s.status=chase.length?(s.chaseMethod==='heuristic'?'partial':'full'):'partial';
  s.upcoming=!!(s.date&&s.date>new Date().toISOString().slice(0,10));
  if(s.upcoming) s.notes.push('尚未發售（依 Bulbapedia 公布的預定日期），資料可能變動。');
  if(s.status==='full')full++;
}
// ---- thumbnail fallback: no logo/symbol -> top chase card image, else first card image in the set ----
for(const s of sets){
  if(s.logo||s.symbol) continue;
  const c=(s.chase||[]).find(c=>c.img);
  if(c){s.thumb=c.img;continue;}
  const first=(s._cards||[]).map(id=>cards[s.lang][id]).find(x=>x&&x.i);
  if(first) s.thumb=first.i+'/low.webp';
}
// ---- intros ----
const eraLabel=Object.fromEntries(ERA);
const fmtDate=d=>d?`${+d.slice(0,4)} 年 ${+d.slice(5,7)} 月 ${+d.slice(8,10)} 日`:'（日期待確認）';
for(const s of sets){
  const parts=[];
  const nm=s.names['zh-tw']&&s.lang!=='zh-tw'?`《${s.name}》（繁中名：${s.names['zh-tw']}）`:`《${s.name}》`;
  parts.push(`${nm}是${LANG_LABEL[s.lang]}的寶可夢卡牌${s.kind?KIND_ZH[s.kind]||'擴充包':(s.era==='other'?'系列商品':'擴充包')}，${s.date?'於 '+fmtDate(s.date)+' 發售':'發售日待確認'}，屬於「${eraLabel[s.era]}」時期。`);
  if(s.official) parts.push(`官方編號共 ${s.official} 張${s.total&&s.total>s.official?`，加上超出編號的秘密稀有卡共 ${s.total} 張`:''}。`);
  const cps=s.links.map(k=>byKey[k]).filter(Boolean);
  if(cps.length) parts.push(`對應版本：${cps.map(o=>`${LANG_LABEL[o.lang]}《${o.name}》${s.partialLinks.includes(o.key)?'（部分收錄）':''}`).join('、')}。`);
  if(s.chase?.length) parts.push(`本彈的熱門高稀有度卡包括：${s.chase.slice(0,3).map(c=>c.name).join('、')}。`);
  s.introAuto=parts.join('');
  s.intro=curated[s.key]?.intro||null;
  if(!s.v1) s.todo='歷史介紹與大獎卡待補充（後續批次）。';
  delete s.cards; delete s._cards;
}
// language availability: own + linked
for(const s of sets){s.editions=[...new Set([s.lang,...s.links.filter(k=>!s.partialLinks.includes(k)),...s.hopLinks].map(k=>k.split(':')[0]))];}
sets.sort((a,b)=>(a.date||a.approxDate||'9999').localeCompare(b.date||b.approxDate||'9999')||a.lang.localeCompare(b.lang));
// ---- site output: only SHOWN languages (all languages are still built above for cross-reference names, quiz bank and data/sets.json) ----
const shownSets=sets.filter(s=>SHOWN.includes(s.lang));
const shownKeys=new Set(shownSets.map(s=>s.key));
// old links (e.g. quiz "查看教材" pointing at an en/zh set) -> redirect to the shown counterpart when one exists
const alias={};
for(const s of sets){if(shownKeys.has(s.key))continue;const pl=new Set(s.partialLinks);const t=[...s.links.filter(k=>!pl.has(k)),...s.links,...(s.hopLinks||[])].find(k=>shownKeys.has(k));if(t)alias[s.key]=t;}
const counts={};for(const l of SHOWN)counts[l]=shownSets.filter(s=>s.lang===l).length;
const v1=shownSets.filter(s=>s.v1);
const stats={generated:new Date().toISOString(),languages:SHOWN,counts,total:shownSets.length,bulbaJaAdded:bulbaAdded,v1Sets:v1.length,v1Full:v1.filter(s=>s.status==='full').length,v1ByLang:Object.fromEntries(SHOWN.map(l=>[l,{sets:v1.filter(s=>s.lang===l).length,full:v1.filter(s=>s.lang===l&&s.status==='full').length}])),chaseCards:v1.reduce((a,s)=>a+(s.chase?.length||0),0),allLanguagesBuilt:sets.length};
fs.mkdirSync('site/data',{recursive:true});
fs.writeFileSync('site/data/sets.js','window.ERAS='+JSON.stringify(ERA)+';\nwindow.STATS='+JSON.stringify(stats)+';\nwindow.SET_ALIAS='+JSON.stringify(alias)+';\nwindow.SETS='+JSON.stringify(shownSets)+';\n');
fs.writeFileSync('data/sets.json',JSON.stringify(sets,null,0));
console.log(JSON.stringify(stats,null,1));
