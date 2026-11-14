# Builds the CAVEDATA table in hud/index.html from the cave prefab files the HUD copies on the build PC
# (Mods/IcarusHUD/caveraw/, needs dev.txt). Usage: python3 cavedata.py <caveraw dir>  -> prints the JS line.
import sys, os, re, json, statistics, collections
D = sys.argv[1]
sys.argv = ['cavepref', D, '']
exec(open(os.path.join(os.path.dirname(__file__), 'cavepref.py')).read().replace("if __name__ == '__main__':", "if False:"))
K = {'BP_CRE_CaveWorm_C': 'w', 'BP_WildBeeHive_C': 'h', 'BP_BatNest_C': 'b', 'BP_SpiderNest_C': 's', 'BP_CRE_LandShark_C': 'l'}
rows, size, ent = {}, {}, collections.defaultdict(list)
for f in sorted(os.listdir(D)):
    if not (f.startswith('Prefabs_Cave_CAVE_') and f.endswith('.uasset')): continue
    n = f[:-7]; c = n.replace('Prefabs_Cave_CAVE_', '')
    p = parse(n)
    sm = [(cls, v) for cls, v in (p.get('CaveActorSpawnMap') or []) if isinstance(v, dict)]
    rows[c] = {cls: (v.get('MinSpawnNumber', 0), v.get('MaxSpawnNumber', 0)) for cls, v in sm}
    # size: how many creature spawn points the cave has (more tunnels = more points), on icarusintel's
    # SMALL/MEDIUM/LARGE/MEGA scale (their ore-count bands: <25, 25-34, 35-54, 55+)
    pts = sum(len(v['SpawnPoints']) for cls, v in sm if isinstance(v.get('SpawnPoints'), list))
    size[c] = 1 if pts < 25 else 2 if pts < 35 else 3 if pts < 55 else 4
    names = summary(load(f))[0]
    for e in sorted(set(re.sub(r'_C$', '', x) for x in names if x.startswith('BP_CaveEntrance_'))):
        ent[e.replace('BP_CaveEntrance_', '')].append(c)
out = {}
for e, cands in sorted(ent.items()):
    sizes = [size[c] for c in cands]
    d = {'n': len(cands), 'lv': sorted(set(sizes)), 'z': collections.Counter(sizes).most_common(1)[0][0],
         'bio': collections.Counter(c.split('_')[0] for c in cands).most_common(1)[0][0]}
    for cls, k in K.items():
        mins = [rows[c].get(cls, (0, 0))[0] for c in cands]; maxs = [rows[c].get(cls, (0, 0))[1] for c in cands]
        if max(maxs) == 0: continue
        d[k] = [int(statistics.median_low(mins)), int(statistics.median_high(maxs)), max(maxs)]
    out[e] = d
print('const CAVEDATA=' + json.dumps(out, separators=(',', ':')) + ';')
