#!/bin/sh
set -e

echo "Running Prisma migrations..."
node /app/node_modules/prisma/build/index.js migrate deploy --schema /app/prisma/schema.prisma

echo "Starting Next.js..."
exec node /app/server.js
