# Redis Maintenance Guide for Self-Hosted Setup

## Overview
Running Redis on your own DigitalOcean droplet requires regular maintenance, but for a cache-only use case (30-minute TTL), the maintenance burden is relatively light.

## Regular Maintenance Tasks

### 1. **Security Updates** (Monthly - 15 minutes)
```bash
# SSH into your Redis droplet
ssh root@<redis-droplet-ip>

# Update system packages
apt update
apt upgrade -y

# Check Redis version
redis-server --version

# Update Redis if needed (major versions only)
apt install redis-server -y
```

**Automation Option:**
```bash
# Enable automatic security updates
apt install unattended-upgrades -y
dpkg-reconfigure --priority=low unattended-upgrades
```

### 2. **Monitoring** (Weekly check - 5 minutes)
```bash
# Quick health check script
cat > /usr/local/bin/redis-health-check.sh << 'EOF'
#!/bin/bash
echo "=== Redis Health Check ==="
echo "Date: $(date)"
echo ""

# Check if Redis is running
if systemctl is-active --quiet redis-server; then
    echo "✅ Redis is running"
else
    echo "❌ Redis is NOT running"
    systemctl start redis-server
fi

# Check memory usage
echo ""
echo "Memory Usage:"
redis-cli -a $REDIS_PASSWORD INFO memory | grep used_memory_human

# Check system resources
echo ""
echo "System Resources:"
free -h | grep Mem
df -h | grep "/$"

# Check Redis logs for errors
echo ""
echo "Recent errors (last 10):"
journalctl -u redis-server --no-pager | grep -i error | tail -10

# Check connection count
echo ""
echo "Connected clients:"
redis-cli -a $REDIS_PASSWORD INFO clients | grep connected_clients
EOF

chmod +x /usr/local/bin/redis-health-check.sh
```

### 3. **Performance Tuning** (Monthly - 10 minutes)
```bash
# Check slow queries
redis-cli -a $REDIS_PASSWORD SLOWLOG GET 10

# Monitor commands in real-time (be careful in production)
redis-cli -a $REDIS_PASSWORD MONITOR

# Check memory fragmentation
redis-cli -a $REDIS_PASSWORD INFO memory | grep mem_fragmentation_ratio
```

### 4. **Disk Space Management** (Bi-weekly - 5 minutes)
Since you're using cache with 30-minute TTL, disk usage should be minimal:
```bash
# Check disk usage
df -h

# Check Redis persistence files
ls -lah /var/lib/redis/

# Clean old logs if needed
journalctl --vacuum-time=7d
```

### 5. **Backup Management** (Optional for cache)
For cache-only usage, backups aren't critical, but you might want config backups:
```bash
# Backup Redis configuration
cp /etc/redis/redis.conf /root/redis-conf-backup-$(date +%Y%m%d).conf

# Backup to local machine
scp root@<redis-ip>:/etc/redis/redis.conf ./redis-conf-backup.conf
```

## Automated Monitoring Setup

### Option 1: Simple Cron-based Monitoring
```bash
# Add to crontab
crontab -e

# Add these lines:
# Daily health check at 9 AM
0 9 * * * /usr/local/bin/redis-health-check.sh > /var/log/redis-health.log 2>&1

# Alert if Redis is down (every 5 minutes)
*/5 * * * * systemctl is-active --quiet redis-server || echo "Redis is down on $(hostname)" | mail -s "Redis Alert" your-email@example.com
```

### Option 2: DigitalOcean Monitoring (Free)
```bash
# Install DO monitoring agent
curl -sSL https://repos.insights.digitalocean.com/install.sh | sudo bash
```

### Option 3: Uptime Monitoring Service
Use a service like UptimeRobot or Pingdom to monitor Redis port 6379.

## Common Issues and Solutions

### 1. **High Memory Usage**
```bash
# Check what's using memory
redis-cli -a $REDIS_PASSWORD INFO memory

# Clear all cache (emergency only)
redis-cli -a $REDIS_PASSWORD FLUSHALL

# Adjust maxmemory if needed
redis-cli -a $REDIS_PASSWORD CONFIG SET maxmemory 2gb
```

