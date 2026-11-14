const { contextBridge, ipcRenderer } = require('electron');
let onState = null, onLive = null, onUpd = null, pendingUpd = null, onDiag = null, pendingDiag = [], pendingLive = null;
ipcRenderer.on('live', (_e, txt) => { if (onLive) onLive(txt); else pendingLive = txt; });
ipcRenderer.on('state', (_e, st) => { if (onState) onState(st); });
ipcRenderer.on('upd', (_e, u) => { if (onUpd) onUpd(u); else pendingUpd = u; });
ipcRenderer.on('diag', (_e, n) => { if (onDiag) onDiag(n); else pendingDiag.push(n); });
contextBridge.exposeInMainWorld('hudApp', {
  gameControl: action => ipcRenderer.invoke('gameControl', action),
  state: () => ipcRenderer.invoke('state'),
  toggleTop: () => ipcRenderer.invoke('toggleTop'),
  toggleCompact: () => ipcRenderer.invoke('toggleCompact'),
  minimize: () => ipcRenderer.invoke('minimize'),
  hide: () => ipcRenderer.invoke('hide'),
  info: () => ipcRenderer.invoke('info'),
  setMacros: on => ipcRenderer.invoke('setMacros', on),
  checkUpdate: () => ipcRenderer.invoke('checkUpdate'),
  diagStatus: () => ipcRenderer.invoke('diagStatus'),
  diagReport: () => ipcRenderer.invoke('diagReport'),
  setSafe: on => ipcRenderer.invoke('setSafe', on),
  setModOn: on => ipcRenderer.invoke('setModOn', on),
  onState: fn => { onState = fn; },
  onLive: fn => {
    if (typeof fn !== 'function') throw new TypeError('데이터를 받을 함수를 지정해 주세요.');
    onLive = fn;
    if (pendingLive !== null) { const txt = pendingLive; pendingLive = null; fn(txt); }
  },
  onUpd: fn => { onUpd = fn; if (pendingUpd) { fn(pendingUpd); pendingUpd = null; } },
  onDiag: fn => { onDiag = fn; for (const n of pendingDiag) fn(n); pendingDiag = []; },
});
