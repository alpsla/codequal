# Redis Setup Guide for CodeQual on DigitalOcean

## Overview
This guide covers setting up Redis for the CodeQual cache infrastructure to support the new architecture where DeepWiki reports are stored in cache with a 30-minute TTL instead of Vector DB.

## Option 1: DigitalOcean Managed Redis (Recommended for Production)

### Advantages
- Fully managed, no maintenance required
- High availability with automatic failover
- Automated backups
- SSL/TLS encryption by default
- Easy scaling

### Setup Steps

1. **Create a Managed Redis Database**
   ```bash
   # Using DigitalOcean CLI (doctl)
   doctl databases create codequal-redis \
     --engine redis \
     --region nyc3 \
     --size db-s-1vcpu-1gb \
     --version 7
   ```

2. **Get Connection Details**
   ```bash
   # List databases to get the ID
   doctl databases list
   
   # Get connection string
   doctl databases connection <database-id> --format Host,Port,Password,SSL
   ```

3. **Configure Firewall Rules**
   - Add your application droplets to the trusted sources
   - Or use VPC networking for internal communication

4. **Connection String Format**
   ```
   rediss://default:<password>@<host>:<port>
   ```

### Pricing
- Basic plan (1GB RAM): ~$15/month
- Standard plan (4GB RAM): ~$60/month
- Premium plan (16GB RAM): ~$240/month

## Option 2: Self-Hosted Redis with Docker (Development/Testing)

### Add Redis to docker-compose.yml

```yaml
version: '3.8'

services:
  # ... existing services ...

  # Redis cache service
  redis:
    image: redis:7-alpine
    container_name: codequal-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: >
      redis-server
      --save 60 1
      --loglevel warning
      --maxmemory 2gb
      --maxmemory-policy allkeys-lru
      --appendonly yes
      --appendfsync everysec
    restart: always
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  # Update CodeQual service
  codequal:
    # ... existing configuration ...
    environment:
      # ... existing environment variables ...
      - REDIS_URL=redis://redis:6379
      - CACHE_TTL=1800  # 30 minutes in seconds
    depends_on:
      - supabase
      - redis  # Add Redis dependency

volumes:
  # ... existing volumes ...
  redis-data:
```

### Redis Configuration for Production

Create `redis.conf` for production settings:

```conf
# Memory management
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec

# Security
requirepass your_redis_password_here
bind 0.0.0.0
protected-mode yes

# Performance
tcp-backlog 511
timeout 0
tcp-keepalive 300

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
```

## Option 3: Redis on Separate DigitalOcean Droplet

### 1. Create a Droplet
```bash
doctl compute droplet create codequal-redis \
  --size s-2vcpu-2gb \
  --image ubuntu-22-04-x64 \
  --region nyc3 \
  --ssh-keys <your-ssh-key-id>
```

### 2. Install Redis
```bash
# SSH into the droplet
ssh root@<droplet-ip>

# Update system
apt update && apt upgrade -y

# Install Redis
apt install redis-server -y

# Configure Redis
nano /etc/redis/redis.conf
```

### 3. Configure Redis for Remote Access
```bash
# Edit redis.conf
bind 0.0.0.0 ::1
protected-mode yes
requirepass your_secure_password_here

# Restart Redis
systemctl restart redis-server
systemctl enable redis-server
```

### 4. Configure Firewall
```bash
# Allow Redis port only from your app servers
ufw allow from <app-server-ip> to any port 6379
ufw enable
```

## TypeScript Cache Service Implementation

Create the cache service that will replace Vector DB storage:

