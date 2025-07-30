#!/bin/bash

# Setup Redis on DigitalOcean for CodeQual
# This script provides options for different deployment methods

set -e

echo "CodeQual Redis Setup for DigitalOcean"
echo "===================================="
echo ""
echo "Choose your deployment method:"
echo "1. DigitalOcean Managed Redis (Recommended for Production)"
echo "2. Self-hosted Redis on existing Droplet"
echo "3. Create new Droplet with Redis"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "Setting up DigitalOcean Managed Redis..."
        echo ""
        
        # Check if doctl is installed
        if ! command -v doctl &> /dev/null; then
            echo "Error: doctl CLI is not installed."
            echo "Please install it from: https://docs.digitalocean.com/reference/doctl/how-to/install/"
            exit 1
        fi
        
        # Get configuration
        read -p "Enter Redis cluster name (default: codequal-redis): " REDIS_NAME
        REDIS_NAME=${REDIS_NAME:-codequal-redis}
        
        read -p "Enter region (default: nyc3): " REGION
        REGION=${REGION:-nyc3}
        
        echo ""
        echo "Available Redis sizes:"
        echo "1. db-s-1vcpu-1gb   - $15/month  (Development)"
        echo "2. db-s-1vcpu-2gb   - $25/month  (Small Production)"
        echo "3. db-s-2vcpu-4gb   - $60/month  (Standard Production)"
        echo "4. db-s-4vcpu-8gb   - $120/month (High Performance)"
        echo ""
        read -p "Choose size (1-4): " size_choice
        
        case $size_choice in
            1) SIZE="db-s-1vcpu-1gb" ;;
            2) SIZE="db-s-1vcpu-2gb" ;;
            3) SIZE="db-s-2vcpu-4gb" ;;
            4) SIZE="db-s-4vcpu-8gb" ;;
            *) SIZE="db-s-1vcpu-2gb" ;;
        esac
        
        echo ""
        echo "Creating Managed Redis database..."
        doctl databases create $REDIS_NAME \
            --engine redis \
            --region $REGION \
            --size $SIZE \
            --version 7
        
        echo ""
        echo "Waiting for database to be ready..."
        sleep 30
        
        # Get database ID
        DB_ID=$(doctl databases list --format ID,Name --no-header | grep $REDIS_NAME | awk '{print $1}')
        
        echo ""
        echo "Database created with ID: $DB_ID"
        echo ""
        echo "Getting connection details..."
        
        # Get connection info
        doctl databases connection $DB_ID
        
        # Create .env.redis file
        echo ""
        echo "Creating .env.redis file..."
        CONNECTION_STRING=$(doctl databases connection $DB_ID --format URI --no-header)
        
        cat > .env.redis << EOF
# DigitalOcean Managed Redis Configuration
REDIS_URL=$CONNECTION_STRING
CACHE_TTL=1800
CACHE_MAX_SIZE=1000

# Add these to your main .env file
EOF
        
        echo ""
        echo "✅ Managed Redis setup complete!"
        echo ""
        echo "Next steps:"
        echo "1. Add the Redis URL from .env.redis to your main .env file"
        echo "2. Configure trusted sources in DigitalOcean dashboard"
        echo "3. Test the connection with the test script"
        ;;
        
    2)
        echo ""
        echo "Setting up Redis on existing Droplet..."
        echo ""
        
        read -p "Enter your Droplet IP address: " DROPLET_IP
        read -p "Enter SSH user (default: root): " SSH_USER
        SSH_USER=${SSH_USER:-root}
        
        # Generate secure password
        REDIS_PASSWORD=$(openssl rand -base64 32)
        echo "Generated Redis password: $REDIS_PASSWORD"
        echo ""
        
        # Create setup script
        cat > /tmp/setup-redis.sh << 'EOF'
#!/bin/bash
set -e

echo "Updating system packages..."
apt update && apt upgrade -y

echo "Installing Redis..."
apt install redis-server -y

echo "Backing up original Redis config..."
cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

