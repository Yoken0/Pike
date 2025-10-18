# 🚀 Pike - AI-Powered Document Intelligence Platform

<div align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google Gemini">
  <img src="https://img.shields.io/badge/Electron-2B2E3A?style=for-the-badge&logo=electron&logoColor=white" alt="Electron">
</div>

<div align="center">
  <h3>🤖 Transform your documents into intelligent conversations</h3>
  <p>Pike is a cutting-edge AI platform that combines document processing, vector search, and conversational AI to help you interact with your knowledge base like never before.</p>
</div>

---

## ✨ Features

### 🧠 **AI-Powered Chat**
- **Google Gemini Integration**: Powered by Google's latest Gemini AI models
- **Context-Aware Responses**: Intelligent understanding of your document context
- **Mathematical Expression Rendering**: Beautiful LaTeX math rendering with KaTeX
- **Real-time Conversations**: Instant responses with streaming capabilities

### 📄 **Document Intelligence**
- **Multi-Format Support**: PDF, TXT, DOCX, MD, and DOC files
- **Drag & Drop Upload**: Intuitive file upload with visual feedback
- **Automatic Processing**: Smart document parsing and chunking
- **Vector Search**: Semantic search across your entire knowledge base

### 🔍 **Advanced Search**
- **Semantic Search**: Find relevant information using natural language
- **Web Integration**: Auto-acquire documents from web sources
- **Context Panel**: See sources and relevance scores for every response
- **Knowledge Base Management**: Organize and manage your document library

### 🎨 **Modern UI/UX**
- **Dark/Light Mode**: Beautiful theme switching with system preference detection
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Real-time Updates**: Live document processing status
- **Accessible Interface**: Built with accessibility in mind

### 🖥️ **Multi-Platform Support**
- **Web Application**: Run in any modern browser
- **Desktop App**: Native Electron application for Windows, macOS, and Linux
- **Docker Support**: Containerized deployment for easy scaling

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 20+ 
- **npm** or **yarn**
- **Google Gemini API Key** ([Get yours here](https://ai.google.dev/))

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/pike.git
cd pike

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### Running Pike

#### 🌐 Web Application
```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

#### 🖥️ Desktop Application
```bash
# Build and run desktop app
npm run desktop

# Or build for production
npm run build:desktop
```

#### 🐳 Docker Deployment
```bash
# Development mode with hot reloading
./docker-run.sh --dev
# or
npm run docker:dev

# Production mode
./docker-run.sh --prod
# or
npm run docker:prod

# Quick start (production)
./docker-run.sh

# Clean up Docker resources
./docker-run.sh --clean
# or
npm run docker:clean
```

---

## 📖 Usage Guide

### 1. **Upload Documents**
- **Drag & Drop**: Simply drag files onto the Knowledge Base area
- **Click Upload**: Click the upload area to browse and select files
- **Supported Formats**: PDF, TXT, DOCX, MD, DOC (up to 10MB each)

### 2. **Start Conversations**
- **Ask Questions**: Type natural language questions about your documents
- **Get Context**: View source documents and relevance scores
- **Math Support**: Use LaTeX syntax for mathematical expressions: `$inline$` or `$$block$$`

### 3. **Explore Features**
- **Auto-Search**: Let Pike find relevant web content for your queries
- **Knowledge Search**: Search through your uploaded documents
- **Theme Toggle**: Switch between light and dark modes
- **Document Management**: View processing status and manage your library

---

## 🛠️ Development

### Project Structure
```
pike/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utilities and configurations
├── server/                 # Express backend
│   ├── services/           # AI and processing services
│   └── routes.ts           # API endpoints
├── shared/                 # Shared schemas and types
├── electron/               # Desktop app configuration
└── docker/                # Container configurations
```

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run preview         # Preview production build

# Desktop
npm run desktop         # Run desktop app
npm run build:desktop   # Build desktop app

# Docker
npm run docker:dev     # Docker development mode
npm run docker:prod    # Docker production mode
npm run docker:build   # Build Docker image
npm run docker:clean   # Clean Docker resources
npm run docker:logs    # Show Docker logs

# Deployment
npm run deploy         # Deploy to production
npm run deploy:prod    # Deploy to production
npm run deploy:staging # Deploy to staging

# Development utilities
npm run dev:setup      # Setup development environment
npm run dev:test       # Run tests
npm run dev:lint       # Run linting
npm run dev:format     # Format code
npm run dev:clean      # Clean build artifacts

# Utilities
npm run lint           # Run ESLint
npm run type-check     # Run TypeScript checks
```

### Environment Variables

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Optional
PORT=3000
NODE_ENV=development
```

---

## 🔧 Configuration

### API Keys Setup

1. **Google Gemini API**:
   - Visit [Google AI Studio](https://ai.google.dev/)
   - Create a new project
   - Generate an API key
   - Add to your `.env` file

### Customization

- **Themes**: Modify `client/src/contexts/ThemeContext.tsx`
- **AI Models**: Update `server/services/gemini.ts`
- **File Types**: Configure in `server/routes.ts`
- **UI Components**: Customize in `client/src/components/ui/`

---

## 📊 Performance

### Optimizations Implemented
- **Code Splitting**: Lazy-loaded components for faster initial load
- **Memoization**: React.memo and useMemo for expensive operations
- **Efficient Loops**: Cached array lengths and optimized iterations
- **Async Operations**: Non-blocking file processing and API calls
- **Bundle Optimization**: Tree-shaking and minification

### Benchmarks
- **Initial Load**: < 2s on 3G connection
- **File Upload**: < 1s for 10MB files
- **AI Response**: < 3s for complex queries
- **Memory Usage**: < 100MB for typical workloads

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Development Setup
```bash
# Fork and clone the repository
git clone https://github.com/yourusername/pike.git
cd pike

# Create a feature branch
git checkout -b feature/amazing-feature

# Make your changes
# Add tests if applicable
# Update documentation

# Commit and push
git commit -m "Add amazing feature"
git push origin feature/amazing-feature

# Open a Pull Request
```

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration
- **Prettier**: Consistent code formatting
- **Testing**: Jest and React Testing Library
- **Commits**: Conventional commit messages

### Areas for Contribution
- 🐛 Bug fixes and issue resolution
- ✨ New features and enhancements
- 📚 Documentation improvements
- 🎨 UI/UX improvements
- ⚡ Performance optimizations
- 🧪 Test coverage expansion

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Google Gemini** for powerful AI capabilities
- **React** and **TypeScript** communities
- **Tailwind CSS** for beautiful styling
- **Electron** for desktop app support
- **All contributors** who help make Pike better

---

<div align="center">
  <p>
    <a href="#-quick-start">Get Started</a> •
    <a href="#-features">Features</a> •
    <a href="#-contributing">Contribute</a> •
  </p>
</div>
