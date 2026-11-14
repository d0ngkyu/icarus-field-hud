# Whole-map caves, step 2: read the copied blocks and the actors' properties.
import sys, os, json, re
sys.path.insert(0, os.path.dirname(__file__))
import mapcaves as MC
g = MC.g; import ooz
U, A, OUT = sys.argv[1], sys.argv[2], sys.argv[3]   # staged mapcaves dir, unpacked pass-A dir, output dir
flat = lambda s: re.sub(r'[\\/:]+', '_', s)
bun = open(os.path.join(U, 'bundle_b1_0.bin'), 'rb').read()
where = {}
for l in open(os.path.join(U, 'bundle_b1.txt')).read().splitlines():
    n, p, o, s = l.split('|'); where[n] = (int(o), int(s))
blocks = {}
for l in open(os.path.join(U, 'manifestB_b1.txt')).read().splitlines():
    out, method, us, bs, first, sizes = l.split('|'); us, bs, first = int(us), int(bs), int(first)
    o, s = where[out]; raw = bun[o:o+s]; full = re.sub(r'(\.b\d+)?\.part\d+$', '', out); k = first; p = 0
    for cs in map(int, sizes.split(',')):
        n = min(bs, us - k * bs)
        blocks[(full, k)] = ooz.decompress(raw[p:p+cs], n) if 'Oodle' in method else raw[p:p+cs]; p += cs; k += 1
def get(full, start, size, B=1048576):
    f = flat(full); out = b''
    while size > 0:
        k = start // B; b = blocks[(f, k)]; a = start - k * B; take = min(size, len(b) - a)
        out += b[a:a+take]; start += take; size -= take
    return out
def load(D):
    res = {}
    for fn, b in MC.tiles(D): res[fn] = b
    return res
if __name__ == '__main__':
    idx = json.load(open(os.path.join(OUT, 'index.json')))
    want = sys.argv[4] if len(sys.argv) > 4 else None
    man = {l.split('|')[0]: l.split('|') for l in open(os.path.join(A, 'manifestA.txt')).read().splitlines()}
    for full, rows in idx.items():
        if want and want not in full: continue
        un = flat(full)[:-5] + '.umap'
        m = man[un]; hb = MC.decomp(open(os.path.join(A, un), 'rb').read(), int(m[2]), [int(x) for x in m[3].split(',')])
        names, imps, exps, total = g['summary'](hb)
        for r in rows[:int(sys.argv[5]) if len(sys.argv) > 5 else 9999]:
            d = get(full, r['u'], r['s'])
            try: pr = g['props'](g['R'](d), names, imps, exps, len(d))
            except Exception as e: pr = 'ERR ' + repr(e)
            print(r['c'], r['n'], r['o'], str(pr)[:600])
