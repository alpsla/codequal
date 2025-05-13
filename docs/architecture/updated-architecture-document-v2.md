    
    // Migrate hot to warm
    for (const entity of hotToWarm) {
      await this.warmStore.store(entity);
      await this.hotStore.remove(entity.id);
    }
    
    // Migrate warm to cold
    for (const entity of warmToCold) {
      await this.coldStore.store(entity);
      await this.warmStore.remove(entity.id);
    }
  }
  
  // Retrieve entity from appropriate tier
  async retrieveEntity(id: string): Promise<any> {
    // Try hot store first
    let entity = await this.hotStore.get(id);
    
    if (!entity) {
      // Try warm store
      entity = await this.warmStore.get(id);
      
      if (!entity) {
        // Try cold store
        entity = await this.coldStore.get(id);
        
        if (entity) {
          // Move from cold to warm if found
          await this.warmStore.store(entity);
        }
      }
      
      // Move to hot tier if entity is frequently used
      if (entity && entity.usageCount > 20) {
        await this.hotStore.store(entity);
      }
    }
    
    // Update usage metrics
    if (entity) {
      await this.updateUsageMetrics(entity.id, entity);
    }
    
    return entity;
  }
}
```

### Knowledge Quality Control

```typescript
interface QualityControlConfig {
  minimumConfidenceScore: number;
  minimumRelevanceScore: number;
  deduplicationThreshold: number;
  contentQualityChecks: {
    minContentLength: number;
    requiresCodeExamples: boolean;
    requiresBestPractices: boolean;
    maxAgeForTechnicalContent: number; // in ms
  };
}

class KnowledgeQualityService {
  constructor(
    private config: QualityControlConfig,
    private embeddings: EmbeddingService
  ) {}
  
  // Check content quality before storing
  async validateContent(content: KnowledgeEntity): Promise<ValidationResult> {
    const issues: string[] = [];
    
    // Check basic quality criteria
    if (content.content.length < this.config.contentQualityChecks.minContentLength) {
      issues.push('Content length below minimum threshold');
    }
    
    if (content.type === 'education') {
      const eduContent = content as EducationalEntity;
      
      // Check for required components
      if (this.config.contentQualityChecks.requiresCodeExamples && 
          (!eduContent.codeExamples || eduContent.codeExamples.length === 0)) {
        issues.push('Educational content missing code examples');
      }
      
      if (this.config.contentQualityChecks.requiresBestPractices && 
          (!eduContent.bestPractices || eduContent.bestPractices.length === 0)) {
        issues.push('Educational content missing best practices');
      }
    }
    
    // Check for duplicate content
    const duplicates = await this.findDuplicateContent(content);
    if (duplicates.length > 0) {
      issues.push(`Content similar to existing entries: ${duplicates.map(d => d.id).join(', ')}`);
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      duplicates
    };
  }
  
  // Merge duplicate content
  async mergeContent(
    primary: KnowledgeEntity,
    secondary: KnowledgeEntity
  ): Promise<KnowledgeEntity> {
    // Create merged entity based on content type
    if (primary.type === 'education' && secondary.type === 'education') {
      return this.mergeEducationalContent(
        primary as EducationalEntity,
        secondary as EducationalEntity
      );
    }
    
    // Default merge for other types
    return {
      ...primary,
      metadata: {
        ...primary.metadata,
        mergedFrom: [...(primary.metadata.mergedFrom || []), secondary.id],
        mergedAt: new Date()
      },
      updatedAt: new Date()
    };
  }
}
```## Agent Roles

In this architecture, any agent type can fulfill any of these functional roles:

### Analysis Agents

**Primary Agent:**
- Comprehensive analysis of assigned area
- Focus on core issues in the domain
- Broad coverage of the codebase

**Secondary Agent:**
- Complementary analysis focusing on gaps
- Specialized analysis in agent's strength areas
- Verification/contradiction of primary agent findings

**Fallback Agent:**
- Activated when primary or secondary agents fail
- May have different strengths/weaknesses
- Prioritized based on effectiveness for the role
- Configured with failure context awareness

### Support Agents

**Repository Data Provider:**
- Connects to source control APIs (GitHub, GitLab, Azure DevOps)
- Fetches code, diffs, PR metadata, commit history
- Processes and structures repository data for analysis
- Manages caching to reduce API calls
- Provides unified data interface for other agents

**Repository Interaction Provider:**
- Adds review comments to code
- Submits approvals/rejections based on analysis results
- Creates follow-up PRs with suggested fixes
- Manages issue creation and tracking
- Handles PR descriptions and summaries

**Documentation Provider:**
- Generates/updates documentation based on code changes
- Creates/updates READMEs for new features
- Maintains API documentation
- Updates changelogs automatically
- Generates architecture documentation

**Test Provider:**
- Generates unit tests for new code
- Updates existing tests to match code changes
- Provides test coverage analysis
- Suggests test improvements
- Creates test plans for new features

**CI/CD Provider:**
- Integrates with build systems
- Monitors deployment processes
- Provides release notes generation
- Updates deployment configurations
- Handles infrastructure as code updates

### Orchestrator Agent

- Categorization of findings across agents
- Deduplication of similar insights
- Prioritization of issues by severity
- Organization of results into meaningful structure
- Resolution of conflicting findings

### Reporting Agent

- Creation of executive summaries
- Detailed explanation of technical issues
- Educational content related to findings
- Actionable recommendations for improvement
- Customized reporting for different audiences## Unified Deployment Architecture

To address the need for both cloud and on-premises deployment while avoiding duplication of work, we've designed a unified deployment architecture that leverages containerization, configuration abstraction, and environment-aware services.

### Core Principles of Unified Deployment

1. **Container-First Architecture**
   - All components packaged as containers with identical runtime behavior
   - Configuration injected via environment variables and config files
   - Stateless design where possible to simplify scaling and migration
   - Volumes for necessary stateful components

2. **Environment Abstraction Layer**
   - Environment-specific adapters for dependencies (database, storage, etc.)
   - Unified API for accessing external services
   - Feature flags for environment-specific capabilities
   - Runtime detection of deployment environment

3. **Configuration Hierarchy**
   - Base configuration shared across all environments
   - Environment-specific overrides (cloud, on-premises)
   - Customer-specific customizations
   - Instance-specific runtime settings

### Unified Deployment Components

```typescript
// Environment abstraction interface
interface EnvironmentAdapter {
  // Environment type
  type: 'cloud' | 'on-premises' | 'development';
  
