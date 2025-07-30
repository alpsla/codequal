#!/bin/bash

# Create and configure a Redis droplet on DigitalOcean
set -e

echo "==================================="
echo "Redis Droplet Setup for DigitalOcean"
echo "==================================="
echo ""

# Check if doctl is authenticated
if ! doctl auth list | grep -q "current"; then
    echo "Error: doctl is not authenticated. Run 'doctl auth init' first."
    exit 1
fi

# Configuration variables
DROPLET_NAME="codequal-redis"
REGION="nyc3"
SIZE="s-2vcpu-2gb"  # $18/month - good for Redis
IMAGE="ubuntu-22-04-x64"
TAG="redis"

# Get user input
echo "Current configuration:"
echo "  Name: $DROPLET_NAME"
echo "  Region: $REGION"
echo "  Size: $SIZE ($18/month)"
echo "  Image: $IMAGE"
echo ""
read -p "Do you want to modify these settings? (y/N): " modify

if [[ $modify == "y" || $modify == "Y" ]]; then
    read -p "Enter droplet name (default: $DROPLET_NAME): " input_name
    DROPLET_NAME=${input_name:-$DROPLET_NAME}
    
    echo "Available regions: nyc1, nyc3, sfo3, ams3, sgp1, lon1, fra1, tor1, blr1"
    read -p "Enter region (default: $REGION): " input_region
    REGION=${input_region:-$REGION}
    
    echo "Available sizes:"
    echo "  s-1vcpu-1gb  - $6/month"
    echo "  s-2vcpu-2gb  - $18/month (recommended)"
    echo "  s-2vcpu-4gb  - $24/month"
    echo "  s-4vcpu-8gb  - $48/month"
    read -p "Enter size (default: $SIZE): " input_size
    SIZE=${input_size:-$SIZE}
fi

# Generate secure Redis password
REDIS_PASSWORD=$(openssl rand -base64 32)
echo ""
echo "Generated Redis password: $REDIS_PASSWORD"
echo "(Save this password - you'll need it to connect!)"
echo ""

# Create cloud-init script for Redis setup
cat > /tmp/redis-cloud-init.yaml << EOF
#cloud-config
package_update: true
package_upgrade: true

packages:
  - redis-server
  - ufw
  - htop
  - net-tools

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
      
      # Memory
      maxmemory 1gb
      maxmemory-policy allkeys-lru
      
      # Persistence
      save 900 1
      save 300 10
      save 60 10000
      appendonly yes
      appendfsync everysec
      
      # Logging
      loglevel notice
      logfile /var/log/redis/redis-server.log
      syslog-enabled yes
      
      # Performance
      databases 16
      
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

runcmd:
  # Create Redis directories
  - mkdir -p /var/log/redis
  - chown redis:redis /var/log/redis
  
  # Enable and start Redis tuning
  - systemctl enable redis-tuning.service
  - systemctl start redis-tuning.service
  
  # Configure firewall
  - ufw allow 22/tcp
  - ufw allow 6379/tcp
  - ufw --force enable
  
  # Restart Redis with new config
  - systemctl restart redis-server
  - systemctl enable redis-server
  
  # Create monitoring script
  - |
    cat > /usr/local/bin/redis-monitor.sh << 'SCRIPT'
    #!/bin/bash
    echo "Redis Status:"
    systemctl status redis-server --no-pager | head -n 5
    echo ""
    echo "Memory Info:"
    redis-cli -a "$REDIS_PASSWORD" INFO memory | grep used_memory_human
    echo ""
    echo "Connected Clients:"
    redis-cli -a "$REDIS_PASSWORD" INFO clients | grep connected_clients
    SCRIPT
  - chmod +x /usr/local/bin/redis-monitor.sh
  
  # Test Redis
  - redis-cli -a "$REDIS_PASSWORD" ping

final_message: "Redis server is ready! Password: $REDIS_PASSWORD"
EOF

# Get SSH key
echo "Fetching your SSH keys..."
SSH_KEYS=$(doctl compute ssh-key list --format ID --no-header | tr '\n' ',' | sed 's/,$//')

if [ -z "$SSH_KEYS" ]; then
    echo "Warning: No SSH keys found. You'll need to use the web console to access the droplet."
    read -p "Continue without SSH keys? (y/N): " continue_no_ssh
    if [[ $continue_no_ssh != "y" && $continue_no_ssh != "Y" ]]; then
        echo "Please add an SSH key first: doctl compute ssh-key create"
        exit 1
    fi
fi

# Create the droplet
echo ""
echo "Creating droplet..."
echo ""

DROPLET_CREATE_CMD="doctl compute droplet create $DROPLET_NAME \
    --size $SIZE \
    --image $IMAGE \
    --region $REGION \
    --tag-names $TAG \
    --user-data-file /tmp/redis-cloud-init.yaml \
    --wait"

if [ -n "$SSH_KEYS" ]; then
    DROPLET_CREATE_CMD="$DROPLET_CREATE_CMD --ssh-keys $SSH_KEYS"
fi

eval $DROPLET_CREATE_CMD

# Get droplet info
echo ""
echo "Getting droplet information..."
DROPLET_ID=$(doctl compute droplet list --format ID,Name --no-header | grep $DROPLET_NAME | awk '{print $1}')
DROPLET_IP=$(doctl compute droplet get $DROPLET_ID --format PublicIPv4 --no-header)

echo ""
echo "==================================="
echo "Redis Droplet Created Successfully!"
echo "==================================="
echo ""
echo "Droplet Name: $DROPLET_NAME"
echo "Droplet ID: $DROPLET_ID"
echo "IP Address: $DROPLET_IP"
echo "Redis Port: 6379"
echo "Redis Password: $REDIS_PASSWORD"
echo ""
echo "Connection string for your .env:"
echo "REDIS_URL=redis://:$REDIS_PASSWORD@$DROPLET_IP:6379"
echo ""

# Create connection info file
cat > redis-connection-info.txt << EOF
Redis Droplet Connection Information
====================================
Created: $(date)

Droplet Name: $DROPLET_NAME
Droplet ID: $DROPLET_ID
IP Address: $DROPLET_IP
Redis Port: 6379
Redis Password: $REDIS_PASSWORD

Connection String:
REDIS_URL=redis://:$REDIS_PASSWORD@$DROPLET_IP:6379

SSH Access:
ssh root@$DROPLET_IP

Test Redis Connection:
redis-cli -h $DROPLET_IP -p 6379 -a '$REDIS_PASSWORD' ping

Monitor Redis:
ssh root@$DROPLET_IP 'redis-monitor.sh'
EOF

echo "Connection info saved to: redis-connection-info.txt"
echo ""
echo "⚠️  IMPORTANT: Configure firewall to restrict access!"
echo "Run this command to allow only your app servers:"
echo "ssh root@$DROPLET_IP 'ufw allow from YOUR_APP_SERVER_IP to any port 6379'"
echo ""
echo "The droplet is being configured. Wait 2-3 minutes before connecting."