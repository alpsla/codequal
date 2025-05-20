# Unified Deployment Architecture

**Last Updated: May 11, 2025**

## Overview

CodeQual implements a cloud-agnostic, containerized deployment strategy that works seamlessly across cloud providers and on-premises environments. This unified approach eliminates duplication of deployment processes, enabling consistent operation across development, testing, and production environments.

## Container-Based Architecture

- **Docker-based Deployment**: All components packaged as Docker containers
- **Compose-based Orchestration**: Docker Compose for development and small deployments
- **Kubernetes Support**: Kubernetes manifests for scalable cloud or on-premises deployments
- **Helm Charts**: Simplified deployment for Kubernetes environments
- **Infrastructure as Code**: Terraform configurations for provisioning

## Unified Deployment Process

### 1. Common Base Layer

- Core containerized services identical across all environments
- Consistent configuration management
- Environment-agnostic service discovery
- Shared Docker images across all deployment targets

### 2. Environment-Specific Adapters

- Configuration adapters for different deployment targets
- Auto-detection of environment characteristics
- Dynamic resource allocation based on available capacity
- Environment-specific networking and security configurations

### 3. Deployment Workflows

- Single command deployment across all environments
- Consistent upgrade procedures regardless of target
- Unified rollback mechanisms
- Common logging and monitoring approach

## Deployment Targets

### 1. Development Environment

- Local Docker Compose deployment
- Minimal resource requirements (8GB RAM, 4 CPU cores)
- SQLite database option for offline development
- Hot-reloading for rapid iteration
- Local testing with remote DeepWiki integration

### 2. Small-Scale Production

- Single-server deployment 
- Docker Compose with production settings
- Managed database options or containerized PostgreSQL
- Nginx for reverse proxy and SSL termination
- Suitable for individual teams or small companies

### 3. Cloud Provider Deployment

- Kubernetes-based deployment on any major cloud
- Horizontal scaling for API components
- Managed database services integration
- Cloud provider monitoring integration
- Cost optimization through auto-scaling

### 4. Enterprise On-Premises

- Kubernetes or OpenShift deployment
- Air-gapped installation option
- Integration with corporate LDAP/Active Directory
- Enterprise database compatibility
- Compliance with corporate security policies

## Cloud Migration Strategy

A staged migration approach enables starting with minimal infrastructure and scaling up:

### 1. Initial DigitalOcean Deployment

- Fast setup (usually under 1 hour)
- Simple configuration using Droplets with Docker pre-installed
- $100 credit for testing and validation
- Docker-based deployment ensures portability

### 2. Preparation for Enterprise Migration

- Document infrastructure requirements based on actual usage
- Formalize containerization of all components
- Establish backup and restore procedures
- Select target enterprise cloud provider (GCP, AWS, etc.)

### 3. Enterprise Migration Path

- Create cloud provider account and configure services
- Set up appropriate compute resources (VM instances, container clusters)
- Configure networking and security
- Push Docker images to provider's container registry
- Deploy using Docker Compose or Kubernetes
- Migrate data from previous deployment
- Update DNS to point to new infrastructure
- Validate functionality and performance

## Resource Requirements

### Minimal (Development/Testing)
- 4 CPU cores
- 8GB RAM
- 20GB storage
- Ubuntu 20.04/22.04 or compatible Linux

### Recommended (Small Production)
- 8 CPU cores
- 16GB RAM
- 100GB SSD storage
- Ubuntu 20.04/22.04 or compatible Linux

### Enterprise Scale
- Kubernetes cluster with at least 3 nodes
- Each node: 8+ CPU cores, 32GB+ RAM
- 500GB+ total storage
- Enterprise Linux distribution

## Installation Process

The unified installation process follows these steps regardless of environment:

1. **Prerequisite Check**: Verify system requirements and dependencies
2. **Configuration Generation**: Create environment-specific config files
3. **Container Deployment**: Pull and start all required containers
4. **Database Initialization**: Set up and migrate the database
5. **Service Configuration**: Configure networking, credentials, and integrations
6. **Verification**: Run health checks to ensure correct operation
7. **Monitoring Setup**: Configure logging and monitoring tools

## Development Workflow

### Hybrid Development Approach

The development workflow maintains developer velocity while leveraging cloud components:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Local Development Environment                     │
│                                                                     │
│  ┌─────────────────────┐                                            │
│  │  CodeQual (Local)   │                                            │
│  │  - Your IDE         │                                            │
│  │  - Hot Reload       │                                            │
│  │  - Fast Iteration   │                                            │
│  └─────────────────────┘                                            │
│            ▲                                                       │
│            │ API Calls                                             │
│            │                                                       │
└────────────┼───────────────────────────────────────────────────────┘
             │
             │ HTTPS
             │
┌────────────▼───────────────────────────────────────────────────────┐
│                  Cloud Deployment (DigitalOcean)                   │
│                                                                    │
│  ┌─────────────────────┐     ┌────────────────────┐               │
│  │   DeepWiki          │◄───►│     Supabase       │               │
│  │   - Repository      │     │   (Shared DB)      │               │
│  │     Analysis        │     │   - Repository     │               │
│  │   - Search API      │     │     Cache          │               │
│  │   - Embeddings      │     │   - Vector Data    │               │
│  └─────────────────────┘     └────────────────────┘               │
│                                      ▲                             │
│                                      │                             │
│  ┌─────────────────────┐             │                             │
│  │   CodeQual          │◄────────────┘                             │
│  │   (Production)      │                                           │
│  └─────────────────────┘                                           │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Development Environment Configuration

