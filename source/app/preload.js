const { contextBridge, ipcRenderer } = require('electron');
let onState = null, onLive = null, onUpd = null, pendingUpd = null, onDiag = null, pendingDiag = [];
ipcRenderer.on('live', (_e, txt) => { if (onLive) onLive(txt); });
ipcRenderer.on('state', (_e, st) => { if (onState) onState(st); });
ipcRenderer.on('upd', (_e, u) => { if (onUpd) onUpd(u); else pendingUpd = u; });
ipcRenderer.on('diag', (_e, n) => { if (onDiag) onDiag(n); else pendingDiag.push(n); });
contextBridge.exposeInMainWorld('hudApp', {
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
  onLive: fn => { onLive = fn; },
  onUpd: fn => { onUpd = fn; if (pendingUpd) { fn(pendingUpd); pendingUpd = null; } },
  onDiag: fn => { onDiag = fn; for (const n of pendingDiag) fn(n); pendingDiag = []; },
});
