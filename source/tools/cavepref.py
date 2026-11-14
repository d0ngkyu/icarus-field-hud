# Parse Icarus cave prefab assets (CavePrefabAsset) -> creature placements per cave.
import ooz, struct, sys, os, re, json
D = sys.argv[1]
man = {l.split('|')[0]: l.split('|') for l in open(os.path.join(D, 'manifest.txt')).read().splitlines()}
def load(n):
    m = man[n]; us = int(m[2]); raw = open(os.path.join(D, n), 'rb').read()
    if 'Oodle' not in m[1]: return raw
    sizes = [int(x) for x in m[3].split(',')]
    out = b''; o = 0
    for s in sizes:
        out += ooz.decompress(raw[o:o+s], us if len(sizes) == 1 else min(65536, us - len(out))); o += s
    return out
class R:
    def __init__(s, b, o=0): s.b, s.o = b, o
    def i32(s): v = struct.unpack_from('<i', s.b, s.o)[0]; s.o += 4; return v
    def u32(s): v = struct.unpack_from('<I', s.b, s.o)[0]; s.o += 4; return v
    def i64(s): v = struct.unpack_from('<q', s.b, s.o)[0]; s.o += 8; return v
    def f32(s): v = struct.unpack_from('<f', s.b, s.o)[0]; s.o += 4; return v
    def u8(s): v = s.b[s.o]; s.o += 1; return v
    def fstr(s):
        n = s.i32()
        if n == 0: return ''
        if n < 0: v = s.b[s.o:s.o-2*n].decode('utf-16-le').rstrip('\0'); s.o += -2*n; return v
        v = s.b[s.o:s.o+n-1].decode('latin1'); s.o += n; return v
    def guid(s): s.o += 16
def summary(b):
    r = R(b); assert r.u32() == 0x9E2A83C1
    lv = r.i32(); r.i32(); r.i32(); r.i32()  # legacy, ue3, ue4ver, licensee
    if lv <= -2: pass
    nc = r.i32(); r.o += nc * 20  # custom versions
    total = r.i32(); folder = r.fstr(); flags = r.u32()
    nn = r.i32(); no = r.i32()
    r.fstr() if False else None
    gn = r.i32(); go = r.i32()  # gatherable text
    ec = r.i32(); eo = r.i32(); ic = r.i32(); io = r.i32()
    names = []; rr = R(b, no)
    for _ in range(nn): names.append(rr.fstr()); rr.o += 4
    imps = []; rr = R(b, io)
    for _ in range(ic):
        cp = rr.i64(); cn = rr.i64(); outer = rr.i32(); on = rr.i64()
        imps.append((names[cn & 0xffffffff], names[on & 0xffffffff], outer))
    exps = []; rr = R(b, eo)
    for _ in range(ec):
        cls = rr.i32(); sup = rr.i32(); tmpl = rr.i32(); outer = rr.i32(); on = rr.i64(); fl = rr.u32()
        size = rr.i64(); off = rr.i64(); rr.o += 60  # forced,notclient,notserver,guid,pkgflags,notalways,isasset,firstdep,4 dep counts (104-byte export)
        exps.append(dict(cls=cls, name=names[on & 0xffffffff], size=size, off=off, outer=outer, tmpl=tmpl))
    return names, imps, exps, total
def objname(imps, exps, i):
    if i < 0: return imps[-i-1][1]
    if i > 0: return exps[i-1]['name']
    return None
def props(r, names, imps, exps, end, depth=0):
    out = {}
    while r.o < end:
        n = names[r.i32()]; r.i32()
        if n == 'None': break
        t = names[r.i32()]; r.i32(); size = r.i32(); idx = r.i32()
        extra = {}
        if t == 'StructProperty': extra['s'] = names[r.i32()]; r.i32(); r.guid()
        elif t in ('BoolProperty',): extra['v'] = r.u8()
        elif t in ('ByteProperty', 'EnumProperty'): extra['e'] = names[r.i32()]; r.i32()
        elif t in ('ArrayProperty', 'SetProperty'): extra['in'] = names[r.i32()]; r.i32()
        elif t == 'MapProperty': extra['k'] = names[r.i32()]; r.i32(); extra['vt'] = names[r.i32()]; r.i32()
        hg = r.u8()
        if hg: r.guid()
        start = r.o; val = None
        try: val = value(r, t, extra, size, names, imps, exps, depth)
        except Exception as e: val = '?'
        r.o = start + size
        if t == 'BoolProperty': val = extra['v']
        out.setdefault(n, []).append(val) if idx else out.__setitem__(n, val)
    return out
def value(r, t, extra, size, names, imps, exps, depth):
    if t == 'IntProperty': return r.i32()
    if t == 'FloatProperty': return r.f32()
    if t == 'NameProperty': v = names[r.i32()]; r.i32(); return v
    if t == 'ObjectProperty': return objname(imps, exps, r.i32())
    if t == 'SoftObjectProperty': v = names[r.i32()]; r.i32(); r.fstr(); return v
    if t == 'StrProperty': return r.fstr()
    if t == 'StructProperty':
        s = extra['s']
        if s in ('Vector', 'Rotator'): return (r.f32(), r.f32(), r.f32())
        if s == 'Quat': return None
        if s in ('Transform',): return props(r, names, imps, exps, r.o + size, depth+1)
        if s == 'Guid': return None
        return props(r, names, imps, exps, r.o + size, depth+1)
    if t == 'ArrayProperty':
        cnt = r.i32(); it = extra['in']; res = []
        if it == 'StructProperty':
            r.i32(); r.i32(); it2 = names[r.i32()]; r.i32(); r.i32(); r.i32(); sname = names[r.i32()]; r.i32(); r.guid(); r.u8()
            for _ in range(cnt):
                if sname in ('Vector',): res.append((r.f32(), r.f32(), r.f32())); continue
                if sname in ('Transform',):
                    res.append(props(r, names, imps, exps, len(r.b), depth+1)); continue
                res.append(props(r, names, imps, exps, len(r.b), depth+1))
            return res
        for _ in range(cnt): res.append(value(r, it, {}, 0, names, imps, exps, depth))
        return res
    if t == 'MapProperty':
        r.i32(); cnt = r.i32(); res = []
        for _ in range(cnt):
            k = value(r, extra['k'], {'s': 'X'}, 0, names, imps, exps, depth) if extra['k'] != 'StructProperty' else props(r, names, imps, exps, len(r.b), depth+1)
            v = props(r, names, imps, exps, len(r.b), depth+1) if extra['vt'] == 'StructProperty' else value(r, extra['vt'], {}, 0, names, imps, exps, depth)
            res.append((k, v))
        return res
    return None
if __name__ == '__main__':
    n = sys.argv[2]
    ua = load(n + '.uasset'); ue = load(n + '.uexp')
    names, imps, exps, total = summary(ua)
    print([ (e['name'], e['size'], e['off']) for e in exps][:10], total)
def parse(n):
    ua = load(n + '.uasset'); ue = load(n + '.uexp')
    names, imps, exps, total = summary(ua)
    e = exps[0]
    r = R(ue, e['off'] - total)
    return props(r, names, imps, exps, e['off'] - total + e['size'])
