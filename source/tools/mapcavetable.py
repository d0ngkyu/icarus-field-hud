# Whole-map caves, step 3: one row per cave -> /home/claude/mapcaves/caves.json
import sys, os, json, re, math
sys.argv = [sys.argv[0], '/mnt/user-data/uploads/Icarus/Icarus/Binaries/Win64/ue4ss/Mods/IcarusHUD/mapcaves', '/home/claude/mapcaves/a2', '/home/claude/mapcaves']
sys.path.insert(0, os.path.dirname(__file__))
exec(open(os.path.join(os.path.dirname(__file__), 'mapparse.py')).read().split("if __name__ == '__main__':")[0])
idx = json.load(open(OUT + '/index.json'))
man = {l.split('|')[0]: l.split('|') for l in open(A + '/manifestA.txt').read().splitlines()}
caves = {}
for full, rows in idx.items():
    mapn = full.split('/')[1]
    un = flat(full)[:-5] + '.umap'; m = man[un]
    hb = MC.decomp(open(os.path.join(A, un), 'rb').read(), int(m[2]), [int(x) for x in m[3].split(',')])
    names, imps, exps, total = g['summary'](hb)
    P = {}
    for r in rows:
        if 'Voxel' in r['c'] or 'Voxel' in r['o']: continue
        d = get(full, r['u'], r['s'])
        try: P[(r['n'], r['o'])] = (r['c'], g['props'](g['R'](d), names, imps, exps, len(d)))
        except Exception as e: print('ERR', full, r['n'], e)
    loc = {o: p['RelativeLocation'] for (n, o), (c, p) in P.items() if n in ('DefaultSceneRoot', 'Mesh') and 'RelativeLocation' in p}
    rot = {o: p.get('RelativeRotation', (0, 0, 0))[1] for (n, o), (c, p) in P.items() if n == 'DefaultSceneRoot' and 'RelativeLocation' in p}
    spawn = {}
    for (n, o), (c, p) in P.items():
        if c == 'BP_IcarusCaveAISpawner_C' and n in loc: spawn[tuple(round(v) for v in loc[n])] = p.get('LinkedCavePrefab')
    ents = [(n, c, loc[n]) for (n, o), (c, p) in P.items() if c.startswith('BP_CaveEntrance_') and n in loc]
    for (n, o), (c, p) in P.items():
        if c == 'BP_InteractableLake_C' and p.get('EdgeSplinePoints'):
            pts = [t['Translation'] for t in p['EdgeSplinePoints'] if isinstance(t, dict)]
            if len(pts) >= 3: caves.setdefault(mapn + '#lake', []).append([[round(a[0]), round(a[1]), round(a[2])] for a in pts])
    lst = caves.setdefault(mapn, [])
    for (n, o), (c, p) in P.items():
        if c != 'BP_CaveInstance_C' or n not in loc: continue
        L = loc[n]; pre = spawn.get(tuple(round(v) for v in L))
        vol = [v['Transform'] for v in p.get('VolumeData') or []]
        lst.append(dict(id=n, tile=full.split('/')[-1][:-5], x=L[0], y=L[1], z=L[2], yaw=rot.get(n, 0), prefab=pre,
                        ne=len(p.get('EntranceData') or []), vol=[[t['Translation'], t['Scale3D']] for t in vol],
                        ent=[list(t['Transform']['Translation']) for t in p.get('EntranceData') or []]))
    for n, c, L in ents: caves.setdefault(mapn + '#ent', []).append(dict(id=n, c=c, x=L[0], y=L[1], z=L[2]))
json.dump(caves, open(OUT + '/caves.json', 'w'))
for k, v in caves.items(): print(k, len(v), sum(1 for c in v if c.get('prefab')) if '#' not in k else '')
