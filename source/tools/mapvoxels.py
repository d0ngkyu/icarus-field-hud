# Whole-map caves, step 3b: rock/ore voxels inside each cave -> /home/claude/mapcaves/voxels.json ({id@tile: count})
import sys, os, json, math, collections
sys.argv = [sys.argv[0], '/mnt/user-data/uploads/Icarus/Icarus/Binaries/Win64/ue4ss/Mods/IcarusHUD/mapcaves', '/home/claude/mapcaves/a2', '/home/claude/mapcaves']
sys.path.insert(0, os.path.dirname(__file__))
src = open(os.path.join(os.path.dirname(__file__), 'mapparse.py')).read().split("if __name__ == '__main__':")[0]
exec(src.replace('bundle_b1_0.bin', 'bundle_b2_0.bin').replace('bundle_b1.txt', 'bundle_b2.txt').replace('manifestB_b1.txt', 'manifestB_b2.txt'))
idx = json.load(open('/home/claude/mapcaves/v2/index2.json'))
man = {l.split('|')[0]: l.split('|') for l in open(A + '/manifestA.txt').read().splitlines()}
vox = collections.defaultdict(list)       # map -> [(x,y,z,class)]
for full, rows in idx.items():
    mapn = full.split('/')[1]
    un = flat(full)[:-5] + '.umap'; m = man[un]
    hb = MC.decomp(open(os.path.join(A, un), 'rb').read(), int(m[2]), [int(x) for x in m[3].split(',')])
    names, imps, exps, total = g['summary'](hb)
    cls = {r['n']: r['c'] for r in rows}
    for r in rows:
        if r['c'] != 'ProceduralMeshComponent': continue
        d = get(full, r['u'], r['s'])
        try: p = g['props'](g['R'](d), names, imps, exps, len(d))
        except Exception: continue
        if 'RelativeLocation' in p: vox[mapn].append(tuple(p['RelativeLocation']) + (r['o'].split('_GEN_')[1][:2],))
json.dump(vox, open('/home/claude/mapcaves/voxpos.json', 'w'))
print({k: len(v) for k, v in vox.items()})