### 2. **Connection Refused**
```bash
# Check if Redis is running
systemctl status redis-server

# Check logs
journalctl -u redis-server -n 50

# Restart Redis
systemctl restart redis-server
```

### 3. **Slow Performance**
```bash
# Check for memory swapping
free -h
vmstat 1 5

# Check Redis latency
redis-cli -a $REDIS_PASSWORD --latency

# Monitor slow queries
redis-cli -a $REDIS_PASSWORD CONFIG SET slowlog-log-slower-than 10000
redis-cli -a $REDIS_PASSWORD SLOWLOG GET 20
```

## Maintenance Schedule Summary

| Task | Frequency | Time Required | Can Be Automated |
|------|-----------|---------------|------------------|
| Security Updates | Monthly | 15 min | Yes (unattended-upgrades) |
| Health Checks | Weekly | 5 min | Yes (cron + monitoring) |
| Log Rotation | Automatic | 0 min | Yes (built-in) |
| Performance Review | Monthly | 10 min | Partially |
| Disk Space Check | Bi-weekly | 5 min | Yes (alerts) |
| Redis Updates | Quarterly | 30 min | No |
| Droplet Backups | Weekly | 0 min | Yes (DO snapshots) |

**Total: ~1 hour per month**

## Comparison with Managed Redis

| Aspect | Self-Hosted | Managed Service |
|--------|-------------|-----------------|
| Monthly Time | ~1 hour | 0 minutes |
| Monthly Cost | $18 | $40-60 |
| Control | Full | Limited |
| Performance | Best | Good |
| Automatic Failover | No | Yes |
| Automatic Backups | No | Yes |
| SSL/TLS | Manual | Included |
| Scaling | Manual | Automatic |

## Reducing Maintenance Burden

### 1. **Enable DigitalOcean Snapshots**
```bash
# Via DO dashboard or CLI
doctl compute droplet-action snapshot <droplet-id>
```

### 2. **Set Up Automated Alerts**
```bash
# Install monitoring script
cat > /etc/systemd/system/redis-monitor.service << EOF
[Unit]
Description=Redis Monitoring Service
After=redis-server.service

[Service]
Type=simple
ExecStart=/usr/local/bin/redis-monitor-daemon.sh
Restart=always

[Install]
WantedBy=multi-user.target
EOF
```

### 3. **Use Configuration Management**
Consider using Ansible or similar for consistent updates:
```yaml
# ansible-playbook redis-maintenance.yml
---
- hosts: redis-servers
  tasks:
    - name: Update packages
      apt:
        update_cache: yes
        upgrade: yes
    
    - name: Ensure Redis is running
      systemd:
        name: redis-server
        state: started
        enabled: yes
```

## When to Consider Managed Redis

Switch to managed Redis if:
- You're spending more than 2 hours/month on maintenance
- You need high availability (automatic failover)
- You require guaranteed SLAs
- Maintenance is impacting your productivity
- You need to scale frequently

## Emergency Procedures

### Redis Crash Recovery
```bash
# 1. Check status
systemctl status redis-server

# 2. Check logs
journalctl -u redis-server -n 100

# 3. Try to start
systemctl start redis-server

# 4. If corrupted, restore from backup
systemctl stop redis-server
mv /var/lib/redis/dump.rdb /var/lib/redis/dump.rdb.corrupted
systemctl start redis-server

# 5. If all fails, reinstall
apt remove --purge redis-server
apt install redis-server
# Restore your config from backup
```

### Performance Emergency
```bash
# 1. Check what's consuming memory
redis-cli -a $REDIS_PASSWORD CLIENT LIST

# 2. Kill long-running clients
redis-cli -a $REDIS_PASSWORD CLIENT KILL TYPE normal

# 3. Emergency memory cleanup
redis-cli -a $REDIS_PASSWORD MEMORY DOCTOR

# 4. Restart as last resort
systemctl restart redis-server
```

## Conclusion

For CodeQual's use case (30-minute cache TTL):
- **Maintenance is minimal**: ~1 hour/month
- **Most tasks can be automated**
- **No data loss concerns** (it's just cache)
- **Cost savings**: $18/month vs $40-60/month for managed

The maintenance burden is very manageable for a cache-only Redis instance. If you're comfortable with basic Linux administration, self-hosting is a cost-effective choice.