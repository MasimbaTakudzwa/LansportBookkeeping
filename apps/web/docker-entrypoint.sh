#!/bin/sh
set -e

echo "Syncing database schema with prisma db push..."
npx prisma db push --accept-data-loss

echo "Starting Next.js..."
exec node server.js