  // Database connectivity
  getDatabaseConnection(): Promise<DatabaseConnection>;
  
  // Object storage
  getStorageClient(): StorageClient;
  
  // Authentication provider
  getAuthProvider(): AuthProvider;
  
  // Model provider access
  getModelProvider(model: string): ModelProvider;
  
  // Feature availability
  isFeatureAvailable(feature: string): boolean;
  
  // Telemetry and monitoring
  getTelemetryClient(): TelemetryClient;
  
  // License validation
  validateLicense(): Promise<LicenseStatus>;
}

// Configuration manager
class ConfigurationManager {
  private baseConfig: BaseConfig;
  private envConfig: EnvironmentConfig;
  private customerConfig: CustomerConfig;
  private instanceConfig: InstanceConfig;
  
  constructor(
    private environmentType: 'cloud' | 'on-premises' | 'development',
    private customerId: string,
    private instanceId: string
  ) {
    // Load configuration hierarchy
    this.baseConfig = loadBaseConfig();
    this.envConfig = loadEnvironmentConfig(environmentType);
    this.customerConfig = loadCustomerConfig(customerId);
    this.instanceConfig = loadInstanceConfig(instanceId);
  }
  
  // Get merged configuration
  getConfig<T>(section: string): T {
    return deepMerge(
      this.baseConfig[section],
      this.envConfig[section],
      this.customerConfig[section],
      this.instanceConfig[section]
    ) as T;
  }
  
  // Update configuration (with appropriate persistence)
  async updateConfig(section: string, key: string, value: any, level: ConfigLevel): Promise<void> {
    // Update at appropriate level with correct persistence
    switch (level) {
      case 'instance':
        this.instanceConfig[section][key] = value;
        await saveInstanceConfig(this.instanceId, this.instanceConfig);
        break;
      case 'customer':
        this.customerConfig[section][key] = value;
        await saveCustomerConfig(this.customerId, this.customerConfig);
        break;
      // Environment and base config changes are restricted
    }
  }
}

// Deployment orchestrator
class DeploymentOrchestrator {
  constructor(
    private config: ConfigurationManager,
    private environment: EnvironmentAdapter
  ) {}
  
  // Initialize system components with environment-appropriate settings
  async initializeSystem(): Promise<SystemStatus> {
    // Initialize core services with environment adaptations
    const database = await this.environment.getDatabaseConnection();
    const storage = this.environment.getStorageClient();
    const auth = this.environment.getAuthProvider();
    
    // Apply environment-specific optimizations
    if (this.environment.type === 'on-premises') {
      // Configure for potentially limited resources
      await this.applyResourceConstraints();
      
      // Set up local model providers if available
      await this.configureLocalModels();
      
      // Configure air-gap adaptations if needed
      if (!this.environment.isFeatureAvailable('external_connectivity')) {
        await this.configureAirGapMode();
      }
    } else {
      // Configure for cloud scaling
      await this.configureAutoScaling();
      
      // Set up cloud-specific monitoring
      await this.configureCloudMonitoring();
    }
    
    // Initialize shared components
    await this.initializeSharedComponents();
    
    return this.getSystemStatus();
  }
  
