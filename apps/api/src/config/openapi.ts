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
      }
    ],
    paths: {}  // Paths will be added through the API routes
  }
};
