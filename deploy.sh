#!/bin/bash
set -e

echo "🔨 Building Docker image..."
docker build -t eclipse-viewer:latest .

echo "🔄 Stopping old container..."
docker stop eclipse-viewer 2>/dev/null || true
docker rm eclipse-viewer 2>/dev/null || true

echo "🚀 Starting new container..."
docker run -d \
  --name eclipse-viewer \
  --restart unless-stopped \
  -p 8080:80 \
  eclipse-viewer:latest

echo "✅ Deployed successfully"
