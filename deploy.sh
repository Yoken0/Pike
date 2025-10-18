#!/bin/bash

# Pike Production Deployment Script
# Automated deployment for production environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

# Default values
ENVIRONMENT="production"
PORT="3000"
REBUILD=false
CLEAN=false
HEALTH_CHECK=true

# Function to show usage
show_usage() {
    echo "Pike Production Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --env ENV         Environment (production, staging) (default: production)"
    echo "  --port PORT       Port to expose (default: 3000)"
    echo "  --rebuild         Force rebuild of Docker images"
    echo "  --clean           Clean up old containers and images"
    echo "  --no-health       Skip health check"
    echo "  --help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --env production --port 8080"
    echo "  $0 --rebuild --clean"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --rebuild)
            REBUILD=true
            shift
            ;;
        --clean)
            CLEAN=true
            shift
            ;;
        --no-health)
            HEALTH_CHECK=false
            shift
            ;;
        --help)
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

# Function to check prerequisites
check_prerequisites() {
    print_header "Checking deployment prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    # Check docker-compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "docker-compose is not installed"
        exit 1
    fi
    
    # Check .env file
    if [ ! -f ".env" ]; then
        print_error ".env file not found. Please create one with required environment variables"
        exit 1
    fi
    
    # Check API key
    if grep -q "your_gemini_key_here" .env; then
        print_error "Please set GEMINI_API_KEY in .env file"
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Function to clean up old resources
cleanup_old() {
    if [ "$CLEAN" = true ]; then
        print_info "Cleaning up old containers and images..."
        
        # Stop and remove old containers
        docker-compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
        
        # Remove old Pike images
        docker images | grep pike | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
        
        # Clean up unused resources
        docker system prune -f
        
        print_status "Cleanup completed"
    fi
}

# Function to build and deploy
deploy() {
    print_header "Deploying Pike to ${ENVIRONMENT} environment..."
    
    # Set environment variables
    export NODE_ENV=${ENVIRONMENT}
    export PORT=${PORT}
    
    # Build and start services
    if [ "$REBUILD" = true ]; then
        print_info "Building Docker images..."
        docker-compose -f docker-compose.prod.yml build --no-cache
    fi
    
    print_info "Starting Pike services..."
    docker-compose -f docker-compose.prod.yml up -d
    
    print_status "Deployment initiated"
}

# Function to wait for health check
wait_for_health() {
    if [ "$HEALTH_CHECK" = false ]; then
        return
    fi
    
    print_info "Waiting for Pike to be healthy..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:${PORT}/api/stats >/dev/null 2>&1; then
            print_status "Pike is healthy and ready!"
            return
        fi
        
        print_info "Attempt $attempt/$max_attempts - waiting for Pike to start..."
        sleep 10
        ((attempt++))
    done
    
    print_error "Health check failed after $max_attempts attempts"
    print_info "Check logs with: docker-compose -f docker-compose.prod.yml logs"
    exit 1
}

# Function to show deployment status
show_status() {
    print_header "Deployment Status"
    
    echo "Environment: ${ENVIRONMENT}"
    echo "Port: ${PORT}"
    echo "URL: http://localhost:${PORT}"
    echo ""
    
    print_info "Container status:"
    docker-compose -f docker-compose.prod.yml ps
    
    echo ""
    print_info "To view logs: docker-compose -f docker-compose.prod.yml logs -f"
    print_info "To stop: docker-compose -f docker-compose.prod.yml down"
}

# Function to rollback
rollback() {
    print_warning "Rolling back deployment..."
    docker-compose -f docker-compose.prod.yml down
    print_status "Rollback completed"
}

# Function to cleanup on error
cleanup_on_error() {
    print_error "Deployment failed. Rolling back..."
    rollback
    exit 1
}

# Set up error handling
trap cleanup_on_error ERR

# Main execution
main() {
    print_header "Pike Production Deployment"
    
    check_prerequisites
    cleanup_old
    deploy
    wait_for_health
    show_status
    
    print_status "Deployment completed successfully!"
}

# Run main function
main
