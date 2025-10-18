#!/bin/bash

# Pike Development Utilities
# Collection of helpful scripts for Pike development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

print_header() {
    echo -e "${PURPLE}🚀${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Pike Development Utilities"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  setup           Set up development environment"
    echo "  test            Run tests"
    echo "  lint            Run linting"
    echo "  format          Format code"
    echo "  build           Build the application"
    echo "  clean           Clean build artifacts"
    echo "  deps            Update dependencies"
    echo "  type-check      Run TypeScript type checking"
    echo "  analyze         Analyze bundle size"
    echo "  docker-dev      Start Docker development environment"
    echo "  docker-prod     Start Docker production environment"
    echo "  docker-clean    Clean Docker resources"
    echo "  logs            Show application logs"
    echo "  help            Show this help message"
}

# Function to setup development environment
setup_dev() {
    print_header "Setting up Pike development environment..."
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        print_error "Node.js 20+ required. Current version: $(node --version)"
        exit 1
    fi
    
    # Install dependencies
    print_info "Installing dependencies..."
    npm install
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        print_info "Creating .env file..."
        cat > .env << EOF
NODE_ENV=development
PORT=3000
GEMINI_API_KEY=your_gemini_key_here
EOF
        print_warning "Please add your Gemini API key to .env file"
    fi
    
    # Run type checking
    print_info "Running type checking..."
    npm run type-check
    
    print_status "Development environment setup complete!"
}

# Function to run tests
run_tests() {
    print_header "Running tests..."
    npm run test
}

# Function to run linting
run_lint() {
    print_header "Running linting..."
    npm run lint:check
}

# Function to format code
format_code() {
    print_header "Formatting code..."
    npm run format
}

# Function to build application
build_app() {
    print_header "Building application..."
    npm run build
    print_status "Build complete!"
}

# Function to clean build artifacts
clean_build() {
    print_header "Cleaning build artifacts..."
    rm -rf dist node_modules/.cache
    print_status "Cleanup complete!"
}

# Function to update dependencies
update_deps() {
    print_header "Updating dependencies..."
    npm update
    print_status "Dependencies updated!"
}

# Function to run type checking
type_check() {
    print_header "Running TypeScript type checking..."
    npm run type-check
}

# Function to analyze bundle
analyze_bundle() {
    print_header "Analyzing bundle size..."
    npm run analyze
}

# Function to start Docker development
docker_dev() {
    print_header "Starting Docker development environment..."
    ./docker-run.sh --dev
}

# Function to start Docker production
docker_prod() {
    print_header "Starting Docker production environment..."
    ./docker-run.sh --prod
}

# Function to clean Docker resources
docker_clean() {
    print_header "Cleaning Docker resources..."
    ./docker-run.sh --clean
}

# Function to show logs
show_logs() {
    print_header "Showing application logs..."
    ./docker-run.sh --logs
}

# Main execution
case "${1:-help}" in
    setup)
        setup_dev
        ;;
    test)
        run_tests
        ;;
    lint)
        run_lint
        ;;
    format)
        format_code
        ;;
    build)
        build_app
        ;;
    clean)
        clean_build
        ;;
    deps)
        update_deps
        ;;
    type-check)
        type_check
        ;;
    analyze)
        analyze_bundle
        ;;
    docker-dev)
        docker_dev
        ;;
    docker-prod)
        docker_prod
        ;;
    docker-clean)
        docker_clean
        ;;
    logs)
        show_logs
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        print_error "Unknown command: $1"
        show_usage
        exit 1
        ;;
esac
