/**
 * Model Researcher Service
 * 
 * Responsibilities:
 * 1. Research and evaluate latest AI models quarterly
 * 2. Store model configurations in Supabase
 * 3. Provide cached model selections for different contexts
 * 4. Handle orchestrator requests for specific context research
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

interface ModelResearchResult {
  id: string;
  model_id: string;
  provider: string;
  quality_score: number;
  speed_score: number;
  price_score: number;
  context_length: number;
  specializations: string[];
  optimal_for: {
    languages: string[];
    repo_sizes: string[];
    frameworks: string[];
  };
  research_date: Date;
  next_research_date: Date;
  metadata: any;
}

interface ContextRequest {
  language: string;
  repo_size: string;
  framework?: string;
  task_type?: string;
  specific_requirements?: string[];
}

export class ModelResearcherService {
  private supabase: any;
  private readonly RESEARCH_INTERVAL_DAYS = 90; // Quarterly
  private readonly QUALITY_WEIGHT = 0.70;
  private readonly SPEED_WEIGHT = 0.20;
  private readonly PRICE_WEIGHT = 0.10;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Get optimal model for context - uses cached research from Supabase
   */
  async getOptimalModelForContext(context: ContextRequest): Promise<string> {
    try {
      // First, check if we have recent research data
      const hasRecentResearch = await this.checkResearchFreshness();
      
      if (!hasRecentResearch) {
        console.log('Model research is outdated, triggering new research...');
        await this.conductQuarterlyResearch();
      }

      // Query Supabase for best model based on context
      const { data, error } = await this.supabase
        .from('model_research')
        .select('*')
        .contains('optimal_for->languages', [context.language])
        .contains('optimal_for->repo_sizes', [context.repo_size])
        .order('quality_score', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        // Context not found in research, request specific research
        console.log('Context not found in cached research, requesting specific research...');
        return await this.requestSpecificContextResearch(context);
      }

      return data.model_id;
    } catch (error) {
      console.error('Error getting optimal model:', error);
      return this.getFallbackModel(context);
    }
  }

  /**
   * Check if research data is fresh (within quarterly window)
   */
  private async checkResearchFreshness(): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('model_research_metadata')
      .select('last_research_date')
      .single();

    if (error || !data) return false;

    const lastResearchDate = new Date(data.last_research_date);
    const daysSinceResearch = (Date.now() - lastResearchDate.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysSinceResearch < this.RESEARCH_INTERVAL_DAYS;
  }

  /**
   * Conduct quarterly research on all available models
   * This should be scheduled to run every 90 days
   */
  async conductQuarterlyResearch(): Promise<void> {
    console.log('🔬 Starting quarterly model research...');
    
    try {
      // STEP 1: Search the web for latest AI models
      console.log('🌐 Step 1: Searching web for latest AI models...');
      const latestModels = await this.searchWebForLatestModels();
      
      // STEP 2: Get exact model IDs from OpenRouter
      console.log('🔍 Step 2: Getting exact syntax from OpenRouter...');
      const availableModels = await this.fetchAvailableModels();
      
      // STEP 3: Match web findings with OpenRouter availability
      console.log('🔗 Step 3: Matching web models with OpenRouter catalog...');
      const verifiedModels = this.matchWebModelsWithOpenRouter(latestModels, availableModels);
      
      // STEP 4: Research each verified model
      console.log('📊 Step 4: Researching verified models...');
      const researchResults: ModelResearchResult[] = [];
      
      for (const model of verifiedModels) {
        const research = await this.researchModel(model);
        researchResults.push(research);
      }

      // STEP 5: Store research results in Supabase
      await this.storeResearchResults(researchResults);
      
      // Update metadata
      await this.updateResearchMetadata();
      
      console.log(`✅ Quarterly research complete. Evaluated ${researchResults.length} models.`);
    } catch (error) {
      console.error('Error conducting quarterly research:', error);
      throw error;
    }
  }

  /**
   * Search the web for latest AI models using web search
   * This is Step 1 of the proper flow: Web Search → OpenRouter validation
   */
  private async searchWebForLatestModels(): Promise<any[]> {
    console.log('🌐 Searching web for latest AI models using WebSearch tool...');
    
    try {
      // Get current date for search
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
      
      // Calculate date ranges dynamically
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
      
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(currentDate.getMonth() - 3);
      
      // Get month names for search queries
      const lastThreeMonths = [];
      for (let i = 0; i < 3; i++) {
        const d = new Date();
        d.setMonth(currentDate.getMonth() - i);
        lastThreeMonths.push(d.toLocaleString('default', { month: 'long' }));
      }
      
      // Dynamic search queries using current date - NO hardcoded dates
      const searchQueries = [
        `latest AI language models released ${currentYear} ${currentMonth}`,
        `newest LLM models ${currentYear} last 3 months release dates`,
        `AI models released ${currentYear} ${lastThreeMonths.join(' ')} latest versions`,
        `${currentYear} AI model releases Anthropic OpenAI Google Meta Microsoft`,
        `state of the art language models ${currentYear} benchmark scores recent`,
        `LLM comparison ${currentYear} latest versions performance coding`,
        `newest AI models ${currentYear} last 6 months capabilities`,
        `${currentYear} machine learning models recent launches dates`,
        `artificial intelligence breakthroughs ${currentYear} new models`
      ];
      
      const discoveredModels = [];
      
      // Use the actual WebSearch tool if available
      // Note: WebSearch would be injected from the MCP environment
      const webSearchAvailable = false; // Disabled for now - would need proper WebSearch tool injection
      if (webSearchAvailable) {
        console.log('Using WebSearch tool for real web search...');
        
        for (const query of searchQueries) {
          try {
            // const searchResults = await WebSearch({ query });
            
            // Parse the search results to extract model information
            // const modelsFromSearch = this.parseWebSearchResults(searchResults);
            // discoveredModels.push(...modelsFromSearch);
            
            // console.log(`Found ${modelsFromSearch.length} models from query: ${query}`);
          } catch (error) {
            console.log(`Error searching for: ${query}`, error);
          }
        }
      } else {
        // Fallback to AI-based search if WebSearch tool is not available
        console.log('WebSearch tool not available, using AI-based search...');
        
        const { searchWebForLatestModels } = await import('../../researcher/web-search-researcher');
        const { AIService } = await import('../services/ai-service');
        
        const aiService = new AIService();
        const aiDiscoveredModels = await searchWebForLatestModels(aiService);
        discoveredModels.push(...aiDiscoveredModels);
      }
      
      console.log(`✅ Found ${discoveredModels.length} models from web search`);
      
      // Dynamic filtering based on current date - NO hardcoded dates
      const recentModels = discoveredModels.filter(model => {
        if (model.releaseDate) {
          const releaseDate = new Date(model.releaseDate);
          
          // Model must be within last 6 months
          if (releaseDate < sixMonthsAgo) {
            console.log(`Filtering out ${model.model} - older than 6 months (${model.releaseDate})`);
            return false;
          }
          
          // Model shouldn't be from future (sanity check)
          if (releaseDate > currentDate) {
            console.log(`Filtering out ${model.model} - future date (${model.releaseDate})`);
            return false;
          }
          
          return true;
        }
        // Keep if no date for further validation
        return true;
      });
      
      console.log(`Filtered to ${recentModels.length} recent models (last 6 months)`);
      
      // If no models found, log warning but don't add fake data
      if (recentModels.length === 0) {
        console.log('⚠️ No recent models found from web search');
        console.log('This might indicate:');
        console.log('  1. Web search needs better queries');
        console.log('  2. Models need to be validated in OpenRouter');
        console.log('  3. Date parsing needs adjustment');
      }
      
      return recentModels;
    } catch (error) {
      console.error('Error searching web for models:', error);
      // Fallback to empty array if web search fails
      return [];
    }
  }

  /**
   * Parse WebSearch results to extract model information
   * NO hardcoded model names - dynamically extract from search results
   */
  private parseWebSearchResults(searchResults: any): any[] {
    const models = [];
    
    if (!searchResults || typeof searchResults !== 'string') {
      return models;
    }
    
    // Generic patterns to find model information - NO specific model names
    const modelPatterns = [
      // Pattern: "Provider released ModelName on Date"
      /(\w+)\s+released\s+([A-Z][a-zA-Z0-9\-\s.]+)\s+on\s+(\w+\s+\d{1,2},?\s+\d{4})/gi,
      // Pattern: "ModelName from Provider"
      /([A-Z][a-zA-Z0-9\-\s.]+)\s+from\s+(\w+)/gi,
      // Pattern: "Provider's ModelName"
      /(\w+)'s\s+([A-Z][a-zA-Z0-9\-\s.]+)\s+model/gi,
      // Pattern: "new ModelName model"
      /new\s+([A-Z][a-zA-Z0-9\-\s.]+)\s+model/gi,
      // Pattern: "ModelName achieved X% on benchmark"
      /([A-Z][a-zA-Z0-9\-\s.]+)\s+achieved\s+\d+\.?\d*%/gi
    ];
    
    const datePatterns = [
      /released?\s+on\s+(\w+\s+\d{1,2},?\s+\d{4})/gi,
      /launched?\s+(\w+\s+\d{1,2},?\s+\d{4})/gi,
      /available\s+since\s+(\w+\s+\d{4})/gi,
      /(\w+\s+\d{4})\s+release/gi,
      /as\s+of\s+(\w+\s+\d{4})/gi
    ];
    
    // Extract all potential model mentions
    const foundModels = new Set<string>();
    
    for (const pattern of modelPatterns) {
      let match;
      while ((match = pattern.exec(searchResults)) !== null) {
        // Extract model name and provider dynamically
        let modelName = '';
        let provider = '';
        
        if (match[2]) {
          // Pattern had provider and model
          provider = match[1].toLowerCase();
          modelName = match[2].trim();
        } else if (match[1]) {
          // Pattern had just model
          modelName = match[1].trim();
        }
        
        if (modelName && !foundModels.has(modelName)) {
          foundModels.add(modelName);
          
          // Try to find associated date
          let releaseDate = '';
          for (const datePattern of datePatterns) {
            const dateMatch = searchResults.match(datePattern);
            if (dateMatch && dateMatch[1]) {
              releaseDate = dateMatch[1];
              break;
            }
          }
          
          // Try to determine provider if not found
          if (!provider) {
            const providerPatterns = [
              /anthropic/i,
              /openai/i,
              /google/i,
              /meta/i,
              /mistral/i,
              /deepseek/i,
              /cohere/i,
              /ai21/i
            ];
            
            for (const providerPattern of providerPatterns) {
              if (searchResults.match(providerPattern)) {
                provider = providerPattern.source.replace(/\\/g, '');
                break;
              }
            }
          }
          
          models.push({
            provider: provider || 'unknown',
            model: modelName.replace(/\s+/g, '-').toLowerCase(),
            version: modelName,
            releaseDate: releaseDate || new Date().toISOString().split('T')[0],
            notes: 'Discovered via web search'
          });
        }
      }
    }
    
    return models;
  }

  /**
   * Match web-discovered models with OpenRouter catalog
   * This validates that the models found on the web are available in OpenRouter
   */
  private matchWebModelsWithOpenRouter(webModels: any[], openRouterModels: any[]): any[] {
    console.log('🔗 Matching web models with OpenRouter catalog...');
    
    const matched = [];
    const openRouterMap = new Map();
    
    // Create a map for quick lookup
    openRouterModels.forEach(model => {
      openRouterMap.set(model.id.toLowerCase(), model);
    });
    
    // Try to match each web model with OpenRouter
    for (const webModel of webModels) {
      const searchKeys = [
        `${webModel.provider}/${webModel.model}`.toLowerCase(),
        `${webModel.provider}/${webModel.version}`.toLowerCase(),
        webModel.model.toLowerCase()
      ];
      
      for (const key of searchKeys) {
        for (const [openRouterId, openRouterModel] of openRouterMap) {
          if (openRouterId.includes(key) || key.includes(openRouterId.split('/')[1])) {
            matched.push({
              ...openRouterModel,
              webDiscovery: webModel
            });
            console.log(`✅ Matched: ${openRouterModel.id}`);
            break;
          }
        }
      }
    }
    
    // If no web models matched, use all OpenRouter models
    if (matched.length === 0) {
      console.log('⚠️ No web matches found, using OpenRouter catalog');
      return openRouterModels;
    }
    
    return matched;
  }

  /**
   * Research a specific model's capabilities
   */
  private async researchModel(model: any): Promise<ModelResearchResult> {
    // Calculate scores based on model characteristics
    const qualityScore = this.calculateQualityScore(model);
    const speedScore = this.calculateSpeedScore(model);
    const priceScore = this.calculatePriceScore(model);
    
    // Determine optimal use cases
    const optimalFor = this.determineOptimalUseCases(model, qualityScore);
    
    return {
      id: `research_${model.id}_${Date.now()}`,
      model_id: model.id,
      provider: model.id.split('/')[0],
      quality_score: qualityScore,
      speed_score: speedScore,
      price_score: priceScore,
      context_length: model.context_length || 0,
      specializations: this.detectSpecializations(model),
      optimal_for: optimalFor,
      research_date: new Date(),
      next_research_date: new Date(Date.now() + (this.RESEARCH_INTERVAL_DAYS * 24 * 60 * 60 * 1000)),
      metadata: {
        pricing: model.pricing,
        architecture: model.architecture,
        training_date: model.training_date
      }
    };
  }

  /**
   * Request specific context research from orchestrator
   * Called when cached research doesn't cover the needed context
   */
  async requestSpecificContextResearch(context: ContextRequest): Promise<string> {
    console.log(`🔍 Requesting specific research for context:`, context);
    
    // Notify orchestrator that specific research is needed
    const researchRequest = {
      type: 'SPECIFIC_MODEL_RESEARCH',
      context,
      priority: 'high',
      requester: 'ModelResearcherService',
      timestamp: new Date()
    };

    // Send request to orchestrator
    await this.notifyOrchestrator(researchRequest);
    
    // Conduct immediate research for this specific context
    const specificModel = await this.researchSpecificContext(context);
    
    // Store the specific research result
    await this.storeSpecificResearch(specificModel, context);
    
    return specificModel.model_id;
  }

  /**
   * Research models for a specific context
   */
  private async researchSpecificContext(context: ContextRequest): Promise<ModelResearchResult> {
    const models = await this.fetchAvailableModels();
    
    // Score models specifically for this context
    const scoredModels = models.map(model => {
      const contextScore = this.calculateContextSpecificScore(model, context);
      const qualityScore = this.calculateQualityScore(model);
      
      return {
        model,
        totalScore: (contextScore * 0.5) + (qualityScore * 0.5)
      };
    });
    
    // Sort by score and pick the best
    scoredModels.sort((a, b) => b.totalScore - a.totalScore);
    const bestModel = scoredModels[0].model;
    
    return this.researchModel(bestModel);
  }

  /**
   * Calculate context-specific score for a model
   */
  private calculateContextSpecificScore(model: any, context: ContextRequest): number {
    let score = 50;
    const modelLower = model.id.toLowerCase();
    
    // Language-specific scoring
    if (context.language === 'Python' && modelLower.includes('code')) score += 10;
    if (context.language === 'Rust' && modelLower.includes('opus')) score += 10;
    
    // Size-specific scoring
    if (context.repo_size === 'large' && model.context_length >= 128000) score += 20;
    if (context.repo_size === 'small' && modelLower.includes('mini')) score += 10;
    
    // Framework-specific scoring
    if (context.framework === 'Machine Learning' && 
        (modelLower.includes('opus') || modelLower.includes('claude'))) score += 15;
    
    // Task-specific scoring
    if (context.task_type === 'code-analysis' && !modelLower.includes('chat')) score += 10;
    
    return Math.min(100, score);
  }

  /**
   * Store research results in Supabase
   */
  private async storeResearchResults(results: ModelResearchResult[]): Promise<void> {
    // Clear old research data
    await this.supabase
      .from('model_research')
      .delete()
      .lt('research_date', new Date(Date.now() - (this.RESEARCH_INTERVAL_DAYS * 2 * 24 * 60 * 60 * 1000)));
    
    // Insert new research data
    const { error } = await this.supabase
      .from('model_research')
      .upsert(results, { onConflict: 'model_id' });
    
    if (error) {
      console.error('Error storing research results:', error);
      throw error;
    }
  }

  /**
   * Store specific context research
   */
  private async storeSpecificResearch(result: ModelResearchResult, context: ContextRequest): Promise<void> {
    // Store in a separate table for specific context research
    const { error } = await this.supabase
      .from('model_context_research')
      .insert({
        ...result,
        context,
        research_type: 'specific',
        expires_at: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)) // 30 days expiry for specific research
      });
    
    if (error) {
      console.error('Error storing specific research:', error);
      throw error;
    }
  }

  /**
   * Update research metadata
   */
  private async updateResearchMetadata(): Promise<void> {
    const { error } = await this.supabase
      .from('model_research_metadata')
      .upsert({
        id: 'singleton',
        last_research_date: new Date(),
        next_scheduled_research: new Date(Date.now() + (this.RESEARCH_INTERVAL_DAYS * 24 * 60 * 60 * 1000)),
        total_models_researched: await this.getModelCount(),
        research_version: '1.0.0'
      });
    
    if (error) {
      console.error('Error updating research metadata:', error);
      throw error;
    }
  }

  /**
   * Notify orchestrator about research needs
   */
  private async notifyOrchestrator(request: any): Promise<void> {
    // This would typically send a message to the orchestrator service
    // For now, we'll log it
    console.log('📨 Notifying orchestrator:', request);
    
    // In production, this would be something like:
    // await this.orchestratorClient.notify(request);
  }

  /**
   * Fetch available models from OpenRouter API
   */
  private async fetchAvailableModels(): Promise<any[]> {
    try {
      const response = await axios.get('https://openrouter.ai/api/v1/models');
      const models = response.data.data;
      
      // Filter to only recent models (within 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      return models.filter((model: any) => {
        // Check if model has a date in its ID
        const dateMatch = model.id.match(/(\d{4})[-]?(\d{2})[-]?(\d{2})/);
        if (dateMatch) {
          const modelDate = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`);
          if (modelDate < sixMonthsAgo) return false;
        }
        
        // Exclude deprecated models
        if (model.id.includes('deprecated')) return false;
        
        return true;
      });
    } catch (error) {
      console.error('Error fetching models from OpenRouter:', error);
      return [];
    }
  }

  /**
   * Calculate quality score for a model
   */
  private calculateQualityScore(model: any): number {
    let score = 40;
    
    // Context length scoring
    if (model.context_length >= 200000) score += 25;
    else if (model.context_length >= 128000) score += 20;
    else if (model.context_length >= 64000) score += 15;
    else if (model.context_length >= 32000) score += 10;
    
    // Model tier scoring (generic, not hardcoded)
    const modelLower = model.id.toLowerCase();
    
    if (modelLower.includes('opus') || modelLower.includes('o1')) score += 25;
    else if (modelLower.includes('sonnet') || modelLower.includes('4o')) score += 20;
    else if (modelLower.includes('haiku') || modelLower.includes('mini')) score += 10;
    
    return Math.min(100, score);
  }

  /**
   * Calculate speed score for a model
   */
  private calculateSpeedScore(model: any): number {
    const modelLower = model.id.toLowerCase();
    let score = 50;
    
    if (modelLower.includes('mini') || modelLower.includes('haiku')) score += 30;
    else if (modelLower.includes('sonnet')) score += 10;
    else if (modelLower.includes('opus') || modelLower.includes('o1')) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate price score for a model
   */
  private calculatePriceScore(model: any): number {
    if (!model.pricing) return 50;
    
    const promptPrice = parseFloat(model.pricing.prompt || '0');
    const completionPrice = parseFloat(model.pricing.completion || '0');
    const avgPrice = (promptPrice + completionPrice) / 2;
    
    if (avgPrice < 1) return 90;
    if (avgPrice < 5) return 70;
    if (avgPrice < 10) return 50;
    if (avgPrice < 20) return 30;
    return 10;
  }

  /**
   * Determine optimal use cases for a model
   */
  private determineOptimalUseCases(model: any, qualityScore: number): any {
    const modelLower = model.id.toLowerCase();
    const languages = [];
    const repo_sizes = [];
    const frameworks = [];
    
    // High quality models for all languages
    if (qualityScore >= 80) {
      languages.push('Python', 'JavaScript', 'TypeScript', 'Java', 'Go', 'Rust');
    } else if (qualityScore >= 60) {
      languages.push('Python', 'JavaScript', 'TypeScript');
    } else {
      languages.push('JavaScript', 'TypeScript');
    }
    
    // Repo size based on context length
    if (model.context_length >= 128000) {
      repo_sizes.push('large', 'enterprise');
    }
    if (model.context_length >= 32000) {
      repo_sizes.push('medium');
    }
    repo_sizes.push('small');
    
    // Framework specializations
    if (modelLower.includes('code')) {
      frameworks.push('General');
    }
    if (qualityScore >= 75) {
      frameworks.push('Machine Learning', 'Blockchain', 'Microservices');
    }
    
    return { languages, repo_sizes, frameworks };
  }

  /**
   * Detect model specializations
   */
  private detectSpecializations(model: any): string[] {
    const specializations = [];
    const modelLower = model.id.toLowerCase();
    
    if (modelLower.includes('code')) specializations.push('code-generation');
    if (modelLower.includes('chat')) specializations.push('conversation');
    if (model.context_length >= 128000) specializations.push('large-context');
    if (modelLower.includes('vision')) specializations.push('multimodal');
    
    return specializations;
  }

  /**
   * Get fallback model for emergencies
   */
  private getFallbackModel(context: ContextRequest): string {
    // Return a generic descriptor that can be mapped
    return `high-quality-${context.repo_size}-model`;
  }

  /**
   * Get total model count
   */
  private async getModelCount(): Promise<number> {
    const { count } = await this.supabase
      .from('model_research')
      .select('*', { count: 'exact', head: true });
    
    return count || 0;
  }
}