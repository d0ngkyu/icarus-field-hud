# voxels inside each cave: within R of the cave's own rock pieces (prefab meshes placed in the world)
import json, math, collections, sys
C = json.load(open('/home/claude/mapcaves/caves.json')); V = json.load(open('/home/claude/mapcaves/voxpos.json'))
PM = json.load(open('/home/claude/mapcaves/prefabmesh.json'))
R = float(sys.argv[1]) if len(sys.argv) > 1 else 800
out = {}; seen = collections.Counter()
for mapn, caves in C.items():
    if '#' in mapn: continue
    grid = collections.defaultdict(list)
    for v in V.get(mapn, []): grid[(int(v[0] // R), int(v[1] // R))].append(v)
    for cv in caves:
        pre = (cv.get('prefab') or '').replace('CAVE_', '')
        pts = PM.get(pre)
        if not pts: continue
        a = math.radians(cv['yaw']); ca, sa = math.cos(a), math.sin(a)
        W = [(cv['x'] + t[0] * ca - t[1] * sa, cv['y'] + t[0] * sa + t[1] * ca, cv['z'] + t[2]) for t in pts]
        got = set()
        for w in W:
            gx, gy = int(w[0] // R), int(w[1] // R)
            for i in (-1, 0, 1):
                for j in (-1, 0, 1):
                    for v in grid.get((gx + i, gy + j), ()):
                        if (v[0] - w[0]) ** 2 + (v[1] - w[1]) ** 2 + (v[2] - w[2]) ** 2 < R * R: got.add((v[0], v[1], v[2]))
        out[cv['id'] + '@' + cv['tile']] = len(got)
        seen[pre] = seen[pre]
json.dump(out, open('/home/claude/mapcaves/voxels.json', 'w'))
if __name__ == '__main__':
    by = collections.defaultdict(list)
    for mapn, caves in C.items():
        if '#' in mapn: continue
        for cv in caves:
            k = cv['id'] + '@' + cv['tile']
            if k in out: by[(cv.get('prefab') or '').replace('CAVE_', '')].append(out[k])
    for p in ['CF_MED_004', 'CF_SML_001', 'AC_MED_005', 'AC_SML_002', 'DC_MED_001', 'LC_MED_006']: print(p, sorted(by[p]))
