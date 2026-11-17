import json
from pathlib import Path
INPUT=Path('data/transcripts-index.json')
SDIR=Path('data/transcripts-shards')
MAN=Path('data/transcripts-manifest.json')
MAX=14*1024*1024
def bsz(o): return len(json.dumps(o,ensure_ascii=False,separators=(',',':')).encode('utf-8'))
def slist(items):
 res,cur,cb=[],[],2
 for it in items:
  ib=bsz(it)+1
  if cur and cb+ib>MAX: res.append(cur); cur,cb=[it],2+ib
  else: cur.append(it); cb+=ib
 if cur: res.append(cur)
 return res
def split_transcripts():
 data=json.loads(INPUT.read_text('utf-8'))
 SDIR.mkdir(parents=True,exist_ok=True)
 for old in SDIR.glob('part-*.json'): old.unlink()
 mf={'shards':[]}
 if isinstance(data,list): mf['type']='list'; chunks=slist(data)
 else:
  lks=[k for k,v in data.items() if isinstance(v,list) and len(v)>10]
  if lks:
   lk=max(lks,key=lambda k:len(data[k]))
   mf['type']='wrapped_list'; mf['list_key']=lk; mf['meta']={k:v for k,v in data.items() if k!=lk}; chunks=slist(data[lk])
  else:
   mf['type']='dict'; chunks,cur,cb=[],{},2
   for k,v in data.items():
    eb=bsz({k:v})
    if cur and cb+eb>MAX: chunks.append(cur); cur,cb={k:v},2+eb
    else: cur[k]=v; cb+=eb
   if cur: chunks.append(cur)
 for i,c in enumerate(chunks,1):
  fn=f'part-{i:02d}.json'
  (SDIR/fn).write_text(json.dumps(c,ensure_ascii=False,separators=(',',':')),'utf-8')
  mf['shards'].append(f'data/transcripts-shards/{fn}')
  print('Created',fn)
 MAN.write_text(json.dumps(mf,ensure_ascii=False,indent=2),'utf-8')
 print('Done:',len(chunks),'shards')
if __name__=='__main__': split_transcripts()
