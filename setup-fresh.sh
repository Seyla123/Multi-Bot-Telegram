#!/bin/bash

# Exit on error
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Starting Fresh Setup & Deployment ===${NC}"

# 1. Ensure .env exists
if [ ! -f .env ]; then
  echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
  cp .env.example .env
fi

# 2. Pull latest code from Git
echo -e "${BLUE}1/4 Pulling latest code from Git...${NC}"
git pull origin main

# 3. Build Docker image & reset database fresh (creates tables + seeds data)
echo -e "${BLUE}2/4 Resetting database fresh & applying migrations...${NC}"
docker compose run --rm --build api npx prisma migrate reset --force

# 4. Start all Docker containers in background
echo -e "${BLUE}3/4 Launching Docker containers in production mode...${NC}"
docker compose up -d --build

# 5. Check container status
echo -e "${BLUE}4/4 Checking container health...${NC}"
sleep 3
docker ps

SERVER_IP=$(curl -s ifconfig.me || echo "your-server-ip")

echo ""
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}   Deployment & Database Reset Completed Successfully! ${NC}"
echo -e "${GREEN}======================================================${NC}"
echo -e "${BLUE}Access your app at: ${YELLOW}http://${SERVER_IP}:3000${NC}"
echo -e "${BLUE}View live logs with: ${YELLOW}docker logs -f nest_api${NC}"
echo -e "${GREEN}======================================================${NC}"
