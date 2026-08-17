#!/bin/bash

# Exit on error
set -e

# Color output helpers
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Default flag values
BUILD=false
MIGRATE=false
SEED=false
CLEAR_QUEUE=false

# Parse command line flags
for arg in "$@"
do
    case $arg in
        --build)
        BUILD=true
        ;;
        --migrate)
        MIGRATE=true
        ;;
        --seed)
        SEED=true
        ;;
        --clear-queue)
        CLEAR_QUEUE=true
        ;;
        --all)
        BUILD=true
        MIGRATE=true
        CLEAR_QUEUE=true
        ;;
        --help)
        echo "Usage: ./deploy.sh [OPTIONS]"
        echo "Options:"
        echo "  (no flags)     Pull git code and restart container (Fast update)"
        echo "  --build        Rebuild Docker images and restart containers"
        echo "  --migrate      Run Prisma DB migrations"
        echo "  --seed         Seed database data"
        echo "  --clear-queue  Flush Redis queue & cache"
        echo "  --all          Run build, migrate, and clear queue"
        exit 0
        ;;
    esac
done

echo -e "${BLUE}=== 1. Pulling Latest Code from Git ===${NC}"
git pull origin main

if [ "$MIGRATE" = true ]; then
  echo -e "${BLUE}=== 2. Running Database Migrations ===${NC}"
  docker compose run --rm api npx prisma migrate deploy
fi

if [ "$SEED" = true ]; then
  echo -e "${BLUE}=== 3. Seeding Database ===${NC}"
  docker compose run --rm api npx prisma db seed
fi

if [ "$BUILD" = true ]; then
  echo -e "${BLUE}=== 4. Rebuilding Docker Images & Containers ===${NC}"
  docker compose up -d --build
else
  echo -e "${BLUE}=== 4. Quick Restart API Container ===${NC}"
  docker compose restart api
fi

if [ "$CLEAR_QUEUE" = true ]; then
  echo -e "${BLUE}=== 5. Flushing Redis Queue & Cache ===${NC}"
  docker exec nest_redis redis-cli FLUSHALL
  echo -e "${GREEN}Redis queue flushed.${NC}"
fi

echo -e "${GREEN}=== Deployment Task Completed Successfully! ===${NC}"
