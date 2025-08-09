# Pike

## Overview

Pike is a full-stack web application that implements a RAG (Retrieval-Augmented Generation) AI assistant. The system allows users to upload documents, chat with their knowledge base, and get AI-powered responses augmented with relevant context from their documents. The application features autonomous web search capabilities, document processing with vector embeddings, and real-time chat functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### Desktop Application & Docker Support (Latest)
- Added Electron integration for desktop app functionality
- Created build scripts for Windows, macOS, and Linux distribution
- Configured cross-platform packaging with electron-builder
- Added development mode with hot reloading
- Desktop app runs the full Pike web application in a native window
- Added Docker containerization for easy deployment anywhere
- Created Docker Compose setup with health checks and auto-restart
- Fixed localhost binding issues for local development
- Multiple deployment options: web, desktop, and Docker

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript and Vite for fast development and building
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent, accessible design
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

### Backend Architecture
- **Runtime**: Node.js with TypeScript using ESM modules
- **Framework**: Express.js with custom middleware for logging and error handling
- **Development Server**: Custom Vite integration for hot module replacement in development
- **File Upload**: Multer with memory storage for handling document uploads
- **API Design**: RESTful endpoints with proper HTTP status codes and error handling

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Vector Storage**: JSON storage in PostgreSQL for document embeddings and vector similarity search
- **Fallback Storage**: In-memory storage implementation for development/testing

### Authentication and Authorization
- **Session Management**: Express sessions with PostgreSQL session store (connect-pg-simple)
- **Security**: Basic session-based authentication without external providers

### AI and Vector Processing
- **LLM Integration**: OpenAI GPT-4o for chat responses and text generation
- **Embedding Generation**: OpenAI embeddings API for document vectorization
- **Vector Search**: Custom cosine similarity implementation for retrieving relevant document chunks
- **Document Processing**: Multi-format support (PDF, text, markdown) with chunking for vector storage

### External Integrations
- **Web Search**: Serper API integration for autonomous web search capabilities
- **Web Scraping**: Cheerio for extracting content from web pages
- **Content Processing**: Automatic document chunking and embedding generation

### Key Design Patterns
- **Repository Pattern**: Abstract storage interface with multiple implementations (memory, PostgreSQL)
- **Service Layer**: Separate services for document processing, vector operations, and AI interactions
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Type Safety**: Shared TypeScript types between frontend and backend
- **Real-time Updates**: Polling-based updates for document processing status

## External Dependencies

### Core Infrastructure
- **Database**: Neon Database (PostgreSQL) via `@neondatabase/serverless`
- **ORM**: Drizzle ORM for database operations and schema management

### AI Services
- **OpenAI API**: GPT-4o model for chat responses and text embeddings
- **Serper API**: Google search API for autonomous web search functionality

### Development Tools
- **Vite**: Development server and build tool with React plugin
- **TypeScript**: Type checking and compilation
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS**: CSS processing with autoprefixer
- **Electron**: Desktop application framework for cross-platform native apps
- **Electron Builder**: Packaging and distribution for desktop applications
- **Docker**: Containerization for consistent deployment across environments
- **Docker Compose**: Multi-container orchestration with health monitoring

### UI and Interaction
- **Radix UI**: Accessible component primitives for complex UI elements
- **TanStack Query**: Server state management and caching
- **Wouter**: Lightweight routing library
- **React Hook Form**: Form state management with validation

### File Processing
- **Multer**: File upload handling middleware
- **Cheerio**: Server-side HTML parsing and manipulation for web scraping

### Utilities
- **Date-fns**: Date manipulation and formatting
- **clsx**: Utility for constructing className strings
- **Zod**: Runtime type validation and schema definition