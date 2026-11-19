import subprocess,sys,re,collections
a,b=sys.argv[1],sys.argv[2]
out=subprocess.run(['diff','-ruN','-x','node_modules','-x','evidence','-x','dist','-x','.git','-x','*.tsbuildinfo','-x','.vite',a,b],capture_output=True,text=True).stdout
files=collections.OrderedDict(); cur=None
for line in out.split('\n'):
    if line.startswith('diff -ruN'):
        cur=line.split(' ')[-1].replace(b+'/',''); files[cur]=[0,0]
    elif cur and line.startswith('+') and not line.startswith('+++'): files[cur][0]+=1
    elif cur and line.startswith('-') and not line.startswith('---'): files[cur][1]+=1
def kind(f):
    if re.search(r'\.(test|verify)\.', f) or '/test/' in f: return 'test'
    if 'packages/framework' in f: return 'framework'
    return 'product'
tot=collections.defaultdict(lambda:[0,0,0])
for f,(p,m) in files.items():
    k=kind(f); tot[k][0]+=1; tot[k][1]+=p; tot[k][2]+=m
print({k:tuple(v) for k,v in tot.items()})
if '-v' in sys.argv:
    for f,(p,m) in files.items(): print(f'  {kind(f):9} +{p:<4} -{m:<4} {f}')
