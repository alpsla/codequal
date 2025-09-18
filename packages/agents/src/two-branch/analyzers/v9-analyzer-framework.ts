/**
 * V9 Analyzer Framework - REDIRECT TO ENHANCED VERSION
 * 
 * This file is deprecated. Use V9AnalyzerFrameworkEnhanced which includes:
 * - Proper two-branch analysis (main vs PR)
 * - Dynamic model selection from Supabase
 * - PR comment generation with personalization
 * - Complete execution metadata tracking
 * - Cost analysis and model version tracking
 * 
 * The enhanced version implements the correct data flow:
 * PR URL → Cloud clone main → Cache/Index → Create PR branch (no second clone) 
 * → Orchestrator detects language/size → Fetches config from Supabase 
 * → Initiates 5 role-based agents → Tools analyze BOTH branches 
 * → Agents compile per-branch results → Orchestrator parallel processing 
 * → Final report with all metadata
 */

// Import and re-export the enhanced version
import { V9AnalyzerFrameworkEnhanced } from './v9-analyzer-framework-enhanced';

export { V9AnalyzerFrameworkEnhanced } from './v9-analyzer-framework-enhanced';

// For backward compatibility, also export as default
export default V9AnalyzerFrameworkEnhanced;

// Create an alias for backward compatibility  
export const V9AnalyzerFramework = V9AnalyzerFrameworkEnhanced;