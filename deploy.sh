#!/bin/bash

# Exit on error
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Fast Deploying Application (No Docker Build) ===${NC}"

# 1. Ensure .env exists
if [ ! -f .env ]; then
  echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
  cp .env.example .env
fi

# 2. Pull latest code from Git
echo -e "${BLUE}1/6 Pulling latest code from Git...${NC}"
git pull origin main

# 3. Install dependencies & Prisma Client
echo -e "${BLUE}2/6 Installing dependencies & generating Prisma Client...${NC}"
npm install
npx prisma generate

# 4. Build Vue 3 Frontend
echo -e "${BLUE}3/6 Building Vue Frontend...${NC}"
cd client
npm install
npm run build
cd ..

# 5. Build NestJS Backend
echo -e "${BLUE}4/6 Building NestJS Backend...${NC}"
npm run build

# 6. Ensure containers are up and restart API container
echo -e "${BLUE}5/6 Restarting NestJS container...${NC}"
docker compose up -d
docker compose restart api

# 7. Sync Nginx config if Nginx is installed on server
if [ -d /etc/nginx/sites-available ]; then
  echo -e "${BLUE}6/6 Syncing Nginx configuration...${NC}"
  cp nginx/default.conf /etc/nginx/sites-available/default
  ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
  nginx -t && systemctl restart nginx || true
fi

echo ""
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}   Application Deployed & Restarted Successfully!     ${NC}"
echo -e "${GREEN}======================================================${NC}"
