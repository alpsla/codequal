#!/bin/bash

# Use Existing Infrastructure for Security Tools Testing
# This script leverages your existing DigitalOcean infrastructure

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${MAGENTA}${BOLD}"
cat << 'ASCII'
   ____          _       ___              _ 
  / ___|___   __| | ___ / _ \ _   _  __ _| |
 | |   / _ \ / _` |/ _ \ | | | | | |/ _` | |
 | |__| (_) | (_| |  __/ |_| | |_| | (_| | |
  \____\___/ \__,_|\___|\__\_\\__,_|\__,_|_|
                                             
  Using Existing Infrastructure for Testing
ASCII
echo -e "${NC}"

# Configuration
REDIS_IP="157.230.9.119"
REDIS_URL="redis://$REDIS_IP:6379"

echo -e "${CYAN}🔍 Checking existing infrastructure...${NC}"
echo ""

# Check Kubernetes access
echo -e "${YELLOW}Kubernetes Clusters:${NC}"
doctl kubernetes cluster list --format Name,Status
echo ""

# Check existing pods
echo -e "${YELLOW}Running Pods:${NC}"
kubectl get pods -n codequal-prod --no-headers | head -5
echo ""

# Check Redis connectivity
echo -e "${YELLOW}Redis Server:${NC}"
if nc -zv $REDIS_IP 6379 2>/dev/null; then
    echo -e "${GREEN}✅ Redis is accessible at $REDIS_IP:6379${NC}"
else
    echo -e "${RED}❌ Cannot connect to Redis at $REDIS_IP:6379${NC}"
fi
echo ""

# Options
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo -e "${CYAN}${BOLD}Select Testing Option:${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}1)${NC} 🚀 ${GREEN}Deploy Security Tools Pod${NC}"
echo "   • Create a dedicated pod for security tools"
echo "   • Install all tools in containerized environment"
echo "   • Run tests in isolation"
echo ""
echo -e "${BOLD}2)${NC} 🔧 ${YELLOW}Use Redis Droplet${NC}"
echo "   • Install tools on Redis droplet (has SSH access)"
echo "   • IP: $REDIS_IP"
echo "   • Less resource competition"
echo ""
echo -e "${BOLD}3)${NC} 📦 ${BLUE}Create New Testing Pod${NC}"
echo "   • Deploy new pod in codequal-dev namespace"
echo "   • Fresh environment for testing"
echo "   • Automatic cleanup after tests"
echo ""
echo -e "${BOLD}4)${NC} 🖥️ ${CYAN}Use Local Docker${NC}"
echo "   • Run tests locally with Docker"
echo "   • No cloud resources needed"
echo "   • Faster iteration"
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo -n "Choice [1-4]: "
read -r CHOICE

case $CHOICE in
    1)
        # Deploy Security Tools Pod
        echo -e "\n${GREEN}Deploying Security Tools Pod...${NC}"
        
        # Create deployment manifest
        cat << 'EOF' > /tmp/security-tools-pod.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: codequal-testing
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: security-tools-storage
  namespace: codequal-testing
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: do-block-storage
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: security-tools
  namespace: codequal-testing
spec:
  replicas: 1
  selector:
    matchLabels:
      app: security-tools
  template:
    metadata:
      labels:
        app: security-tools
    spec:
      containers:
      - name: tools
        image: ubuntu:22.04
        command: ["/bin/bash"]
        args: ["-c", "while true; do sleep 30; done;"]
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
        volumeMounts:
        - name: storage
          mountPath: /opt/test-repos
        - name: tools
          mountPath: /opt/tools
      volumes:
      - name: storage
        persistentVolumeClaim:
          claimName: security-tools-storage
      - name: tools
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: security-tools-service
  namespace: codequal-testing
spec:
  selector:
    app: security-tools
  ports:
    - protocol: TCP
      port: 8080
      targetPort: 8080
EOF
        
        echo "Applying Kubernetes manifest..."
        kubectl apply -f /tmp/security-tools-pod.yaml
        
        echo "Waiting for pod to be ready..."
        kubectl wait --for=condition=ready pod -l app=security-tools -n codequal-testing --timeout=120s
        
        POD_NAME=$(kubectl get pods -n codequal-testing -l app=security-tools -o jsonpath='{.items[0].metadata.name}')
        
        echo -e "${GREEN}✅ Pod deployed: $POD_NAME${NC}"
        
        # Copy installation script to pod
        echo "Copying installation scripts to pod..."
        kubectl cp ./install-security-tools.sh codequal-testing/$POD_NAME:/tmp/
        kubectl cp ./create-test-repos.sh codequal-testing/$POD_NAME:/tmp/
        kubectl cp ./run-real-tool-tests.sh codequal-testing/$POD_NAME:/tmp/
        
        # Install tools in pod
        echo "Installing security tools in pod..."
        kubectl exec -n codequal-testing $POD_NAME -- bash /tmp/install-security-tools.sh
        
        # Create test repos
        echo "Creating test repositories..."
        kubectl exec -n codequal-testing $POD_NAME -- bash /tmp/create-test-repos.sh
        
        # Run tests
        echo "Running security tests..."
        kubectl exec -n codequal-testing $POD_NAME -- bash /tmp/run-real-tool-tests.sh
        
        # Copy results back
        echo "Retrieving results..."
        kubectl cp codequal-testing/$POD_NAME:/tmp/tool-test-results ./pod-test-results
        
        echo -e "${GREEN}✅ Testing complete! Results in ./pod-test-results${NC}"
        ;;
        
    2)
        # Use Redis Droplet
        echo -e "\n${YELLOW}Using Redis Droplet for testing...${NC}"
        
        export DROPLET_IP=$REDIS_IP
        export DROPLET_USER=root
        
        echo "Connecting to Redis droplet..."
        
        # Check if we can SSH
        if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@$REDIS_IP "echo 'Connected'" &> /dev/null; then
            echo -e "${GREEN}✅ SSH connection successful${NC}"
            
            # Run deployment script
            ./deploy-with-tracking.sh
        else
            echo -e "${RED}❌ Cannot SSH to Redis droplet${NC}"
            echo "You may need to add your SSH key to the droplet"
            echo ""
            echo "To add SSH key:"
            echo "  doctl compute ssh-key list"
            echo "  doctl compute droplet add-ssh-keys <droplet-id> --ssh-keys <key-id>"
        fi
        ;;
        
    3)
        # Create New Testing Pod
        echo -e "\n${BLUE}Creating new testing pod in codequal-dev...${NC}"
        
        # Create a Job for one-time testing
        cat << 'EOF' > /tmp/security-test-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: security-tools-test-$(date +%s)
  namespace: codequal-dev
