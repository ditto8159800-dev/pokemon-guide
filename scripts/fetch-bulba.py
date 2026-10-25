# Fetch Bulbapedia expansion pages (category members) -> data/sources/bulba/*.json (cached, polite)
import json, os, time, urllib.request, urllib.parse, sys
UA={'User-Agent':'Mozilla/5.0 pokemon-guide-research (static study site)'}
API='https://bulbapedia.bulbagarden.net/w/api.php'
def get(params):
    q=API+'?'+urllib.parse.urlencode({**params,'format':'json'})
    for i in range(4):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(q,headers=UA),timeout=30))
        except Exception as e: time.sleep(2*(i+1))
    return {}
os.makedirs('data/sources/bulba',exist_ok=True)
members=[];cont={}
while True:
    d=get({'action':'query','list':'categorymembers','cmtitle':'Category:Pokémon Trading Card Game expansions','cmlimit':500,**cont})
    members+= [m['title'] for m in d.get('query',{}).get('categorymembers',[])]
    if 'continue' in d: cont=d['continue']
    else: break
json.dump(members,open('data/sources/bulba-members.json','w'),ensure_ascii=False,indent=0)
print('members',len(members))
# batch-fetch wikitext via query/revisions (50 per request)
out={}
f='data/sources/bulba-pages.json'
if os.path.exists(f): out=json.load(open(f))
todo=[m for m in members if m not in out]
for i in range(0,len(todo),50):
    batch=todo[i:i+50]
    d=get({'action':'query','prop':'revisions','rvprop':'content','rvslots':'main','titles':'|'.join(batch),'redirects':1})
    for p in d.get('query',{}).get('pages',{}).values():
        try: out[p['title']]=p['revisions'][0]['slots']['main']['*']
        except: pass
    time.sleep(1)
    print(i+len(batch),'/',len(todo),file=sys.stderr)
json.dump(out,open(f,'w'),ensure_ascii=False)
print('pages',len(out))
