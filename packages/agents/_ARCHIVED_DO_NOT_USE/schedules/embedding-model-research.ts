import { ResearchSchedule } from '../types/research';

/**
 * Quarterly research schedule for embedding model evaluation
 * Keeps CodeQual up-to-date with the latest and most cost-effective embedding models
 */
export const embeddingModelResearchSchedule: ResearchSchedule = {
  id: 'embedding-model-research',
  name: 'Embedding Model Evaluation',
  description: 'Research and evaluate the latest embedding models for quality, performance, and cost-effectiveness',
  frequency: 'quarterly',
  enabled: true,
  
  researchTasks: [
    {
      name: 'MTEB Leaderboard Analysis',
      description: 'Review the latest MTEB (Massive Text Embedding Benchmark) leaderboard',
      sources: [
        'https://huggingface.co/spaces/mteb/leaderboard',
        'https://github.com/embeddings-benchmark/mteb'
      ],
      outputFormat: 'markdown',
      focus: [
        'Top 10 models by overall score',
        'Best models for code retrieval tasks',
        'Best models for documentation retrieval',
        'New entrants since last quarter'
      ]
    },
    
    {
      name: 'Cost-Performance Analysis',
      description: 'Analyze embedding models by cost per token and performance metrics',
      sources: [
        'OpenAI pricing',
        'Voyage AI pricing',
        'Cohere pricing',
        'Anthropic pricing'
      ],
      outputFormat: 'comparison-table',
      focus: [
        'Cost per 1K tokens',
        'Embedding dimensions',
        'Maximum context length',
        'API latency benchmarks'
      ]
    },
    
    {
      name: 'Code-Specific Embedding Models',
      description: 'Research models specifically optimized for code understanding',
      sources: [
        'Papers on code embeddings',
        'GitHub discussions',
        'ML conferences (NeurIPS, ICML)',
        'arXiv papers'
      ],
      outputFormat: 'technical-report',
      focus: [
        'Models trained on code corpora',
        'Multi-language code support',
        'Performance on code similarity tasks',
        'Integration complexity'
      ]
    },
    
    {
      name: 'Open Source Alternatives',
      description: 'Evaluate open source embedding models for self-hosting option',
      sources: [
        'Hugging Face model hub',
        'GitHub repositories',
        'Research papers'
      ],
      outputFormat: 'implementation-guide',
      focus: [
        'Models that can run on standard GPUs',
        'Docker/container availability',
        'Fine-tuning capabilities',
        'License compatibility'
      ]
    }
  ],
  
  deliverables: [
    {
      type: 'report',
      name: 'Quarterly Embedding Model Report',
      format: 'markdown',
      sections: [
        'Executive Summary',
        'Top Performers by Category',
        'Cost-Benefit Analysis',
        'Migration Recommendations',
        'Implementation Examples'
      ]
    },
    {
      type: 'config-update',
      name: 'embedding-models.ts update',
      format: 'code',
      description: 'Updated configuration with new models and pricing'
    },
    {
      type: 'migration-guide',
      name: 'Model Migration Guide',
      format: 'markdown',
      description: 'Step-by-step guide if model change is recommended'
    }
  ],
  
  automationConfig: {
    triggerType: 'cron',
    cronExpression: '0 0 1 */3 *', // First day of every 3rd month
    notificationChannels: ['email', 'slack'],
    autoCreatePR: true,
    requiresApproval: true
  },
  
  successCriteria: [
    'Identified at least 3 new promising models',
    'Completed cost-performance analysis',
    'Tested top candidates with sample data',
    'Provided clear migration path if changes recommended'
  ]
};