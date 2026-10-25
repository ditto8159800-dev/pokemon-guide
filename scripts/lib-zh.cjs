// Translate Japanese (or English) card names to Traditional Chinese where it can be done reliably.
// Pokémon names: PokeAPI pokemon_species_names.csv (zh-Hant = language 4, ja-Hrkt = 1, en = 9).
const fs=require('fs');const path=require('path');const ROOT=path.join(__dirname,'..');
const rows=fs.readFileSync(path.join(ROOT,'data/sources/pokemon_species_names.csv'),'utf8').split('\n').slice(1).map(l=>l.split(','));
const by={};for(const [id,lang,name] of rows){if(!id||!name)continue;(by[id]??={})[lang]=name;}
const PK=[];for(const v of Object.values(by)){if(!v['4'])continue;if(v['1'])PK.push([v['1'],v['4']]);if(v['9'])PK.push([v['9'],v['4']]);}
PK.sort((a,b)=>b[0].length-a[0].length);
const D=JSON.parse(fs.readFileSync(path.join(ROOT,'content/zh-names.json'),'utf8'));
const TR=Object.entries(D.trainers).sort((a,b)=>b[0].length-a[0].length);
const REGION={'アローラ':'阿羅拉','ガラル':'伽勒爾','ヒスイ':'洗翠','パルデア':'帕底亞'};
function pokemon(n){ // returns zh or null; handles メガ / region forms / suffixes (ex, V, VMAX, VSTAR, GX, & tag teams)
  let pre='';
  if(/^メガ/.test(n)&&!PK.find(([j])=>n.startsWith(j))){pre='超級';n=n.slice(2);}
  if(/^Mega /.test(n)){pre='超級';n=n.slice(5);}
  if(/^Dark /.test(n)){pre='暗';n=n.slice(5);}
  for(const [r,z] of Object.entries(REGION)) if(n.startsWith(r)){pre+=z;n=n.slice(r.length);}
  const parts=n.split(/[&＆]/);const out=[];
  for(let p of parts){p=p.trim();const hit=PK.find(([j])=>p.startsWith(j));if(!hit) return null;
    let rest=p.slice(hit[0].length).trim();
    let mx='';if(/^[XY](?=ex|$|\s)/.test(rest)){mx=rest[0];rest=rest.slice(1);}  // メガリザードンXex
    if(rest&&!/^(ex|EX|V|VMAX|VSTAR|GX|V-UNION|BREAK|δ|☆|◇)?(\s.*)?$/.test(rest)) return null;
    out.push(hit[1]+mx+(rest?(/^\s/.test(rest)?rest:rest):''));}
  return pre+out.join('＆');
}
function toZh(name){
  if(!name) return null;
  let n=String(name).replace(/\s+(HR|SR|SAR|AR|UR|CSR|CHR|RR|RRR)(:\s*SA)?$/,'').replace(/\s*\((Prime|LEGEND|Lv\.X)\)$/,'').trim();
  if(D.cards[n]) return D.cards[n];
  const p=pokemon(n); if(p) return p;
  const m=n.match(/^(.+?)の(.+)$/); // 〇〇の△△ : owner's Pokémon or trainer's card
  if(m){const owner=TR.find(([j])=>j===m[1]);const poke=pokemon(m[2]);
    if(owner&&poke) return `${owner[1]}的${poke}`;}
  const t=TR.find(([j])=>j===n); if(t) return t[1];
  return null;
}
module.exports={toZh};
