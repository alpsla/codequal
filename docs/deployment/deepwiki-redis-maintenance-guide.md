# DeepWiki Redis Integration - Configuration & Maintenance Guide

## Overview
This document covers the configuration, testing, and maintenance requirements for the DeepWiki Redis cache integration on DigitalOcean Kubernetes.

## Current Configuration

### Redis Server
- **Type**: Self-hosted Redis on DigitalOcean Droplet
- **Droplet ID**: 510789114
- **Droplet Name**: codequal-redis
- **Public IP**: 157.230.9.119
- **Private IP**: 10.116.0.7 (used by DeepWiki)
- **Port**: 6379
- **Password**: n7ud71guwMiBv3lOwyKGNbiDUThiyk3n
- **Memory**: 1.5GB with LRU eviction
- **Persistence**: Disabled (cache-only)

### DeepWiki Pod Configuration
- **Namespace**: codequal-dev
- **Deployment**: deepwiki
- **Environment Variables**:
  ```
  REDIS_URL=redis://:n7ud71guwMiBv3lOwyKGNbiDUThiyk3n@10.116.0.7:6379
  CACHE_TTL=1800 (30 minutes)
  CACHE_ENABLED=true
  CACHE_TYPE=redis
  VECTOR_DB_REPORTS_ENABLED=false
  ```

## Integration Test Results (January 30, 2025)

| Test | Result | Details |
|------|--------|---------|
| Pod Connection | ✅ PASS | Pod found: deepwiki-6bf9b97d86-j4ltw |
| Redis Environment | ✅ PASS | All Redis variables configured |
| Redis Connection | ✅ PASS | Connection successful (PONG) |
| Cache Write | ✅ PASS | Test data written successfully |
| Cache Read | ✅ PASS | Test data retrieved successfully |
| TTL Verification | ✅ PASS | TTL working correctly |

## Maintenance Requirements

### 1. Regular Monitoring (Weekly - 10 minutes)

#### Check Redis Health
```bash
# SSH into Redis droplet
ssh root@157.230.9.119

# Check Redis status
systemctl status redis-server

# Check memory usage
redis-cli -a 'n7ud71guwMiBv3lOwyKGNbiDUThiyk3n' --no-auth-warning INFO memory | grep used_memory_human

# Check connected clients
redis-cli -a 'n7ud71guwMiBv3lOwyKGNbiDUThiyk3n' --no-auth-warning INFO clients
```

#### Monitor from Kubernetes
```bash
# Check DeepWiki pod status
kubectl get pods -n codequal-dev -l app=deepwiki

# Check Redis connectivity from pod
POD_NAME=$(kubectl get pods -n codequal-dev -l app=deepwiki -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n codequal-dev $POD_NAME -- redis-cli -h 10.116.0.7 -p 6379 -a 'n7ud71guwMiBv3lOwyKGNbiDUThiyk3n' --no-auth-warning ping

# View DeepWiki logs for Redis errors
kubectl logs -n codequal-dev -l app=deepwiki --tail=50 | grep -i redis
```

### 2. System Updates (Monthly - 20 minutes)

```bash
# SSH into Redis droplet
ssh root@157.230.9.119

# Update system packages
apt update && apt upgrade -y

# Check Redis version
redis-server --version

# Restart Redis if updated
systemctl restart redis-server
```

### 3. Performance Monitoring (Bi-weekly - 5 minutes)

```bash
# Check cache hit/miss ratio
redis-cli -h 157.230.9.119 -p 6379 -a 'n7ud71guwMiBv3lOwyKGNbiDUThiyk3n' --no-auth-warning INFO stats | grep -E "keyspace_hits|keyspace_misses"

# Monitor slow queries
redis-cli -h 157.230.9.119 -p 6379 -a 'n7ud71guwMiBv3lOwyKGNbiDUThiyk3n' --no-auth-warning SLOWLOG GET 10

# Check memory fragmentation
redis-cli -h 157.230.9.119 -p 6379 -a 'n7ud71guwMiBv3lOwyKGNbiDUThiyk3n' --no-auth-warning INFO memory | grep fragmentation
```

### 4. Kubernetes-Specific Maintenance

#### Volume Attachment Issue Prevention
When updating DeepWiki deployment:

```bash
# ALWAYS scale down first to avoid volume attachment issues
kubectl scale deployment deepwiki -n codequal-dev --replicas=0

# Wait for pod termination
kubectl wait --for=delete pod -l app=deepwiki -n codequal-dev --timeout=60s

# Apply new configuration
kubectl apply -f deepwiki-deployment-dev-redis-secure.yaml

# Scale back up
kubectl scale deployment deepwiki -n codequal-dev --replicas=1
```

#### Update Redis Configuration
```bash
# Update secret if Redis password changes
kubectl delete secret redis-config -n codequal-dev
kubectl apply -f redis-secret.yaml

# Restart DeepWiki pod to pick up changes
kubectl rollout restart deployment/deepwiki -n codequal-dev
```

### 5. Troubleshooting Common Issues

#### Issue: DeepWiki Can't Connect to Redis
```bash
# Check network connectivity
kubectl exec -n codequal-dev $POD_NAME -- apt-get update && apt-get install -y telnet
kubectl exec -n codequal-dev $POD_NAME -- telnet 10.116.0.7 6379

# Verify environment variables
kubectl exec -n codequal-dev $POD_NAME -- env | grep REDIS

# Check Redis firewall
ssh root@157.230.9.119 'ufw status'
```

