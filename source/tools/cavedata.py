# Builds the CAVEDATA table in hud/index.html from the cave prefab files the HUD copies on the build PC
# (Mods/IcarusHUD/caveraw/, needs dev.txt). Usage: python3 cavedata.py <caveraw dir>  -> prints the JS line.
import sys, os, re, json, statistics, collections
D = sys.argv[1]
sys.argv = ['cavepref', D, '']
exec(open(os.path.join(os.path.dirname(__file__), 'cavepref.py')).read().replace("if __name__ == '__main__':", "if False:"))
K = {'BP_CRE_CaveWorm_C': 'w', 'BP_WildBeeHive_C': 'h', 'BP_BatNest_C': 'b', 'BP_SpiderNest_C': 's', 'BP_CRE_LandShark_C': 'l'}
rows, size, info, ent = {}, {}, {}, collections.defaultdict(list)
for f in sorted(os.listdir(D)):
    if not (f.startswith('Prefabs_Cave_CAVE_') and f.endswith('.uasset')): continue
    n = f[:-7]; c = n.replace('Prefabs_Cave_CAVE_', '')
    p = parse(n)
    sm = [(cls, v) for cls, v in (p.get('CaveActorSpawnMap') or []) if isinstance(v, dict)]
    rows[c] = {cls: (v.get('MinSpawnNumber', 0), v.get('MaxSpawnNumber', 0)) for cls, v in sm}
    # size: the cave's real width = farthest horizontal distance across its rock pieces and spawn points (metres).
    # Bands chosen with the user: <60 m Lv.1 small, 60-100 Lv.2 medium, 100-150 Lv.3 large, 150+ M mega.
    pos = [sp['Translation'] for cls, v in sm if isinstance(v.get('SpawnPoints'), list) for sp in v['SpawnPoints'] if isinstance(sp, dict) and sp.get('Translation')]
    pos += [m['Transform']['Translation'] for m in (p.get('StaticMeshes') or []) if isinstance(m, dict) and isinstance(m.get('Transform'), dict)]
    span = 0
    if pos:
        xs = [a[0] for a in pos]; ys = [a[1] for a in pos]
        span = round(((max(xs) - min(xs)) ** 2 + (max(ys) - min(ys)) ** 2) ** .5 / 100)
    deep = len(p.get('DeepMiningOreDeposit') or []) if isinstance(p.get('DeepMiningOreDeposit'), list) else 0
    info[c] = (span, deep)
    size[c] = 1 if span < 60 else 2 if span < 100 else 3 if span < 150 else 4
    names = summary(load(f))[0]
    for e in sorted(set(re.sub(r'_C$', '', x) for x in names if x.startswith('BP_CaveEntrance_'))):
        ent[e.replace('BP_CaveEntrance_', '')].append(c)
out = {}
for e, cands in sorted(ent.items()):
    sizes = [size[c] for c in cands]
    d = {'n': len(cands), 'lv': sorted(set(sizes)), 
         'bio': collections.Counter(c.split('_')[0] for c in cands).most_common(1)[0][0],
         'm': int(statistics.median([info[c][0] for c in cands])), 'd': int(statistics.median([info[c][1] for c in cands]))}
    for cls, k in K.items():
        mins = [rows[c].get(cls, (0, 0))[0] for c in cands]; maxs = [rows[c].get(cls, (0, 0))[1] for c in cands]
        if max(maxs) == 0: continue
        d[k] = [int(statistics.median_low(mins)), int(statistics.median_high(maxs)), max(maxs)]
    d['z'] = 1 if d['m'] < 60 else 2 if d['m'] < 100 else 3 if d['m'] < 150 else 4   # level of the typical (median-width) cave
    out[e] = d
print('const CAVEDATA=' + json.dumps(out, separators=(',', ':')) + ';')
