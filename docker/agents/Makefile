# CodeQual Agent Services Makefile
# Simplifies building, testing, and deploying agent containers

.PHONY: help build test deploy clean

# Variables
REGISTRY ?= codequal
VERSION ?= v9
NAMESPACE ?= codequal-dev

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(GREEN)CodeQual Agent Services - Build & Deploy$(NC)"
	@echo ""
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "Examples:"
	@echo "  make build          # Build all images"
	@echo "  make test-local     # Test with docker-compose"
	@echo "  make deploy         # Deploy to Kubernetes"

# ============== BUILD TARGETS ==============

build: build-agents build-api ## Build all Docker images

build-agents: ## Build unified agent service image
	@echo "$(GREEN)Building agent service image...$(NC)"
	cd ../.. && docker build \
		-f docker/agents/Dockerfile.all-agents \
		-t $(REGISTRY)/agent-service:$(VERSION) \
		-t $(REGISTRY)/agent-service:latest \
		.
	@echo "$(GREEN)✓ Agent service image built successfully$(NC)"

build-api: ## Build API service image
	@echo "$(GREEN)Building API service image...$(NC)"
	cd ../.. && docker build \
		-f docker/api/Dockerfile.api \
		-t $(REGISTRY)/api:$(VERSION) \
		-t $(REGISTRY)/api:latest \
		.
	@echo "$(GREEN)✓ API service image built successfully$(NC)"

# ============== LOCAL TESTING ==============

test-local: check-env ## Test locally with docker-compose
	@echo "$(GREEN)Starting local test environment...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)Waiting for services to be healthy...$(NC)"
	@sleep 10
	@docker-compose ps
	@echo ""
	@echo "$(GREEN)Services running at:$(NC)"
	@echo "  API:              http://localhost:3000/health"
	@echo "  Redis:            localhost:6379"
	@echo "  Security Agent:   localhost:50051"
	@echo "  Performance Agent: localhost:50052"
	@echo "  Quality Agent:    localhost:50053"
	@echo "  Orchestrator:     localhost:8080"
	@echo ""
	@echo "$(YELLOW)Run 'make logs' to view logs$(NC)"
	@echo "$(YELLOW)Run 'make stop' to stop services$(NC)"

logs: ## View docker-compose logs
	docker-compose logs -f

stop: ## Stop local test environment
	@echo "$(YELLOW)Stopping services...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ Services stopped$(NC)"

clean-local: ## Clean up local test environment
	@echo "$(RED)Cleaning up local environment...$(NC)"
	docker-compose down -v --remove-orphans
	@echo "$(GREEN)✓ Local environment cleaned$(NC)"

# ============== KUBERNETES DEPLOYMENT ==============

check-kubectl:
	@which kubectl > /dev/null || (echo "$(RED)kubectl not found. Please install kubectl$(NC)" && exit 1)
	@kubectl cluster-info > /dev/null 2>&1 || (echo "$(RED)Not connected to a Kubernetes cluster$(NC)" && exit 1)

deploy: check-kubectl deploy-redis deploy-agents deploy-api ## Deploy all services to Kubernetes
	@echo "$(GREEN)✓ All services deployed successfully$(NC)"
	@echo ""
	@make status

deploy-redis: ## Deploy Redis cache to Kubernetes
	@echo "$(GREEN)Deploying Redis cache...$(NC)"
	kubectl apply -n $(NAMESPACE) -f - <<EOF
	apiVersion: v1
	kind: Service
	metadata:
	  name: redis-cache
	spec:
	  ports:
	  - port: 6379
	    targetPort: 6379
	  selector:
	    app: redis
	---
	apiVersion: apps/v1
	kind: StatefulSet
	metadata:
	  name: redis
	spec:
	  serviceName: redis-cache
	  replicas: 1
	  selector:
	    matchLabels:
	      app: redis
	  template:
	    metadata:
	      labels:
	        app: redis
	    spec:
	      containers:
	      - name: redis
	        image: redis:7-alpine
	        ports:
	        - containerPort: 6379
	        command:
	        - redis-server
	        - --maxmemory
	        - 2gb
	        - --maxmemory-policy
	        - allkeys-lru
	EOF
	@echo "$(GREEN)✓ Redis deployed$(NC)"

deploy-agents: ## Deploy agent services to Kubernetes
	@echo "$(GREEN)Deploying agent services...$(NC)"
	@for agent in security performance quality architecture dependency; do \
		echo "  Deploying $$agent agent..."; \
		kubectl apply -n $(NAMESPACE) -f - <<EOF; \
	apiVersion: apps/v1
	kind: Deployment
	metadata:
	  name: $$agent-agent
	spec:
	  replicas: 2
	  selector:
	    matchLabels:
	      app: $$agent-agent
	  template:
	    metadata:
	      labels:
	        app: $$agent-agent
	    spec:
	      containers:
	      - name: agent
	        image: $(REGISTRY)/agent-service:$(VERSION)
	        env:
	        - name: AGENT_TYPE
	          value: $$agent
	        - name: REDIS_URL
	          value: redis://redis-cache:6379
	        - name: OPENROUTER_API_KEY
	          valueFrom:
	            secretKeyRef:
	              name: api-secrets
	              key: openrouter-key
	        ports:
	        - containerPort: 50051
	EOF \
	done
	@echo "$(GREEN)✓ Agents deployed$(NC)"

