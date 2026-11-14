# Whole-map caves. job: from pass-A umap headers, list the export byte ranges to copy (cavejob.json).
import sys, os, json, re
sys.argv += ['/tmp']
src = open(os.path.join(os.path.dirname(__file__), 'cavepref.py')).read()
src = "\n".join(l for l in src.splitlines() if not l.startswith(("D = ", "man = ")))
g = {'__name__': 'x'}; exec(src.split("if __name__ == '__main__':")[0], g)
import ooz
def decomp(raw, us, sizes, bs=65536):
    out = b''; o = 0
    for s in sizes:
        out += ooz.decompress(raw[o:o+s], us if len(sizes) == 1 else min(bs, us - len(out))); o += s
    return out
ACT = re.compile(r'^(BP_CaveInstance_C|BP_CaveEntrance_.*_C|BP_Voxel_.*_C|BP_DeepMining.*_C|BP_InteractableLake_C|BP_IcarusCaveAISpawner_C)$')
def tiles(D):
    man = [l.split('|') for l in open(os.path.join(D, 'manifestA.txt')).read().splitlines() if l]
    for m in man:
        b = decomp(open(os.path.join(D, m[0]), 'rb').read(), int(m[2]), [int(x) for x in m[3].split(',')]) if 'Oodle' in m[1] else open(os.path.join(D, m[0]), 'rb').read()
        yield m[0], b
def index(b):
    names, imps, exps, total = g['summary'](b)
    on = lambda i: g['objname'](imps, exps, i) or ''
    rows = []
    for i, e in enumerate(exps, 1):
        cn = on(e['cls']); o = exps[e['outer']-1] if e['outer'] > 0 else None
        oc = on(o['cls']) if o else ''
        keep = ACT.match(cn) or (o and ACT.match(oc) and cn in ('SceneComponent', 'StaticMeshComponent') and e['name'] in ('DefaultSceneRoot', 'Mesh'))
        if keep: rows.append(dict(i=i, c=cn, n=e['name'], o=o['name'] if o else '', s=e['size'], u=e['off'] - total))
    return rows, names, imps
if __name__ == '__main__':
    D, out = sys.argv[1], sys.argv[2]
    sizes = {}
    for l in open(os.path.join(D, 'uexp_sizes.txt')).read().splitlines():
        p = l.split('|'); sizes[os.path.basename(p[0])] = p[0]
    job = []; idx = {}
    for fn, b in tiles(D):
        rows, _, _ = index(b)
        if not rows: continue
        base = re.sub(r'\.umap$', '.uexp', fn.split('_Sublevels_Generated_')[-1])
        full = sizes.get(base)
        if not full: print('no uexp for', fn); continue
        idx[full] = rows
        rs = sorted((r['u'], r['u'] + r['s']) for r in rows)
        cur = None
        for a, z in rs:
            if cur and a - cur[1] < 131072: cur[1] = max(cur[1], z)
            else:
                if cur: job.append(dict(file=full, start=cur[0], len=cur[1]-cur[0]))
                cur = [a, z]
        if cur: job.append(dict(file=full, start=cur[0], len=cur[1]-cur[0]))
    json.dump(dict(ranges=job), open(os.path.join(out, 'cavejob.json'), 'w'))
    json.dump(idx, open(os.path.join(out, 'index.json'), 'w'))
    print(len(idx), 'tiles', len(job), 'ranges', sum(r['len'] for r in job) // 1024, 'KB')
