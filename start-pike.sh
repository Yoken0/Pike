#!/bin/bash

# Pike Local Development Starter
echo "🚀 Starting Pike locally..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ from nodejs.org"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
NODE_ENV=development
# Add your OpenAI API key here:
# OPENAI_API_KEY=your_key_here
# Optional: Add Serper API key for web search:
# SERPER_API_KEY=your_key_here
EOF
    echo "⚠️  Please add your OpenAI API key to the .env file for full functionality"
fi

# Set environment and start the server
export NODE_ENV=development
echo "🌐 Starting Pike on http://localhost:5000"
echo "📋 Press Ctrl+C to stop"
echo ""

npm run dev