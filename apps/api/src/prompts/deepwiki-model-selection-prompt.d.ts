/**
 * DeepWiki Model Selection Prompt
 *
 * This prompt is specifically designed for the DeepWiki role to select
 * optimal models for comprehensive repository analysis.
 *
 * Weights:
 * - Quality: 60% (most important for accurate analysis)
 * - Cost: 30% (budget considerations)
 * - Speed: 10% (less critical for batch analysis)
 */
export interface DeepWikiSelectionContext {
    repositoryUrl: string;
    language: string;
    repositorySize: 'small' | 'medium' | 'large' | 'enterprise';
    complexity?: number;
}
export declare function createDeepWikiModelSelectionPrompt(candidates: any[], context: DeepWikiSelectionContext): string;
/**
 * Example usage:
 *
 * const context = {
 *   repositoryUrl: 'https://github.com/vercel/next.js',
 *   language: 'typescript',
 *   repositorySize: 'enterprise',
 *   complexity: 8
 * };
 *
 * const candidates = [
 *   {
 *     id: 'anthropic/claude-opus-4',
 *     provider: 'anthropic',
 *     context_length: 200000,
 *     scores: { quality: 9.5, cost: 7.0, speed: 7.5 },
 *     release_date: '2025-04-01',
 *     age_months: 3,
 *     pricing: { prompt: 15, completion: 75 },
 *     features: 'Best-in-class code understanding, 72.5% SWE-bench'
 *   },
 *   // ... more candidates
 * ];
 *
 * const prompt = createDeepWikiModelSelectionPrompt(candidates, context);
 */ 
//# sourceMappingURL=deepwiki-model-selection-prompt.d.ts.map