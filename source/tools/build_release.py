# Builds the update site: site/manifest.json + site/files/<path>
import hashlib, json, os, shutil, sys, time
OUT = '/home/claude/release/site'
UP = '/mnt/user-data/uploads/Icarus/Icarus/Binaries/Win64'
W = 'game/Icarus/Binaries/Win64/'
M = W + 'ue4ss/Mods/'
files = []  # (manifest path, source, once)
def add(p, src, once=False): files.append((p, src, once))
# loader (only put in place when missing)
add(W + 'dwmapi.dll', UP + '/dwmapi.dll', True)
add(W + 'ue4ss/UE4SS.dll', UP + '/ue4ss/UE4SS.dll', True)
add(W + 'ue4ss/UE4SS-settings.ini', '/home/claude/release/UE4SS-settings.ini', True)
add(W + 'ue4ss/LICENSE', UP + '/ue4ss/LICENSE', True)
add(M + 'mods.txt', '/home/claude/release/mods.txt', True)
add(M + 'shared/UEHelpers/UEHelpers.lua', UP + '/ue4ss/Mods/shared/UEHelpers/UEHelpers.lua', True)
add(M + 'Keybinds/Scripts/main.lua', UP + '/ue4ss/Mods/Keybinds/Scripts/main.lua', True)
# the HUD mod
H = '/home/claude/mod/'
add(M + 'IcarusHUD/enabled.txt', H + 'enabled.txt')
add(M + 'IcarusHUD/Scripts/main.lua', H + 'Scripts/main.lua')
add(M + 'IcarusHUD/Scripts/animals.lua', H + 'Scripts/animals.lua')
add(M + 'IcarusHUD/Scripts/bp_names.lua', UP + '/ue4ss/Mods/IcarusHUD/Scripts/bp_names.lua')
add(M + 'IcarusHUD/hud/index.html', H + 'hud/index.html')
add(M + 'IcarusHUD/hud/animals.js', H + 'hud/animals.js')
add(M + 'IcarusHUD/hud/icons.webp', H + 'hud/icons.webp')
for f in sorted(os.listdir(H + 'hud/fonts')): add(M + 'IcarusHUD/hud/fonts/' + f, H + 'hud/fonts/' + f)
for f in sorted(os.listdir(H + 'hud/maps')): add(M + 'IcarusHUD/hud/maps/' + f, H + 'hud/maps/' + f)
# the program's own code (the .exe shell itself does not change)
A = '/home/claude/app/src/'
for f in ['main.js', 'updater.js', 'preload.js', 'extract.js', 'levjob.js', 'cavejob.js', 'diag.js']: add('app/' + f, A + f)
version = sys.argv[1] if len(sys.argv) > 1 else time.strftime('%Y.%m.%d.%H%M')
notes = sys.argv[2] if len(sys.argv) > 2 else ''
shutil.rmtree(OUT, ignore_errors=True)
cfgf = '/home/claude/release/config.json'
man = {'version': version, 'notes': notes, 'config': json.load(open(cfgf)) if os.path.exists(cfgf) else {}, 'files': []}
for p, src, once in files:
    b = open(src, 'rb').read()
    if p.endswith('hud/index.html'): b = b.replace(b'__HUD_VERSION__', version.encode())
    d = os.path.join(OUT, 'files', p); os.makedirs(os.path.dirname(d), exist_ok=True); open(d, 'wb').write(b)
    e = {'p': p, 'n': len(b), 'h': hashlib.sha1(b).hexdigest()}
    if once: e['once'] = 1
    man['files'].append(e)
json.dump(man, open(os.path.join(OUT, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
print(version, len(files), 'files', sum(x['n'] for x in man['files']) // 1024, 'KB')
