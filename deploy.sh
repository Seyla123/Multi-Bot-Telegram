#!/bin/bash

# Exit on error
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== Deploying Code Updates (Executing inside Docker) ===${NC}"

# 1. Ensure .env exists
if [ ! -f .env ]; then
  echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
  cp .env.example .env
fi

# 2. Pull latest code from Git
echo -e "${BLUE}1/5 Pulling latest code from Git...${NC}"
git pull origin main

# 3. Ensure containers are running
echo -e "${BLUE}2/5 Ensuring Docker containers are running...${NC}"
docker compose up -d

# 4. Install dependencies & Prisma inside container
echo -e "${BLUE}3/5 Installing dependencies & generating Prisma Client inside container...${NC}"
docker compose exec -T api npm install
docker compose exec -T api npx prisma generate

# 5. Build Vue Frontend & NestJS Backend inside container
echo -e "${BLUE}4/5 Building Vue Frontend & NestJS Backend inside container...${NC}"
docker compose exec -T api sh -c "cd client && npm install && npm run build && cd .. && npm run build"

# 6. Restart API container to reload updated code
echo -e "${BLUE}5/5 Restarting NestJS container...${NC}"
docker compose restart api

# 7. Sync Nginx configuration if present on host
if [ -d /etc/nginx/sites-available ]; then
  echo -e "${BLUE}Syncing Nginx configuration...${NC}"
  cp nginx/default.conf /etc/nginx/sites-available/default
  ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
  nginx -t && systemctl restart nginx || true
fi

echo ""
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}   New Code Built & Deployed Inside Docker!           ${NC}"
echo -e "${GREEN}======================================================${NC}"
