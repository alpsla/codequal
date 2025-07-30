/**
 * Health check endpoint for AWS Lambda
 * Provides status and readiness information
 */

import { Handler } from 'aws-lambda';

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  service: string;
  version: string;
  timestamp: string;
  checks: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    environment: {
      node_version: string;
      aws_region: string;
      stage: string;
    };
  };
}

export const handler: Handler = async (event) => {
  try {
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const totalMemory = parseInt(process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE || '1024') * 1024 * 1024;
    const usedMemory = memoryUsage.heapUsed + memoryUsage.external;
    const memoryPercentage = Math.round((usedMemory / totalMemory) * 100);

    const response: HealthCheckResponse = {
      status: 'healthy',
      service: 'comparison-agent',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      checks: {
        memory: {
          used: Math.round(usedMemory / 1024 / 1024),
          total: Math.round(totalMemory / 1024 / 1024),
          percentage: memoryPercentage
        },
        environment: {
          node_version: process.version,
          aws_region: process.env.AWS_REGION || 'unknown',
          stage: process.env.NODE_ENV || 'unknown'
        }
      }
    };

    // Check if memory usage is concerning
    if (memoryPercentage > 90) {
      response.status = 'unhealthy';
    }

    return {
      statusCode: 200,
      body: JSON.stringify(response),
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    };
  } catch (error) {
    console.error('Health check failed:', error);
    
    return {
      statusCode: 503,
      body: JSON.stringify({
        status: 'unhealthy',
        service: 'comparison-agent',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    };
  }
};