#### Issue: High Memory Usage
```bash
# Check what's using memory
redis-cli -h 157.230.9.119 -p 6379 -a 'n7ud71guwMiBv3lOwyKGNbiDUThiyk3n' --no-auth-warning MEMORY DOCTOR

# List all keys (be careful in production)
redis-cli -h 157.230.9.119 -p 6379 -a 'n7ud71guwMiBv3lOwyKGNbiDUThiyk3n' --no-auth-warning DBSIZE

# Check key patterns
redis-cli -h 157.230.9.119 -p 6379 -a 'n7ud71guwMiBv3lOwyKGNbiDUThiyk3n' --no-auth-warning --scan --pattern "deepwiki:*" | head -20
```

#### Issue: Slow Performance
```bash
# Check latency
redis-cli -h 157.230.9.119 -p 6379 -a 'n7ud71guwMiBv3lOwyKGNbiDUThiyk3n' --no-auth-warning --latency

# Monitor commands in real-time (careful - impacts performance)
redis-cli -h 157.230.9.119 -p 6379 -a 'n7ud71guwMiBv3lOwyKGNbiDUThiyk3n' --no-auth-warning MONITOR
```

## Monitoring Dashboard Commands

### Real-time Monitoring
```bash
# Watch cache operations
redis-cli -h 157.230.9.119 -p 6379 -a 'n7ud71guwMiBv3lOwyKGNbiDUThiyk3n' --no-auth-warning monitor | grep deepwiki

# Monitor DeepWiki logs
kubectl logs -n codequal-dev -f -l app=deepwiki

# Watch Redis metrics
watch -n 5 'redis-cli -h 157.230.9.119 -p 6379 -a "n7ud71guwMiBv3lOwyKGNbiDUThiyk3n" --no-auth-warning INFO stats | grep -E "instantaneous_ops_per_sec|keyspace"'
```

### Health Check Script
Create `/usr/local/bin/check-deepwiki-redis.sh`:
```bash
#!/bin/bash
echo "=== DeepWiki Redis Health Check ==="
echo "Time: $(date)"
echo ""

# Check Redis
echo "Redis Status:"
redis-cli -h 157.230.9.119 -p 6379 -a 'n7ud71guwMiBv3lOwyKGNbiDUThiyk3n' --no-auth-warning ping

# Check DeepWiki
echo -e "\nDeepWiki Pods:"
kubectl get pods -n codequal-dev -l app=deepwiki

# Check connectivity from pod
POD=$(kubectl get pods -n codequal-dev -l app=deepwiki -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -n "$POD" ]; then
    echo -e "\nRedis connection from DeepWiki:"
    kubectl exec -n codequal-dev $POD -- redis-cli -h 10.116.0.7 -p 6379 -a 'n7ud71guwMiBv3lOwyKGNbiDUThiyk3n' --no-auth-warning ping 2>/dev/null || echo "Failed"
fi

# Memory usage
echo -e "\nRedis Memory:"
redis-cli -h 157.230.9.119 -p 6379 -a 'n7ud71guwMiBv3lOwyKGNbiDUThiyk3n' --no-auth-warning INFO memory | grep used_memory_human
```

## Backup Considerations

Since this is a cache-only deployment with 30-minute TTL:
- **No backup required** for Redis data
- **DO backup** Redis configuration file
- **DO backup** Kubernetes secrets and deployments

```bash
# Backup configurations
mkdir -p ~/codequal-backups/$(date +%Y%m%d)
cd ~/codequal-backups/$(date +%Y%m%d)

# Backup Redis config
scp root@157.230.9.119:/etc/redis/redis.conf ./redis.conf.backup

# Backup Kubernetes configs
kubectl get secret redis-config -n codequal-dev -o yaml > redis-secret.yaml
kubectl get deployment deepwiki -n codequal-dev -o yaml > deepwiki-deployment.yaml
```

## Security Checklist

- [ ] Redis password is strong and unique
- [ ] Firewall restricts Redis access to private IPs only
- [ ] Redis bind address includes only necessary IPs
- [ ] Kubernetes secret is used for Redis credentials
- [ ] Regular security updates are applied
- [ ] No public access to Redis port 6379

## Quick Reference

### Connection Strings
- **From Kubernetes**: `redis://:n7ud71guwMiBv3lOwyKGNbiDUThiyk3n@10.116.0.7:6379`
- **From External**: `redis://:n7ud71guwMiBv3lOwyKGNbiDUThiyk3n@157.230.9.119:6379`

### Key Paths
- **Redis Config**: `/etc/redis/redis.conf`
- **Redis Logs**: `/var/log/redis/redis-server.log`
- **Kubernetes Configs**: `/Users/alpinro/Code Prjects/codequal/kubernetes/`

### Important Commands
```bash
# Restart Redis
ssh root@157.230.9.119 'systemctl restart redis-server'

# Restart DeepWiki
kubectl rollout restart deployment/deepwiki -n codequal-dev

# Emergency cache flush (use with caution)
redis-cli -h 157.230.9.119 -p 6379 -a 'n7ud71guwMiBv3lOwyKGNbiDUThiyk3n' --no-auth-warning FLUSHDB
```

## Estimated Maintenance Time

- **Weekly monitoring**: 10 minutes
- **Monthly updates**: 20 minutes
- **Troubleshooting**: 15-30 minutes per incident
- **Total monthly**: ~1.5 hours

This is minimal maintenance for a cache-only system with automatic expiration.