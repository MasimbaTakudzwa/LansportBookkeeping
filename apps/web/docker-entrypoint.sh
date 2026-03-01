#!/bin/sh
set -e

echo "Syncing database schema with prisma db push..."
node ./node_modules/prisma/build/index.js db push --accept-data-loss

echo "Starting Next.js..."
exec node server.js
