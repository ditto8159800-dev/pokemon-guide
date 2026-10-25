# Parse Bulbapedia "List of Japanese Pokémon TCG expansions" wikitext -> data/sources/bulba-jp.json
import re, json
w=open('data/sources/bulbapedia-jp-expansions.wikitext').read()
w=w.split('==Promotional sets==')[0]
def clean(s):
    s=re.sub(r'<!--.*?-->','',s,flags=re.S)
    s=re.sub(r'<ref.*?</ref>|<ref[^>]*/>','',s,flags=re.S)
    s=re.sub(r'\{\{TCG\|([^}|]*)(\|[^}]*)?\}\}',r'\1',s)
    s=re.sub(r'\[\[(?:[^]|]*\|)?([^]]*)\]\]',r'\1',s)
    s=re.sub(r'\{\{[^}]*\}\}','',s); s=re.sub(r"'''?",'',s); s=re.sub(r'<sup.*?</sup>','',s,flags=re.S)
    return s.strip().strip('"')
rows=[];section=era=sub=None
for line_block in re.split(r'\n(?==)',w):
    m=re.match(r'(=+)\s*(.*?)\s*=+',line_block)
    if m:
        lv=len(m.group(1))
        if lv==2: section=m.group(2)
        elif lv==3: era=m.group(2); sub=None
        elif lv==4: sub=m.group(2)
    for r in line_block.split('\n|-')[1:]:
        cells=re.split(r'\n\|\s*',r)[1:]
        cells=[re.sub(r'^(?:rowspan|colspan)=\d+\s*\|\s*','',c.strip()) for c in cells]
        idx=next((i for i,c in enumerate(cells) if '<br>' in c and re.search(r'[\u3040-\u30ff\u4e00-\u9fff]',c.split('<br>')[0])),None)
        if idx is None or len(cells)<idx+4: continue
        jp=cells[idx].split('<br>')
        no=clean(cells[0]) if section=='Main Sets' and re.match(r'^\d+$',clean(cells[0])) else ''
        rows.append(dict(section=section,era=era,kind=sub or ('Main' if section=='Main Sets' else 'Subset'),no=no,ja=clean(jp[0]).replace(' • ',' / '),translated=clean(jp[1]),en_equiv=clean(cells[idx+1].replace('<br>',' / ')),count=clean(cells[idx+2].replace('<br>',' / ')),date=clean(cells[idx+3].split('\n')[0])))
json.dump(rows,open('data/sources/bulba-jp.json','w'),ensure_ascii=False,indent=1)
print(len(rows))
for x in rows: print(x['era'],'|',x['kind'],'|',x['ja'],'|',x['en_equiv'],'|',x['date'])
