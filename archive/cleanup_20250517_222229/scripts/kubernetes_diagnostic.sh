#!/bin/bash
# Diagnostic script for DeepWiki Kubernetes investigation
# Created: May 15, 2025

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== DeepWiki Kubernetes Investigation Diagnostic ===${NC}"

# Check if kubectl is installed
echo -e "\n${GREEN}Checking if kubectl is installed...${NC}"
if command -v kubectl &> /dev/null; then
    kubectl_version=$(kubectl version --client -o yaml 2>/dev/null || kubectl version --client --short 2>/dev/null || echo "Version retrieval failed")
    echo -e "kubectl is installed: ${YELLOW}${kubectl_version}${NC}"
else
    echo -e "${RED}kubectl is not installed or not in PATH${NC}"
    echo "Please install kubectl and try again"
    exit 1
fi

# Check if kubectl can access the cluster
echo -e "\n${GREEN}Checking if kubectl can access the Kubernetes cluster...${NC}"
if kubectl cluster-info &> /dev/null; then
    cluster_info=$(kubectl cluster-info | head -n 1)
    echo -e "Cluster access: ${GREEN}YES${NC}"
    echo -e "Cluster info: ${YELLOW}${cluster_info}${NC}"
else
    echo -e "Cluster access: ${RED}NO${NC}"
    echo "Unable to access the Kubernetes cluster. Check your kubeconfig."
    echo "Error details:"
    kubectl cluster-info 2>&1 | sed 's/^/    /'
    exit 1
fi

# List available namespaces
echo -e "\n${GREEN}Listing available namespaces...${NC}"
kubectl get namespaces

# Find DeepWiki pods in all namespaces
echo -e "\n${GREEN}Searching for DeepWiki pods in all namespaces...${NC}"
deepwiki_pods=$(kubectl get pods -A | grep -i deepwiki || echo "No DeepWiki pods found")

if [[ "$deepwiki_pods" == "No DeepWiki pods found" ]]; then
    echo -e "${RED}No DeepWiki pods found in any namespace${NC}"
    
    # Check for any pods with "wiki" or "deep" in the name
    echo -e "\n${GREEN}Searching for pods with 'wiki' or 'deep' in the name...${NC}"
    wiki_pods=$(kubectl get pods -A | grep -iE 'wiki|deep' || echo "No matching pods found")
    
    if [[ "$wiki_pods" == "No matching pods found" ]]; then
        echo -e "${RED}No pods with 'wiki' or 'deep' in the name found${NC}"
    else
        echo -e "${YELLOW}Found possibly related pods:${NC}"
        echo "$wiki_pods"
    fi
    
    # List all pods in all namespaces
    echo -e "\n${GREEN}Listing all pods in all namespaces...${NC}"
    kubectl get pods -A
else
    echo -e "${GREEN}DeepWiki pods found:${NC}"
    echo "$deepwiki_pods"
    
    # Get the first pod details
    namespace=$(echo "$deepwiki_pods" | head -1 | awk '{print $1}')
    pod_name=$(echo "$deepwiki_pods" | head -1 | awk '{print $2}')
    
    echo -e "\n${GREEN}Getting details for pod ${YELLOW}$pod_name${GREEN} in namespace ${YELLOW}$namespace${NC}"
    kubectl describe pod "$pod_name" -n "$namespace"
    
    # List containers in the pod
    echo -e "\n${GREEN}Listing containers in the pod...${NC}"
    containers=$(kubectl get pod "$pod_name" -n "$namespace" -o jsonpath='{.spec.containers[*].name}')
    echo -e "Containers: ${YELLOW}$containers${NC}"
    
    # Try to run a simple command in each container
    for container in $containers; do
        echo -e "\n${GREEN}Testing command execution in container ${YELLOW}$container${NC}"
        echo -e "Running: ${YELLOW}kubectl exec $pod_name -n $namespace -c $container -- ls -la / 2>&1${NC}"
        kubectl exec "$pod_name" -n "$namespace" -c "$container" -- ls -la / 2>&1 || echo -e "${RED}Command execution failed${NC}"
    done
fi

echo -e "\n${BLUE}=== Diagnostic Complete ===${NC}"
echo "Use this information to correctly run the explore_deepwiki_k8s.sh script"
echo "Example command:"
echo -e "${YELLOW}./explore_deepwiki_k8s.sh${NC}"

# Make this script executable
chmod +x /Users/alpinro/Code\ Prjects/codequal/scripts/kubernetes_diagnostic.sh
