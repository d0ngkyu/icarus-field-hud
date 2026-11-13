import struct,sys,json
b=open(sys.argv[1],'rb').read()
pos=16; ver=b[pos]; pos+=1
def i32():
    global pos; v=struct.unpack_from('<i',b,pos)[0]; pos+=4; return v
def fs():
    global pos; n=i32()
    if n<0: r=b[pos:pos-2*n].decode('utf-16-le').rstrip('\0'); pos+=-2*n
    else: r=b[pos:pos+n].decode('utf-8','replace').rstrip('\0'); pos+=n
    return r
so=struct.unpack_from('<q',b,pos)[0]; pos+=8
save=pos; pos=so; n=i32(); strs=[]
for _ in range(n):
    strs.append(fs())
    if ver>=2: i32()
pos=save
if ver>=2: i32()
out={}
for _ in range(i32()):
    if ver>=2: i32()
    ns=fs(); d=out.setdefault(ns,{})
    for _ in range(i32()):
        if ver>=2: i32()
        k=fs(); i32(); d[k]=strs[i32()]
json.dump(out,open(sys.argv[2],'w'),ensure_ascii=False)
print(ver,len(strs),{k:len(v) for k,v in out.items() if len(v)>200})
for k in ['Item_Wood_Wall-DisplayName','Item_Kit_Machining_Bench-DisplayName','Item_Iron_Ingot-DisplayName']: print(k,out.get('D_Itemable',{}).get(k))
