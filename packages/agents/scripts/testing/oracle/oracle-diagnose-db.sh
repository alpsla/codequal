#!/bin/bash

# Oracle Cloud Database Diagnostic Script
# Checks PostgreSQL and Redis connectivity and configuration

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  Oracle Cloud Database Diagnostic                            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service
check_service() {
    local service_name=$1
    local port=$2
    
    echo "🔍 Checking $service_name..."
    
    # Check if service is running (systemd)
    if systemctl is-active --quiet $service_name 2>/dev/null; then
        echo -e "   ${GREEN}✅${NC} Service is running (systemd)"
    else
        echo -e "   ${YELLOW}⚠️${NC}  Service not running via systemd"
    fi
    
    # Check if port is listening
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
        echo -e "   ${GREEN}✅${NC} Port $port is listening"
    elif ss -tuln 2>/dev/null | grep -q ":$port "; then
        echo -e "   ${GREEN}✅${NC} Port $port is listening"
    else
        echo -e "   ${RED}❌${NC} Port $port is NOT listening"
    fi
    
    # Check if can connect locally
    if timeout 2 bash -c "cat < /dev/null > /dev/tcp/localhost/$port" 2>/dev/null; then
        echo -e "   ${GREEN}✅${NC} Can connect to localhost:$port"
    else
        echo -e "   ${RED}❌${NC} Cannot connect to localhost:$port"
    fi
    
    echo ""
}

# Function to check Docker container
check_docker_container() {
    local container_name=$1
    
    echo "🐳 Checking Docker container: $container_name..."
    
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${container_name}$"; then
        echo -e "   ${GREEN}✅${NC} Container is running"
        
        # Get container details
        local status=$(docker inspect --format='{{.State.Status}}' $container_name 2>/dev/null)
        local health=$(docker inspect --format='{{.State.Health.Status}}' $container_name 2>/dev/null)
        
        echo "   📊 Status: $status"
        if [ "$health" != "<no value>" ]; then
            echo "   💚 Health: $health"
        fi
        
        # Get port mappings
        echo "   🔌 Port mappings:"
        docker port $container_name 2>/dev/null | sed 's/^/      /'
        
    elif docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^${container_name}$"; then
        echo -e "   ${YELLOW}⚠️${NC}  Container exists but is not running"
        local status=$(docker inspect --format='{{.State.Status}}' $container_name 2>/dev/null)
        echo "   📊 Status: $status"
    else
        echo -e "   ${RED}❌${NC} Container not found"
    fi
    
    echo ""
}

# Check environment variables
echo "📋 Environment Variables:"
echo "   DATABASE_URL: ${DATABASE_URL:-(not set)}"
echo "   POSTGRES_HOST: ${POSTGRES_HOST:-(not set)}"
echo "   POSTGRES_PORT: ${POSTGRES_PORT:-(not set)}"
echo "   POSTGRES_DB: ${POSTGRES_DB:-(not set)}"
echo "   POSTGRES_USER: ${POSTGRES_USER:-(not set)}"
echo "   REDIS_URL: ${REDIS_URL:-(not set)}"
echo "   REDIS_HOST: ${REDIS_HOST:-(not set)}"
echo "   REDIS_PORT: ${REDIS_PORT:-(not set)}"
echo ""

# Check PostgreSQL
echo "═══════════════════════════════════════════════════════════════"
echo "PostgreSQL Diagnostics"
echo "═══════════════════════════════════════════════════════════════"
check_service "postgresql" "5432"
check_docker_container "postgres"
check_docker_container "postgresql"

# Try to connect to PostgreSQL
echo "🔗 Testing PostgreSQL connection..."
if command -v psql &> /dev/null; then
    if psql -h localhost -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-postgres} -c "SELECT version();" 2>/dev/null; then
        echo -e "   ${GREEN}✅${NC} PostgreSQL connection successful"
    else
        echo -e "   ${RED}❌${NC} PostgreSQL connection failed"
    fi
else
    echo -e "   ${YELLOW}⚠️${NC}  psql command not available"
fi
echo ""

# Check Redis
echo "═══════════════════════════════════════════════════════════════"
echo "Redis Diagnostics"
echo "═══════════════════════════════════════════════════════════════"
check_service "redis" "6379"
check_service "redis-server" "6379"
check_docker_container "redis"

# Try to connect to Redis
echo "🔗 Testing Redis connection..."
if command -v redis-cli &> /dev/null; then
    if redis-cli -h localhost ping 2>/dev/null | grep -q "PONG"; then
        echo -e "   ${GREEN}✅${NC} Redis connection successful"
    else
        echo -e "   ${RED}❌${NC} Redis connection failed"
    fi
else
    echo -e "   ${YELLOW}⚠️${NC}  redis-cli command not available"
fi
echo ""

# Check Docker
echo "═══════════════════════════════════════════════════════════════"
echo "Docker Status"
echo "═══════════════════════════════════════════════════════════════"
if command -v docker &> /dev/null; then
    echo "🐳 Docker version:"
    docker --version
    echo ""
    
    echo "📦 Running containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    
    echo "🌐 Docker networks:"
    docker network ls
else
    echo -e "${RED}❌${NC} Docker not available"
fi
echo ""

# Summary
echo "═══════════════════════════════════════════════════════════════"
echo "Summary"
echo "═══════════════════════════════════════════════════════════════"

# Determine overall status
pg_ok=false
redis_ok=false

if netstat -tuln 2>/dev/null | grep -q ":5432 " || ss -tuln 2>/dev/null | grep -q ":5432 "; then
    pg_ok=true
fi

if netstat -tuln 2>/dev/null | grep -q ":6379 " || ss -tuln 2>/dev/null | grep -q ":6379 "; then
    redis_ok=true
fi

if $pg_ok; then
    echo -e "PostgreSQL: ${GREEN}✅ ACCESSIBLE${NC}"
else
    echo -e "PostgreSQL: ${RED}❌ NOT ACCESSIBLE${NC}"
    echo "   Recommended actions:"
    echo "   1. Check if PostgreSQL service/container is running"
    echo "   2. Verify DATABASE_URL or POSTGRES_* environment variables"
    echo "   3. Check firewall/network configuration"
fi

if $redis_ok; then
    echo -e "Redis: ${GREEN}✅ ACCESSIBLE${NC}"
else
    echo -e "Redis: ${RED}❌ NOT ACCESSIBLE${NC}"
    echo "   Recommended actions:"
    echo "   1. Check if Redis service/container is running"
    echo "   2. Verify REDIS_URL or REDIS_* environment variables"
    echo "   3. Check firewall/network configuration"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
