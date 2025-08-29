#!/bin/bash

echo "🚀 Starting Secure MCP Stack"
echo "============================"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Docker
if ! docker --version > /dev/null 2>&1; then
    echo "❌ Docker not installed. Please install Docker Desktop first."
    exit 1
fi
echo "✅ Docker is installed"

# Check GitHub token
if [ -z "$GITHUB_TOKEN" ]; then
    echo "⚠️  GITHUB_TOKEN not set. Some features may not work."
    echo "   Export it with: export GITHUB_TOKEN=your_token_here"
else
    echo "✅ GITHUB_TOKEN is set"
fi

# Build K6 MCP if needed
echo ""
echo "🔨 Building MCP tools..."
if [ ! -f "mcp-tools/k6-mcp/dist/index.js" ]; then
    echo "Building K6 MCP..."
    cd mcp-tools/k6-mcp && npm run build && cd ../..
fi

if [ ! -f "mcp-tools/devsecops-mcp/dist/index.js" ]; then
    echo "Building DevSecOps MCP..."
    cd mcp-tools/devsecops-mcp && npm run build && cd ../..
fi

# Start Docker Compose
echo ""
echo "🐳 Starting Docker services..."
docker-compose -f docker-compose.complete-mcp.yml up -d --build

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo ""
echo "🏥 Checking service health..."
docker-compose -f docker-compose.complete-mcp.yml ps

# Display service URLs
echo ""
echo "📡 MCP Services Available:"
echo "========================="
echo "✅ MCP-Scan:        http://localhost:3000"
echo "✅ DevSecOps-MCP:   http://localhost:3001"
echo "✅ ESLint MCP:      http://localhost:3002"
echo "✅ FileScopeMCP:    http://localhost:3003"
echo "✅ K6 MCP:          http://localhost:3004"
echo "✅ BrowserTools:    http://localhost:3005"
echo "✅ Redis Cache:     redis://localhost:6379"
echo ""
echo "💰 Total Cost: $0 (all tools are FREE!)"
echo ""
echo "📊 View logs:"
echo "   docker-compose -f docker-compose.complete-mcp.yml logs -f [service-name]"
echo ""
echo "🛑 Stop all services:"
echo "   docker-compose -f docker-compose.complete-mcp.yml down"
echo ""
echo "🎯 Ready for secure code analysis!"