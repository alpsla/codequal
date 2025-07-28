// OpenAPI configuration without external dependencies
const version = '1.0.0';

export const openapiSpecification = {
    openapi: '3.0.0',
    info: {
      title: 'CodeQual API',
      version,
      description: 'AI-powered code review API for comprehensive pull request analysis',
      termsOfService: 'https://codequal.com/terms',
      contact: {
        name: 'CodeQual Support',
        email: 'support@codequal.com',
        url: 'https://codequal.com/support'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'https://api.codequal.com/v1',
        description: 'Production server'
      },
      {
        url: 'https://staging-api.codequal.com/v1',
        description: 'Staging server'
      },
      {
        url: 'http://localhost:8080/v1',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for authentication. Format: ck_[32-character-hex-string]'
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authenticated users'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            code: {
              type: 'string',
              description: 'Error code for programmatic handling'
            },
            details: {
              type: 'object',
              description: 'Additional error details'
            }
          },
          required: ['error']
        },
        PRAnalysisRequest: {
          type: 'object',
          properties: {
            prUrl: {
              type: 'string',
              format: 'uri',
              description: 'GitHub pull request URL',
              example: 'https://github.com/owner/repo/pull/123'
            },
            options: {
              type: 'object',
              properties: {
                depth: {
                  type: 'string',
                  enum: ['basic', 'standard', 'comprehensive'],
                  default: 'standard',
                  description: 'Analysis depth level'
                },
                includeTests: {
                  type: 'boolean',
                  default: true,
                  description: 'Include test coverage analysis'
                },
                includeSecurity: {
                  type: 'boolean',
                  default: true,
                  description: 'Include security vulnerability scanning'
                },
                includePerformance: {
                  type: 'boolean',
                  default: true,
                  description: 'Include performance impact analysis'
                }
              }
            }
          },
          required: ['prUrl']
        },
        PRAnalysisResponse: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique analysis ID'
            },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed'],
              description: 'Analysis status'
            },
            prUrl: {
              type: 'string',
              format: 'uri',
              description: 'Analyzed PR URL'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Analysis creation timestamp'
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Analysis completion timestamp',
              nullable: true
            },
            results: {
              type: 'object',
              description: 'Analysis results (only available when completed)',
              nullable: true,
              properties: {
                summary: {
                  type: 'object',
                  properties: {
                    overallScore: {
                      type: 'number',
                      minimum: 0,
                      maximum: 100,
                      description: 'Overall code quality score'
                    },
                    recommendation: {
                      type: 'string',
                      enum: ['approve', 'review', 'reject'],
                      description: 'Merge recommendation'
                    },
                    criticalIssues: {
                      type: 'integer',
                      description: 'Number of critical issues found'
                    },
                    warnings: {
                      type: 'integer',
                      description: 'Number of warnings'
                    }
                  }
                },
                details: {
                  type: 'object',
                  properties: {
                    codeQuality: {
                      type: 'object',
                      description: 'Code quality analysis details'
                    },
                    security: {
                      type: 'object',
                      description: 'Security analysis results'
                    },
                    performance: {
                      type: 'object',
                      description: 'Performance impact analysis'
                    },
                    tests: {
                      type: 'object',
                      description: 'Test coverage and quality'
                    }
                  }
                }
              }
            }
          },
          required: ['id', 'status', 'prUrl', 'createdAt']
        },
        ApiKey: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            name: {
              type: 'string',
              description: 'User-friendly name for the API key'
            },
            keyPrefix: {
              type: 'string',
              description: 'First 8 characters of the key for identification',
              example: 'ck_a1b2c'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            lastUsedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            scopes: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'API scopes/permissions'
            }
          }
        },
        UsageStats: {
          type: 'object',
          properties: {
            period: {
              type: 'string',
              description: 'Billing period'
            },
            apiCalls: {
              type: 'integer',
              description: 'Total API calls in period'
            },
            remainingCalls: {
              type: 'integer',
              description: 'Remaining calls in current plan'
            },
            costToDate: {
              type: 'number',
              description: 'Current period cost in USD'
            },
            lastUpdated: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        ProgressUpdate: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Update ID'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Update timestamp'
            },
            type: {
              type: 'string',
              enum: ['analysis', 'tool', 'agent', 'system'],
              description: 'Update type'
            },
            phase: {
              type: 'string',
              description: 'Current phase'
            },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'failed', 'skipped'],
              description: 'Update status'
            },
            percentage: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: 'Progress percentage'
            },
            message: {
              type: 'string',
              description: 'Progress message'
            },
            details: {
              type: 'object',
              properties: {
                agentName: { type: 'string' },
                toolName: { type: 'string' },
                currentStep: { type: 'integer' },
                totalSteps: { type: 'integer' },
                duration: { type: 'number' },
                error: { type: 'string' }
              }
            }
          },
          required: ['id', 'timestamp', 'type', 'phase', 'status', 'percentage', 'message']
        },
        AnalysisProgress: {
          type: 'object',
          properties: {
            analysisId: {
              type: 'string',
              format: 'uuid',
              description: 'Analysis ID'
            },
            repositoryUrl: {
              type: 'string',
              description: 'Repository URL'
            },
            prNumber: {
              type: 'integer',
              description: 'Pull request number'
            },
            startTime: {
              type: 'string',
              format: 'date-time',
              description: 'Analysis start time'
            },
            endTime: {
              type: 'string',
              format: 'date-time',
              description: 'Analysis end time',
              nullable: true
            },
            overallStatus: {
              type: 'string',
              enum: ['initializing', 'analyzing', 'finalizing', 'completed', 'failed'],
              description: 'Overall analysis status'
            },
            overallPercentage: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: 'Overall progress percentage'
            },
            currentPhase: {
              type: 'string',
              description: 'Current execution phase'
            },
            phases: {
              type: 'object',
              properties: {
                initialization: { $ref: '#/components/schemas/PhaseProgress' },
                toolExecution: { $ref: '#/components/schemas/PhaseProgress' },
                agentAnalysis: { $ref: '#/components/schemas/PhaseProgress' },
                resultProcessing: { $ref: '#/components/schemas/PhaseProgress' },
                reportGeneration: { $ref: '#/components/schemas/PhaseProgress' }
              }
            },
            agents: {
              type: 'object',
              additionalProperties: { $ref: '#/components/schemas/AgentProgress' }
            },
            tools: {
              type: 'object',
              additionalProperties: { $ref: '#/components/schemas/ToolProgress' }
            },
            metrics: {
              type: 'object',
              properties: {
                totalAgents: { type: 'integer' },
                completedAgents: { type: 'integer' },
                failedAgents: { type: 'integer' },
                totalTools: { type: 'integer' },
                completedTools: { type: 'integer' },
                failedTools: { type: 'integer' },
                estimatedTimeRemaining: { type: 'integer', nullable: true }
              }
            },
            updates: {
              type: 'array',
              items: { $ref: '#/components/schemas/ProgressUpdate' }
            }
          },
          required: ['analysisId', 'repositoryUrl', 'prNumber', 'startTime', 'overallStatus', 'overallPercentage', 'currentPhase']
        },
        PhaseProgress: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'failed', 'skipped']
            },
            percentage: {
              type: 'number',
              minimum: 0,
              maximum: 100
            },
            startTime: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            endTime: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            message: {
              type: 'string',
              nullable: true
            }
          },
          required: ['status', 'percentage']
        },
        AgentProgress: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            status: {
              type: 'string',
              enum: ['pending', 'running', 'completed', 'failed', 'skipped']
            },
            percentage: {
              type: 'number',
              minimum: 0,
              maximum: 100
            },
            startTime: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            endTime: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            findings: {
              type: 'integer',
              nullable: true
            },
            error: {
              type: 'string',
              nullable: true
            }
          },
          required: ['name', 'status', 'percentage']
        },
        ToolProgress: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            agentRole: { type: 'string' },
            status: {
              type: 'string',
              enum: ['pending', 'running', 'completed', 'failed', 'skipped']
            },
            percentage: {
              type: 'number',
              minimum: 0,
              maximum: 100
            },
            startTime: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            endTime: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            findingsCount: {
              type: 'integer',
              nullable: true
            },
            error: {
              type: 'string',
              nullable: true
            }
          },
          required: ['name', 'agentRole', 'status', 'percentage']
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['ok', 'degraded', 'error'],
              description: 'Overall system health status'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Health check timestamp'
            },
            database: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['healthy', 'unhealthy', 'unknown']
                },
                tables: {
                  type: 'integer',
                  description: 'Number of database tables'
                }
              }
            },
            vectorDB: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['healthy', 'unavailable']
                }
              }
            },
            background: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['healthy', 'unhealthy']
                }
              }
            }
          },
          required: ['status', 'timestamp']
        },
        AlertStatus: {
          type: 'object',
          properties: {
            healthy: {
              type: 'integer',
              description: 'Number of healthy metrics'
            },
            warning: {
              type: 'integer',
              description: 'Number of warning alerts'
            },
            critical: {
              type: 'integer',
              description: 'Number of critical alerts'
            },
            alerts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  metric: {
                    type: 'string',
                    description: 'Metric name'
                  },
                  value: {
                    type: 'number',
                    description: 'Current metric value'
                  },
                  threshold: {
                    type: 'number',
                    description: 'Alert threshold'
                  },
                  severity: {
                    type: 'string',
                    enum: ['warning', 'critical']
                  },
                  message: {
                    type: 'string',
                    description: 'Alert message'
                  }
                },
                required: ['metric', 'value', 'threshold', 'severity', 'message']
              }
            }
          },
          required: ['healthy', 'warning', 'critical', 'alerts']
        },
        RepositoryStorageMetrics: {
          type: 'object',
          properties: {
            usedGB: {
              type: 'number',
              description: 'Storage used in GB'
            },
            totalGB: {
              type: 'number',
              description: 'Total storage capacity in GB'
            },
            availableGB: {
              type: 'number',
              description: 'Available storage in GB'
            },
            percentUsed: {
              type: 'number',
              description: 'Percentage of storage used'
            },
            activeAnalyses: {
              type: 'integer',
              description: 'Number of active analyses'
            },
            maxConcurrentCapacity: {
              type: 'integer',
              description: 'Maximum concurrent analysis capacity'
            },
            averageAnalysisSize: {
              type: 'number',
              description: 'Average analysis size in GB'
            },
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['scale-up', 'capacity', 'cleanup']
                  },
                  urgency: {
                    type: 'string',
                    enum: ['low', 'medium', 'high']
                  },
                  message: {
                    type: 'string'
                  },
                  suggestedSize: {
                    type: 'number',
                    nullable: true
                  }
                }
              }
            },
            status: {
              type: 'string',
              enum: ['healthy', 'warning', 'critical']
            }
          },
          required: ['usedGB', 'totalGB', 'availableGB', 'percentUsed', 'activeAnalyses', 'status']
        },
        ActiveAnalyses: {
          type: 'object',
          properties: {
            active: {
              type: 'integer',
              description: 'Number of active analyses'
            },
            analyses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  analysisId: {
                    type: 'string',
                    format: 'uuid'
                  },
                  repositoryUrl: {
                    type: 'string',
                    format: 'uri'
                  },
                  type: {
                    type: 'string',
                    enum: ['quick', 'comprehensive', 'deep']
                  },
                  sizeMB: {
                    type: 'number',
                    description: 'Analysis size in MB'
                  },
                  startTime: {
                    type: 'integer',
                    description: 'Start timestamp'
                  },
                  duration: {
                    type: 'integer',
                    description: 'Duration in milliseconds'
                  },
                  status: {
                    type: 'string',
                    enum: ['active', 'long-running']
                  }
                }
              }
            },
            longRunning: {
              type: 'integer',
              description: 'Number of long-running analyses'
            }
          },
          required: ['active', 'analyses', 'longRunning']
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Unauthorized',
                code: 'AUTH_REQUIRED'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Forbidden',
                code: 'INSUFFICIENT_PERMISSIONS'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Not found',
                code: 'RESOURCE_NOT_FOUND'
              }
            }
          }
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          headers: {
            'X-RateLimit-Limit': {
              description: 'Request limit per hour',
              schema: {
                type: 'integer'
              }
            },
            'X-RateLimit-Remaining': {
              description: 'Remaining requests in window',
              schema: {
                type: 'integer'
              }
            },
            'X-RateLimit-Reset': {
              description: 'Time when rate limit resets',
              schema: {
                type: 'integer'
              }
            }
          },
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Rate limit exceeded',
                code: 'RATE_LIMIT_EXCEEDED',
                details: {
                  limit: 1000,
                  remaining: 0,
                  reset: 1640995200
                }
              }
            }
          }
        }
    },
    tags: [
      {
        name: 'Analysis',
        description: 'Pull request analysis operations'
      },
      {
        name: 'Reports',
        description: 'Analysis reports and history'
      },
      {
        name: 'Progress',
        description: 'Real-time analysis progress tracking'
      },
      {
        name: 'API Keys',
        description: 'API key management'
      },
      {
        name: 'Usage',
        description: 'Usage statistics and billing'
      },
      {
        name: 'Health',
        description: 'Service health and status'
      },
      {
        name: 'Monitoring',
        description: 'System monitoring, metrics, and alerts'
      },
      {
        name: 'Repository Storage',
        description: 'Repository storage and analysis monitoring'
      },
      {
        name: 'Vector DB Management',
        description: 'Vector database retention and optimization'
      }
    ],
    paths: {}  // Paths will be added through the API routes
  }
};
