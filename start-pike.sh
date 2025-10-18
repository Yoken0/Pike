#!/bin/bash

# Pike Local Development Starter - Enhanced Version
# Optimized for local development with better error handling and features

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
PORT=3000
NODE_ENV="development"
SKIP_INSTALL=false
CLEAN_INSTALL=false
SHOW_HELP=false

# Function to print colored output
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
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --port PORT        Port to run on (default: 3000)"
    echo "  --skip-install     Skip dependency installation"
    echo "  --clean-install    Clean install dependencies"
    echo "  --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                 # Start with default settings"
    echo "  $0 --port 8080     # Start on port 8080"
    echo "  $0 --clean-install # Clean install dependencies"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --port)
            PORT="$2"
            shift 2
            ;;
        --skip-install)
            SKIP_INSTALL=true
            shift
            ;;
        --clean-install)
            CLEAN_INSTALL=true
            shift
            ;;
        --help)
            SHOW_HELP=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

if [ "$SHOW_HELP" = true ]; then
    show_usage
    exit 0
fi

# Function to check prerequisites
check_prerequisites() {
    print_header "Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 20+ from nodejs.org"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        print_warning "Node.js version $NODE_VERSION detected. Pike works best with Node.js 20+"
    else
        print_status "Node.js $(node --version) detected"
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm"
        exit 1
    fi
    
    print_status "npm $(npm --version) detected"
    
    # Check for required tools
    if ! command -v git &> /dev/null; then
        print_warning "Git is not installed. Some features may not work properly"
    fi
}

# Function to install dependencies
install_dependencies() {
    if [ "$SKIP_INSTALL" = true ]; then
        print_info "Skipping dependency installation"
        return
    fi
    
    print_header "Installing dependencies..."
    
    if [ "$CLEAN_INSTALL" = true ]; then
        print_info "Performing clean install..."
        rm -rf node_modules package-lock.json
    fi
    
    if [ ! -d "node_modules" ] || [ "$CLEAN_INSTALL" = true ]; then
        print_info "Installing dependencies with npm..."
        npm install
        
        if [ $? -eq 0 ]; then
            print_status "Dependencies installed successfully"
        else
            print_error "Failed to install dependencies"
            exit 1
        fi
    else
        print_info "Dependencies already installed"
    fi
}

# Function to create .env file
create_env_file() {
    if [ ! -f ".env" ]; then
        print_info "Creating .env file..."
        cat > .env << EOF
# Pike Configuration
NODE_ENV=${NODE_ENV}
PORT=${PORT}

# Required: Google Gemini API Key for AI features
# Get your key from: https://ai.google.dev/
GEMINI_API_KEY=your_gemini_key_here

# Optional: Serper API Key for web search
# Get your key from: https://serper.dev/
# SERPER_API_KEY=your_serper_key_here

# Optional: Database configuration
# POSTGRES_PASSWORD=your_postgres_password
EOF
        print_warning "Please add your Gemini API key to the .env file for full functionality"
        
        # Try to open .env in default editor
        if command -v code &> /dev/null; then
            print_info "Opening .env file in VS Code..."
            code .env
        elif command -v nano &> /dev/null; then
            print_info "Opening .env file in nano..."
            nano .env
        fi
    else
        print_info "Using existing .env file"
    fi
}

# Function to check API key
check_api_key() {
    if grep -q "your_gemini_key_here" .env; then
        print_warning "Google Gemini API key not set in .env file"
        print_warning "Pike will work but AI features will be disabled"
        echo ""
        echo "Do you want to continue anyway? (y/N)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            print_error "Please edit .env file and add your Google Gemini API key"
            exit 1
        fi
    else
        print_status "API key configuration found"
    fi
}

# Function to start the development server
start_server() {
    print_header "Starting Pike in development mode..."
    print_info "Pike will be available at: http://localhost:${PORT}"
    print_info "Press Ctrl+C to stop"
    echo ""
    
    # Set environment variables
    export NODE_ENV=${NODE_ENV}
    export PORT=${PORT}
    
    # Start the development server
    npm run dev
}

# Function to cleanup on exit
cleanup() {
    print_info "Shutting down Pike..."
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Main execution
main() {
    print_header "Pike Local Development Setup"
    
    check_prerequisites
    install_dependencies
    create_env_file
    check_api_key
    start_server
}

# Run main function
main