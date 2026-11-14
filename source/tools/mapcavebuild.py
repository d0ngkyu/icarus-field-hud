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
ENTS = []
out = {}; stats = collections.Counter()
for mapn, caves in C.items():
    if '#' in mapn: continue
    key = mapn.split('_')[0] + '_' + mapn.split('_')[1]          # Terrain_016_OLY -> Terrain_016
    lakes = C.get(mapn + '#lake', []); rows = []
    for cv in caves:
        ents = [world(cv, t) for t in cv['ent']] or [(cv['x'], cv['y'], cv['z'])]
        # underwater = an entrance sits inside a lake outline and below its surface
        uwl = False   # set below with near_lake (needs the helper defined later)
        ENTS.append((key, len(rows), ents, lakes))
        pre = (cv.get('prefab') or '').replace('CAVE_', '')
        info = PRE.get(pre)
        if info: width, deep, haz = info[0], info[1], info[2]; wet = info[4] if len(info) > 4 else 0
        else:
            width = round(max((2 * 32 * max(s[0], s[1]) for _, s in cv['vol']), default=0) / 100); deep = 0; haz = {}; wet = 0
        ore = VOX.get(cv['id'] + '@' + cv['tile'])
        e0 = ents[0]
        # level: real width band, averaged with the ore-count band when the ore count is known (user's rule)
        wb = 1 if width < 60 else 2 if width < 100 else 3 if width < 150 else 4
        lv = wb if ore is None else math.floor((wb + (1 if ore < 25 else 2 if ore < 35 else 3 if ore < 55 else 4)) / 2 + .5)
        rows.append([round(e0[0]), round(e0[1]), lv, width, ore, deep, int(uwl), len(ents), pre, haz, wet])
        stats[(key, 'uw')] += uwl
    out[key] = rows
    stats.update((key, 'Lv%d' % r[2]) for r in rows)

# hand-placed caves from the Developer sublevels (BP_Cave_C volumes + CaveEntrance_C with a prefab tag), see mapdev.py
DEV = json.load(open('/home/claude/mapcaves/devcaves.json')) if os.path.exists('/home/claude/mapcaves/devcaves.json') else {}
import re as _re
def segd(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]; t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy + 1e-9)))
    return math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
def near_lake(p, lakes, d=6000):
    # underwater: the entrance is in a lake (or on its edge) and lower than the water surface
    for lk in lakes:
        if inside(p[:2], lk) or min(segd(p, lk[i - 1], lk[i]) for i in range(len(lk))) < d:
            if p[2] < lk[0][2] + 50: return True
    return False
for mapn, L in DEV.items():
    key = mapn.split('_')[0] + '_' + mapn.split('_')[1]
    rows = out.setdefault(key, []); lakes = C.get(mapn + '#lake', [])
    items = []
    for d in L:
        if d['c'] == 'CaveEntrance_C' and d['loc']: items.append(dict(p=d['loc'], tag=(d['p'].get('BaseCaveTag') or '').replace('CAVE_', ''), ne=1, box=[]))
        elif d['c'] == 'BP_Cave_C':
            pts = [tuple(map(float, m)) for m in _re.findall(r"'Translation': \(([-\d.e]+), ([-\d.e]+), ([-\d.e]+)\)", d['p'].get('CachedEntranceTransforms', ''))]
            box = [tuple(map(float, m)) for m in _re.findall(r"'Scale3D': \(([-\d.e]+), ([-\d.e]+), ([-\d.e]+)\)", d['p'].get('CachedLocations', ''))]
            if pts: items.append(dict(p=pts[0], tag='', ne=len(pts), box=box, all=pts))
    # one cave = a BP_Cave volume and its tagged entrance within 30 m
    merged = []
    for it in items:
        m = next((x for x in merged if math.hypot(x['p'][0] - it['p'][0], x['p'][1] - it['p'][1]) < 3000), None)
        if m: m['tag'] = m['tag'] or it['tag']; m['ne'] = max(m['ne'], it['ne']); m['box'] += it['box']; m['uwp'] = m.get('uwp', []) + [it['p']]
        else: it['uwp'] = [it['p']]; merged.append(it)
    for it in merged:
        x, y = it['p'][0], it['p'][1]
        if any(math.hypot(r[0] - x, r[1] - y) < 5000 for r in rows): continue
        info = PRE.get(it['tag'])
        if info: width, deep, haz, wet = info[0], info[1], info[2], info[4] if len(info) > 4 else 0
        else:
            width = round(max((64 * max(b[0], b[1]) for b in it['box']), default=0) / 100) if it['box'] else 0
            if len(it.get('all', [])) > 1:
                a = it['all']; width = max(width, round(max(math.hypot(p[0] - q[0], p[1] - q[1]) for p in a for q in a) / 100))
            deep, haz, wet = 0, {}, 0
        uw = any(near_lake(p, lakes) for p in it['uwp'])
        lv = 1 if width < 60 else 2 if width < 100 else 3 if width < 150 else 4
        rows.append([round(x), round(y), lv, width, None, deep, int(uw), it['ne'], it['tag'] or 'HAND', haz, wet])
        stats[(key, 'hand')] += 1; stats[(key, 'uw')] += uw
for key, i, ents, lakes in ENTS:
    # generated caves: only an entrance inside a lake outline and under its surface (none found so far)
    if any(inside(e[:2], lk) and e[2] < lk[0][2] - 100 for e in ents for lk in lakes): out[key][i][6] = 1; stats[(key, 'uw')] += 1
print(stats)
json.dump(out, open('/home/claude/mapcaves/cavemap.json', 'w'), separators=(',', ':'))
