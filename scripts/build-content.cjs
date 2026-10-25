// Build site/data/content.js (rarity + grading) and site/data/quiz.js (question bank) from verified content.
const fs=require('fs');const R=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const rarity=R('content/rarity.json'),grading=R('content/grading.json'),sets=R('data/sets.json'),curated=R('content/curated.json');
const raw={en:R('data/raw/en-sets.json'),ja:R('data/raw/ja-sets.json')},cards={en:R('data/raw/cards-en.json'),ja:R('data/raw/cards-ja.json')};
for(const r of rarity){const e=r.example;const s=raw[e.lang].find(x=>x.id===e.set);if(!s)continue;
  const c=s.cards.map(c=>({id:c.id,...cards[e.lang][c.id]})).find(c=>e.pick?c.l===e.pick:c.r===e.rarity);
  if(c&&c.i) r.exampleCard={name:c.n,num:c.l,set:s.name,img:c.i+'/low.webp',key:`${e.lang}:${c.id}`};}
fs.writeFileSync('site/data/content.js','window.RARITY='+JSON.stringify(rarity)+';\nwindow.GRADING='+JSON.stringify(grading)+';\n');
// ---- question bank ----
const Q=[];const sh=a=>a.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
const pickOthers=(pool,ans,n=3)=>sh([...new Set(pool.filter(x=>x!==ans))]).slice(0,n);
const add=(cat,q,ans,wrong,exp,ref)=>{if(wrong.length<3)return;Q.push({cat,q,options:[ans,...wrong.slice(0,3)],answer:0,exp,ref});};
// rarity
for(const r of rarity){
  add('稀有度',`日版稀有度「${r.code}」的意思最接近下列哪一項？`,r.desc,pickOthers(rarity.map(x=>x.desc),r.desc),`${r.code}（${r.ja}）：${r.desc}`,'rarity.html');
  if(!/無直接對應/.test(r.en)) add('稀有度',`日版「${r.code}」在美版大致對應哪個名稱？`,r.en,pickOthers(rarity.filter(x=>!/無直接對應/.test(x.en)).map(x=>x.en),r.en),`${r.code} ≈ 美版 ${r.en}`,'rarity.html');
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
// sets (only confirmed data; skip anything 待確認 / heuristic)
const v1=sets.filter(s=>s.v1&&s.status==='full'&&s.dateConfirmed&&s.date&&!s.upcoming);
const L={en:'美版',ja:'日版','zh-tw':'繁中版','zh-cn':'簡中版'};
const years=[...new Set(sets.filter(s=>s.year).map(s=>String(s.year)))];
for(const s of v1){
  const y=String(s.year);
  add('卡盒歷史',`${L[s.lang]}《${s.name}》是哪一年發售的？`,y+' 年',pickOthers(years.filter(x=>Math.abs(+x-+y)<=4),y).map(x=>x+' 年'),`《${s.name}》於 ${s.date} 發售。`,`set.html?k=${encodeURIComponent(s.key)}`);
  const ja=s.lang==='en'&&s.links.map(k=>sets.find(x=>x.key===k)).find(x=>x&&x.lang==='ja');
  if(ja&&!s.partial) add('卡盒歷史',`美版《${s.name}》對應的日版是哪一彈？`,`《${ja.name}》`,pickOthers(sets.filter(x=>x.lang==='ja'&&x.v1).map(x=>`《${x.name}》`),`《${ja.name}》`),`美版《${s.name}》對應日版《${ja.name}》。`,`set.html?k=${encodeURIComponent(s.key)}`);
}
// chase cards: curated lists only (editorially verified)
for(const s of sets.filter(s=>s.chaseMethod==='curated'&&s.chase?.length)){
  const top=s.chase[0];
  const others=sets.filter(x=>x.chase?.length&&x.key!==s.key&&x.lang===s.lang).map(x=>x.chase[0].name).filter(n=>n!==top.name);
  add('大獎卡',`《${s.name}》排名第一的大獎卡是？`,`${top.name}（${top.num}）`,pickOthers(others,top.name).map(n=>n),`《${s.name}》的頭號大獎卡是 ${top.name}（${top.num}，${top.rarity}）。`,`set.html?k=${encodeURIComponent(s.key)}`);
  const inList=s.chase.slice(0,5);
  for(const c of inList.slice(1,3)){
    const out=sets.filter(x=>x.chaseMethod==='curated'&&x.key!==s.key).flatMap(x=>x.chase.map(y=>y.name)).filter(n=>!s.chase.some(z=>z.name===n));
    add('大獎卡',`下列哪一張是《${s.name}》的大獎卡（Top 10）？`,`${c.name}（${c.num}）`,pickOthers(out,c.name),`${c.name}（${c.num}）列在《${s.name}》的 Top 10 大獎卡中。`,`set.html?k=${encodeURIComponent(s.key)}`);
  }
}
// era questions for curated sets (intro facts)
const eraName={sm:'太陽&月亮（SM）',swsh:'劍&盾（S）',sv:'朱&紫（SV）',mega:'MEGA 進化'};
for(const s of sets.filter(s=>s.chaseMethod==='curated'||curated[s.key])) if(eraName[s.era]) add('卡盒歷史',`《${s.name}》屬於哪個世代？`,eraName[s.era],pickOthers(Object.values(eraName),eraName[s.era]),`《${s.name}》屬於${eraName[s.era]}世代。`,`set.html?k=${encodeURIComponent(s.key)}`);
Q.forEach((q,i)=>q.id=i+1);
const byCat={};Q.forEach(q=>byCat[q.cat]=(byCat[q.cat]||0)+1);
fs.writeFileSync('site/data/quiz.js','window.QUIZ_BANK='+JSON.stringify(Q)+';\n');
console.log('quiz questions',Q.length,JSON.stringify(byCat),'rarity examples',rarity.filter(r=>r.exampleCard).length,'/',rarity.length);
