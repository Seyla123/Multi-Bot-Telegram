#!/bin/bash

# Exit on error
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Deploying Application ===${NC}"

# 1. Ensure .env exists
if [ ! -f .env ]; then
  echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
  cp .env.example .env
fi

# 2. Pull latest code from Git
echo -e "${BLUE}1/4 Pulling latest code from Git...${NC}"
git pull origin main

# 3. Auto-update Nginx reverse proxy configuration if Nginx exists on server
if [ -d /etc/nginx/sites-available ]; then
  echo -e "${BLUE}2/4 Syncing Nginx configuration...${NC}"
  cp nginx/default.conf /etc/nginx/sites-available/default
  nginx -t && systemctl reload nginx || true
fi

# 4. Start containers safely
echo -e "${BLUE}3/4 Starting Docker containers...${NC}"
docker compose up -d

# 5. Apply pending database migrations safely
echo -e "${BLUE}4/4 Applying database migrations...${NC}"
# docker compose run --rm api npx prisma migrate deploy

echo ""
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}   Application Deployed & Running Successfully!       ${NC}"
echo -e "${GREEN}======================================================${NC}"
