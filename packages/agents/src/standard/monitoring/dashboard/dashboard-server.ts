/**
 * Real-Time Dashboard Server
 * Serves the monitoring dashboard and provides API endpoints for metrics
 */

import express = require('express');
import path = require('path');
import { monitoring } from '../services/unified-monitoring.service';
import { dynamicCostTracker } from '../services/dynamic-agent-cost-tracker.service';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3333;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Serve static dashboard
app.use(express.static(path.join(__dirname)));

// API endpoint for real-time metrics
app.get('/api/monitoring/metrics', async (req, res) => {
  try {
    const timeRange = req.query.range || '1h';
    const metrics = await getMetrics(timeRange as string);
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// API endpoint for agent-specific metrics
app.get('/api/monitoring/agents/:agentName', async (req, res) => {
  try {
    const { agentName } = req.params;
    const timeRange = req.query.range || '1h';
    const agentMetrics = await getAgentMetrics(agentName, timeRange as string);
    res.json(agentMetrics);
  } catch (error) {
    console.error('Error fetching agent metrics:', error);
    res.status(500).json({ error: 'Failed to fetch agent metrics' });
  }
});

// API endpoint for cost analysis
app.get('/api/monitoring/costs', async (req, res) => {
  try {
    const timeRange = req.query.range || '24h';
    const costAnalysis = await getCostAnalysis(timeRange as string);
    res.json(costAnalysis);
  } catch (error) {
    console.error('Error fetching cost analysis:', error);
    res.status(500).json({ error: 'Failed to fetch cost analysis' });
  }
});

// Serve the dashboard HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'real-time-dashboard.html'));
});

/**
 * Fetch comprehensive metrics for the dashboard
 */
async function getMetrics(timeRange: string) {
  const now = new Date();
  const startTime = getStartTime(now, timeRange);
  
  // Fetch from Supabase
  const { data: activities, error } = await supabase
    .from('agent_activity')
    .select('*')
    .gte('timestamp', startTime.getTime())
    .order('timestamp', { ascending: false });
  
  if (error) {
    console.error('Supabase query error:', error);
    // Fall back to local monitoring data
    return getLocalMetrics();
  }
  
  // Calculate summary metrics
  const summary = calculateSummary(activities || []);
  const trends = calculateTrends(activities || [], timeRange);
  const timeSeries = generateTimeSeries(activities || [], timeRange);
  const agentMetrics = calculateAgentMetrics(activities || []);
  const costByAgent = calculateCostByAgent(activities || []);
  
  return {
    summary,
    trends,
    timeSeries,
    agentMetrics,
    costByAgent,
    raw: activities
  };
}

/**
 * Get metrics for a specific agent
 */
async function getAgentMetrics(agentName: string, timeRange: string) {
  const now = new Date();
  const startTime = getStartTime(now, timeRange);
  
  const { data: activities, error } = await supabase
    .from('agent_activity')
    .select('*')
    .eq('agent_role', agentName)
    .gte('timestamp', startTime.getTime())
    .order('timestamp', { ascending: false });
  
  if (error) {
    console.error('Supabase query error:', error);
    return { error: 'Failed to fetch agent metrics' };
  }
  
  const totalOperations = activities?.length || 0;
  const successfulOps = activities?.filter(a => a.success).length || 0;
  const failedOps = totalOperations - successfulOps;
  const successRate = totalOperations > 0 ? (successfulOps / totalOperations) * 100 : 0;
  
  const totalDuration = activities?.reduce((sum, a) => sum + (a.duration_ms || 0), 0) || 0;
  const avgDuration = totalOperations > 0 ? totalDuration / totalOperations : 0;
  
  const totalInputTokens = activities?.reduce((sum, a) => sum + (a.input_tokens || 0), 0) || 0;
  const totalOutputTokens = activities?.reduce((sum, a) => sum + (a.output_tokens || 0), 0) || 0;
  const totalCost = activities?.reduce((sum, a) => sum + (a.cost || 0), 0) || 0;
  
  const primaryUsage = activities?.filter(a => !a.is_fallback).length || 0;
  const fallbackUsage = activities?.filter(a => a.is_fallback).length || 0;
  
  return {
    agentName,
    timeRange,
    summary: {
      totalOperations,
      successfulOps,
      failedOps,
      successRate,
      avgDuration,
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      totalCost,
      primaryUsage,
      fallbackUsage,
      fallbackRate: totalOperations > 0 ? (fallbackUsage / totalOperations) * 100 : 0
    },
    operations: activities?.map(a => ({
      timestamp: new Date(a.timestamp),
      operation: a.operation,
      repository: a.repository_url,
      prNumber: a.pr_number,
      model: a.model_used,
      isFallback: a.is_fallback,
      duration: a.duration_ms,
      tokens: (a.input_tokens || 0) + (a.output_tokens || 0),
      cost: a.cost,
      success: a.success,
      error: a.error
    }))
  };
}

/**
 * Get cost analysis
 */
async function getCostAnalysis(timeRange: string) {
  const now = new Date();
  const startTime = getStartTime(now, timeRange);
  
  const { data: activities, error } = await supabase
    .from('agent_activity')
    .select('agent_role, model_used, input_tokens, output_tokens, cost')
    .gte('timestamp', startTime.getTime());
  
  if (error) {
    console.error('Supabase query error:', error);
    return { error: 'Failed to fetch cost analysis' };
  }
  
  const costByAgent: Record<string, number> = {};
  const costByModel: Record<string, number> = {};
  const tokensByAgent: Record<string, number> = {};
  
  activities?.forEach(activity => {
    const agent = activity.agent_role;
    const model = activity.model_used;
    const cost = activity.cost || 0;
    const tokens = (activity.input_tokens || 0) + (activity.output_tokens || 0);
    
    costByAgent[agent] = (costByAgent[agent] || 0) + cost;
    costByModel[model] = (costByModel[model] || 0) + cost;
    tokensByAgent[agent] = (tokensByAgent[agent] || 0) + tokens;
  });
  
  const totalCost = Object.values(costByAgent).reduce((sum, cost) => sum + cost, 0);
  const totalTokens = Object.values(tokensByAgent).reduce((sum, tokens) => sum + tokens, 0);
  
  return {
    timeRange,
    totalCost,
    totalTokens,
    costByAgent,
    costByModel,
    tokensByAgent,
    topExpensiveAgents: Object.entries(costByAgent)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([agent, cost]) => ({ agent, cost, percentage: (cost / totalCost) * 100 })),
    topExpensiveModels: Object.entries(costByModel)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([model, cost]) => ({ model, cost, percentage: (cost / totalCost) * 100 }))
  };
}

