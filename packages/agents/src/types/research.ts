/**
 * Research Schedule Types
 */

export interface ResearchTask {
  name: string;
  description: string;
  sources: string[];
  priority?: 'high' | 'medium' | 'low';
  outputFormat?: string;
  focus?: string[];
}

export interface ResearchDeliverable {
  type: string;
  name: string;
  format?: string;
  sections?: string[];
  description?: string;
}

export interface AutomationConfig {
  triggerType: string;
  cronExpression?: string;
  notificationChannels?: string[];
  autoCreatePR?: boolean;
  requiresApproval?: boolean;
}

export interface ResearchSchedule {
  id: string;
  name: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  enabled: boolean;
  researchTasks: ResearchTask[];
  lastExecuted?: Date;
  nextExecution?: Date;
  deliverables?: ResearchDeliverable[];
  automationConfig?: AutomationConfig;
  successCriteria?: string[];
}

export interface ResearchResult {
  scheduleId: string;
  executionTime: Date;
  findings: any;
  recommendations: string[];
  metrics: {
    tasksCompleted: number;
    sourcesAnalyzed: number;
    executionTimeMs: number;
  };
}