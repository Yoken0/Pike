# Running Pike Locally - Complete Guide

## Easiest Method (macOS/Linux)

```bash
./start-pike.sh
```

This script handles everything automatically.

## Manual Methods

### Method 1: Shell Script (Recommended)
```bash
chmod +x start-pike.sh
./start-pike.sh
```

### Method 2: CommonJS Runner
```bash
node run-local.cjs
```

### Method 3: Direct npm
```bash
export NODE_ENV=development
npm run dev
```

### Method 4: PowerShell (Windows)
```powershell
$env:NODE_ENV="development"
npm run dev
```

## Complete Setup for Local Development

1. **Clone and Install**
   ```bash
   git clone <your-repo-url>
   cd pike
   npm install
   ```

2. **Environment Setup**
   Create `.env` file:
   ```
   OPENAI_API_KEY=your_key_here
   SERPER_API_KEY=your_key_here (optional)
   NODE_ENV=development
   ```

3. **Run Pike**
   ```bash
   node run-local.js
   ```

4. **Access Pike**
   Open: `http://localhost:5000`

## Troubleshooting

### Port Already in Use
If port 5000 is busy:
```bash
PORT=3000 node run-local.js
```

### Missing API Key
Pike will work without API keys, but AI features won't function. Get your OpenAI key from: https://platform.openai.com/api-keys

### Permission Issues
On macOS, you might need to allow network access when prompted.

## Desktop App (Alternative)

If local web doesn't work, try the desktop version:
```bash
node build-desktop.js dev
```

This runs Pike as a native app without browser dependencies.

## What Fixed the Issue

- Changed server binding from `0.0.0.0` to `localhost` in development
- Added environment-specific host configuration
- Created dedicated local run script with proper environment setup

The web version and desktop version now both work locally on macOS, Windows, and Linux!