#!/bin/bash

# Pike Docker Runner Script - Enhanced Version
# Supports development and production modes

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
MODE="production"
PROFILE="prod"
PORT="3000"
CONTAINER_PORT="5000"

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
    echo "  -d, --dev          Run in development mode with hot reloading"
    echo "  -p, --prod         Run in production mode (default)"
    echo "  --port PORT        External port to expose (default: 3000)"
    echo "  --build            Force rebuild of Docker images"
    echo "  --clean            Clean up Docker containers and images"
    echo "  --logs             Show logs from running containers"
    echo "  --stop             Stop all Pike containers"
    echo "  -h, --help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --dev           # Run in development mode"
    echo "  $0 --prod --port 8080  # Run in production on port 8080"
    echo "  $0 --clean         # Clean up Docker resources"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--dev)
            MODE="development"
            PROFILE="dev"
            PORT="3000"
            CONTAINER_PORT="3000"
            shift
            ;;
        -p|--prod)
            MODE="production"
            PROFILE="prod"
            PORT="3000"
            CONTAINER_PORT="5000"
            shift
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --build)
            BUILD_FLAG="--build"
            shift
            ;;
        --clean)
            CLEAN_MODE=true
            shift
            ;;
        --logs)
            LOGS_MODE=true
            shift
            ;;
        --stop)
            STOP_MODE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Function to check Docker installation
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker Desktop from docker.com"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker Desktop"
        exit 1
    fi

    print_status "Docker is installed and running"
}

# Function to create .env file
create_env_file() {
    if [ ! -f ".env" ]; then
        print_info "Creating .env file..."
        cat > .env << EOF
# Pike Configuration
NODE_ENV=${MODE}

# Required: Google Gemini API Key for AI features
# Get your key from: https://ai.google.dev/
GEMINI_API_KEY=your_gemini_key_here

# Optional: Serper API Key for web search
# Get your key from: https://serper.dev/
# SERPER_API_KEY=your_serper_key_here

# Optional: Database configuration
# POSTGRES_PASSWORD=your_postgres_password

# Optional: Custom port
PORT=${CONTAINER_PORT}
EOF
        print_warning "Please edit .env file and add your Google Gemini API key before running Pike"
        
        # Try to open .env in default editor
        if command -v code &> /dev/null; then
            print_info "Opening .env file in VS Code..."
            code .env
        elif command -v nano &> /dev/null; then
            print_info "Opening .env file in nano..."
            nano .env
        else
            print_info "Edit .env file manually and add your API keys"
        fi
        
        echo "Press Enter when you've added your API keys..."
        read
    fi
}

# Function to clean up Docker resources
clean_docker() {
    print_info "Cleaning up Docker resources..."
    
    # Stop and remove containers
    docker-compose down --remove-orphans 2>/dev/null || true
    
    # Remove Pike images
    docker images | grep pike | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
    
    # Clean up unused resources
    docker system prune -f
    
    print_status "Docker cleanup completed"
}

# Function to stop containers
stop_containers() {
    print_info "Stopping Pike containers..."
    docker-compose down --remove-orphans
    print_status "Containers stopped"
}

# Function to show logs
show_logs() {
    print_info "Showing Pike logs..."
    docker-compose logs -f
}

# Function to run Pike
run_pike() {
    print_header "Starting Pike in ${MODE} mode..."
    print_info "Pike will be available at: http://localhost:${PORT}"
    print_info "Press Ctrl+C to stop"
    echo ""
    
    # Check if API key is set
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
    fi
    
    # Run with docker-compose
    if command -v docker-compose &> /dev/null; then
        if [ "$MODE" = "development" ]; then
            docker-compose --profile dev up ${BUILD_FLAG}
        else
            docker-compose --profile prod up ${BUILD_FLAG}
        fi
    else
        print_error "docker-compose not found. Please install docker-compose"
        exit 1
    fi
}

# Main execution
main() {
    print_header "Pike Docker Setup"
    
    # Handle special modes
    if [ "$CLEAN_MODE" = true ]; then
        clean_docker
        exit 0
    fi
    
    if [ "$STOP_MODE" = true ]; then
        stop_containers
        exit 0
    fi
    
    if [ "$LOGS_MODE" = true ]; then
        show_logs
        exit 0
    fi
    
    # Normal execution
    check_docker
    create_env_file
    run_pike
}

# Run main function
main