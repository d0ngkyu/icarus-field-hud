# Hand-made caves (BP_Cave_C) in each map's Developer sublevels -> /home/claude/mapcaves/devcaves.json
import sys, os, json, re
sys.path.insert(0, os.path.dirname(__file__))
import mapcaves as MC
g = MC.g
M = '/mnt/user-data/uploads/Icarus/Icarus/Binaries/Win64/ue4ss/Mods/IcarusHUD/mapcaves'
H = '/home/claude/mapcaves/d1'
bun = open(M + '/bundle_d2_0.bin', 'rb').read()
where = {l.split('|')[0]: (int(l.split('|')[2]), int(l.split('|')[3])) for l in open(M + '/bundle_d2.txt').read().splitlines()}
def body(out, method, us, sizes):
    o, s = where[out]; raw = bun[o:o+s]
    return MC.decomp(raw, int(us), [int(x) for x in sizes.split(',')]) if 'Oodle' in method else raw
res = {}
DEBUG = len(sys.argv) > 1
for l in open(M + '/manifestC_d2.txt').read().splitlines():
    out, method, us, sizes = l.split('|')
    hn = out.replace('.uexp.d2.c', '.umap.d1.c')
    if not os.path.exists(os.path.join(H, hn)): continue
    hb = open(os.path.join(H, hn), 'rb').read(); ub = body(out, method, us, sizes)
    names, imps, exps, total = g['summary'](hb)
    on = lambda i: g['objname'](imps, exps, i) or ''
    mapn = out.split('_Sublevels_')[0].replace('Maps_', '')
    P = {}
    for i, e in enumerate(exps, 1):
        cn = on(e['cls']); o = exps[e['outer']-1] if e['outer'] > 0 else None
        oc = on(o['cls']) if o else ''
        if cn == 'BP_Cave_C' or (oc == 'BP_Cave_C') or cn.startswith('BP_CaveEntrance') or cn == 'CaveEntrance_C' or oc == 'CaveEntrance_C' or oc.startswith('BP_CaveEntrance'):
            d = ub[e['off'] - total: e['off'] - total + e['size']]
            try: pr = g['props'](g['R'](d), names, imps, exps, len(d))
            except Exception as ex: pr = {'ERR': str(ex)}
            P[(e['name'], o['name'] if o else '')] = (cn, pr)
    for (n, o), (c, p) in P.items():
        if c not in ('BP_Cave_C', 'CaveEntrance_C') and not c.startswith('BP_CaveEntrance'): continue
        root = None
        for (n2, o2), (c2, p2) in P.items():
            if o2 == n and 'RelativeLocation' in p2 and (n2 == p.get('RootComponent') or root is None): root = p2
        if DEBUG and 'Terrain_016' in mapn: print(mapn, c, n, {k: v for k, v in p.items() if k not in ('Tags', 'BlueprintCreatedComponents')}, root and root.get('RelativeLocation'))
        res.setdefault(mapn, []).append(dict(c=c, n=n, loc=root and root.get('RelativeLocation'), p={k: str(v)[:300] for k, v in p.items() if k not in ('Tags', 'BlueprintCreatedComponents')}))
json.dump(res, open('/home/claude/mapcaves/devcaves.json', 'w'))
print({k: len(v) for k, v in res.items()})
