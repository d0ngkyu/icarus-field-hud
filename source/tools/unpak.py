import struct,zlib,sys,os
p,out=sys.argv[1],sys.argv[2]
b=open(p,'rb').read()
i=b.rfind(struct.pack('<I',0x5A6F12E1)); ver,ioff,isz=struct.unpack('<IQQ',b[i+4:i+24])
pos=ioff
def u32():
    global pos; v=struct.unpack_from('<I',b,pos)[0]; pos+=4; return v
def u64():
    global pos; v=struct.unpack_from('<Q',b,pos)[0]; pos+=8; return v
def s(buf,o):
    n=struct.unpack_from('<i',buf,o)[0]; o+=4
    if n<0: r=buf[o:o-2*n].decode('utf-16-le').rstrip('\0'); o+=-2*n
    else: r=buf[o:o+n].decode('utf-8','replace').rstrip('\0'); o+=n
    return r,o
mp,pos=s(b,pos); n=u32(); pos+=8
if u32(): pos+=36
assert u32(); fo=u64(); fs=u64(); pos+=20
es=u32(); enc=b[pos:pos+es]
def entry(o):
    f=struct.unpack_from('<I',enc,o)[0]; o+=4
    bs=(f&0x3f)<<11
    if (f&0x3f)==0x3f: bs=struct.unpack_from('<I',enc,o)[0]; o+=4
    bc=(f>>6)&0xffff; encr=(f>>22)&1; m=(f>>23)&0x3f
    def rd(bit):
        nonlocal o
        if f&(1<<bit): v=struct.unpack_from('<I',enc,o)[0]; o+=4
        else: v=struct.unpack_from('<Q',enc,o)[0]; o+=8
        return v
    off=rd(31); us=rd(30); cs=rd(29) if m else us
    hdr=8+8+8+4+20+1+4+((4+16*bc) if m else 0)
    if bc==1 and not encr: sizes=[cs]
    else:
        sizes=list(struct.unpack_from('<%dI'%bc,enc,o))
    d=b''; q=off+hdr
    if not m: return b[q:q+us]
    for z in sizes: d+=zlib.decompress(b[q:q+z]); q+=z
    return d[:us]
o=fo; nd=struct.unpack_from('<I',b,o)[0]; o+=4; c=0
for _ in range(nd):
    dn,o=s(b,o); nf=struct.unpack_from('<I',b,o)[0]; o+=4
    for _ in range(nf):
        fn,o=s(b,o); eo=struct.unpack_from('<i',b,o)[0]; o+=4
        t=os.path.normpath(os.path.join(out,dn.lstrip('/'),fn)); assert t.startswith(os.path.abspath(out))
        os.makedirs(os.path.dirname(t),exist_ok=True); open(t,'wb').write(entry(eo)); c+=1
print(mp,c,'files')
