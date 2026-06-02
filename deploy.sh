#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "--------------------------------------------------"
echo "🚀 Starting Deployment Process..."
echo "--------------------------------------------------"

# Step 1: Pull the latest changes from Git
echo "📥 Pulling latest changes from repository..."
git pull origin main

# Step 2: Install dependencies (production only to save space/time)
echo "📦 Installing production dependencies..."
npm install --production

# Step 3: Restart PM2 process
if command -v pm2 &> /dev/null; then
    echo "🔄 Reloading process in PM2..."
    pm2 reload ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
    echo "⚡ PM2 Status:"
    pm2 status
else
    echo "⚠️  PM2 process manager not found on this system."
    echo "👉 If using Hostinger Shared Hosting, restart the application from the Node.js dashboard."
fi

echo "--------------------------------------------------"
echo "✅ Deployment Completed Successfully!"
echo "--------------------------------------------------"
