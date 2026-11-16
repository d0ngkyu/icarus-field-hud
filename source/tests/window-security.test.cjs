const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'../app/main.js'),'utf8');
const pick=n=>src.match(new RegExp('function '+n+'\\(url\\) \\{.*\\n'))[0];
const make=hud=>new Function('path','hudFile',pick('safeExternal')+pick('sameHud')+'return {safeExternal,sameHud};')(path.win32,()=>hud);
test('only https leaves the app; the HUD window cannot navigate away from its own page',()=>{
 const {safeExternal,sameHud}=make('C:\\Games\\Icarus\\Icarus\\Binaries\\Win64\\ue4ss\\Mods\\IcarusHUD\\hud\\index.html');
 assert.equal(safeExternal('https://store.steampowered.com/news'),true);
 for(const u of ['http://x.test','file:///C:/Windows/system32/calc.exe','ms-settings:','javascript:alert(1)','steam://rungameid/1','smb://evil/x','not a url'])assert.equal(safeExternal(u),false,u);
 assert.equal(sameHud('file:///C:/Games/Icarus/Icarus/Binaries/Win64/ue4ss/Mods/IcarusHUD/hud/index.html'),true);
 assert.equal(sameHud('file:///c:/games/icarus/icarus/binaries/win64/ue4ss/mods/icarushud/hud/index.html#map'),true);
 assert.equal(sameHud('file:///C:/Users/x/Downloads/evil.html'),false);
 assert.equal(sameHud('https://example.com/'),false);
 assert.equal(make(null).sameHud('file:///C:/a.html'),false);
});
test('window handlers use the guards',()=>{
 assert.match(src,/setWindowOpenHandler\(\(\{ url \}\) => \{ if \(safeExternal\(url\)\) shell\.openExternal\(url\)/);
 assert.match(src,/on\('will-navigate', \(e, url\) => \{ if \(!sameHud\(url\)\) \{ e\.preventDefault\(\)/);
 assert.match(src,/contextIsolation: true, nodeIntegration: false/);
});
