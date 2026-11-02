const { app, BrowserWindow, Menu, dialog, ipcMain, net, protocol } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const APP_URL = 'app://chagok/';
const PRELOAD = path.join(__dirname, 'preload.cjs');
const APP_ROOT = path.resolve(__dirname, '..');
const ASSETS = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/floating-window.js', ['floating-window.js', 'text/javascript; charset=utf-8']],
]);

// A stable origin keeps browser storage consistent across launches and updates.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

let plannerWindow = null;
let clockWindow = null;
let quitting = false;
let startupTimer = null;

function showPlanner() {
  if (!plannerWindow || plannerWindow.isDestroyed()) return;
  if (plannerWindow.isMinimized()) plannerWindow.restore();
  plannerWindow.show();
  plannerWindow.focus();
}

function reportFailure(message, error) {
  clearTimeout(startupTimer);
  const detail = error instanceof Error ? error.message : String(error || '');
  console.error(message, detail);
  showPlanner();
  dialog.showErrorBox('차곡을 실행하지 못했습니다', `${message}${detail ? `\n\n${detail}` : ''}`);
}

function showClock() {
  if (clockWindow && !clockWindow.isDestroyed()) {
    if (clockWindow.isMinimized()) clockWindow.restore();
    clockWindow.show();
    clockWindow.focus();
    return;
  }
  if (!plannerWindow || plannerWindow.isDestroyed()) return;
  plannerWindow.webContents.executeJavaScript("document.getElementById('float-timer')?.click()")
    .catch(error => reportFailure('작은 시계 창을 열지 못했습니다. 작업 설계 화면에서 다시 시도해 주세요.', error));
}

function preventUnexpectedNavigation(contents, allowed) {
  contents.on('will-navigate', (event, url) => {
    if (!allowed(url)) event.preventDefault();
  });
  contents.on('will-redirect', (event, url) => {
    if (!allowed(url)) event.preventDefault();
  });
}

function allowPlannerUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'app:' && parsed.hostname === 'chagok' &&
      (parsed.pathname === '/' || parsed.pathname === '/index.html');
  } catch {
    return false;
  }
}

async function installProtocol() {
  protocol.handle('app', async request => {
    try {
      const url = new URL(request.url);
      const asset = url.hostname === 'chagok' && ASSETS.get(url.pathname);
      if (!asset || !['GET', 'HEAD'].includes(request.method)) {
        return new Response('Not found', { status: 404 });
      }
      const [filename, mime] = asset;
      const response = await net.fetch(pathToFileURL(path.join(APP_ROOT, filename)).href);
      if (!response.ok) return new Response('Asset unavailable', { status: 500 });
      return new Response(request.method === 'HEAD' ? null : response.body, {
        status: 200,
        headers: { 'Content-Type': mime, 'X-Content-Type-Options': 'nosniff' },
      });
    } catch (error) {
      console.error('Could not load a packaged application asset:', error.message);
      return new Response('Asset unavailable', { status: 500 });
    }
  });
}

function createController() {
  plannerWindow = new BrowserWindow({
    title: '차곡 · 작업 설계',
    width: 1260,
    height: 900,
    minWidth: 760,
    minHeight: 600,
    show: false,
    backgroundColor: '#101012',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: PRELOAD,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  preventUnexpectedNavigation(plannerWindow.webContents, allowPlannerUrl);
  plannerWindow.webContents.setWindowOpenHandler(details => {
    if (details.url !== 'about:blank' || details.frameName !== 'chagok-focus') return { action: 'deny' };
    if (clockWindow && !clockWindow.isDestroyed()) {
      showClock();
      return { action: 'deny' };
    }
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        title: '차곡 · 타이머',
        width: 480,
        height: 210,
        useContentSize: true,
        resizable: false,
        maximizable: false,
        fullscreenable: false,
        alwaysOnTop: true,
        autoHideMenuBar: true,
        show: true,
        backgroundColor: '#101012',
        icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
          preload: PRELOAD,
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          backgroundThrottling: false,
        },
      },
    };
  });

  plannerWindow.webContents.on('did-create-window', window => {
    clockWindow = window;
    clearTimeout(startupTimer);
    window.setMenu(null);
    window.setMenuBarVisibility(false);
    window.setAlwaysOnTop(true);
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    preventUnexpectedNavigation(window.webContents, url => url === 'about:blank');
    window.webContents.on('render-process-gone', (_event, details) => {
      reportFailure('시계 화면이 종료되었습니다. 작업 설계 화면에서 다시 열어 주세요.', details.reason);
    });
    window.on('closed', () => {
      clockWindow = null;
      if (!quitting && (!plannerWindow || plannerWindow.isDestroyed() || !plannerWindow.isVisible())) app.quit();
    });
  });

  plannerWindow.on('close', event => {
    if (quitting) return;
    if (clockWindow && !clockWindow.isDestroyed()) {
      event.preventDefault();
      plannerWindow.hide();
    } else {
      app.quit();
    }
  });
  plannerWindow.on('closed', () => { plannerWindow = null; });
  plannerWindow.webContents.on('render-process-gone', (_event, details) => {
    reportFailure('작업 설계 화면이 종료되었습니다. 앱을 다시 실행해 주세요.', details.reason);
  });
  plannerWindow.webContents.on('did-fail-load', (_event, code, description) => {
    if (code !== -3) reportFailure('앱 화면을 불러오지 못했습니다.', description);
  });

  // The renderer opens the compact view after its application module initializes.
  startupTimer = setTimeout(() => {
    if (!clockWindow && !quitting) {
      reportFailure('작은 시계 창이 시작되지 않았습니다. 작업 설계 화면에서 다시 열어 주세요.');
    }
  }, 10000);
  plannerWindow.loadURL(APP_URL).catch(error => reportFailure('앱 화면을 불러오지 못했습니다.', error));
}

function installMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: '차곡',
      submenu: [
        { label: '작업 설계 열기', accelerator: 'CommandOrControl+O', click: showPlanner },
        { label: '작은 시계 열기', accelerator: 'CommandOrControl+T', click: showClock },
        { type: 'separator' },
        { label: '종료', role: 'quit' },
      ],
    },
    { label: '편집', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
  ]));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (clockWindow && !clockWindow.isDestroyed()) showClock();
    else showPlanner();
  });
  app.on('before-quit', () => { quitting = true; clearTimeout(startupTimer); });
  app.on('window-all-closed', () => app.quit());
  app.on('activate', () => {
    if (clockWindow && !clockWindow.isDestroyed()) showClock();
    else showPlanner();
  });
  app.whenReady().then(async () => {
    await installProtocol();
    ipcMain.handle('clock:show-planner', event => {
      const trusted = [plannerWindow, clockWindow].some(window =>
        window && !window.isDestroyed() && window.webContents === event.sender);
      if (!trusted) return false;
      showPlanner();
      return true;
    });
    installMenu();
    createController();
  }).catch(error => {
    reportFailure('앱 초기화에 실패했습니다.', error);
    app.quit();
  });
}
