import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let serverProcess;

const isDev = process.env.NODE_ENV === 'development';
const PORT = process.env.PORT || 3000;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'), // Add icon later
    titleBarStyle: 'default',
    show: false // Don't show until ready
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus on window creation
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Load the app
  if (isDev) {
    // In development, wait for the server to start
    const startUrl = `http://localhost:${PORT}`;
    mainWindow.loadURL(startUrl);
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  // Don't start server in Electron - assume it's already running
  console.log('Assuming server is already running on port', PORT);
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

// App event handlers
app.whenReady().then(() => {
  startServer();
  
  // Wait a bit for server to start, then create window
  setTimeout(() => {
    createWindow();
  }, isDev ? 3000 : 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopServer();
});

// IPC handlers for future desktop-specific features
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});