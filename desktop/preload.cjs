const { contextBridge, ipcRenderer } = require('electron');

// Only the two desktop capabilities needed by the existing renderer are exposed.
contextBridge.exposeInMainWorld('desktopClock', Object.freeze({
  isDesktop: true,
  showPlanner: () => ipcRenderer.invoke('clock:show-planner'),
}));
