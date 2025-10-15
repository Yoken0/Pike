#!/bin/bash

# Pike Docker Runner Script

echo "🐳 Setting up Pike with Docker..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop from docker.com"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Pike Configuration
NODE_ENV=production

# Required: Google Gemini API Key for AI features
# Get your key from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_key_here

# Optional: Serper API Key for web search
# Get your key from: https://serper.dev/
# SERPER_API_KEY=your_serper_key_here

# Optional: Custom port (default: 5000)
# PORT=5000
EOF
    echo "⚠️  Please edit .env file and add your Google Gemini API key before running Pike"
    echo "📝 Opening .env file..."
    
    # Try to open .env in default editor
    if command -v code &> /dev/null; then
        code .env
    elif command -v nano &> /dev/null; then
        nano .env
    else
        echo "📝 Edit .env file manually and add your API keys"
    fi
    
    echo "Press Enter when you've added your API keys..."
    read
fi

# Function to run Pike
run_pike() {
    echo "🚀 Starting Pike with Docker..."
    echo "📍 Pike will be available at: http://localhost:3000"
    echo "🛑 Press Ctrl+C to stop"
    echo ""
    
    # Run with docker-compose for easier management
    if command -v docker-compose &> /dev/null; then
        docker-compose up --build
    else
        # Fallback to docker run with simple Dockerfile
        echo "Using docker run (docker-compose not found)..."
        docker build -f Dockerfile -t pike-app .
        docker run -p 3000:5000 --env-file .env pike-app
    fi
}

# Check if API key is set
if grep -q "your_gemini_key_here" .env; then
    echo "⚠️  Warning: Google Gemini API key not set in .env file"
    echo "   Pike will work but AI features will be disabled"
    echo ""
    echo "Do you want to continue anyway? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Please edit .env file and add your Google Gemini API key"
        exit 1
    fi
fi

# Run Pike
run_pike