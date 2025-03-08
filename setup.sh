#!/bin/bash

# Install dependencies
echo "Installing dependencies..."
bun install

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p apps/backend/uploads

# Initialize database
echo "Starting database..."
docker-compose up -d

# Generate Prisma client
echo "Generating Prisma client..."
cd apps/backend
bunx prisma generate
bunx prisma migrate dev --name init

echo "Setup complete! You can now start the development servers with:"
echo "bun dev" 