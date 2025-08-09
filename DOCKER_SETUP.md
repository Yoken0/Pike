# Pike - Docker Setup

Docker makes Pike easy to run on any system without dealing with Node.js, dependencies, or environment setup.

## Quick Start

1. **Install Docker Desktop** from [docker.com](https://docker.com)
2. **Download Pike** and open terminal in the pike folder
3. **Run Pike**:
   ```bash
   ./docker-run.sh
   ```

That's it! Pike will be available at `http://localhost:5000`

## Manual Docker Commands

### Build and Run
```bash
# Build the image
docker build -t pike-app .

# Run Pike
docker run -p 5000:5000 --env-file .env pike-app
```

### Using Docker Compose
```bash
# Start Pike
docker-compose up --build

# Start in background
docker-compose up -d --build

# Stop Pike
docker-compose down
```

## Environment Configuration

Create `.env` file with your API keys:
```env
NODE_ENV=production
OPENAI_API_KEY=your_openai_key_here
SERPER_API_KEY=your_serper_key_here
PORT=5000
```

## Docker Benefits

✅ **Works Everywhere**: Same environment on Windows, macOS, Linux
✅ **No Node.js Required**: Docker handles everything
✅ **Easy Updates**: Just rebuild the container
✅ **Isolated Environment**: Won't conflict with other apps
✅ **Production Ready**: Same setup for development and deployment

## Advanced Usage

### Custom Port
```bash
docker run -p 3000:5000 --env-file .env pike-app
# Access at http://localhost:3000
```

### Volume Mounting (for development)
```bash
docker run -p 5000:5000 -v $(pwd):/app --env-file .env pike-app
```

### Health Checks
```bash
# Check if Pike is healthy
docker ps
# Look for "healthy" status
```

## Troubleshooting

**Build errors (like rollup issues)?**
```bash
./docker-debug.sh
```
This script will diagnose and fix common Docker build problems.

**Docker not found?**
- Install Docker Desktop from docker.com
- Make sure Docker Desktop is running

**Port already in use?**
```bash
docker run -p 3000:5000 --env-file .env pike-app
```

**Permission denied?**
```bash
chmod +x docker-run.sh
chmod +x docker-debug.sh
```

**Apple Silicon (M1/M2) issues?**
```bash
docker build --platform linux/amd64 -f Dockerfile.simple -t pike-app .
```

**Build still failing?**
Use the simple Dockerfile that skips compilation:
```bash
docker build -f Dockerfile.simple -t pike-app .
docker run -p 5000:5000 --env-file .env pike-app
```

**Can't access Pike?**
- Check `http://localhost:5000`
- Make sure Docker port mapping is correct (`-p 5000:5000`)
- Check Docker logs: `docker logs <container_id>`

## Production Deployment

For production servers:
```bash
# Build production image
docker build -t pike-production .

# Run with restart policy
docker run -d \
  --name pike-app \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file .env \
  pike-production
```

## Docker Image Details

- **Base**: Node.js 20 Alpine (lightweight)
- **Size**: ~200MB (optimized)
- **Security**: Non-root user, minimal dependencies
- **Health Check**: Built-in endpoint monitoring
- **Auto-restart**: Container restarts on failure