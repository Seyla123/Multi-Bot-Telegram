#!/bin/bash

# Exit on error
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== Deploying Code Updates (Docker Build & Migrate) ===${NC}"

# 1. Ensure .env exists
if [ ! -f .env ]; then
  echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
  cp .env.example .env
fi

# 2. Pull latest code from Git
echo -e "${BLUE}1/4 Pulling latest code from Git...${NC}"
git pull origin main

# 3. Rebuild the application image
echo -e "${BLUE}2/4 Building new Docker images...${NC}"
docker compose build api

# 4. Run Database Migrations
# This automatically spins up MySQL/Redis, waits for MySQL to be fully healthy,
# and applies any pending Prisma migrations (creating/updating the database schema).
echo -e "${BLUE}3/4 Deploying database migrations...${NC}"
docker compose run --rm api npx prisma migrate deploy

# 5. Start all containers in the background
echo -e "${BLUE}4/4 Starting all services...${NC}"
docker compose up -d

# 6. Sync Nginx configuration if present on host
if [ -d /etc/nginx/sites-available ]; then
  echo -e "${BLUE}Syncing Nginx configuration...${NC}"
  cp nginx/default.conf /etc/nginx/sites-available/default
  ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
  nginx -t && systemctl restart nginx || true
fi

echo ""
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}   New Code Built & Deployed Via Docker!              ${NC}"
echo -e "${GREEN}======================================================${NC}"
