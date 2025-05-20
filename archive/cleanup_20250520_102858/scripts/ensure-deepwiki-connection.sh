#!/bin/bash

# Script to ensure DeepWiki connection is active
# This script:
# 1. Checks if port forwarding is running
# 2. If not, restarts it
# 3. Tests the connection
# 4. Returns success/failure status

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if port forwarding is active
check_port_forwarding() {
  echo -e "${BLUE}Checking if DeepWiki port forwarding is active...${NC}"
  if pgrep -f "kubectl port-forward.*8001:8001" > /dev/null; then
    echo -e "${GREEN}✅ Port forwarding is active${NC}"
    return 0
  else
    echo -e "${YELLOW}⚠️ Port forwarding is not active${NC}"
    return 1
  fi
}

# Function to start port forwarding
start_port_forwarding() {
  echo -e "${BLUE}Starting port forwarding for DeepWiki...${NC}"
  # Kill any existing port-forwarding process first
  pkill -f "kubectl port-forward.*8001:8001" 2>/dev/null || true
  
  # Start port forwarding in the background
  kubectl port-forward -n codequal-dev svc/deepwiki-fixed 8001:8001 &
  
  # Get the PID
  PF_PID=$!
  
  # Wait a moment for it to start
  sleep 3
  
  # Check if it's running
  if ps -p $PF_PID > /dev/null; then
    echo -e "${GREEN}✅ Port forwarding started successfully (PID: $PF_PID)${NC}"
    return 0
  else
    echo -e "${RED}❌ Failed to start port forwarding${NC}"
    return 1
  fi
}

# Function to test the connection
test_connection() {
  echo -e "${BLUE}Testing connection to DeepWiki API...${NC}"
  if curl -s http://localhost:8001/ --connect-timeout 5 > /dev/null; then
    echo -e "${GREEN}✅ DeepWiki API is accessible${NC}"
    return 0
  else
    echo -e "${RED}❌ Cannot connect to DeepWiki API${NC}"
    
    # Check if pod is running
    echo -e "${BLUE}Checking if DeepWiki pod is running...${NC}"
    POD=$(kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    
    if [ -z "$POD" ]; then
      echo -e "${RED}❌ DeepWiki pod not found${NC}"
      echo -e "${YELLOW}Recommendation: Run ./fix-and-test-deepwiki.sh to create the DeepWiki deployment${NC}"
    else
      echo -e "${GREEN}✅ DeepWiki pod is running ($POD)${NC}"
      echo -e "${YELLOW}Checking pod status...${NC}"
      kubectl describe pod -n codequal-dev $POD | grep -A 5 "Status:"
    fi
    
    return 1
  fi
}

# Main function
main() {
  # Check if port forwarding is running
  if ! check_port_forwarding; then
    # If not, start it
    if ! start_port_forwarding; then
      echo -e "${RED}❌ Failed to establish port forwarding${NC}"
      echo -e "${YELLOW}Recommendation: Check if kubectl is configured correctly${NC}"
      return 1
    fi
  fi
  
  # Test the connection
  if ! test_connection; then
    echo -e "${RED}❌ DeepWiki connection failed${NC}"
    echo -e "${YELLOW}Recommendation: Run ./fix-and-test-deepwiki.sh to fix DeepWiki issues${NC}"
    
    # If direct calibration is available, suggest it as an alternative
    if [ -f "$(dirname "$0")/direct-calibration.js" ]; then
      echo -e "${GREEN}Alternative: Run direct calibration instead:${NC}"
      echo -e "${GREEN}  ./run-direct-calibration.sh -q${NC}"
    fi
    
    return 1
  fi
  
  echo -e "${GREEN}✅ DeepWiki connection is established and working${NC}"
  return 0
}

# Execute main function if script is run directly
# Otherwise, allow sourcing for use in other scripts
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main
fi