deploy-api: ## Deploy API service to Kubernetes
	@echo "$(GREEN)Deploying API service...$(NC)"
	kubectl apply -n $(NAMESPACE) -f - <<EOF
	apiVersion: v1
	kind: Service
	metadata:
	  name: api-service
	spec:
	  type: LoadBalancer
	  ports:
	  - port: 80
	    targetPort: 3000
	  selector:
	    app: api
	---
	apiVersion: apps/v1
	kind: Deployment
	metadata:
	  name: api
	spec:
	  replicas: 2
	  selector:
	    matchLabels:
	      app: api
	  template:
	    metadata:
	      labels:
	        app: api
	    spec:
	      containers:
	      - name: api
	        image: $(REGISTRY)/api:$(VERSION)
	        env:
	        - name: REDIS_URL
	          value: redis://redis-cache:6379
	        - name: ORCHESTRATOR_URL
	          value: orchestrator:8080
	        ports:
	        - containerPort: 3000
	EOF
	@echo "$(GREEN)✓ API deployed$(NC)"

# ============== MANAGEMENT COMMANDS ==============

status: check-kubectl ## Check deployment status
	@echo "$(GREEN)Deployment Status:$(NC)"
	@echo ""
	kubectl get pods -n $(NAMESPACE) -l 'app in (redis,api,security-agent,performance-agent,quality-agent)'
	@echo ""
	kubectl get svc -n $(NAMESPACE)

scale: check-kubectl ## Configure auto-scaling
	@echo "$(GREEN)Configuring auto-scaling...$(NC)"
	kubectl autoscale deployment quality-agent --cpu-percent=70 --min=3 --max=20 -n $(NAMESPACE)
	kubectl autoscale deployment security-agent --cpu-percent=70 --min=2 --max=10 -n $(NAMESPACE)
	@echo "$(GREEN)✓ Auto-scaling configured$(NC)"

test-api: ## Test API endpoint
	@echo "$(GREEN)Testing API health endpoint...$(NC)"
	@API_URL=$$(kubectl get svc api-service -n $(NAMESPACE) -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "localhost:3000"); \
	curl -s http://$$API_URL/health | python3 -m json.tool

# ============== UTILITIES ==============

check-env: ## Check required environment variables
	@echo "$(GREEN)Checking environment...$(NC)"
	@test -n "$$OPENROUTER_API_KEY" || (echo "$(RED)ERROR: OPENROUTER_API_KEY not set$(NC)" && exit 1)
	@test -n "$$SUPABASE_URL" || echo "$(YELLOW)WARNING: SUPABASE_URL not set$(NC)"
	@test -n "$$SUPABASE_SERVICE_KEY" || echo "$(YELLOW)WARNING: SUPABASE_SERVICE_KEY not set$(NC)"
	@echo "$(GREEN)✓ Environment check passed$(NC)"

push: build ## Push images to registry
	@echo "$(GREEN)Pushing images to registry...$(NC)"
	docker push $(REGISTRY)/agent-service:$(VERSION)
	docker push $(REGISTRY)/agent-service:latest
	docker push $(REGISTRY)/api:$(VERSION)
	docker push $(REGISTRY)/api:latest
	@echo "$(GREEN)✓ Images pushed successfully$(NC)"

clean: clean-local ## Clean everything
	@echo "$(RED)Cleaning all resources...$(NC)"
	docker rmi $(REGISTRY)/agent-service:$(VERSION) 2>/dev/null || true
	docker rmi $(REGISTRY)/api:$(VERSION) 2>/dev/null || true
	@echo "$(GREEN)✓ Cleanup complete$(NC)"

# ============== QUICK START ==============

quickstart: build test-local ## Quick start for development
	@echo ""
	@echo "$(GREEN)════════════════════════════════════════$(NC)"
	@echo "$(GREEN)   CodeQual Agent Services Ready!$(NC)"
	@echo "$(GREEN)════════════════════════════════════════$(NC)"
	@echo ""
	@echo "Test with:"
	@echo '  curl -X POST http://localhost:3000/api/analyze \'
	@echo '    -H "Content-Type: application/json" \'
	@echo '    -d '"'"'{"prUrl":"https://github.com/org/repo/pull/123"}'"'"''
	@echo ""

.DEFAULT_GOAL := help