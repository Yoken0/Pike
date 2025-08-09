# Pike Desktop Application

Pike is now available as a desktop application! Run your AI-powered document assistant natively on Windows, macOS, and Linux.

## Quick Start

### Development Mode
```bash
node build-desktop.js dev
```

### Build Desktop App
```bash
node build-desktop.js build
```

### Create Installers
```bash
node build-desktop.js dist
```

## What's New in Desktop Version

✅ **Native Desktop Experience**
- Runs in a dedicated window (no browser needed)
- Native window controls and menus
- Better performance and integration

✅ **Cross-Platform Support**
- Windows (NSIS installer)
- macOS (DMG for Intel & Apple Silicon)
- Linux (AppImage portable app)

✅ **All Web Features Included**
- Document upload and processing
- AI chat with RAG responses
- Autonomous web search
- Vector similarity search
- Source citations

✅ **Desktop-Specific Benefits**
- Faster startup than web version
- Offline document storage
- System notifications (coming soon)
- File associations (coming soon)

## Technical Details

The desktop app uses Electron to wrap the existing React/Express application:

- **Main Process**: `electron/main.js` - Window management and server startup
- **Renderer Process**: Your existing Pike web app
- **Preload Script**: `electron/preload.js` - Secure API bridge
- **Build Config**: `electron-builder.config.js` - Cross-platform packaging

## File Structure
```
pike/
├── electron/
│   ├── main.js              # Electron main process
│   ├── preload.js           # Secure API bridge
│   └── assets/
│       └── icon.png         # App icon
├── electron-builder.config.js  # Build configuration
├── build-desktop.js         # Build scripts
└── DESKTOP_SETUP.md        # Detailed setup guide
```

## System Requirements

- **Windows**: Windows 10 or later
- **macOS**: macOS 10.14 or later
- **Linux**: Ubuntu 18.04+ or equivalent
- **Memory**: 512MB RAM minimum
- **Storage**: 200MB free space

## Next Steps

1. **Test the desktop app**: Run `node build-desktop.js dev`
2. **Create your first build**: Run `node build-desktop.js build`
3. **Distribute to users**: Share the installers from `dist-electron/`

For detailed setup instructions, see `DESKTOP_SETUP.md`.