#!/bin/bash
echo ""
echo " Stopping Lansport Analytics..."
echo ""
docker compose down
echo ""
echo " All services stopped. Data is preserved in Docker volumes."
echo ""
