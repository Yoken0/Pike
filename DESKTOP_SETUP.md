# Pike Desktop App Setup

This guide explains how to build and run Pike as a desktop application using Electron.

## Prerequisites

- Node.js 18+ installed
- All dependencies installed (`npm install`)
- OpenAI API key configured in `.env` file

## Development Mode

To run Pike as a desktop app in development mode:

```bash
node build-desktop.js dev
```

This will:
1. Start the Express/Vite development server
2. Launch the Electron desktop app
3. Open Pike in a native desktop window
4. Enable hot reloading for development

## Building for Distribution

### Build the Desktop App

```bash
node build-desktop.js build
```

This creates the desktop application for your current platform.

### Create Distribution Packages

```bash
node build-desktop.js dist
```

This creates installer packages:
- **Windows**: `.exe` installer (NSIS)
- **macOS**: `.dmg` disk image (Universal binary for Intel + Apple Silicon)
- **Linux**: `.AppImage` portable application

## Output Files

Built applications are saved to the `dist-electron` directory:

```
dist-electron/
├── Pike-1.0.0.dmg           # macOS installer
├── Pike Setup 1.0.0.exe     # Windows installer
├── Pike-1.0.0.AppImage      # Linux portable app
└── unpacked/                # Unpacked app files
```

## Desktop App Features

The desktop version includes:
- Native window controls and menus
- System tray integration (future)
- File association for documents (future)
- Auto-updater support (future)
- Offline document storage

## Configuration

The Electron configuration is in:
- `electron/main.js` - Main process (window management, server startup)
- `electron/preload.js` - Preload script (secure API bridge)
- `electron-builder.config.js` - Build configuration

## Development Tips

1. **Debug Mode**: In development, the app opens with DevTools enabled
2. **Server Port**: The app uses port 5000 by default
3. **Hot Reloading**: Frontend changes auto-reload, backend changes require restart
4. **Platform Building**: Use `--mac`, `--win`, or `--linux` flags to build for specific platforms

## Troubleshooting

### Server Won't Start
- Check if port 5000 is available
- Ensure OpenAI API key is set
- Check terminal output for error messages

### Build Failures
- Run `npm run check` to verify TypeScript
- Ensure all dependencies are installed
- Check `electron-builder` logs for specific errors

### App Won't Launch
- Verify Node.js version (18+)
- Check for antivirus blocking (Windows)
- Look for permission errors (macOS/Linux)