  // Additional orchestration methods...
}
```

### Packaging and Deployment Strategy

This unified approach allows us to create a single set of containers and deployment configurations that can be used in both cloud and on-premises scenarios:

1. **Container Registry**
   - All container images built once and pushed to public registry
   - Tagged with versions for consistent deployment
   - Identical binaries for all environments

2. **Deployment Templates**
   - Kubernetes manifests for both cloud and on-premises
   - Docker Compose for simpler on-premises deployments
   - Helm charts for managed installations
   - Terraform modules for cloud provisioning

3. **Installation Methods**
   - Cloud: Automated through CI/CD pipeline
   - On-Premises: Installer script or admin dashboard
   - Development: Local Docker Compose setup

### Environment-Specific Adaptations

While the core components remain identical, we implement specific adaptations for each environment:

#### Cloud Environment
- Connection to managed Supabase instance
- Cloud-native scaling with auto-scaling groups
- Managed authentication (Auth0, Cognito)
- Cloud logging and monitoring
- Managed vector database services

#### On-Premises Environment
- Self-contained PostgreSQL with pgvector extension
- Local authentication with LDAP/AD integration
- Local model serving option
- Resource-aware scaling based on available hardware
- Offline license validation
- Local logging with export options

### Kubernetes-Based Unified Deployment

For both cloud and on-premises deployments, we leverage Kubernetes as a common orchestration layer:

```yaml
# Example Kubernetes deployment manifest (applicable to both environments)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: codequal-api
spec:
  replicas: {{ .Values.api.replicas }}
  selector:
    matchLabels:
      app: codequal-api
  template:
    metadata:
      labels:
        app: codequal-api
    spec:
      containers:
      - name: api
        image: codequal/api:{{ .Values.version }}
        ports:
        - containerPort: 8080
        env:
        - name: ENVIRONMENT_TYPE
          value: {{ .Values.environmentType }}
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: codequal-secrets
              key: database-url
        volumeMounts:
        - name: config
          mountPath: /app/config
        resources:
          requests:
            memory: {{ .Values.api.resources.requests.memory }}
            cpu: {{ .Values.api.resources.requests.cpu }}
          limits:
            memory: {{ .Values.api.resources.limits.memory }}
            cpu: {{ .Values.api.resources.limits.cpu }}
      volumes:
      - name: config
        configMap:
          name: codequal-config
```

### Benefits of Unified Approach

By implementing this unified deployment architecture, we gain several advantages:

1. **Development Efficiency**
   - Single codebase for all deployment scenarios
   - Simplified testing across environments
   - Reduced maintenance overhead
   - Faster feature delivery for both deployment models

2. **Operational Consistency**
   - Same behaviors and capabilities in all environments
   - Identical troubleshooting and monitoring approaches
   - Consistent update and upgrade processes
   - Shared documentation and knowledge base

3. **Business Flexibility**
   - Smooth transitions between deployment models
   - Hybrid deployment options (some components in cloud, some on-premises)
   - Easy addition of new deployment environments (e.g., edge, hybrid cloud)
   - Support for multi-tenant and dedicated deployments

### Implementation Approach

To implement this unified architecture efficiently:

1. Start with container-first design for all components
2. Build environment abstraction layer early in development
3. Test in both environments from the beginning
4. Automate deployment for both scenarios
5. Use feature flags for environment-specific capabilities

This unified approach ensures we avoid duplicating work while meeting the needs of both cloud and on-premises customers.async function handleCalibrationNotification(decision: CalibrationDecision, user: User): Promise<UserResponse> {
  if (!decision.requiresCalibration) {
    return { proceed: true, config: decision.selectedConfig };
  }
  
  const notificationContent = `
    We've detected that your repository has characteristics we haven't fully optimized for yet:
    
    - Framework: ${repositoryContext.frameworks.join(', ')}
    - Architecture: ${repositoryContext.architecture}
    - Size: ${formatRepositorySize(repositoryContext.size)}
    
    To provide the most accurate analysis, we'll need to calibrate our system for your specific context. 
    This will take approximately ${decision.estimatedCalibrationTime} minutes for the initial analysis.
  `;
  
  const userResponse = await sendUserNotification({
    user,
    content: notificationContent,
    options: [
      { id: 'proceed', label: 'Proceed with calibration' },
      { id: 'approximate', label: 'Use best approximation' },
      { id: 'schedule', label: 'Schedule for later' }
    ],
    timeout: 48 * 60 * 60 * 1000 // 48 hours
  });
  
  switch (userResponse.selection) {
    case 'proceed':
      return { proceed: true, calibrate: true };
    case 'approximate':
      return { proceed: true, calibrate: false, config: decision.temporaryConfig };
    case 'schedule':
      const scheduledTime = await getScheduledTime(user);
      scheduleCalibration(repositoryContext, scheduledTime, user);
      return { proceed: true, calibrate: false, config: decision.temporaryConfig };
    default:
      // Timeout or no response
      return { proceed: true, calibrate: false, config: decision.temporaryConfig };
  }
}## Adaptive Configuration System

The system implements a self-improving configuration system that learns from experience across diverse repositories:

### Configuration Management

1. **Dynamic Configuration Selection**:
   - Analyze repository characteristics (languages, frameworks, architecture, size)
   - Query Supabase for matching configurations
   - Apply similarity matching for new contexts
   - Track performance metrics for continuous improvement

2. **Similarity Matching Algorithm**:

```typescript
function findBestMatch(existingConfigs: ConfigurationRecord[], targetContext: RepositoryContext): ConfigurationRecord {
  // Calculate similarity scores for each configuration
  const scoredConfigs = existingConfigs.map(config => {
    const score = calculateSimilarityScore(config, targetContext);
    return { config, score };
  });
  
  // Sort by similarity score (highest first)
  scoredConfigs.sort((a, b) => b.score - a.score);
  
  return scoredConfigs[0].config;
}

