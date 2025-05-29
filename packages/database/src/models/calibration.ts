import { getSupabase } from '../supabase/client';
import type { Tables } from '../supabase/client';

/**
 * Interface for calibration run
 */
export interface CalibrationRun {
  id: string;
  runId: string;
  timestamp: Date;
  modelVersions: Record<string, string>;
  metrics: Record<string, unknown>[];
  createdAt: Date;
}

/**
 * Interface for calibration test result
 */
export interface CalibrationTestResult {
  id: string;
  runId: string;
  repositoryId: string;
  size: string;
  languages: string[];
  architecture: string;
  results: Record<string, Record<string, number>>;
  createdAt: Date;
}

/**
 * Calibration model for database operations
 */
export class CalibrationModel {
  /**
   * Store a new calibration run
   * @param runId Unique identifier for the calibration run
   * @param modelVersions Versions of the models tested
   * @param metrics Performance metrics for each model and role
   * @returns Created calibration run
   */
  static async storeCalibrationRun(
    runId: string,
    modelVersions: Record<string, string>,
    metrics: Record<string, unknown>[]
  ): Promise<CalibrationRun> {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('calibration_runs')
      .insert({
        run_id: runId,
        timestamp: new Date().toISOString(),
        model_versions: modelVersions,
        metrics: metrics
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Error storing calibration run: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('Failed to store calibration run: No data returned');
    }
    
    return this.mapToCalibrationRun(data as Tables['calibration_runs']);
  }
  
  /**
   * Store a calibration test result
   * @param runId Calibration run ID
   * @param repositoryId Repository ID
   * @param size Repository size category
   * @param languages Repository languages
   * @param architecture Repository architecture
   * @param results Test results for each provider
   * @returns Created calibration test result
   */
  static async storeTestResult(
    runId: string,
    repositoryId: string,
    size: string,
    languages: string[],
    architecture: string,
    results: Record<string, Record<string, number>>
  ): Promise<CalibrationTestResult> {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('calibration_test_results')
      .insert({
        run_id: runId,
        repository_id: repositoryId,
        size: size,
        languages: languages,
        architecture: architecture,
        results: results
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Error storing calibration test result: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('Failed to store calibration test result: No data returned');
    }
    
    return this.mapToCalibrationTestResult(data as Tables['calibration_test_results']);
  }
  
  /**
   * Get the latest calibration run
   * @returns Latest calibration run or null if none exists
   */
  static async getLatestCalibrationRun(): Promise<CalibrationRun | null> {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('calibration_runs')
      .select()
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      throw new Error(`Error getting latest calibration run: ${error.message}`);
    }
    
    if (!data) {
      return null;
    }
    
    return this.mapToCalibrationRun(data as Tables['calibration_runs']);
  }
  
  /**
   * Get calibration run by ID
   * @param runId Calibration run ID
   * @returns Calibration run
   */
  static async getCalibrationRunById(runId: string): Promise<CalibrationRun> {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('calibration_runs')
      .select()
      .eq('run_id', runId)
      .single();
    
    if (error) {
      throw new Error(`Error getting calibration run: ${error.message}`);
    }
    
    if (!data) {
      throw new Error(`Calibration run not found: ${runId}`);
    }
    
    return this.mapToCalibrationRun(data as Tables['calibration_runs']);
  }
  
  /**
   * Get test results for a calibration run
   * @param runId Calibration run ID
   * @returns Test results
   */
  static async getTestResultsForRun(runId: string): Promise<CalibrationTestResult[]> {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('calibration_test_results')
      .select()
      .eq('run_id', runId);
    
    if (error) {
      throw new Error(`Error getting calibration test results: ${error.message}`);
    }
    
    if (!data) {
      return [];
    }
    
    return data.map(item => this.mapToCalibrationTestResult(item as Tables['calibration_test_results']));
  }
  
  /**
   * Map database record to calibration run
   * @param data Database record
   * @returns Calibration run
   */
  private static mapToCalibrationRun(data: Tables['calibration_runs']): CalibrationRun {
    return {
      id: data.id,
      runId: data.run_id,
      timestamp: new Date(data.timestamp),
      modelVersions: data.model_versions,
      metrics: data.metrics,
      createdAt: new Date(data.created_at)
    };
  }
  
  /**
   * Map database record to calibration test result
   * @param data Database record
   * @returns Calibration test result
   */
  private static mapToCalibrationTestResult(data: Tables['calibration_test_results']): CalibrationTestResult {
    return {
      id: data.id,
      runId: data.run_id,
      repositoryId: data.repository_id,
      size: data.size,
      languages: data.languages,
      architecture: data.architecture,
      results: data.results,
      createdAt: new Date(data.created_at)
    };
  }
}