/**
 * Calculate summary metrics
 */
function calculateSummary(activities: any[]) {
  const totalAnalyses = activities.length;
  const successfulAnalyses = activities.filter(a => a.success).length;
  const successRate = totalAnalyses > 0 ? (successfulAnalyses / totalAnalyses) * 100 : 0;
  
  const totalDuration = activities.reduce((sum, a) => sum + (a.duration_ms || 0), 0);
  const avgResponseTime = totalAnalyses > 0 ? totalDuration / totalAnalyses : 0;
  
  const totalCost = activities.reduce((sum, a) => sum + (a.cost || 0), 0);
  
  const uniqueModels = new Set(activities.map(a => a.model_used));
  const activeModels = uniqueModels.size;
  
  const fallbackCount = activities.filter(a => a.is_fallback).length;
  const fallbackRate = totalAnalyses > 0 ? (fallbackCount / totalAnalyses) * 100 : 0;
  
  // Mock cache hit rate for now (would need Redis integration)
  const cacheHitRate = 76.5;
  
  return {
    totalAnalyses,
    successRate,
    avgResponseTime,
    totalCost,
    activeModels,
    fallbackRate,
    cacheHitRate
  };
}

/**
 * Calculate trends
 */
function calculateTrends(activities: any[], timeRange: string) {
  // This would compare current period with previous period
  // For now, returning mock data
  return {
    analysesChange: 12.5,
    successChange: -2.1,
    responseTimeChange: -8.3,
    costChange: 5.20,
    cacheChange: 4.2
  };
}

/**
 * Generate time series data
 */
