#!/bin/bash

# Exit on error
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BUILD_DOCKER=false

# Check if user passed --build or -b flag
if [ "$1" == "--build" ] || [ "$1" == "-b" ] || [ "$1" == "--docker" ]; then
  BUILD_DOCKER=true
fi

echo -e "${BLUE}=== Deploying Application ===${NC}"

# 1. Ensure .env exists
if [ ! -f .env ]; then
  echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
  cp .env.example .env
fi

# 2. Pull latest code from Git
echo -e "${BLUE}1/5 Pulling latest code from Git...${NC}"
git pull origin main

# 3. Install dependencies & Prisma Client
echo -e "${BLUE}2/5 Syncing dependencies & Prisma Client...${NC}"
npm install
npx prisma generate

if [ "$BUILD_DOCKER" = true ]; then
  echo -e "${BLUE}3/5 Rebuilding Docker containers (--build flag detected)...${NC}"
  docker compose up -d --build
else
  echo -e "${BLUE}3/5 Building Frontend & Backend on host...${NC}"
  cd client
  npm install
  npm run build
  cd ..
  npm run build

  echo -e "${BLUE}4/5 Restarting Docker containers...${NC}"
  docker compose up -d
  docker compose restart api
fi

# 4. Sync Nginx config if present
if [ -d /etc/nginx/sites-available ]; then
  echo -e "${BLUE}5/5 Syncing Nginx configuration...${NC}"
  cp nginx/default.conf /etc/nginx/sites-available/default
  ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
  nginx -t && systemctl restart nginx || true
fi

echo ""
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}   Application Deployed & Running Successfully!       ${NC}"
echo -e "${GREEN}======================================================${NC}"
