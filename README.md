# Pike - AI-Powered Document Assistant

Pike is a RAG-powered personal assistant that autonomously acquires documents and knowledge using web search and scraping. Chat with your documents, upload files, and get intelligent responses with source citations.

## Features

- **Document Upload**: PDF, text, and markdown file support
- **AI Chat**: Powered by Google Gemini with RAG context
- **Autonomous Search**: Automatically finds relevant web content
- **Vector Search**: Similarity search through your knowledge base
- **Source Citations**: All responses include document references
- **Cross-Platform**: Web, desktop, and Docker deployment options

## Quick Start Options

### 🐳 Docker (Recommended - Works Everywhere)
```bash
./docker-run.sh
```
No setup required! Works on Windows, macOS, and Linux.

### 🖥️ Desktop App
```bash
node build-desktop.js dev
```
Native desktop experience with all features.

### 🌐 Web Development
```bash
./start-pike.sh
```
Traditional web development setup.

## Requirements

- **For Docker**: Docker Desktop
- **For Local/Desktop**: Node.js 18+
- **For AI Features**: Google Gemini API key

## API Keys

1. **Google Gemini** (required): Get from [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. **Serper** (optional): Get from [serper.dev](https://serper.dev) for web search

Add to `.env` file:
```env
GEMINI_API_KEY=your_key_here
SERPER_API_KEY=your_key_here
```

## Documentation

- **[DOCKER_SETUP.md](DOCKER_SETUP.md)** - Complete Docker guide
- **[DESKTOP_SETUP.md](DESKTOP_SETUP.md)** - Desktop app instructions  
- **[LOCAL_SETUP.md](LOCAL_SETUP.md)** - Local development setup
- **[QUICK_START.md](QUICK_START.md)** - Fast start guide

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Express.js, Google Gemini API, Vector Search
- **Desktop**: Electron with cross-platform builds
- **Deployment**: Docker, Docker Compose, Native packaging

## Deployment Options

1. **Docker Container** - Easiest, works anywhere
2. **Desktop App** - Native Windows/macOS/Linux apps
3. **Web Server** - Traditional Express.js deployment
4. **Replit** - Cloud development environment

## Architecture

Pike implements RAG (Retrieval-Augmented Generation) with:
- Document processing and chunking
- OpenAI embeddings for vector storage
- Cosine similarity search
- Autonomous web content acquisition
- Real-time chat with context injection

## License

MIT License - See LICENSE file for details.

---

**Need help?** Check the documentation files or create an issue!
