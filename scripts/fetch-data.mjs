// Fetch TCGdex data and cache to data/raw/*.json
import fs from 'fs';
const API='https://api.tcgdex.net/v2';
const out='data/raw'; fs.mkdirSync(out,{recursive:true});
const j=async u=>{for(let i=0;i<4;i++){try{const r=await fetch(u);if(r.status===404)return null;if(!r.ok)throw new Error(r.status);return await r.json();}catch(e){await new Promise(r=>setTimeout(r,800*(i+1)));}}return null;};
async function pool(items,n,fn){const res=[];let i=0;await Promise.all(Array.from({length:n},async()=>{while(i<items.length){const k=i++;res[k]=await fn(items[k]);}}));return res;}
for(const lang of (process.argv[2]||'en,ja,zh-tw,zh-cn').split(',')){
  const series=await j(`${API}/${lang}/series`);
  const sdet=await pool(series,6,s=>j(`${API}/${lang}/series/${s.id}`));
  const sets=await j(`${API}/${lang}/sets`);
  const det=await pool(sets,8,s=>j(`${API}/${lang}/sets/${encodeURIComponent(s.id)}`));
  fs.writeFileSync(`${out}/${lang}-series.json`,JSON.stringify(sdet.filter(Boolean)));
  fs.writeFileSync(`${out}/${lang}-sets.json`,JSON.stringify(det.filter(Boolean)));
  console.log(lang,series.length,'series',sets.length,'sets',det.filter(Boolean).length,'details');
}