echo "Configuring Redis..."
cat > /etc/redis/redis.conf << 'REDIS_CONFIG'
# Basic Configuration
bind 0.0.0.0 ::1
protected-mode yes
port 6379
tcp-backlog 511
timeout 0
tcp-keepalive 300

# Security
requirepass REDIS_PASSWORD_PLACEHOLDER

# Memory Management
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec

# Logging
loglevel warning
logfile /var/log/redis/redis-server.log

# Performance
tcp-keepalive 300
REDIS_CONFIG

# Replace password placeholder
sed -i "s/REDIS_PASSWORD_PLACEHOLDER/$1/" /etc/redis/redis.conf

echo "Setting up log directory..."
mkdir -p /var/log/redis
chown redis:redis /var/log/redis

echo "Restarting Redis..."
systemctl restart redis-server
systemctl enable redis-server

echo "Configuring firewall..."
ufw allow 22/tcp
ufw allow 6379/tcp
echo "y" | ufw enable

echo "Testing Redis..."
redis-cli -a "$1" ping

echo "Redis setup complete!"
EOF
        
        # Copy and run setup script
        echo "Copying setup script to droplet..."
        scp /tmp/setup-redis.sh $SSH_USER@$DROPLET_IP:/tmp/
        
        echo "Running setup script..."
        ssh $SSH_USER@$DROPLET_IP "bash /tmp/setup-redis.sh $REDIS_PASSWORD"
        
        # Create .env.redis file
        cat > .env.redis << EOF
# Self-hosted Redis Configuration
REDIS_URL=redis://:$REDIS_PASSWORD@$DROPLET_IP:6379
CACHE_TTL=1800
CACHE_MAX_SIZE=1000

# Security Note: Configure firewall to only allow your app servers
EOF
        
        echo ""
        echo "✅ Redis setup complete on droplet!"
        echo ""
        echo "Next steps:"
        echo "1. Add the Redis URL from .env.redis to your main .env file"
        echo "2. Configure firewall to restrict access to your app servers only"
        echo "3. Test the connection with the test script"
        ;;
        
    3)
        echo ""
        echo "Creating new Droplet with Redis..."
        echo ""
        
        # Implementation for creating new droplet
        echo "This option requires doctl CLI."
        echo "Would create a new droplet and install Redis."
        echo "For now, please use option 1 or 2."
        ;;
        
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

# Create test script
cat > test-redis-connection.js << 'EOF'
const Redis = require('ioredis');

async function testRedis() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        console.error('REDIS_URL not set in environment');
        process.exit(1);
    }
    
    console.log('Connecting to Redis...');
    const redis = new Redis(redisUrl);
    
    try {
        // Test basic operations
        console.log('Testing SET operation...');
        await redis.set('test:key', 'Hello CodeQual!', 'EX', 60);
        
        console.log('Testing GET operation...');
        const value = await redis.get('test:key');
        console.log('Retrieved value:', value);
        
        console.log('Testing TTL...');
        const ttl = await redis.ttl('test:key');
        console.log('TTL remaining:', ttl, 'seconds');
        
        // Test cache-like operations
        console.log('\nTesting cache operations...');
        const mockReport = {
            prId: 'test-123',
            timestamp: new Date().toISOString(),
            data: 'Sample DeepWiki report'
        };
        
        await redis.setex('deepwiki:report:test-123', 1800, JSON.stringify(mockReport));
        const cached = await redis.get('deepwiki:report:test-123');
        console.log('Cached report:', JSON.parse(cached));
        
        // Get Redis info
        console.log('\nRedis server info:');
        const info = await redis.info('server');
        const version = info.match(/redis_version:(.+)/);
        console.log('Redis version:', version ? version[1] : 'unknown');
        
        console.log('\n✅ All tests passed! Redis is working correctly.');
        
    } catch (error) {
        console.error('❌ Redis test failed:', error.message);
    } finally {
        redis.disconnect();
    }
}

// Load .env.redis if it exists
require('dotenv').config({ path: '.env.redis' });
testRedis();
EOF

echo ""
echo "Test script created: test-redis-connection.js"
echo "Run it with: node test-redis-connection.js"
echo ""
echo "Happy caching! 🚀"