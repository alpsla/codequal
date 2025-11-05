# Compliance-Required Analysis Guide

## What are Compliance-Required Analyses?

Compliance-required analyses are code reviews that must meet specific regulatory, industry, or organizational standards where **audit trails and completeness are legally mandated**.

## Types of Compliance Requirements

### 🏛️ **Regulatory Compliance**

#### Financial Services
- **SOX (Sarbanes-Oxley)**: Financial reporting systems
- **PCI-DSS**: Payment card data handling
- **GDPR**: Data privacy and protection
- **BASEL III**: Banking risk management
- **FFIEC**: Federal financial institution examinations

#### Healthcare
- **HIPAA**: Protected health information
- **FDA 21 CFR Part 11**: Electronic records and signatures
- **HITECH**: Health information technology

#### Government/Defense
- **FISMA**: Federal information security
- **NIST**: Cybersecurity frameworks
- **FedRAMP**: Cloud security authorization
- **ITAR**: International traffic in arms regulations

#### Industry Standards
- **ISO 27001**: Information security management
- **ISO 13485**: Medical device quality
- **NIST CSF**: Cybersecurity framework

### 🏢 **Organizational Compliance**

#### Internal Policies
- Code review requirements for production systems
- Security review mandates for customer-facing applications
- Quality gates for mission-critical systems
- Change management approval processes

#### Contractual Obligations
- Client security requirements
- Vendor assessment mandates
- Partnership compliance terms
- Service level agreements (SLAs)

## How the System Identifies Compliance Requirements

### 🔍 **Automatic Detection**

```typescript
// Repository-level indicators
const complianceIndicators = {
  // File patterns that suggest compliance requirements
  filePatterns: [
    '**/payment/**',
    '**/billing/**', 
    '**/financial/**',
    '**/medical/**',
    '**/health/**',
    '**/security/**',
    '**/auth/**',
    '**/encryption/**'
  ],
  
  // Dependencies that indicate compliance needs
  dependencies: [
    'stripe', 'square', 'paypal', // Payment processing
    'crypto', 'bcrypt', 'jwt', // Security/encryption
    'hipaa-*', 'gdpr-*', // Compliance-specific libraries
    'audit-*', 'compliance-*' // Audit/compliance tools
  ],
  
  // Repository metadata
  topics: ['fintech', 'healthcare', 'government', 'security'],
  
  // Environment indicators
  environments: ['production', 'staging', 'compliance']
};
```

### 📋 **Explicit Configuration**

```typescript
// In repository configuration (.codequal.yml)
compliance:
  required: true
  standards: ['SOX', 'PCI-DSS', 'GDPR']
  criticality: 'high'
  auditRequired: true
  documentation: 'required'
  
analysis:
  security:
    compressionLevel: 'natural' # Force natural format
    qualityThreshold: 95
    requiredFindings: 3
  
  performance:
    compressionLevel: 'minimal'
    qualityThreshold: 90
```

### 🏷️ **PR/Context Markers**

```typescript
// Pull request markers
const prComplianceMarkers = {
  labels: ['compliance', 'security', 'audit', 'production'],
  title: /\b(compliance|audit|security|production|hotfix)\b/i,
  branch: /^(release|hotfix|security|compliance)\/.*/,
  reviewers: ['security-team', 'compliance-officer']
};

// Analysis context
const analysisContext = {
  priority: 'critical',
  businessCriticality: 'high',
  complianceRequired: true, // Explicitly set
  environment: 'production',
  regulatoryFramework: ['SOX', 'PCI-DSS']
};
```

## Quality Requirements for Compliance

### 📊 **Minimum Standards**

| Compliance Type | Min Quality | Min Findings | Context Preservation | Format |
|------------------|-------------|--------------|---------------------|---------|
| SOX Financial | 95% | 3+ | 100% | Natural |
| PCI-DSS | 95% | 2+ security | 100% | Natural |
| HIPAA | 90% | 2+ privacy | 95% | Natural |
| GDPR | 90% | 1+ data protection | 95% | Natural |
| Internal Security | 85% | 2+ | 90% | Minimal |
| General Prod | 80% | 1+ | 85% | Standard |

### 🔒 **Mandatory Requirements**

1. **Complete Audit Trail**: Full analysis history and reasoning
2. **Detailed Findings**: Specific file/line references, not summaries
3. **Risk Assessment**: Severity levels and impact analysis
4. **Remediation Steps**: Actionable, specific recommendations
5. **Evidence Preservation**: Original context and analysis data

