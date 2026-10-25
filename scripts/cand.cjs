const fs=require("fs");const {RANK,popScore}=require("./lib-rarity.cjs");
const sets={},C={};for(const l of ["en","ja","zh-tw"]){for(const s of JSON.parse(fs.readFileSync(`data/raw/${l}-sets.json`)))sets[l+":"+s.id]=s;C[l]=JSON.parse(fs.readFileSync(`data/raw/cards-${l}.json`));}
const n=+process.argv[3]||25;
for(const k of process.argv[2].split(" ")){const l=k.split(":")[0];const s=sets[k];if(!s){console.log("MISSING",k);continue}const cs=s.cards.map(c=>({...C[l][c.id],id:c.id}));
 cs.sort((a,b)=>(RANK[b.r]??30)-(RANK[a.r]??30)||popScore(b.n)-popScore(a.n));
 console.log("##",k,s.name,s.releaseDate,s.cardCount.official+"/"+s.cardCount.total);console.log(cs.slice(0,n).map(c=>`${c.l}:${c.n}[${c.r}]`).join("; "));}
