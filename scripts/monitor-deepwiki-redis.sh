#!/bin/bash

# DeepWiki Redis Monitoring Script
# Run this script to check the health of Redis and DeepWiki integration

echo "================================================"
echo "DeepWiki Redis Integration Health Check"
echo "================================================"
echo "Time: $(date)"
echo ""

# Configuration
REDIS_HOST="157.230.9.119"
REDIS_PRIVATE_IP="10.116.0.7"
REDIS_PASSWORD="n7ud71guwMiBv3lOwyKGNbiDUThiyk3n"
NAMESPACE="codequal-dev"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Function to check status
check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        return 1
    fi
}

# 1. Check Redis Droplet
echo "1. Redis Server Status"
echo "----------------------"
if redis-cli -h $REDIS_HOST -p 6379 -a "$REDIS_PASSWORD" --no-auth-warning ping > /dev/null 2>&1; then
    check_status 0 "Redis is accessible from local machine"
    
    # Get Redis info
    MEMORY=$(redis-cli -h $REDIS_HOST -p 6379 -a "$REDIS_PASSWORD" --no-auth-warning INFO memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
    CLIENTS=$(redis-cli -h $REDIS_HOST -p 6379 -a "$REDIS_PASSWORD" --no-auth-warning INFO clients | grep connected_clients | cut -d: -f2 | tr -d '\r')
    OPS=$(redis-cli -h $REDIS_HOST -p 6379 -a "$REDIS_PASSWORD" --no-auth-warning INFO stats | grep instantaneous_ops_per_sec | cut -d: -f2 | tr -d '\r')
    
    echo "   Memory Used: $MEMORY"
    echo "   Connected Clients: $CLIENTS"
    echo "   Ops/sec: $OPS"
else
    check_status 1 "Cannot connect to Redis"
fi

# 2. Check Kubernetes
echo ""
echo "2. Kubernetes Status"
echo "-------------------"
kubectl config current-context > /dev/null 2>&1
check_status $? "kubectl is configured"

# Get DeepWiki pod
POD_NAME=$(kubectl get pods -n $NAMESPACE -l app=deepwiki -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -n "$POD_NAME" ]; then
    check_status 0 "DeepWiki pod found: $POD_NAME"
    
    # Check pod status
    POD_STATUS=$(kubectl get pod -n $NAMESPACE $POD_NAME -o jsonpath='{.status.phase}')
    if [ "$POD_STATUS" = "Running" ]; then
        check_status 0 "Pod is running"
    else
        check_status 1 "Pod status: $POD_STATUS"
    fi
else
    check_status 1 "No DeepWiki pod found"
fi

# 3. Check Redis Integration
echo ""
echo "3. Redis Integration"
echo "-------------------"
if [ -n "$POD_NAME" ]; then
    # Check environment variables
    ENV_CHECK=$(kubectl exec -n $NAMESPACE $POD_NAME -- env | grep -c "REDIS_URL" 2>/dev/null)
    if [ "$ENV_CHECK" -gt 0 ]; then
        check_status 0 "Redis environment variables are set"
    else
        check_status 1 "Redis environment variables missing"
    fi
    
    # Test connection from pod
    PING_RESULT=$(kubectl exec -n $NAMESPACE $POD_NAME -- redis-cli -h $REDIS_PRIVATE_IP -p 6379 -a "$REDIS_PASSWORD" --no-auth-warning ping 2>/dev/null)
    if [ "$PING_RESULT" = "PONG" ]; then
        check_status 0 "Redis connection from pod successful"
    else
        check_status 1 "Redis connection from pod failed"
    fi
fi

# 4. Check Cache Usage
echo ""
echo "4. Cache Usage Statistics"
echo "------------------------"
# Count DeepWiki keys
KEY_COUNT=$(redis-cli -h $REDIS_HOST -p 6379 -a "$REDIS_PASSWORD" --no-auth-warning --scan --pattern "deepwiki:*" | wc -l)
echo "   DeepWiki cache keys: $KEY_COUNT"

# Check for recent activity
echo "   Recent cache operations:"
RECENT_OPS=$(redis-cli -h $REDIS_HOST -p 6379 -a "$REDIS_PASSWORD" --no-auth-warning MONITOR 2>/dev/null | timeout 2s grep -c "deepwiki" || echo "0")
echo "   Operations in last 2 seconds: $RECENT_OPS"

# 5. Performance Metrics
echo ""
echo "5. Performance Metrics"
echo "---------------------"
# Test write performance
START_TIME=$(date +%s%N)
redis-cli -h $REDIS_HOST -p 6379 -a "$REDIS_PASSWORD" --no-auth-warning SET test:perf "test" EX 10 > /dev/null 2>&1
END_TIME=$(date +%s%N)
WRITE_TIME=$(( ($END_TIME - $START_TIME) / 1000000 ))
echo "   Write latency: ${WRITE_TIME}ms"

# Test read performance
START_TIME=$(date +%s%N)
redis-cli -h $REDIS_HOST -p 6379 -a "$REDIS_PASSWORD" --no-auth-warning GET test:perf > /dev/null 2>&1
END_TIME=$(date +%s%N)
READ_TIME=$(( ($END_TIME - $START_TIME) / 1000000 ))
echo "   Read latency: ${READ_TIME}ms"

# Check if performance is acceptable
if [ $READ_TIME -lt 50 ]; then
    check_status 0 "Performance target met (<50ms)"
else
    check_status 1 "Performance below target (>50ms)"
fi

# 6. Recent Errors
echo ""
echo "6. Recent Errors Check"
echo "---------------------"
if [ -n "$POD_NAME" ]; then
    ERROR_COUNT=$(kubectl logs -n $NAMESPACE $POD_NAME --tail=100 2>/dev/null | grep -ci "redis.*error" || echo "0")
    if [ "$ERROR_COUNT" -eq 0 ]; then
        check_status 0 "No Redis errors in recent logs"
    else
        check_status 1 "Found $ERROR_COUNT Redis errors in recent logs"
        echo "   Recent errors:"
        kubectl logs -n $NAMESPACE $POD_NAME --tail=100 2>/dev/null | grep -i "redis.*error" | tail -3
    fi
fi

# Summary
echo ""
echo "================================================"
echo "Summary"
echo "================================================"
echo "Redis Host: $REDIS_HOST"
echo "DeepWiki Pod: ${POD_NAME:-Not found}"
echo "Cache Keys: $KEY_COUNT"
echo "Performance: Read ${READ_TIME}ms / Write ${WRITE_TIME}ms"
echo ""

# Provide helpful commands
echo "Useful Commands:"
echo "----------------"
echo "# Watch Redis activity:"
echo "redis-cli -h $REDIS_HOST -p 6379 -a '$REDIS_PASSWORD' --no-auth-warning monitor"
echo ""
echo "# Check DeepWiki logs:"
echo "kubectl logs -n $NAMESPACE -f $POD_NAME"
echo ""
echo "# SSH to Redis server:"
echo "ssh root@$REDIS_HOST"