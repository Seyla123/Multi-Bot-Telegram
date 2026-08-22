#!/bin/bash

# Exit on error
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== Deploying NestJS Backend Updates (Node.js & PM2) ===${NC}"

# 1. Ensure .env exists
if [ ! -f .env ]; then
  echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
  cp .env.example .env
fi

# 2. Pull latest code from Git
echo -e "${BLUE}1/5 Pulling latest code from Git...${NC}"
git pull origin main

# 3. Install dependencies & generate Prisma client
echo -e "${BLUE}2/5 Installing dependencies & generating Prisma Client...${NC}"
npm install

# 4. Run Database Migrations
echo -e "${BLUE}3/5 Deploying database migrations...${NC}"
npx prisma migrate deploy

# 5. Build NestJS application
echo -e "${BLUE}4/5 Building NestJS application...${NC}"
npm run build

# 6. Restart PM2 process
echo -e "${BLUE}5/5 Restarting PM2 process...${NC}"
if command -v pm2 &> /dev/null; then
  pm2 reload nest_api || pm2 start dist/main.js --name "nest_api"
else
  echo -e "${YELLOW}PM2 not found. You can start the app with: npm run start:prod${NC}"
fi

echo ""
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}   NestJS Backend Built & Deployed Successfully!      ${NC}"
echo -e "${GREEN}======================================================${NC}"
