// Fetch per-card rarity for every card (for chase-card detection). Resumable.
import fs from 'fs';
const API='https://api.tcgdex.net/v2';
const j=async u=>{for(let i=0;i<4;i++){try{const r=await fetch(u);if(r.status===404)return null;if(!r.ok)throw new Error(r.status);return await r.json();}catch(e){await new Promise(r=>setTimeout(r,800*(i+1)));}}return null;};
for(const lang of (process.argv[2]||'en,ja,zh-tw,zh-cn').split(',')){
  const f=`data/raw/cards-${lang}.json`;
  const have=fs.existsSync(f)?JSON.parse(fs.readFileSync(f)):{};
  const sets=JSON.parse(fs.readFileSync(`data/raw/${lang}-sets.json`));
  const ids=[...new Set(sets.flatMap(s=>(s.cards||[]).map(c=>c.id)))].filter(id=>!have[id]);
  let i=0,done=0;
  await Promise.all(Array.from({length:24},async()=>{while(i<ids.length){const id=ids[i++];const c=await j(`${API}/${lang}/cards/${encodeURIComponent(id)}`);
    if(c)have[id]={r:c.rarity||null,n:c.name,l:c.localId,i:c.image||null,ill:c.illustrator||null};
    if(++done%1000===0){console.log(lang,done,'/',ids.length);fs.writeFileSync(f,JSON.stringify(have));}}}));
  fs.writeFileSync(f,JSON.stringify(have));console.log(lang,'done',Object.keys(have).length);
}
