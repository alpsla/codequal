#!/bin/bash

# DeepWiki Environment Setup Script
# This script automates the setup and connection to DeepWiki pod for testing
# Created: 2025-08-02

set -e

NAMESPACE="codequal-dev"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../../../.." && pwd)"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if kubectl is available
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    print_success "kubectl is available"
}

# Function to check kubernetes connection
check_k8s_connection() {
    print_status "Checking Kubernetes cluster connection..."
    if kubectl cluster-info &> /dev/null; then
        print_success "Connected to Kubernetes cluster"
        kubectl cluster-info | head -1
    else
        print_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
}

# Function to check if namespace exists
check_namespace() {
    print_status "Checking namespace $NAMESPACE..."
    if kubectl get namespace $NAMESPACE &> /dev/null; then
        print_success "Namespace $NAMESPACE exists"
    else
        print_error "Namespace $NAMESPACE does not exist"
        print_status "Creating namespace..."
        kubectl create namespace $NAMESPACE
        print_success "Namespace created"
    fi
}

# Function to get DeepWiki pod name
get_deepwiki_pod() {
    print_status "Finding DeepWiki pod..."
    POD_NAME=$(kubectl get pods -n $NAMESPACE -l app=deepwiki -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [ -z "$POD_NAME" ]; then
        print_error "No DeepWiki pod found in namespace $NAMESPACE"
        return 1
    else
        print_success "Found DeepWiki pod: $POD_NAME"
        echo "$POD_NAME"
        return 0
    fi
}

# Function to check if DeepWiki deployment exists
check_deepwiki_deployment() {
    print_status "Checking DeepWiki deployment..."
    if kubectl get deployment deepwiki -n $NAMESPACE &> /dev/null; then
        print_success "DeepWiki deployment exists"
        
        # Check deployment status
        READY=$(kubectl get deployment deepwiki -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')
        DESIRED=$(kubectl get deployment deepwiki -n $NAMESPACE -o jsonpath='{.spec.replicas}')
        
        if [ "$READY" == "$DESIRED" ] && [ "$READY" -gt 0 ]; then
            print_success "DeepWiki deployment is ready ($READY/$DESIRED replicas)"
            return 0
        else
            print_warning "DeepWiki deployment is not ready ($READY/$DESIRED replicas)"
            return 1
        fi
    else
        print_error "DeepWiki deployment does not exist"
        return 1
    fi
}

# Function to deploy DeepWiki if not exists
deploy_deepwiki() {
    print_status "Deploying DeepWiki..."
    
    # Check if deployment yaml exists
    DEPLOYMENT_FILE="$PROJECT_ROOT/kubernetes/deepwiki-deployment.yaml"
    if [ ! -f "$DEPLOYMENT_FILE" ]; then
        print_warning "DeepWiki deployment file not found, creating minimal deployment..."
        
        cat > "$DEPLOYMENT_FILE" <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deepwiki
  namespace: $NAMESPACE
spec:
  replicas: 1
  selector:
    matchLabels:
      app: deepwiki
  template:
    metadata:
      labels:
        app: deepwiki
    spec:
      containers:
      - name: deepwiki
        image: deepwiki:latest
        ports:
        - containerPort: 8001
        - containerPort: 3000
        env:
        - name: OPENROUTER_API_KEY
          valueFrom:
            secretKeyRef:
              name: deepwiki-api-keys
              key: OPENROUTER_API_KEY
              optional: true
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
EOF
    fi
    
    # Apply deployment
    kubectl apply -f "$DEPLOYMENT_FILE"
    
    # Apply services
    if [ -f "$PROJECT_ROOT/kubernetes/deepwiki-services.yaml" ]; then
        kubectl apply -f "$PROJECT_ROOT/kubernetes/deepwiki-services.yaml"
    fi
    
    # Wait for deployment to be ready
    print_status "Waiting for DeepWiki deployment to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/deepwiki -n $NAMESPACE
    
    print_success "DeepWiki deployed successfully"
}

# Function to setup port forwarding
setup_port_forward() {
    local pod_name=$1
    
    print_status "Setting up port forwarding..."
    
    # Kill any existing port forwards
    pkill -f "kubectl port-forward.*deepwiki" || true
    sleep 2
    
    # Start port forwarding for API
    print_status "Port forwarding API (8001:8001)..."
    kubectl port-forward -n $NAMESPACE pod/$pod_name 8001:8001 &
    API_PF_PID=$!
    
    # Start port forwarding for frontend
    print_status "Port forwarding Frontend (3000:3000)..."
    kubectl port-forward -n $NAMESPACE pod/$pod_name 3000:3000 &
    FRONTEND_PF_PID=$!
    
    # Wait for port forwards to establish
    sleep 5
    
    # Test connections
    if curl -s http://localhost:8001/health &> /dev/null; then
        print_success "API port forward is working"
    else
        print_warning "API port forward may not be working correctly"
    fi
    
    echo ""
    print_success "Port forwarding established:"
    echo "  - API: http://localhost:8001"
    echo "  - Frontend: http://localhost:3000"
    echo ""
    echo "Port forward PIDs: API=$API_PF_PID, Frontend=$FRONTEND_PF_PID"
    
    # Save PIDs to a file for later cleanup
    echo "$API_PF_PID" > /tmp/deepwiki-api-pf.pid
    echo "$FRONTEND_PF_PID" > /tmp/deepwiki-frontend-pf.pid
}

# Function to test DeepWiki connection
test_deepwiki_connection() {
    print_status "Testing DeepWiki connection..."
    
    # Test API endpoint
    if curl -s http://localhost:8001/api/v1/health | grep -q "ok"; then
        print_success "DeepWiki API is accessible"
    else
        print_warning "DeepWiki API health check failed"
        
        # Try to get more info
        print_status "Checking API response..."
        curl -v http://localhost:8001/api/v1/health 2>&1 | grep -E "(HTTP|Connected)"
    fi
    
    # Test with a simple analysis request
    print_status "Testing analysis endpoint..."
    RESPONSE=$(curl -s -X POST http://localhost:8001/api/v1/analyze \
        -H "Content-Type: application/json" \
        -d '{
            "repositoryUrl": "https://github.com/facebook/react",
            "branch": "main",
            "maxDepth": 1
        }' 2>&1 || echo "Request failed")
    
    if echo "$RESPONSE" | grep -q "analysis_id\|task_id"; then
        print_success "DeepWiki analysis endpoint is working"
        echo "Response: $RESPONSE" | head -50
    else
        print_warning "DeepWiki analysis endpoint test failed"
        echo "Response: $RESPONSE" | head -50
    fi
}

# Function to show environment variables needed
show_env_vars() {
    print_status "Environment variables for local development:"
    echo ""
    echo "# Add these to your .env file or export them:"
    echo "export DEEPWIKI_API_URL=http://localhost:8001"
    echo "export DEEPWIKI_NAMESPACE=$NAMESPACE"
    
    # Get pod name for direct exec commands
    POD_NAME=$(get_deepwiki_pod 2>/dev/null || echo "deepwiki-pod")
    echo "export DEEPWIKI_POD_NAME=$POD_NAME"
    
    echo ""
    echo "# For direct kubectl commands:"
    echo "export KUBECONFIG=$KUBECONFIG"
    echo ""
    
    # Create env file
    ENV_FILE="$PROJECT_ROOT/.env.deepwiki"
    cat > "$ENV_FILE" <<EOF
# DeepWiki Environment Variables
# Generated by setup-deepwiki-environment.sh on $(date)

DEEPWIKI_API_URL=http://localhost:8001
DEEPWIKI_NAMESPACE=$NAMESPACE
DEEPWIKI_POD_NAME=$POD_NAME
USE_DEEPWIKI_MOCK=false

# Optional: Add your API keys here
# OPENROUTER_API_KEY=your-key-here
EOF
    
    print_success "Environment variables saved to: $ENV_FILE"
    echo "Source it with: source $ENV_FILE"
}

# Function to create helper scripts
create_helper_scripts() {
    print_status "Creating helper scripts..."
    
    # Create quick connect script
    cat > "$PROJECT_ROOT/scripts/deepwiki-connect.sh" <<'EOF'
#!/bin/bash
# Quick connect to DeepWiki

NAMESPACE="codequal-dev"
POD_NAME=$(kubectl get pods -n $NAMESPACE -l app=deepwiki -o jsonpath='{.items[0].metadata.name}')

echo "Connecting to DeepWiki pod: $POD_NAME"
echo ""
echo "Starting port forwards..."

# Kill existing port forwards
pkill -f "kubectl port-forward.*deepwiki" || true
sleep 2

# Start port forwarding
kubectl port-forward -n $NAMESPACE pod/$POD_NAME 8001:8001 &
kubectl port-forward -n $NAMESPACE pod/$POD_NAME 3000:3000 &

echo ""
echo "DeepWiki is now accessible at:"
echo "  - API: http://localhost:8001"
echo "  - Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop port forwarding"

# Wait for user to stop
wait
EOF
    chmod +x "$PROJECT_ROOT/scripts/deepwiki-connect.sh"
    
    # Create test script
    cat > "$PROJECT_ROOT/scripts/test-deepwiki-analysis.sh" <<'EOF'
#!/bin/bash
# Test DeepWiki analysis

REPO_URL=${1:-"https://github.com/facebook/react"}
BRANCH=${2:-"main"}

echo "Testing DeepWiki analysis..."
echo "Repository: $REPO_URL"
echo "Branch: $BRANCH"
echo ""

curl -X POST http://localhost:8001/api/v1/analyze \
    -H "Content-Type: application/json" \
    -d "{
        \"repositoryUrl\": \"$REPO_URL\",
        \"branch\": \"$BRANCH\",
        \"model\": \"anthropic/claude-3-opus\",
        \"provider\": \"openrouter\"
    }" | jq .
EOF
    chmod +x "$PROJECT_ROOT/scripts/test-deepwiki-analysis.sh"
    
    print_success "Helper scripts created:"
    echo "  - $PROJECT_ROOT/scripts/deepwiki-connect.sh"
    echo "  - $PROJECT_ROOT/scripts/test-deepwiki-analysis.sh"
}

# Function to cleanup port forwards
cleanup_port_forwards() {
    print_status "Cleaning up port forwards..."
    
    if [ -f /tmp/deepwiki-api-pf.pid ]; then
        kill $(cat /tmp/deepwiki-api-pf.pid) 2>/dev/null || true
        rm /tmp/deepwiki-api-pf.pid
    fi
    
    if [ -f /tmp/deepwiki-frontend-pf.pid ]; then
        kill $(cat /tmp/deepwiki-frontend-pf.pid) 2>/dev/null || true
        rm /tmp/deepwiki-frontend-pf.pid
    fi
    
    # Kill any remaining port forwards
    pkill -f "kubectl port-forward.*deepwiki" || true
    
    print_success "Port forwards cleaned up"
}

# Main execution
main() {
    echo "============================================"
    echo "DeepWiki Environment Setup"
    echo "============================================"
    echo ""
    
    # Check prerequisites
    check_kubectl
    check_k8s_connection
    check_namespace
    
    # Check DeepWiki deployment
    if ! check_deepwiki_deployment; then
        print_warning "DeepWiki is not deployed or not ready"
        echo ""
        read -p "Do you want to deploy DeepWiki? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            deploy_deepwiki
        else
            print_error "Cannot proceed without DeepWiki deployment"
            exit 1
        fi
    fi
    
    # Get pod name
    POD_NAME=$(get_deepwiki_pod)
    if [ $? -ne 0 ]; then
        print_error "Failed to find DeepWiki pod"
        exit 1
    fi
    
    # Setup port forwarding
    setup_port_forward "$POD_NAME"
    
    # Test connection
    test_deepwiki_connection
    
    # Show environment variables
    echo ""
    show_env_vars
    
    # Create helper scripts
    create_helper_scripts
    
    echo ""
    echo "============================================"
    print_success "DeepWiki environment setup complete!"
    echo "============================================"
    echo ""
    echo "Next steps:"
    echo "1. Source the environment file: source $PROJECT_ROOT/.env.deepwiki"
    echo "2. Run tests: cd $PROJECT_ROOT/packages/agents && npm test"
    echo "3. Or use the test script: $PROJECT_ROOT/scripts/test-deepwiki-analysis.sh"
    echo ""
    echo "To reconnect later, run: $PROJECT_ROOT/scripts/deepwiki-connect.sh"
    echo ""
    echo "Port forwarding is running in the background."
    echo "To stop it, run: $SCRIPT_DIR/setup-deepwiki-environment.sh --cleanup"
}

# Handle cleanup option
if [ "$1" == "--cleanup" ]; then
    cleanup_port_forwards
    exit 0
fi

# Set trap to cleanup on exit
trap cleanup_port_forwards EXIT

# Run main
main

# Keep script running to maintain port forwards
echo ""
echo "Press Ctrl+C to stop port forwarding and exit"
read -r -d '' _ </dev/tty