# Every cave prefab (base game + DLC paks, copied by cavejob 'copy') -> prefabs.json and prefabmesh.json
# prefabs.json: name -> [width m, deep veins, {creature:[min,max]}, deep-water flag, water-inside flag]
# prefabmesh.json: name -> rock piece / spawn / void positions (prefab space) used to count ore voxels nearby
import sys, os, json
D = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/mapcaves/pf'
sys.argv = ['cavepref', D, '']
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cavepref.py')).read().replace("if __name__ == '__main__':", "if False:"))
K = {'BP_CRE_CaveWorm_C': 'w', 'BP_WildBeeHive_C': 'h', 'BP_BatNest_C': 'b', 'BP_SpiderNest_C': 's', 'BP_CRE_LandShark_C': 'l'}
pre, mesh = {}, {}
for f in sorted(os.listdir(D)):
    if not (f.startswith('Prefabs_Cave_CAVE_') and f.endswith('.uasset')): continue
    n = f[:-7]; c = n.replace('Prefabs_Cave_CAVE_', '')
    try: p = parse(n)
    except Exception as e: print('skip', c, e); continue
    sm = [(cls, v) for cls, v in (p.get('CaveActorSpawnMap') or []) if isinstance(v, dict)]
    spawn = [sp['Translation'] for cls, v in sm if isinstance(v.get('SpawnPoints'), list) for sp in v['SpawnPoints'] if isinstance(sp, dict) and sp.get('Translation')]
    rocks = [m['Transform']['Translation'] for m in (p.get('StaticMeshes') or []) if isinstance(m, dict) and isinstance(m.get('Transform'), dict)]
    voids = [v['Transform']['Translation'] for v in (p.get('Voids') or []) if isinstance(v, dict) and isinstance(v.get('Transform'), dict)]
    pos = spawn + rocks or voids
    span = 0
    if pos:
        xs = [a[0] for a in pos]; ys = [a[1] for a in pos]
        span = round(((max(xs) - min(xs)) ** 2 + (max(ys) - min(ys)) ** 2) ** .5 / 100)
    deep = len(p.get('DeepMiningOreDeposit') or []) if isinstance(p.get('DeepMiningOreDeposit'), list) else 0
    haz = {K[cls]: [v.get('MinSpawnNumber', 0), v.get('MaxSpawnNumber', 0)] for cls, v in sm if cls in K and v.get('MaxSpawnNumber', 0) > 0}
    uw = wet = 0
    for l in p.get('Lakes') or []:
        row = str((l.get('WaterSetup') or {}).get('RowName', ''))
        if row.startswith('Cave_'):
            wet = 1; s = l['Transform']['Scale3D']
            if (64 * s[0] / 100) * (64 * s[1] / 100) >= 300 and 64 * s[2] / 100 >= 20: uw = 1
    pre[c] = [span, deep, haz, uw, wet]
    mesh[c] = [[round(a[0]), round(a[1]), round(a[2])] for a in (rocks or spawn + voids)]   # rock pieces (matches icarusintel ore counts); fallback when a prefab has none
json.dump(pre, open('/home/claude/mapcaves/prefabs.json', 'w'))
json.dump(mesh, open('/home/claude/mapcaves/prefabmesh.json', 'w'))
print(len(pre), 'prefabs;', sum(1 for v in mesh.values() if not v), 'without positions')