function generateTimeSeries(activities: any[], timeRange: string) {
  const points = 12; // Number of data points
  const now = Date.now();
  const interval = getIntervalMs(timeRange) / points;
  
  const labels = [];
  const responseTime = [];
  const successRate = [];
  
  for (let i = 0; i < points; i++) {
    const startTime = now - (points - i) * interval;
    const endTime = startTime + interval;
    
    const periodActivities = activities.filter(a => 
      a.timestamp >= startTime && a.timestamp < endTime
    );
    
    const time = new Date(startTime);
    labels.push(time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    
    const avgDuration = periodActivities.length > 0
      ? periodActivities.reduce((sum, a) => sum + (a.duration_ms || 0), 0) / periodActivities.length
      : 0;
    responseTime.push(avgDuration);
    
    const successCount = periodActivities.filter(a => a.success).length;
    const rate = periodActivities.length > 0 
      ? (successCount / periodActivities.length) * 100 
      : 0;
    successRate.push(rate);
  }
  
  return { labels, responseTime, successRate };
}

/**
 * Calculate per-agent metrics
 */
function calculateAgentMetrics(activities: any[]) {
  const agentMap: Record<string, any> = {};
  
  activities.forEach(activity => {
    const agent = activity.agent_role;
    if (!agentMap[agent]) {
      agentMap[agent] = {
        name: agent,
        operations: 0,
        successCount: 0,
        totalDuration: 0,
        totalTokens: 0,
        totalCost: 0,
        models: new Set(),
        fallbackCount: 0
      };
    }
    
    agentMap[agent].operations++;
    if (activity.success) agentMap[agent].successCount++;
    agentMap[agent].totalDuration += activity.duration_ms || 0;
    agentMap[agent].totalTokens += (activity.input_tokens || 0) + (activity.output_tokens || 0);
    agentMap[agent].totalCost += activity.cost || 0;
    agentMap[agent].models.add(activity.model_used);
    if (activity.is_fallback) agentMap[agent].fallbackCount++;
  });
  
  return Object.values(agentMap).map(agent => ({
    name: agent.name,
    model: Array.from(agent.models).join(', '),
    operations: agent.operations,
    successRate: agent.operations > 0 ? (agent.successCount / agent.operations) * 100 : 0,
    avgDuration: agent.operations > 0 ? agent.totalDuration / agent.operations : 0,
    totalTokens: agent.totalTokens,
    cost: agent.totalCost,
    status: agent.successCount / agent.operations > 0.9 ? 'healthy' : 'degraded'
  }));
}

/**
 * Calculate cost by agent
 */
function calculateCostByAgent(activities: any[]) {
  const costMap: Record<string, number> = {};
  
  activities.forEach(activity => {
    const agent = activity.agent_role;
    costMap[agent] = (costMap[agent] || 0) + (activity.cost || 0);
  });
  
  return Object.entries(costMap).map(([agent, cost]) => ({ agent, cost }));
}

/**
 * Get local metrics as fallback
 */
function getLocalMetrics() {
  const aggregated = monitoring.getAggregatedMetrics();
  
  return {
    summary: {
      totalAnalyses: aggregated.analysis.totalAnalyses,
      successRate: aggregated.analysis.successRate * 100,
      avgResponseTime: aggregated.analysis.averageDuration,
      totalCost: aggregated.cost.totalCost,
      activeModels: 6, // Mock
      fallbackRate: 8.2, // Mock
      cacheHitRate: 76.5 // Mock
    },
    trends: {
      analysesChange: 0,
      successChange: 0,
      responseTimeChange: 0,
      costChange: 0,
      cacheChange: 0
    },
    timeSeries: {
      labels: [],
      responseTime: [],
      successRate: []
    },
    agentMetrics: [],
    costByAgent: []
  };
}

/**
 * Helper functions
 */
function getStartTime(now: Date, timeRange: string): Date {
  const ms = getIntervalMs(timeRange);
  return new Date(now.getTime() - ms);
}

function getIntervalMs(timeRange: string): number {
  switch (timeRange) {
    case '1h': return 60 * 60 * 1000;
    case '6h': return 6 * 60 * 60 * 1000;
    case '24h': return 24 * 60 * 60 * 1000;
    case '7d': return 7 * 24 * 60 * 60 * 1000;
    default: return 60 * 60 * 1000;
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`
  🚀 Dashboard Server Running!
  ===============================
  📊 Dashboard: http://localhost:${PORT}
  🔌 API Endpoints:
     - GET /api/monitoring/metrics?range=1h
     - GET /api/monitoring/agents/:agentName?range=1h
     - GET /api/monitoring/costs?range=24h
  
  Press Ctrl+C to stop the server
  `);
});

export { app };