## Implementation Examples

### Example 1: Financial Services Repository

```typescript
// Detected automatically
const repoAnalysis = {
  repositoryUrl: 'https://github.com/bank/payment-processing',
  files: ['src/payments/stripe-handler.ts', 'src/billing/invoices.ts'],
  dependencies: ['stripe', 'crypto', 'audit-log'],
  
  // System automatically sets
  complianceRequired: true,
  standards: ['SOX', 'PCI-DSS'],
  compressionLevel: 'natural'
};
```

### Example 2: Healthcare Application

```typescript
// Explicitly configured
const analysisConfig = {
  agentRole: 'security',
  analysisContext: {
    priority: 'critical',
    complianceRequired: true,
    regulatoryFramework: ['HIPAA', 'HITECH']
  },
  qualityRequirements: {
    minimumQuality: 95,
    preserveContext: true,
    requireFullFindings: true,
    auditTrail: true
  }
};
```

### Example 3: Government Contract

```typescript
// Branch-based detection
const govContractPR = {
  branch: 'security/nist-compliance-update',
  labels: ['security', 'government', 'nist'],
  reviewers: ['security-officer@gov.agency'],
  
  // Automatically triggers
  complianceRequired: true,
  framework: ['NIST', 'FISMA'],
  compressionLevel: 'natural'
};
```

## Configuration Options

### Repository-Level Configuration

```yaml
# .codequal.yml
compliance:
  # Explicit compliance requirement
  required: true
  
  # Applicable standards/frameworks
  standards:
    - 'SOX'
    - 'PCI-DSS'
    - 'GDPR'
  
  # Business criticality
  criticality: 'high' # low, medium, high, critical
  
  # Quality requirements
  quality:
    minimumScore: 95
    preserveFullContext: true
    requireDetailedFindings: true
  
  # Analysis overrides
  analysis:
    compressionLevel: 'natural' # natural, minimal, standard, aggressive
    fallbackEnabled: false # Disable fallback to compressed formats
    
  # Audit requirements
  audit:
    required: true
    retentionDays: 2555 # 7 years for SOX
    documentation: 'detailed'
```

### Environment-Based Rules

```typescript
// Production deployments
const productionRules = {
  environment: 'production',
  defaultCompliance: true,
  minimumQuality: 90,
  compressionLevel: 'minimal', // Conservative for prod
  
  // Escalation rules
  escalation: {
    securityFindings: 'immediate',
    qualityViolations: 'block-deployment',
    complianceGaps: 'require-approval'
  }
};
```

## Real-World Scenarios

### Scenario 1: Banking Application Update
```
Repository: payment-gateway-v2
Files: credit-card-processor.ts, fraud-detection.js
Compliance: SOX + PCI-DSS (automatically detected)
Result: Natural format, 95% quality threshold, detailed audit trail
```

### Scenario 2: Healthcare Data API
```
Repository: patient-portal-api  
Files: patient-records.ts, medical-history.js
Compliance: HIPAA (configured in .codequal.yml)
Result: Natural format, privacy-focused analysis, complete documentation
```

### Scenario 3: Internal Tool Update
```
Repository: dev-tools
Files: utility-functions.js, helper-scripts.ts
Compliance: None
Result: Standard compression, 80% quality threshold, efficient processing
```

## Monitoring & Validation

### Quality Assurance Checks

1. **Compliance Detection Accuracy**: Verify automatic detection works correctly
2. **Quality Threshold Enforcement**: Ensure minimum standards are met
3. **Audit Trail Completeness**: Validate all required documentation exists
4. **Format Compliance**: Confirm natural format used when required

### Metrics to Track

- Compliance analysis success rate
- Quality score distribution for compliance analyses  
- Audit trail completeness percentage
- False positive/negative compliance detection rates

## Best Practices

1. **Be Conservative**: When in doubt, assume compliance is required
2. **Document Everything**: Maintain detailed audit trails for all compliance analyses
3. **Regular Reviews**: Periodically review compliance detection rules
4. **Stakeholder Alignment**: Ensure compliance team approves detection logic
5. **Continuous Monitoring**: Track quality metrics for compliance analyses

This system ensures that when regulatory compliance is at stake, we never compromise on analysis quality or completeness.