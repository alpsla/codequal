#!/bin/bash

# Automated Redis droplet creation for CodeQual
set -e

echo "==================================="
echo "Creating Redis Droplet on DigitalOcean"
echo "==================================="
echo ""

# Configuration
DROPLET_NAME="codequal-redis"
REGION="nyc1"  # Same as your other droplets
SIZE="s-2vcpu-2gb"
IMAGE="ubuntu-22-04-x64"
TAG="redis,codequal"

# Generate secure Redis password
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
echo "Generated Redis password: $REDIS_PASSWORD"
echo ""

# Create cloud-init script
cat > /tmp/redis-cloud-init.yaml << EOF
#cloud-config
package_update: true
package_upgrade: true

packages:
  - redis-server
  - ufw
  - htop
  - net-tools
  - fail2ban

write_files:
  - path: /etc/redis/redis.conf
    content: |
      # Network
      bind 0.0.0.0 ::1
      protected-mode yes
      port 6379
      tcp-backlog 511
      timeout 0
      tcp-keepalive 300
      
      # Security
      requirepass $REDIS_PASSWORD
      
      # Memory (optimized for cache)
      maxmemory 1500mb
      maxmemory-policy allkeys-lru
      maxmemory-samples 5
      
      # Persistence (minimal for cache)
      save ""
      appendonly no
      
      # Logging
      loglevel notice
      logfile /var/log/redis/redis-server.log
      syslog-enabled yes
      
      # Performance
      databases 2
      
      # Clients
      maxclients 10000
      
      # Optimizations for cache
      lazyfree-lazy-eviction yes
      lazyfree-lazy-expire yes
      lazyfree-lazy-server-del yes
      replica-lazy-flush yes
      
  - path: /etc/systemd/system/redis-tuning.service
    content: |
      [Unit]
      Description=Redis System Tuning
      Before=redis-server.service
      
      [Service]
      Type=oneshot
      ExecStart=/bin/bash -c 'echo never > /sys/kernel/mm/transparent_hugepage/enabled'
      ExecStart=/bin/bash -c 'echo 512 > /proc/sys/net/core/somaxconn'
      ExecStart=/bin/bash -c 'sysctl vm.overcommit_memory=1'
      RemainAfterExit=true
      
      [Install]
      WantedBy=multi-user.target

  - path: /usr/local/bin/redis-health.sh
    content: |
      #!/bin/bash
      PASS="$REDIS_PASSWORD"
      echo "=== Redis Health Check ==="
      echo "Time: \$(date)"
      
      # Check if running
      if systemctl is-active --quiet redis-server; then
          echo "✅ Redis is running"
      else
          echo "❌ Redis is down - attempting restart"
          systemctl start redis-server
      fi
      
      # Check memory
      echo -e "\nMemory Usage:"
      redis-cli -a "\$PASS" --no-auth-warning INFO memory | grep -E "(used_memory_human|maxmemory_human)"
      
      # Check clients
      echo -e "\nConnected Clients:"
      redis-cli -a "\$PASS" --no-auth-warning INFO clients | grep connected_clients
      
      # Check uptime
      echo -e "\nUptime:"
      redis-cli -a "\$PASS" --no-auth-warning INFO server | grep uptime_in_days
    permissions: '0755'

runcmd:
  # Create Redis directories
  - mkdir -p /var/log/redis
  - chown redis:redis /var/log/redis
  
  # Enable and start Redis tuning
  - systemctl enable redis-tuning.service
  - systemctl start redis-tuning.service
  
  # Configure firewall (restrictive)
  - ufw default deny incoming
  - ufw default allow outgoing
  - ufw allow 22/tcp
  - ufw allow from 10.0.0.0/8 to any port 6379
  - ufw allow from 172.16.0.0/12 to any port 6379
  - ufw allow from 192.168.0.0/16 to any port 6379
  - ufw --force enable
  
  # Configure fail2ban
  - systemctl enable fail2ban
  - systemctl start fail2ban
  
  # Restart Redis with new config
  - systemctl restart redis-server
  - systemctl enable redis-server
  
  # Set up monitoring cron
  - echo "*/5 * * * * /usr/local/bin/redis-health.sh > /var/log/redis-health.log 2>&1" | crontab -
  
  # Enable automatic security updates
  - echo 'unattended-upgrades unattended-upgrades/enable_auto_updates boolean true' | debconf-set-selections
  - dpkg-reconfigure -f noninteractive unattended-upgrades
  
  # Test Redis
  - redis-cli -a "$REDIS_PASSWORD" --no-auth-warning ping

