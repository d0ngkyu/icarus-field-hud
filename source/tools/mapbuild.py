import ooz, struct, sys, os, re
from PIL import Image
SRC='/mnt/user-data/uploads/Icarus/Icarus/Binaries/Win64/ue4ss/Mods/IcarusHUD/'
man={}
for l in open(SRC+'mapraw_done.txt'):
    p=l.strip().split('|')
    if len(p)==4: man[p[0]]=(p[1],int(p[2]),[int(x) for x in p[3].split(',')])
def load(name):
    meth,us,sizes=man[name]
    b=open(SRC+'mapraw_'+name,'rb').read()
    if meth=='none': return b[:us]
    out=b'';o=0;left=us
    for z in sizes:
        n=min(left, 65536) if len(sizes)>1 else us
        out+=ooz.decompress(b[o:o+z], n) if 'Oodle' in meth else __import__('zlib').decompress(b[o:o+z])
        o+=z; left-=n
    return out[:us]
def tex(d):
    i=d.find(b'PF_')
    e=d.index(b'\0',i); pf=d[i:e].decode()
    sx,sy=struct.unpack_from('<ii',d,i-4-12)
    # bulk header: flags u32, count u32, size u32, offset i64
    j=e+1
    while j<len(d)-20:
        fl,c1,c2=struct.unpack_from('<III',d,j)
        if c1==c2 and c1>=sx*sy//2 and c1<=sx*sy*8: break
        j+=1
    data=d[j+20:j+20+c1]
    if pf=='PF_DXT1': im=Image.frombytes('RGBA',(sx,sy),data,'bcn',1)
    elif pf=='PF_DXT5': im=Image.frombytes('RGBA',(sx,sy),data,'bcn',3)
    elif pf=='PF_B8G8R8A8': im=Image.frombytes('RGBA',(sx,sy),data,'raw','BGRA')
    else: raise Exception(pf)
    return im.convert('RGB'),pf
if __name__=='__main__':
    terr=sys.argv[1]; n=int(sys.argv[2])
    tiles={}
    for k in man:
        if k.startswith(terr+'__') and k.endswith('.uexp'):
            m=re.search(r'_x(\d+)_y(\d+)\.uexp$',k); tiles[(int(m[1]),int(m[2]))]=k
    first=tex(load(next(iter(tiles.values()))))
    ts=first[0].size[0]; print(terr, len(tiles), first[1], first[0].size)
    big=Image.new('RGB',(ts*n,ts*n))
    for (x,y),k in tiles.items():
        im,_=tex(load(k)); big.paste(im,(y*ts,x*ts) if os.environ.get("T") else (x*ts,y*ts))
    big.save('/home/claude/maps/%s_raw.png'%terr)
