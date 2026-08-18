#!/bin/bash

# Exit on error
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== Deploying Code Updates (Docker Build) ===${NC}"

# 1. Ensure .env exists
if [ ! -f .env ]; then
  echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
  cp .env.example .env
fi

# 2. Pull latest code from Git
echo -e "${BLUE}1/3 Pulling latest code from Git...${NC}"
git pull origin main

# 3. Build and start containers
# Using --build ensures the Docker image is built from the Dockerfile
# where the build compilation actually happens (npm run build).
# Since we commented out the host volumes, the container runs the pre-built files instantly.
echo -e "${BLUE}2/3 Rebuilding and starting Docker containers...${NC}"
docker compose up -d --build

# 4. Sync Nginx configuration if present on host
if [ -d /etc/nginx/sites-available ]; then
  echo -e "${BLUE}3/3 Syncing Nginx configuration...${NC}"
  cp nginx/default.conf /etc/nginx/sites-available/default
  ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
  nginx -t && systemctl restart nginx || true
fi

echo ""
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}   New Code Built & Deployed Via Docker!              ${NC}"
echo -e "${GREEN}======================================================${NC}"