final_message: "Redis cache server is ready!"
EOF

# Get SSH keys
echo "Getting SSH keys..."
SSH_KEYS=$(doctl compute ssh-key list --format ID --no-header | tr '\n' ',' | sed 's/,$//')

if [ -z "$SSH_KEYS" ]; then
    echo "Warning: No SSH keys found!"
    echo "Add SSH key with: doctl compute ssh-key import <name> --public-key-file ~/.ssh/id_rsa.pub"
    exit 1
fi

# Create the droplet
echo "Creating droplet in region $REGION..."
doctl compute droplet create $DROPLET_NAME \
    --size $SIZE \
    --image $IMAGE \
    --region $REGION \
    --tag-names $TAG \
    --user-data-file /tmp/redis-cloud-init.yaml \
    --ssh-keys $SSH_KEYS \
    --wait

# Wait for droplet to be fully ready
echo ""
echo "Waiting for droplet to initialize (2 minutes)..."
sleep 120

# Get droplet info
DROPLET_ID=$(doctl compute droplet list --format ID,Name --no-header | grep $DROPLET_NAME | awk '{print $1}')
DROPLET_IP=$(doctl compute droplet get $DROPLET_ID --format PublicIPv4 --no-header)
DROPLET_PRIVATE_IP=$(doctl compute droplet get $DROPLET_ID --format PrivateIPv4 --no-header)

# Create .env.redis file
cat > .env.redis << EOF
# Redis Connection Information
# Created: $(date)

# Public connection (for development)
REDIS_URL=redis://:$REDIS_PASSWORD@$DROPLET_IP:6379

# Private connection (for production - same VPC)
REDIS_URL_PRIVATE=redis://:$REDIS_PASSWORD@$DROPLET_PRIVATE_IP:6379

# Configuration
CACHE_TTL=1800
CACHE_MAX_SIZE=1000
EOF

# Create detailed connection info
cat > redis-connection-info.txt << EOF
Redis Droplet Created Successfully!
===================================
Created: $(date)

Droplet Details:
- Name: $DROPLET_NAME
- ID: $DROPLET_ID
- Region: $REGION
- Size: $SIZE
- Public IP: $DROPLET_IP
- Private IP: $DROPLET_PRIVATE_IP

Redis Configuration:
- Port: 6379
- Password: $REDIS_PASSWORD
- Max Memory: 1.5GB
- Eviction Policy: allkeys-lru
- Persistence: Disabled (cache only)

Connection Strings:
- Public: redis://:$REDIS_PASSWORD@$DROPLET_IP:6379
- Private: redis://:$REDIS_PASSWORD@$DROPLET_PRIVATE_IP:6379

SSH Access:
ssh root@$DROPLET_IP

Test Connection:
redis-cli -h $DROPLET_IP -p 6379 -a '$REDIS_PASSWORD' ping

Monitor Health:
ssh root@$DROPLET_IP '/usr/local/bin/redis-health.sh'

View Logs:
ssh root@$DROPLET_IP 'tail -f /var/log/redis/redis-server.log'

IMPORTANT SECURITY STEPS:
1. Update firewall to allow only your app servers:
   ssh root@$DROPLET_IP 'ufw allow from YOUR_APP_IP to any port 6379'

2. Remove public access after testing:
   ssh root@$DROPLET_IP 'ufw delete allow 6379/tcp'

3. Use private IP ($DROPLET_PRIVATE_IP) for production
EOF

echo ""
echo "✅ Redis droplet created successfully!"
echo ""
echo "Files created:"
echo "- .env.redis (add to your main .env)"
echo "- redis-connection-info.txt (save securely)"
echo ""
echo "Next steps:"
echo "1. Test connection: redis-cli -h $DROPLET_IP -p 6379 -a '$REDIS_PASSWORD' ping"
echo "2. Configure firewall for your app servers"
echo "3. Update your .env file with REDIS_URL"
echo ""

# Test connection
echo "Testing Redis connection..."
if command -v redis-cli &> /dev/null; then
    redis-cli -h $DROPLET_IP -p 6379 -a "$REDIS_PASSWORD" --no-auth-warning ping
else
    echo "redis-cli not found locally. Test from your app server or install redis-tools."
fi