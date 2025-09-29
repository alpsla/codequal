#!/bin/bash

# Script to deploy and run the test on Oracle Cloud

echo "🚀 Deploying Test to Oracle Cloud A1.Flex"
echo "=========================================="
echo ""

# Oracle instance details
ORACLE_HOST="129.213.49.128"
ORACLE_USER="opc"
SSH_KEY="/Users/alpinro/Code\ Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key"

# Check SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found at: $SSH_KEY"
    echo "Please update the SSH_KEY path in this script"
    exit 1
fi

echo "📤 Copying test script to Oracle instance..."
scp -i "$SSH_KEY" test-oracle-real-pmd.sh "$ORACLE_USER@$ORACLE_HOST:/tmp/"

echo ""
echo "🔧 Connecting to Oracle and running test..."
echo ""

ssh -i "$SSH_KEY" "$ORACLE_USER@$ORACLE_HOST" << 'REMOTE_SCRIPT'
#!/bin/bash

echo "Connected to Oracle A1.Flex Instance"
echo "====================================="
echo "CPU: $(nproc) cores"
echo "Memory: $(free -h | grep Mem | awk '{print $2}')"
echo ""

# Make script executable
chmod +x /tmp/test-oracle-real-pmd.sh

# Run the test
cd /tmp
./test-oracle-real-pmd.sh

REMOTE_SCRIPT

echo ""
echo "✅ Test deployment complete!"
echo ""
echo "To monitor the test in real-time, run:"
echo "ssh -i $SSH_KEY $ORACLE_USER@$ORACLE_HOST 'tail -f /tmp/pmd-test.log'"