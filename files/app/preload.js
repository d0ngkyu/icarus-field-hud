const { contextBridge, ipcRenderer } = require('electron');
let onState = null, onLive = null, onUpd = null, pendingUpd = null, onOnline = null;
ipcRenderer.on('live', (_e, txt) => { if (onLive) onLive(txt); });
ipcRenderer.on('state', (_e, st) => { if (onState) onState(st); });
ipcRenderer.on('online', (_e, n) => { if (onOnline) onOnline(n); });
ipcRenderer.on('upd', (_e, u) => { if (onUpd) onUpd(u); else pendingUpd = u; });
contextBridge.exposeInMainWorld('hudApp', {
  state: () => ipcRenderer.invoke('state'),
  toggleTop: () => ipcRenderer.invoke('toggleTop'),
  toggleCompact: () => ipcRenderer.invoke('toggleCompact'),
  minimize: () => ipcRenderer.invoke('minimize'),
  hide: () => ipcRenderer.invoke('hide'),
  info: () => ipcRenderer.invoke('info'),
  setMacros: on => ipcRenderer.invoke('setMacros', on),
  checkUpdate: () => ipcRenderer.invoke('checkUpdate'),
  online: () => ipcRenderer.invoke('online'),
  setPresence: on => ipcRenderer.invoke('setPresence', on),
  onOnline: fn => { onOnline = fn; },
  onState: fn => { onState = fn; },
  onLive: fn => { onLive = fn; },
  onUpd: fn => { onUpd = fn; if (pendingUpd) { fn(pendingUpd); pendingUpd = null; } },
});