spec:
  template:
    spec:
      containers:
      - name: tester
        image: node:18-bullseye
        command: ["/bin/bash"]
        args: 
        - -c
        - |
          # Install dependencies
          apt-get update
          apt-get install -y git build-essential
          
          # Clone the repository
          git clone https://github.com/yourusername/codequal.git /tmp/codequal
          cd /tmp/codequal/packages/agents
          
          # Install Node dependencies
          npm install
          npm run build
          
          # Run tests
          NODE_ENV=production TOOL_MODE=strict npm test src/two-branch/tests/integration/real-tools-integration.test.ts
          
          # Save results
          echo "Test completed at $(date)" > /tmp/test-complete
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
      restartPolicy: Never
  backoffLimit: 1
EOF
        
        kubectl apply -f /tmp/security-test-job.yaml
        
        echo "Job created. Monitoring progress..."
        kubectl wait --for=condition=complete job/security-tools-test-* -n codequal-dev --timeout=600s
        
        echo -e "${GREEN}✅ Testing job completed${NC}"
        ;;
        
    4)
        # Use Local Docker
        echo -e "\n${CYAN}Using Local Docker for testing...${NC}"
        
        # Check Docker
        if ! command -v docker &> /dev/null; then
            echo -e "${RED}❌ Docker not installed${NC}"
            exit 1
        fi
        
        # Create Dockerfile
        cat << 'EOF' > /tmp/Dockerfile.security-tools
FROM ubuntu:22.04

# Install base dependencies
RUN apt-get update && apt-get install -y \
    curl wget git build-essential \
    python3-pip nodejs npm \
    default-jdk php ruby golang-go rustc

# Install security tools
RUN pip3 install bandit safety
RUN npm install -g eslint semgrep
RUN gem install brakeman rubocop

# Copy test scripts
COPY scripts/*.sh /opt/scripts/
COPY src/two-branch/test-results /opt/test-results

WORKDIR /opt

CMD ["/bin/bash"]
EOF
        
        echo "Building Docker image..."
        docker build -t codequal-security-tools -f /tmp/Dockerfile.security-tools .
        
        echo "Running tests in Docker..."
        docker run --rm -v $(pwd):/workspace codequal-security-tools \
            bash -c "cd /workspace && ./scripts/run-real-tool-tests.sh"
        
        echo -e "${GREEN}✅ Docker testing complete${NC}"
        ;;
        
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}Testing Infrastructure Ready!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""

# Update tracking
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SESSION_ID="infra_${TIMESTAMP}"
RESULTS_DIR="../src/two-branch/test-results"

# Create session metadata
mkdir -p "$RESULTS_DIR/sessions/$SESSION_ID"
cat << EOF > "$RESULTS_DIR/sessions/$SESSION_ID/metadata.json"
{
  "sessionId": "$SESSION_ID",
  "timestamp": "$(date -Iseconds)",
  "infrastructure": {
    "type": "existing",
    "redis_ip": "$REDIS_IP",
    "kubernetes": true,
    "method": "$CHOICE"
  },
  "status": "completed"
}
EOF

echo -e "${CYAN}📊 View results:${NC}"
echo "   ./scripts/view-test-results.sh"
echo ""
echo -e "${CYAN}📁 Session tracked:${NC}"
echo "   $RESULTS_DIR/sessions/$SESSION_ID/"