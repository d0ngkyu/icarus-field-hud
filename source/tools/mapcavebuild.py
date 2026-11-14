# Whole-map caves, step 4: caves.json (+ voxels.json when present) -> CAVEMAP for hud/index.html
import json, math, sys, os, collections
C = json.load(open('/home/claude/mapcaves/caves.json'))
PRE = json.load(open('/home/claude/mapcaves/prefabs.json'))      # prefab -> [width m, deep veins, hazards]
VOX = json.load(open('/home/claude/mapcaves/voxels.json')) if os.path.exists('/home/claude/mapcaves/voxels.json') else {}
def inside(pt, poly):
    x, y = pt; c = False; j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i][0], poly[i][1]; xj, yj = poly[j][0], poly[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi: c = not c
        j = i
    return c
def world(cv, t):
    a = math.radians(cv['yaw']); return (cv['x'] + t[0] * math.cos(a) - t[1] * math.sin(a), cv['y'] + t[0] * math.sin(a) + t[1] * math.cos(a), cv['z'] + t[2])
out = {}; stats = collections.Counter()
for mapn, caves in C.items():
    if '#' in mapn: continue
    key = mapn.split('_')[0] + '_' + mapn.split('_')[1]          # Terrain_016_OLY -> Terrain_016
    lakes = C.get(mapn + '#lake', []); rows = []
    for cv in caves:
        ents = [world(cv, t) for t in cv['ent']] or [(cv['x'], cv['y'], cv['z'])]
        # underwater = an entrance sits inside a lake outline and below its surface
        uwl = any(inside(e[:2], lk) and e[2] < lk[0][2] + 500 for e in ents for lk in lakes)
        pre = (cv.get('prefab') or '').replace('CAVE_', '')
        info = PRE.get(pre)
        if info: width, deep, haz = info[0], info[1], info[2]
        else:
            width = round(max((2 * 32 * max(s[0], s[1]) for _, s in cv['vol']), default=0) / 100); deep = 0; haz = {}
        ore = VOX.get(cv['id'] + '@' + cv['tile'])
        e0 = ents[0]
        # level: real width band, averaged with the ore-count band when the ore count is known (user's rule)
        wb = 1 if width < 60 else 2 if width < 100 else 3 if width < 150 else 4
        lv = wb if ore is None else math.floor((wb + (1 if ore < 25 else 2 if ore < 35 else 3 if ore < 55 else 4)) / 2 + .5)
        rows.append([round(e0[0]), round(e0[1]), lv, width, ore, deep, int(uwl), len(ents), pre, haz])
        stats[(key, 'uw')] += uwl
    out[key] = rows
    stats.update((key, 'Lv%d' % r[2]) for r in rows)
print(stats)
json.dump(out, open('/home/claude/mapcaves/cavemap.json', 'w'), separators=(',', ':'))
