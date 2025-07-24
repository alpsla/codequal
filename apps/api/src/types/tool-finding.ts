import { AgentRole } from '@codequal/agents';

export interface ToolFinding {
  id?: string;
  toolId: string;
  agentRole: AgentRole;
  content: string;
  repositoryId: string;
  metadata: {
    executedAt: string;
    prNumber?: number;
    scheduledRun?: boolean;
    isLatest?: boolean;
  };
  title?: string;
  description?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  category?: string;
  file?: string;
  line?: number;
  column?: number;
  impact?: string;
  recommendation?: string;
  tool?: string;
  agent?: string;
  confidence?: number;
  ruleId?: string;
  message?: string;
  type?: string;
}