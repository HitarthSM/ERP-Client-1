import * as fs from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import { app, BrowserWindow, dialog, Menu, ipcMain } from 'electron';
import { version as APP_VERSION } from '../../package.json';
import { initSettingsStore, loadSettings, saveSettings } from './settings-store';
import { initAutoUpdater } from './auto-updater';
import { startStaticServer, stopStaticServer, STATIC_SERVER_ORIGIN } from './static-server';

const DEFAULT_APP_NAME = 'Pramukh Digital';

/** Load root `.env` into process.env when missing (dev / unpackaged). */
function loadRootEnv(): void {
  const envPath = path.join(__dirname, '../../.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadRootEnv();

const APP_NAME = process.env.APP_NAME?.trim() || DEFAULT_APP_NAME;

function resolveAppIcon(): string | undefined {
  for (const candidate of [
    path.join(__dirname, '../../assets/icon.ico'),
    path.join(__dirname, '../../assets/app-logo.png'),
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

// Keep dev and packaged on same AppData folder
app.setName(APP_NAME);

let mainWindow: BrowserWindow | null = null;
const isDev = process.env.NODE_ENV === 'development';

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

let appIpcRegistered = false;

function registerAppIpc(): void {
  if (appIpcRegistered) return;
  appIpcRegistered = true;

  ipcMain.handle('app:get-version', () => APP_VERSION);

  ipcMain.handle('app:get-update-settings', () => {
    const s = loadSettings();
    return {
      githubToken: s.githubToken,
      updateCheckIntervalMinutes: s.updateCheckIntervalMinutes,
    };
  });

  ipcMain.handle('app:save-update-settings', (_event, partial: {
    githubToken?: string;
    updateCheckIntervalMinutes?: number;
  }) => {
    try {
      const next = saveSettings({
        ...(partial.githubToken !== undefined ? { githubToken: partial.githubToken } : {}),
        ...(partial.updateCheckIntervalMinutes !== undefined
          ? { updateCheckIntervalMinutes: partial.updateCheckIntervalMinutes }
          : {}),
      });
      return {
        success: true,
        settings: {
          githubToken: next.githubToken,
          updateCheckIntervalMinutes: next.updateCheckIntervalMinutes,
        },
      };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  });

  ipcMain.handle(
    'app:save-pdf',
    async (
      _event,
      payload: { html: string; defaultFileName?: string },
    ): Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }> => {
      let pdfWin: BrowserWindow | null = null;
      try {
        const html = payload?.html?.trim();
        if (!html) return { success: false, error: 'Missing HTML for PDF' };

        pdfWin = new BrowserWindow({
          show: false,
          width: 800,
          height: 1100,
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
          },
        });

        await pdfWin.loadURL(
          `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
        );
        // Let layout settle before rasterizing.
        await new Promise((r) => setTimeout(r, 120));

        const pdf = await pdfWin.webContents.printToPDF({
          printBackground: true,
          pageSize: 'A4',
          margins: { marginType: 'default' },
        });

        const { canceled, filePath } = await dialog.showSaveDialog({
          title: 'Save PDF',
          defaultPath: payload.defaultFileName || 'document.pdf',
          filters: [{ name: 'PDF', extensions: ['pdf'] }],
        });
        if (canceled || !filePath) return { success: false, canceled: true };

        await fs.writeFile(filePath, pdf);
        return { success: true, filePath };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : String(e) };
      } finally {
        pdfWin?.destroy();
      }
    },
  );
}

async function createWindow(): Promise<void> {
  const icon = resolveAppIcon();
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    backgroundColor: '#0f172a',
    show: false,
    title: `${APP_NAME} v${APP_VERSION}`,
    ...(icon ? { icon } : {}),
  });

  // Suppress default menu in production
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    if (mainWindow) initAutoUpdater(mainWindow);
  });

  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadURL(`${STATIC_SERVER_ORIGIN}/`);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  initSettingsStore(app.getPath('userData'));
  registerAppIpc();
  if (!isDev) {
    const rendererDir = path.join(__dirname, '../renderer');
    try {
      await startStaticServer(rendererDir);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      dialog.showErrorBox(`${APP_NAME} — Startup Error`, message);
      app.quit();
      return;
    }
  }
  return createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopStaticServer();
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});