```bash
# Development environment
NODE_ENV=development
PORT=3000

# Connect to cloud-deployed DeepWiki
DEEPWIKI_URL=https://your-digitalocean-ip:8002

# Connect to the SAME Supabase instance as production
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# All API keys
ANTHROPIC_API_KEY=your_claude_key
OPENAI_API_KEY=your_openai_key
DEEPSEEK_API_KEY=your_deepseek_key
GEMINI_API_KEY=your_gemini_key

# Git provider tokens
GITHUB_TOKEN=your_github_token
GITLAB_TOKEN=your_gitlab_token

# Development-specific settings
LOG_LEVEL=debug
MOCK_APIS=false
```

### Development Testing Flow

```bash
# Start local CodeQual
npm run dev

# It will automatically connect to:
# - Cloud DeepWiki for analysis
# - Shared Supabase for data/cache
```

## Docker Configuration

### Docker Compose Setup

```yaml
version: '3.8'

services:
  codequal:
    build: 
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - PORT=3000
      - DEEPWIKI_URL=${DEEPWIKI_URL}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - PUBLIC_SUPABASE_ANON_KEY=${PUBLIC_SUPABASE_ANON_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    volumes:
      - codequal_data:/app/data
    restart: always
    depends_on:
      - deepwiki

  deepwiki:
    build:
      context: ./deepwiki
      dockerfile: Dockerfile
    ports:
      - "8002:8002"
    environment:
      - PORT=8002
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - deepwiki_data:/app/data
      - deepwiki_repos:/app/repos
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./nginx/ssl:/etc/nginx/ssl
      - ./nginx/www:/var/www/html
    depends_on:
      - codequal
      - deepwiki
    restart: always

volumes:
  codequal_data:
  deepwiki_data:
  deepwiki_repos:
```

### Kubernetes Deployment Example

```yaml
# codequal-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: codequal
  labels:
    app: codequal
spec:
  replicas: 2
  selector:
    matchLabels:
      app: codequal
  template:
    metadata:
      labels:
        app: codequal
    spec:
      containers:
      - name: codequal
        image: your-registry/codequal:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        - name: DEEPWIKI_URL
          valueFrom:
            configMapKeyRef:
              name: codequal-config
              key: DEEPWIKI_URL
        - name: SUPABASE_URL
          valueFrom:
            configMapKeyRef:
              name: codequal-config
              key: SUPABASE_URL
        # Secret values
        - name: SUPABASE_SERVICE_ROLE_KEY
          valueFrom:
            secretKeyRef:
              name: codequal-secrets
              key: SUPABASE_SERVICE_ROLE_KEY
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: codequal-secrets
              key: ANTHROPIC_API_KEY
        # ... other environment variables
        resources:
          limits:
            cpu: "2"
            memory: "4Gi"
          requests:
            cpu: "500m"
            memory: "1Gi"
        volumeMounts:
        - name: codequal-data
          mountPath: /app/data
      volumes:
      - name: codequal-data
        persistentVolumeClaim:
          claimName: codequal-data-pvc
```

## Backup and Recovery Strategy

### Data Backup

1. **Database Backups**:
   - Automated Supabase database backups
   - Point-in-time recovery capabilities
   - Regular backup verification

2. **Container Volumes**:
   - Persistent volume snapshots
   - Configuration backups
   - Repository cache backups

3. **Configuration Backup**:
   - Environment variables
   - Deployment configurations
   - Secret management

### Recovery Procedures

1. **Database Restoration**:
   - Restore from Supabase backups
   - Verify data integrity
   - Test application functionality

2. **Application Recovery**:
   - Redeploy containers from images
   - Restore configuration
   - Reconnect to data sources

3. **Disaster Recovery**:
   - Cross-region recovery option
   - Complete environment rebuild capability
   - Regular recovery testing

## Monitoring and Alerting

### Monitoring Stack

- **Infrastructure Monitoring**: Prometheus + Grafana
- **Application Monitoring**: OpenTelemetry + Grafana
- **Log Management**: Loki + Grafana
- **Uptime Monitoring**: Uptime Kuma / Pingdom
- **Error Tracking**: Sentry

### Key Metrics

1. **Infrastructure Metrics**:
   - CPU, memory, disk usage
   - Network traffic
   - Container health
   - Database performance

2. **Application Metrics**:
   - Request latency
   - Error rates
   - Throughput
   - LLM API usage
   - Token consumption

3. **Business Metrics**:
   - Repository analyses completed
   - PR reviews performed
   - User engagement
   - Feature usage

### Alert Configuration

- **Critical Alerts**: Immediate notification for system-down scenarios
- **Warning Alerts**: Notification for potential issues
- **Information Alerts**: Regular reports on system status
- **Alert Channels**: Email, Slack, PagerDuty

## Security Considerations

### Authentication and Authorization

- **User Authentication**: OAuth 2.0, OIDC
- **Service Authentication**: API keys, JWT tokens
- **Authorization**: Role-based access control
- **Secrets Management**: Kubernetes Secrets, environment variables

### Network Security

- **TLS Encryption**: HTTPS for all traffic
- **Network Policies**: Restricted communication between services
- **API Security**: Rate limiting, input validation
- **Infrastructure Security**: Firewall rules, security groups

### Data Security

- **Data Encryption**: At rest and in transit
- **PII Handling**: Minimization, encryption
- **Data Retention**: Configurable policies
- **Audit Logging**: Access and modification tracking
