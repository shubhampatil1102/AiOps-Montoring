# Docker Setup Guide for AiOps Admin Panel

## Overview
This application is fully containerized with Docker Compose:
- **Frontend**: React + TypeScript + Vite served by Nginx
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL

## Prerequisites
- Docker: [Install Docker Desktop](https://www.docker.com/products/docker-desktop)
- Docker Compose (included with Docker Desktop)

## Quick Start

### 1. Build and Start All Services
```bash
docker-compose up --build
```

This command will:
- Build the frontend image
- Build the backend image
- Start PostgreSQL database
- Start backend service
- Start frontend service (Nginx)

### 2. Access the Application
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:4000
- **Database**: localhost:5432

### 3. Stop the Services
```bash
docker-compose down
```

## Development Workflow

### Running in Development Mode
For local development without Docker:
```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend
npm install
npm run dev
```

### Rebuild Services After Changes
After making code changes:
```bash
# Rebuild and restart services
docker-compose up --build

# Or rebuild specific service
docker-compose build frontend --no-cache
docker-compose up frontend
```

## File Structure
```
├── Dockerfile                 # Frontend build config
├── nginx.conf               # Nginx configuration
├── docker-compose.yml       # Docker Compose orchestration
├── .dockerignore            # Files excluded from Docker build
├── backend/
│   ├── Dockerfile          # Backend build config
│   ├── package.json        # Backend dependencies
│   ├── tsconfig.json       # TypeScript config
│   └── src/
│       └── server.ts       # Entry point
└── src/
    ├── main.tsx           # Frontend entry point
    └── ...
```

## Important Files

### Dockerfile (Frontend)
- Multi-stage build for optimization
- Builds React app with Vite
- Serves via Nginx with SPA routing

### backend/Dockerfile (Backend)
- Multi-stage build to reduce image size
- Compiles TypeScript to JavaScript
- Uses slim Node image for production

### docker-compose.yml
- Orchestrates frontend, backend, and database
- Sets environment variables
- Configures networking and volumes

### nginx.conf
- Routes API calls to backend
- Handles SPA routing
- Static file caching

## Useful Docker Commands

### View running containers
```bash
docker-compose ps
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Execute commands in containers
```bash
# Backend terminal
docker-compose exec backend sh

# Frontend terminal
docker-compose exec frontend sh
```

### Remove everything (clean slate)
```bash
docker-compose down -v  # -v removes volumes (database data)
```

## Troubleshooting

### Port Already in Use
If ports 3000, 4000, or 5432 are already in use:
```yaml
# Edit docker-compose.yml
ports:
  - "8080:80"    # frontend on port 8080
  - "5000:4000"  # backend on port 5000
```

### Database Connection Errors
Ensure PostgreSQL service is ready:
```bash
docker-compose logs postgres
```

### Clear Docker Cache and Rebuild
```bash
docker-compose down
docker system prune -a
docker-compose up --build
```

## Environment Variables
Configuration is set in `docker-compose.yml`:
- **Database**: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- **Backend**: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- **Frontend**: `VITE_API_URL` (optional, defaults to http://backend:4000)

## Production Deployment

### Build Images for Production
```bash
docker build -t aiops-frontend:latest .
docker build -t aiops-backend:latest ./backend
```

### Push to Registry (e.g., Docker Hub)
```bash
docker tag aiops-frontend:latest your-username/aiops-frontend:latest
docker push your-username/aiops-frontend:latest
```

### Deploy with Docker Compose
```bash
docker-compose -f docker-compose.yml up -d
```

## Health Checks
Add health checks to `docker-compose.yml`:
```yaml
services:
  backend:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
```

## Next Steps
1. Test the application: `docker-compose up --build`
2. Verify all services are running: `docker-compose ps`
3. Check logs if issues: `docker-compose logs`
4. Access frontend at http://localhost:3000
