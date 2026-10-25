# Simplified-Chinese set card lists (number, English card name, rarity) from Bulbapedia ATCG pages.
# Used because TCGdex zh-cn card lists are mostly empty. Output: data/sources/bulba-zhcn-sets.json
import re, json, time, urllib.request, urllib.parse
UA={'User-Agent':'Mozilla/5.0 pokemon-guide-research (static study site)'}
API='https://bulbapedia.bulbagarden.net/w/api.php'
w=open('data/sources/bulba-other-langs.wikitext').read()
sc=w.split('==Simplified Chinese Catch-up sets==')[1]
rows=[]
for r in sc.split('\n|-')[1:]:
    codes=re.findall(r'SetSymbol(C[A-Z]+[\d.]*[a-z]?)\.png',r)
    titles=re.findall(r'\{\{ATCG\|([^}|]+)(?:\|([^}]*))?\}\}',r)
    cells=re.split(r'\n\|\s*',r)
    zh=[x.strip() for x in cells[-1].split('\n')[0].split('<br>')] if cells else []
    for i,c in enumerate(codes):
        t=titles[min(i,len(titles)-1)] if titles else None
        if t: rows.append(dict(code=c,page=t[0].strip(),label=(t[1] or t[0]).strip(),zh=zh[i] if i<len(zh) else ''))
def get(params):
    q=API+'?'+urllib.parse.urlencode({**params,'format':'json'})
    for i in range(4):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(q,headers=UA),timeout=30))
        except Exception: time.sleep(2*(i+1))
    return {}
pages={}
for title in sorted({r['page'] for r in rows}):
    d=get({'action':'query','prop':'revisions','rvprop':'content','rvslots':'main','titles':title+' (ATCG)','redirects':1})
    for p in d.get('query',{}).get('pages',{}).values():
        if 'revisions' in p: pages[title]=p['revisions'][0]['slots']['main']['*']
    time.sleep(1)
def parse(text):
    blocks=re.split(r'\{\{[Ss]etlist/header',text)[1:]
    out=[]
    for b in blocks:
        tm=re.search(r'title=([^|}]*)',b); title=tm.group(1).strip() if tm else ''
        ents=[]
        for m in re.finditer(r'\{\{[Ss]etlist/(?:nm)?entry\|([^\n]*)\}\}',b):
            parts=m.group(1).split('|')
            num=parts[0]
            body=m.group(1)
            nm=re.search(r'\{\{TCG ID\|[^|]*\|([^|}]*)',body) or re.search(r'\[\[[^]|]*\|([^]]*)\]\]',body)
            name=nm.group(1) if nm else ''
            suf=re.findall(r'\{\{(TCGV|VMAX|VSTAR|ex|EX|GX|TTGX|V-UNION)\}\}',body)
            if suf: name+=' '+{'TCGV':'V','TTGX':'GX'}.get(suf[0],suf[0])
            rar=re.sub(r'^\d+=','',parts[-1].strip()) if parts else ''
            ents.append(dict(num=num,name=name.strip(),rarity=rar))
        out.append(dict(title=title,entries=ents))
    return out
res=[]
for r in rows:
    t=pages.get(r['page'])
    bl=parse(t) if t else []
    pick=next((b for b in bl if r['label'] and r['label'].split(':')[-1].strip().lower() in b['title'].lower() and ':' in r['label']),None) or (bl[0] if bl else None)
    rel=re.search(r'\|\s*release\s*=\s*([^\n|]*)',t or '')
    cnt=re.search(r'\|\s*cards\s*=\s*([^\n|]*)',t or '')
    res.append(dict(**r,found=bool(t),blocks=len(bl),release=rel.group(1).strip() if rel else '',cardsInfo=cnt.group(1).strip() if cnt else '',entries=pick['entries'] if pick else []))
json.dump(res,open('data/sources/bulba-zhcn-sets.json','w'),ensure_ascii=False,indent=0)
for x in res: print(x['code'],x['page'],x['zh'],x['release'],x['cardsInfo'],len(x['entries']))
