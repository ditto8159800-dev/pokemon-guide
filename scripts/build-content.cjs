// Build site/data/content.js (rarity + grading) and site/data/quiz.js (question bank) from verified content.
const fs=require('fs');const R=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const rarity=R('content/rarity.json'),grading=R('content/grading.json'),sets=R('data/sets.json'),curated=R('content/curated.json');
const raw={en:R('data/raw/en-sets.json'),ja:R('data/raw/ja-sets.json')},cards={en:R('data/raw/cards-en.json'),ja:R('data/raw/cards-ja.json')};
for(const r of rarity){const e=r.example;const s=raw[e.lang].find(x=>x.id===e.set);if(!s)continue;
  const c=s.cards.map(c=>({id:c.id,...cards[e.lang][c.id]})).find(c=>e.pick?c.l===e.pick:c.r===e.rarity);
  if(c&&c.i) r.exampleCard={name:c.n,num:c.l,set:s.name,img:c.i+'/low.webp',key:`${e.lang}:${c.id}`};}
const rdetail=fs.existsSync('content/rarity-details.json')?R('content/rarity-details.json'):null;
const glabels=fs.existsSync('content/grading-labels.json')?R('content/grading-labels.json'):{};
const gphotos=fs.existsSync('content/grading-photos.json')?R('content/grading-photos.json'):{};
fs.writeFileSync('site/data/content.js','window.RARITY='+JSON.stringify(rarity)+';\nwindow.GRADING='+JSON.stringify(grading)+';\nwindow.GRADING_PHOTOS='+JSON.stringify(gphotos)+';\nwindow.RARITY_DETAIL='+JSON.stringify(rdetail)+';\nwindow.GRADING_LABELS='+JSON.stringify(glabels)+';\n');
// one catalog page per grading company (site/grading-<slug>.html), rendered by assets/grading-company.js
for(const [name,L] of Object.entries(glabels)){if(name.startsWith('_'))continue;
  fs.writeFileSync(`site/grading-${L.slug}.html`,`<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n<title>${name} 鑑定標籤怎麼看｜寶可夢卡牌學習站</title><link rel="stylesheet" href="assets/style.css">\n<script src="data/sets.js"></script><script src="data/content.js"></script><script src="assets/common.js"></script></head>\n<body><div class="layout"><main id="gc"></main></div>\n<script>window.COMPANY=${JSON.stringify(name)};</script><script src="assets/grading-company.js"></script></body></html>\n`);}
