#!/bin/bash
echo ""
echo " ============================================"
echo "   LANSPORT ANALYTICS"
echo "   Financial Data Platform"
echo " ============================================"
echo ""

# Check Docker is available
if ! command -v docker &> /dev/null; then
    echo " ERROR: Docker not found."
    echo " Install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check Docker daemon is running
if ! docker info &> /dev/null; then
    echo " ERROR: Docker is installed but not running."
    echo " Please start the Docker daemon and try again."
    exit 1
fi

# Create .env from template if missing
if [ ! -f .env ]; then
    echo " INFO: First run — creating .env from template..."
    cp .env.example .env
    echo " INFO: .env created. Edit it to change passwords before going live."
    echo ""
fi

echo " Starting all services..."
docker compose up -d --build

if [ $? -ne 0 ]; then
    echo ""
    echo " ERROR: Failed to start services. Check logs with: docker compose logs"
    exit 1
fi

echo ""
echo " Waiting for services to initialise..."
sleep 12

echo ""
echo " ============================================"
echo "   Lansport Analytics is running!"
echo "   Open: http://localhost"
echo " ============================================"
echo ""

# Open browser if possible
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost
elif command -v open &> /dev/null; then
    open http://localhost
fi

echo " To stop: ./stop.sh or docker compose down"
echo ""
