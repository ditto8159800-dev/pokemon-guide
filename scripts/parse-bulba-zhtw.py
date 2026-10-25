# Extract Japanese <-> Traditional Chinese set-name pairs from Bulbapedia's
# "List of Pokémon TCG expansions in other languages" (only ja + zh-tw columns are used).
import re, json
w=open('data/sources/bulba-other-langs.wikitext').read()
def clean(s):
    s=re.sub(r'<!--.*?-->','',s,flags=re.S)
    s=re.sub(r'\{\{(?:TCG|ATCG)\|[^}|]*\|([^}]*)\}\}',r'\1',s); s=re.sub(r'\{\{(?:TCG|ATCG)\|([^}|]*)\}\}',r'\1',s)
    s=re.sub(r'\[\[(?:[^]|]*\|)?([^]]*)\]\]','',s); s=re.sub(r'\{\{[^}]*\}\}','',s)
    return s.strip()
out=[]
sec=None
for part in re.split(r'\n(?===)',w):
    m=re.match(r'==([^=].*?)==',part)
    if m: sec=m.group(1).strip()
    if sec not in ('Japanese sets','Thai, Indonesian & Traditional Chinese Catch-up sets'): continue
    for tbl in re.findall(r'\{\|.*?\n\|\}',part,flags=re.S):
        hdr=[clean(h.split('|')[-1]) for h in re.findall(r'\n!([^\n]*)',tbl)]
        if 'Traditional Chinese' not in hdr: continue
        for r in tbl.split('\n|-')[1:]:
            cells=re.split(r'\n\|\s*',r)[1:]
            exp=[]
            for c in cells:
                c=c.strip(); mm=re.match(r'colspan=(\d+)\s*\|\s*(.*)',c)
                exp+= [mm.group(2)]*int(mm.group(1)) if mm else [c]
            if len(exp)<len(hdr): continue
            row=dict(zip(hdr,exp))
            tc=clean(row.get('Traditional Chinese',''))
            if not tc or tc in ('—','-'): continue
            ja=clean(row.get('Japanese','')) if 'Japanese' in row else ''
            tr=clean(row.get('Translation',''))
            for i,t in enumerate(tc.split('<br>')):
                jas=ja.split('<br>') if ja else []
                trs=tr.split('<br>')
                out.append(dict(section=sec,ja=(jas[i] if i<len(jas) else '').strip(),zh_tw=t.strip(),translated=(trs[i] if i<len(trs) else trs[0]).strip()))
json.dump(out,open('data/sources/bulba-zhtw.json','w'),ensure_ascii=False,indent=1)
print(len(out))
for x in out: print(x['section'][:8],'|',x['ja'],'|',x['zh_tw'],'|',x['translated'])
