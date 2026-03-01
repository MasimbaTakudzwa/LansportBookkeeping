@echo off
title Lansport Analytics - Stopping

echo.
echo  Stopping Lansport Analytics...
echo.

docker compose down

echo.
echo  All services stopped.
echo  Data is preserved in Docker volumes (postgres_data, redis_data).
echo.
pause
