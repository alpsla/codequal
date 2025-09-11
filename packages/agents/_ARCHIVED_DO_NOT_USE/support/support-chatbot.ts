import { createLogger } from '@codequal/core/utils';
import { VectorContextService } from '../multi-agent/vector-context-service';
import { ModelVersionSync, RepositorySizeCategory } from '@codequal/core/services/model-selection/ModelVersionSync';
import OpenAI from 'openai';

export interface SupportQuery {
  question: string;
  context?: 'api' | 'billing' | 'technical' | 'general';
  userId?: string;
  metadata?: any;
}

export class SupportChatbot {
  private logger = createLogger('SupportChatbot');
  private vectorService: VectorContextService;
  private modelSync: ModelVersionSync;
  private openai: OpenAI;

  constructor(vectorService: VectorContextService) {
    this.vectorService = vectorService;
    this.modelSync = new ModelVersionSync(this.logger);
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
  }

  async answer(query: SupportQuery): Promise<{
    answer: string;
    sources: string[];
    confidence: number;
    suggestedActions?: string[];
  }> {
    try {
      // Step 1: Search Vector DB for relevant documentation
      const relevantDocs = await this.searchDocumentation(query.question);
      
      // Step 2: Check if we have high-confidence answer
      const confidence = this.calculateConfidence(relevantDocs);
      
      if (confidence < 0.7) {
        // Escalate to human support
        return this.escalateToHuman(query);
      }

      // Step 3: Select appropriate model (cheaper for support)
      const model = await this.selectSupportModel(query);
      
      // Step 4: Generate answer
      const answer = await this.generateAnswer(query, relevantDocs, model);
      
      return {
        answer,
        sources: relevantDocs.map(d => d.metadata?.source || 'Documentation'),
        confidence,
        suggestedActions: this.getSuggestedActions(query.context)
      };
    } catch (error) {
      this.logger.error('Support chatbot error', { error, query });
      return this.getDefaultResponse(query);
    }
  }

  private async searchDocumentation(_question: string): Promise<any[]> {
    // TODO: Implement actual search using VectorContextService
    // For now, return mock documentation results
    return [
      {
        content: 'API keys can be created in the dashboard under Settings > API Keys.',
        score: 0.9,
        type: 'api_docs'
      },
      {
        content: 'Rate limits are 1000 requests per hour for the Standard plan.',
        score: 0.8,
        type: 'faq'
      }
    ];
  }

  private calculateConfidence(docs: any[]): number {
    if (docs.length === 0) return 0;
    
    // Average of top 3 document scores
    const topScores = docs.slice(0, 3).map(d => d.score);
    const avgScore = topScores.reduce((a, b) => a + b, 0) / topScores.length;
    
    // Boost confidence if multiple high-scoring docs
    const highScoreDocs = docs.filter(d => d.score > 0.8).length;
    const boost = Math.min(highScoreDocs * 0.1, 0.2);
    
    return Math.min(avgScore + boost, 1.0);
  }

  private async selectSupportModel(query: SupportQuery) {
    // Use cheaper, faster models for support
    const requirements = {
      language: 'english',
      sizeCategory: RepositorySizeCategory.SMALL,
      task: 'support_chat',
      complexity: 'simple',
      speed_priority: 'high',
      cost_priority: 'high', // Important for support
      quality_requirements: {
        accuracy: 'medium',
        friendliness: 'high'
      }
    };

    return this.modelSync.findOptimalModel(
      requirements,
      'openai',  // Preferred provider for support
      false      // Don't include fallback
    );
  }

  private async generateAnswer(
    query: SupportQuery,
    docs: any[],
    model: any
  ): Promise<string> {
    const context = docs
      .slice(0, 5)
      .map(d => d.content)
      .join('\n\n---\n\n');

    const prompt = `You are CodeQual's helpful support assistant. Answer the user's question based on the documentation provided.

Documentation context:
${context}

User question: ${query.question}

Guidelines:
- Be concise but complete
- Reference specific features or endpoints when relevant
- Suggest next steps or related documentation
- Be friendly and professional
- If information is unclear, acknowledge it`;

    const response = await this.openai.chat.completions.create({
      model: model.model_id,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: query.question }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    return response.choices[0].message.content || 'I apologize, but I couldn\'t generate a response.';
  }

  private escalateToHuman(query: SupportQuery) {
    // Log for human review
    this.logger.info('Escalating to human support', { query });
    
    // Could integrate with Slack/Discord here
    
    return {
      answer: `I'm not confident I can answer this accurately. I've forwarded your question to our support team who will respond within 24 hours. 
      
      In the meantime, you might find these resources helpful:
      - API Documentation: https://docs.codequal.com/api
      - FAQ: https://docs.codequal.com/faq
      - Status Page: https://status.codequal.com`,
      sources: [],
      confidence: 0.5,
      suggestedActions: ['Contact support@codequal.com', 'Check documentation']
    };
  }

  private getSuggestedActions(context?: string): string[] {
    const actions: Record<string, string[]> = {
      api: [
        'View API documentation',
        'Generate API key',
        'Check usage dashboard'
      ],
      billing: [
        'View pricing',
        'Manage subscription',
        'Download invoice'
      ],
      technical: [
        'Check system status',
        'View integration guides',
        'Browse code examples'
      ],
      general: [
        'Browse documentation',
        'Contact sales',
        'Schedule demo'
      ]
    };

    return actions[context || 'general'] || actions.general;
  }

  private getDefaultResponse(query: SupportQuery) {
    return {
      answer: `I'm having trouble accessing my documentation. Please try:
      1. Email support@codequal.com
      2. Check https://docs.codequal.com
      3. Visit our status page`,
      sources: [],
      confidence: 0,
      suggestedActions: ['Contact human support']
    };
  }
}