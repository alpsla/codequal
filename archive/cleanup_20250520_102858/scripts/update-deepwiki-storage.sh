#!/bin/bash

# Script to update the DeepWiki deployment to use the larger storage volume
# and configure appropriate resource limits

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====== DeepWiki Storage and Resources Update ======${NC}"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
  echo -e "${RED}Error: kubectl is not installed or not in the PATH${NC}"
  exit 1
fi

# Step 1: Check current deployment status
echo -e "${BLUE}Step 1: Checking current deployment status...${NC}"
kubectl get deployment -n codequal-dev deepwiki-fixed

# Step 2: Apply the updated deployment configuration
echo -e "${BLUE}Step 2: Applying updated deployment configuration...${NC}"
kubectl apply -f "$(dirname "$0")/update-deepwiki-deployment.yaml"

# Step 3: Wait for the deployment to roll out
echo -e "${BLUE}Step 3: Waiting for deployment to roll out...${NC}"
kubectl rollout status deployment/deepwiki-fixed -n codequal-dev --timeout=300s

# Step 4: Verify the new pod is using the correct PVC
echo -e "${BLUE}Step 4: Verifying pod configuration...${NC}"
POD=$(kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}')
echo -e "${GREEN}New pod: ${POD}${NC}"

# Check the pod's volume mounts
echo -e "${BLUE}Checking volume mounts...${NC}"
kubectl describe pod -n codequal-dev $POD | grep -A 5 "Volumes:"

# Check the pod's resource limits
echo -e "${BLUE}Checking resource limits...${NC}"
kubectl describe pod -n codequal-dev $POD | grep -A 10 "Limits:"

# Step 5: Restart port forwarding
echo -e "${BLUE}Step 5: Restarting port forwarding...${NC}"
# Kill any existing port-forwarding process
pkill -f "kubectl port-forward.*8001:8001" || true

# Set up port forwarding in the background
kubectl port-forward -n codequal-dev svc/deepwiki-fixed 8001:8001 &
PF_PID=$!

# Wait for port forwarding to be ready
echo -e "${YELLOW}Waiting for port forwarding to be ready...${NC}"
sleep 5

# Verify port forwarding is working
if ! ps -p $PF_PID > /dev/null; then
  echo -e "${RED}Error: Port forwarding failed to start${NC}"
  exit 1
fi
echo -e "${GREEN}Port forwarding started (PID: $PF_PID)${NC}"

# Step 6: Create disk space cleanup script
echo -e "${BLUE}Step 6: Creating disk space cleanup script...${NC}"

cat > cleanup_repositories.sh << 'EOF'
#!/bin/bash

# Script to clean up older repositories in the DeepWiki pod
# to manage disk space

# Set variables
NAMESPACE="codequal-dev"
POD_LABEL="app=deepwiki-fixed"
REPO_DIR="/root/.adalflow/repos"
DAYS_OLD=7  # Repositories older than this will be removed

# Get the pod name
POD=$(kubectl get pods -n $NAMESPACE -l $POD_LABEL -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD" ]; then
  echo "Error: DeepWiki pod not found"
  exit 1
fi

echo "Cleaning up repositories older than $DAYS_OLD days in pod $POD..."

# Execute cleanup command in the pod
kubectl exec -n $NAMESPACE $POD -- bash -c "find $REPO_DIR -mindepth 1 -maxdepth 1 -type d -mtime +$DAYS_OLD -exec echo 'Removing {}' \; -exec rm -rf {} \;"

# Check disk usage after cleanup
echo "Current disk usage:"
kubectl exec -n $NAMESPACE $POD -- df -h $REPO_DIR
EOF

chmod +x cleanup_repositories.sh
echo -e "${GREEN}Created cleanup script: cleanup_repositories.sh${NC}"

# Step 7: Test API connection
echo -e "${BLUE}Step 7: Testing connection to DeepWiki API...${NC}"
if curl -s http://localhost:8001/ --connect-timeout 10 > /dev/null; then
  echo -e "${GREEN}✅ DeepWiki API is accessible${NC}"
else
  echo -e "${RED}❌ Cannot connect to DeepWiki API${NC}"
  echo -e "${YELLOW}Recommendation: Check DeepWiki pod logs for errors:${NC}"
  echo -e "${YELLOW}kubectl logs -n codequal-dev $POD${NC}"
  exit 1
fi

# Final message
echo -e "${GREEN}====== DeepWiki Storage and Resources Update Complete ======${NC}"
echo -e "${GREEN}DeepWiki is now configured to use the larger 30Gi storage volume${NC}"
echo -e "${GREEN}Resource limits have been set to 8Gi memory and 2 CPU cores${NC}"
echo -e "${YELLOW}To clean up old repositories and free up disk space, run:${NC}"
echo -e "${YELLOW}./cleanup_repositories.sh${NC}"