// ---- question bank ----
const Q=[];const sh=a=>a.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
const pickOthers=(pool,ans,n=3)=>sh([...new Set(pool.filter(x=>x!==ans))]).slice(0,n);
const add=(cat,q,ans,wrong,exp,ref)=>{if(wrong.length<3)return;Q.push({cat,q,options:[ans,...wrong.slice(0,3)],answer:0,exp,ref});};
// rarity
for(const r of rarity){
  add('稀有度',`日版稀有度「${r.code}」的意思最接近下列哪一項？`,r.desc,pickOthers(rarity.map(x=>x.desc),r.desc),`${r.code}（${r.ja}）：${r.desc}`,'rarity.html');
  if(false) add('稀有度',`日版「${r.code}」在美版大致對應哪個名稱？`,r.en,pickOthers(rarity.filter(x=>!/無直接對應/.test(x.en)).map(x=>x.en),r.en),`${r.code} ≈ 美版 ${r.en}`,'rarity.html');
}
add('稀有度','一副牌組最多可以放幾張 ACE SPEC 卡？','1 張',['2 張','4 張','沒有限制'],'ACE SPEC 是強力卡，一副牌組只能放 1 張。','rarity.html');
add('稀有度','美版朱紫世代的「Special Illustration Rare（SIR）」對應日版哪個稀有度？','SAR',['AR','SR','RR'],'SIR = 日版 SAR（スペシャルアートレア）。','rarity.html');
add('稀有度','美版朱紫世代的「Illustration Rare（IR）」對應日版哪個稀有度？','AR',['SAR','UR','RRR'],'IR = 日版 AR（アートレア）。','rarity.html');
// grading
for(const g of grading){
  add('鑑定',`「${g.full}」的簡稱是？`,g.name,pickOthers(grading.map(x=>x.name),g.name),`${g.name} = ${g.full}（${g.country}）`,'grading.html');
  add('鑑定',`下列哪一個描述屬於 ${g.name}？`,g.label,pickOthers(grading.map(x=>x.label),g.label),`${g.name}：${g.label}`,'grading.html');
  if(!/待確認/.test(g.country)) add('鑑定',`${g.name} 是哪個國家的鑑定公司？`,g.country,pickOthers(['美國','英國','日本','中國','德國'],g.country),`${g.name} 總部在${g.country}。`,'grading.html');
}
add('鑑定','PSA 10 的正式名稱是？','GEM MT 10（Gem Mint）',['Pristine 10','Black Label 10','Perfect 10'],'PSA 的最高分 10 分標示為 GEM MT 10。','grading.html');
add('鑑定','BGS 的「黑標（Black Label）」代表什麼？','四項分項分數全部 10 分的 Pristine 10',['任何 9.5 分的卡','簽名卡','有瑕疵的卡'],'BGS 四項分項（置中、邊角、邊緣、表面）都是 10 分才會得到黑標。','grading.html');
add('鑑定','BGS 的分項分數不包含下列哪一項？','卡片年份',['置中（Centering）','邊角（Corners）','表面（Surface）'],'BGS 分項為置中、邊角、邊緣、表面。','grading.html');
add('鑑定','SGC 標籤常被暱稱為什麼？','燕尾服（Tuxedo）',['紅標','黑標','金標'],'SGC 的黑色邊框標籤被稱為 Tuxedo。','grading.html');
add('鑑定','在寶可夢卡市場中，一般認為哪家鑑定公司的轉售流動性最高？','PSA',['TAG','ACE','SGC'],'PSA 是寶可夢卡最主流的鑑定公司。','grading.html');
// ---- simple questions about the hot Japanese sets shown on the site (site/data/sets.js) ----
global.window={};eval(fs.readFileSync('site/data/sets.js','utf8'));const HOT=window.SETS.filter(s=>s.status==='full'||s.chase?.length);
const nm=s=>s.nameZh?`《${s.nameZh.replace(/（.*?）/g,'')}》`:`《${s.name}》`;
const yrs=[2019,2020,2021,2022,2023,2024,2025,2026];
for(const s of HOT){
  const ref=`set.html?k=${encodeURIComponent(s.key)}`;
  // 1) release year, distractors at least 2 years away (easy)
  if(s.year) add('卡盒歷史',`日版${nm(s)}是哪一年發售的？`,s.year+' 年',pickOthers(yrs.filter(y=>Math.abs(y-s.year)>=2).map(String),String(s.year)).map(y=>y+' 年'),`${nm(s)}在 ${s.date} 發售。`,ref);
  // 2) Japanese name <-> Chinese name
  if(s.nameZh) add('卡盒歷史',`日版卡盒「${s.name}」的中文名是？`,nm(s),pickOthers(HOT.filter(x=>x.nameZh&&x.key!==s.key).map(nm),nm(s)),`「${s.name}」= ${nm(s)}。`,ref);
  // 3) top chase card (the #1 card, by its Chinese name when we have one)
  const top=s.chase?.[0];const tn=c=>c.nameZh||c.name;
  if(top) add('大獎卡',`${nm(s)}裡社群公認、目前成交價最高的頭號大獎卡是哪一張？`,tn(top),pickOthers(HOT.filter(x=>x.key!==s.key&&x.chase?.length).map(x=>tn(x.chase[0])).filter(n=>n!==tn(top)),tn(top)),`${nm(s)}的頭號大獎卡是 ${tn(top)}（${top.num}，${top.rarity}）。`,ref);
}
// 4) which of these is a hot set right now (easy recognition)
const hotNames=HOT.filter(s=>s.rank&&s.rank<=8).map(nm);
// 5) RR / AR / SAR basics
add('稀有度','卡片表面有「摸得到的凹凸紋路」的全圖卡，最可能是哪個稀有度？','SAR',['AR','RR','C'],'SAR 有凹凸（レリーフ）加工；AR 雖然也是全圖但沒有凹凸。','rarity.html');
add('稀有度','一般日版擴充包，每一盒大約會有幾張 AR？','約 3 張',['約 30 張','每 10 盒才 1 張','完全沒有'],'多數開盒統計是每盒約 3 張 AR。','rarity.html');
add('稀有度','SAR 大約要開幾盒才會出 1 張（一般擴充包）？','約 3–6 盒',['每包都有','每盒 5 張','約 100 盒'],'社群統計大約 3–6 盒 1 張，不同彈不一樣。','rarity.html');
add('稀有度','RR（ダブルレア）通常是哪一種卡？','寶可夢 ex 這類強力卡',['能量卡','金色邊框的卡','促銷卡'],'RR 大多是寶可夢 ex。','rarity.html');
add('稀有度','AR 和 SAR 最快的分法是什麼？','摸表面有沒有凹凸紋路',['看卡片背面顏色','看卡片編號是不是單數','秤重量'],'SAR 有凹凸加工，AR 沒有。','rarity.html');
Q.forEach((q,i)=>q.id=i+1);
const byCat={};Q.forEach(q=>byCat[q.cat]=(byCat[q.cat]||0)+1);
fs.writeFileSync('site/data/quiz.js','window.QUIZ_BANK='+JSON.stringify(Q)+';\n');
console.log('quiz questions',Q.length,JSON.stringify(byCat),'rarity examples',rarity.filter(r=>r.exampleCard).length,'/',rarity.length);
