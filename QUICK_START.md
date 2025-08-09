# Pike - Quick Start Guide

## Run Pike Locally (macOS/Linux)

1. **Download or clone Pike**
2. **Open Terminal in the pike folder**
3. **Run the startup script**:
   ```bash
   ./start-pike.sh
   ```

That's it! Pike will:
- Install dependencies automatically
- Create a `.env` file for you
- Start on http://localhost:5000

## Windows Users

1. **Open PowerShell in the pike folder**
2. **Run**:
   ```powershell
   node run-local.cjs
   ```

## Add Your API Key

To enable AI features, edit the `.env` file and add:
```
OPENAI_API_KEY=your_key_here
```

Get your API key from: https://platform.openai.com/api-keys

## Desktop App

For a native desktop experience:
```bash
node build-desktop.js dev
```

## Troubleshooting

**Port 5000 in use?**
```bash
PORT=3000 ./start-pike.sh
```

**Still having issues?**
1. Make sure you have Node.js 18+ installed
2. Check that you're in the pike project folder
3. Try deleting `node_modules` and running again

**Features Without API Key:**
- Upload and view documents ✅
- Chat interface ✅  
- AI responses ❌ (needs OpenAI key)
- Web search ❌ (needs Serper key)

## What Pike Does

- Upload documents (PDF, text files)
- Chat with AI about your documents
- Automatic web search for additional context
- Vector similarity search through your knowledge base
- Source citations for all responses