```typescript
// packages/core/src/services/cache/RedisCacheService.ts

import Redis from 'ioredis';
import { CacheService, DeepWikiReport } from '../../types/cache';

export class RedisCacheService implements CacheService {
  private client: Redis;
  private defaultTTL: number = 1800; // 30 minutes

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
    });
  }

  async setReport(
    prId: string, 
    report: DeepWikiReport, 
    ttl: number = this.defaultTTL
  ): Promise<void> {
    const key = `deepwiki:report:${prId}`;
    const value = JSON.stringify(report);
    
    await this.client.setex(key, ttl, value);
    
    // Also set a timestamp for monitoring
    await this.client.hset('deepwiki:reports:meta', prId, JSON.stringify({
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
      size: value.length
    }));
  }

  async getReport(prId: string): Promise<DeepWikiReport | null> {
    const key = `deepwiki:report:${prId}`;
    const value = await this.client.get(key);
    
    if (!value) {
      return null;
    }
    
    try {
      return JSON.parse(value) as DeepWikiReport;
    } catch (error) {
      console.error(`Failed to parse report for PR ${prId}:`, error);
      return null;
    }
  }

  async isReportAvailable(prId: string): Promise<boolean> {
    const key = `deepwiki:report:${prId}`;
    const exists = await this.client.exists(key);
    return exists === 1;
  }

  async cleanExpired(): Promise<void> {
    // Redis handles expiration automatically with TTL
    // This method can be used for manual cleanup if needed
    const meta = await this.client.hgetall('deepwiki:reports:meta');
    const now = new Date();
    
    for (const [prId, metaStr] of Object.entries(meta)) {
      try {
        const metadata = JSON.parse(metaStr);
        const expiresAt = new Date(metadata.expiresAt);
        
        if (expiresAt < now) {
          await this.client.hdel('deepwiki:reports:meta', prId);
        }
      } catch (error) {
        console.error(`Failed to clean metadata for PR ${prId}:`, error);
      }
    }
  }

  async getStats(): Promise<{
    totalReports: number;
    memoryUsage: number;
    oldestReport: string | null;
  }> {
    const info = await this.client.info('memory');
    const memoryMatch = info.match(/used_memory:(\d+)/);
    const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;
    
    const meta = await this.client.hgetall('deepwiki:reports:meta');
    const totalReports = Object.keys(meta).length;
    
    let oldestReport = null;
    let oldestTime = Infinity;
    
    for (const [prId, metaStr] of Object.entries(meta)) {
      try {
        const metadata = JSON.parse(metaStr);
        const createdAt = new Date(metadata.createdAt).getTime();
        if (createdAt < oldestTime) {
          oldestTime = createdAt;
          oldestReport = prId;
        }
      } catch (error) {
        // Skip invalid entries
      }
    }
    
    return {
      totalReports,
      memoryUsage,
      oldestReport
    };
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

// Factory function with fallback to in-memory cache
export function createCacheService(redisUrl?: string): CacheService {
  if (redisUrl) {
    try {
      return new RedisCacheService(redisUrl);
    } catch (error) {
      console.error('Failed to create Redis cache service:', error);
      console.log('Falling back to in-memory cache');
    }
  }
  
  // Fallback to in-memory cache for development
  return new InMemoryCacheService();
}
```

## Environment Variables

Add to your `.env` file:

```bash
# For DigitalOcean Managed Redis
REDIS_URL=rediss://default:your_password@your-redis-host.db.ondigitalocean.com:25061

# For Self-hosted Redis
REDIS_URL=redis://your_password@your-redis-host:6379

# Cache configuration
CACHE_TTL=1800  # 30 minutes
CACHE_MAX_SIZE=1000  # Maximum number of reports to cache
```

## Monitoring Redis

### 1. Redis CLI Commands
```bash
# Connect to Redis
redis-cli -h <host> -p <port> -a <password>

# Monitor real-time commands
MONITOR

# Check memory usage
INFO memory

# Get all DeepWiki report keys
KEYS deepwiki:report:*

# Check specific report TTL
TTL deepwiki:report:<pr-id>
```

### 2. Grafana Dashboard Query
```promql
# Redis memory usage
redis_memory_used_bytes

# Number of connected clients
redis_connected_clients

# Commands processed per second
rate(redis_commands_processed_total[5m])

# Keyspace hits ratio
rate(redis_keyspace_hits_total[5m]) / 
(rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))
```

## Migration Steps

1. **Deploy Redis** (choose one of the options above)
2. **Update application configuration** with Redis connection details
3. **Deploy cache service** implementation
4. **Update DeepWiki chat** to use cache instead of Vector DB
5. **Test with a real PR** to verify caching works
6. **Monitor performance** to ensure <50ms retrieval times

## Testing the Setup

```typescript
// test-redis-cache.ts
import { RedisCacheService } from './RedisCacheService';

async function testCache() {
  const cache = new RedisCacheService(process.env.REDIS_URL!);
  
  // Test report
  const mockReport: DeepWikiReport = {
    prId: 'test-pr-123',
    mainBranchAnalysis: { /* ... */ },
    featureBranchAnalysis: { /* ... */ },
    comparison: { /* ... */ },
    timestamp: new Date().toISOString()
  };
  
  // Set report
  console.log('Setting report...');
  await cache.setReport('test-pr-123', mockReport, 60); // 1 minute TTL for testing
  
  // Get report
  console.log('Getting report...');
  const start = Date.now();
  const retrieved = await cache.getReport('test-pr-123');
  const duration = Date.now() - start;
  
  console.log(`Retrieved in ${duration}ms`);
  console.log('Report available:', await cache.isReportAvailable('test-pr-123'));
  
  // Check stats
  const stats = await cache.getStats();
  console.log('Cache stats:', stats);
  
  await cache.disconnect();
}

testCache().catch(console.error);
```

## Security Best Practices

1. **Use strong passwords** - Generate with: `openssl rand -base64 32`
2. **Enable SSL/TLS** for production
3. **Restrict network access** using firewalls or VPC
4. **Regular backups** even though data is transient
5. **Monitor for unusual access patterns**

## Next Steps

After Redis is set up:
1. Implement the cache service interface
2. Update DeepWiki chat to read from cache
3. Remove Vector DB report storage code
4. Test end-to-end flow
5. Monitor performance metrics