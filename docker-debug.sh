#!/bin/bash

# Pike Docker Debug Script - Helps troubleshoot Docker issues

echo "🔍 Pike Docker Debug Helper"
echo ""

# Check Docker status
echo "1. Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    echo "   Install Docker Desktop from docker.com"
    exit 1
else
    echo "✅ Docker is installed: $(docker --version)"
fi

# Check if Docker is running
echo ""
echo "2. Checking Docker daemon..."
if ! docker info &> /dev/null; then
    echo "❌ Docker daemon is not running"
    echo "   Please start Docker Desktop"
    exit 1
else
    echo "✅ Docker daemon is running"
fi

# Check architecture
echo ""
echo "3. System information..."
echo "   Architecture: $(uname -m)"
echo "   Platform: $(uname -s)"
echo "   Docker platform: $(docker version --format '{{.Server.Arch}}')"

# Clean up any existing Pike containers/images
echo ""
echo "4. Cleaning up existing Pike containers..."
docker stop pike 2>/dev/null || true
docker rm pike 2>/dev/null || true
docker rmi pike-app 2>/dev/null || true

# Try simple build first
echo ""
echo "5. Testing simple Docker build..."
echo "   Building with Dockerfile.simple (no compilation)..."

if docker build -f Dockerfile.simple -t pike-app-simple . --no-cache; then
    echo "✅ Simple build succeeded!"
    
    echo ""
    echo "6. Testing Pike container..."
    echo "   Starting Pike with simple image..."
    
    # Run Pike with simple image
    docker run -d --name pike-test -p 5000:5000 --env-file .env pike-app-simple
    
    # Wait a moment for startup
    sleep 10
    
    # Check if it's responding
    if curl -s http://localhost:5000/api/stats >/dev/null; then
        echo "✅ Pike is running successfully on http://localhost:5000"
        echo ""
        echo "🎉 SUCCESS! Use this command to run Pike:"
        echo "   docker run -d --name pike -p 5000:5000 --env-file .env pike-app-simple"
    else
        echo "❌ Pike container started but not responding"
        echo "   Checking logs..."
        docker logs pike-test
    fi
    
    # Cleanup test container
    docker stop pike-test
    docker rm pike-test
    
else
    echo "❌ Simple build failed"
    echo ""
    echo "📋 Common solutions:"
    echo "   1. Make sure you're in the pike project directory"
    echo "   2. Check available disk space: df -h"
    echo "   3. Clear Docker cache: docker system prune -a"
    echo "   4. Try running Docker as administrator (Windows)"
    echo "   5. On Apple Silicon (M1/M2), try: docker build --platform linux/amd64"
fi

echo ""
echo "🔧 Alternative options if Docker fails:"
echo "   • Desktop app: node build-desktop.js dev"
echo "   • Local web: ./start-pike.sh"
echo "   • Direct npm: npm run dev"