function calculateSimilarityScore(config: ConfigurationRecord, context: RepositoryContext): number {
  let score = 0;
  
  // Language matching (weighted heavily)
  const languageOverlap = calculateSetOverlap(
    new Set(config.languages), 
    new Set(context.languages)
  );
  score += languageOverlap * 0.35; // 35% of score
  
  // Framework matching
  const frameworkOverlap = calculateSetOverlap(
    new Set(config.frameworks), 
    new Set(context.frameworks)
  );
  score += frameworkOverlap * 0.25; // 25% of score
  
  // Architecture matching
  const architectureScore = config.architecture === context.architecture ? 1 : 0;
  score += architectureScore * 0.2; // 20% of score
  
  // Size similarity (using logarithmic scale)
  const sizeScore = 1 - Math.min(1, Math.abs(
    Math.log10(config.size) - Math.log10(context.size)
  ) / 2);
  score += sizeScore * 0.1; // 10% of score
  
  // Domain matching
  const domainScore = config.domain === context.domain ? 1 : 0;
  score += domainScore * 0.1; // 10% of score
  
  return score; // 0-1 score
}

function calculateSetOverlap<T>(set1: Set<T>, set2: Set<T>): number {
  if (set1.size === 0 || set2.size === 0) return 0;
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}
```

3. **Self-Improvement Cycle**:
   - Detect new contexts (languages, frameworks, architectures)
   - Apply initial best-guess configuration
   - Measure performance and user satisfaction
   - Calibrate for optimal performance
   - Store new calibrated configuration
   - Re-evaluate periodically to maintain quality

### Calibration System

When encountering new repository characteristics, the system implements a calibration process:

```typescript
function shouldInitiateCalibration(repositoryContext: RepositoryContext): CalibrationDecision {
  // Extract key context parameters
  const { languages, frameworks, architecture, size, domainType } = repositoryContext;
  
  // Create context signature
  const contextSignature = createContextSignature(languages, frameworks, architecture);
  
  // Query Supabase for matching configurations
  const matchingConfigs = await queryMatchingConfigurations(contextSignature);
  
  if (matchingConfigs.length === 0) {
    // No matching configuration found
    return {
      requiresCalibration: true,
      calibrationType: 'full',
      estimatedCalibrationTime: estimateCalibrationTime(repositoryContext),
      reason: 'No matching configuration found'
    };
  }
  
  // Find best matching configuration
  const bestMatch = findBestMatch(matchingConfigs, repositoryContext);
  
  // Calculate match confidence (0-1)
  const matchConfidence = calculateMatchConfidence(bestMatch, repositoryContext);
  
  if (matchConfidence < 0.7) {
    // Low confidence match
    return {
      requiresCalibration: true,
      calibrationType: 'partial',
      estimatedCalibrationTime: estimateCalibrationTime(repositoryContext, 'partial'),
      reason: 'Low confidence match',
      temporaryConfig: bestMatch.id
    };
  }
  
  return {
    requiresCalibration: false,
    selectedConfig: bestMatch.id
  };
}
```

### User Communication Flow

When a new repository with unfamiliar characteristics is detected:

```typescript
async function handleCalibrationNotification(decision: CalibrationDecision, user: User): Promise<UserResponse> {
  if (!decision.requiresCalibration) {
    return { proceed: true, config: decision.selectedConfig };
  }
  
  const notificationContent = `
    We've detected that your repository has characteristics we haven't fully optimized for yet:
    
    - Framework: ${repositoryContext.frameworks.join(', ')}
    - Architecture: ${repositoryContext.architecture}
    -