"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalibrationModel = void 0;
const client_1 = require("../supabase/client");
/**
 * Calibration model for database operations
 */
class CalibrationModel {
    /**
     * Store a new calibration run
     * @param runId Unique identifier for the calibration run
     * @param modelVersions Versions of the models tested
     * @param metrics Performance metrics for each model and role
     * @returns Created calibration run
     */
    static async storeCalibrationRun(runId, modelVersions, metrics) {
        const supabase = (0, client_1.getSupabase)();
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
        return this.mapToCalibrationRun(data);
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
    static async storeTestResult(runId, repositoryId, size, languages, architecture, results) {
        const supabase = (0, client_1.getSupabase)();
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
        return this.mapToCalibrationTestResult(data);
    }
    /**
     * Get the latest calibration run
     * @returns Latest calibration run or null if none exists
     */
    static async getLatestCalibrationRun() {
        const supabase = (0, client_1.getSupabase)();
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
        return this.mapToCalibrationRun(data);
    }
    /**
     * Get calibration run by ID
     * @param runId Calibration run ID
     * @returns Calibration run
     */
    static async getCalibrationRunById(runId) {
        const supabase = (0, client_1.getSupabase)();
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
        return this.mapToCalibrationRun(data);
    }
    /**
     * Get test results for a calibration run
     * @param runId Calibration run ID
     * @returns Test results
     */
    static async getTestResultsForRun(runId) {
        const supabase = (0, client_1.getSupabase)();
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
        return data.map((item) => this.mapToCalibrationTestResult(item));
    }
    /**
     * Map database record to calibration run
     * @param data Database record
     * @returns Calibration run
     */
    static mapToCalibrationRun(data) {
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
    static mapToCalibrationTestResult(data) {
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
exports.CalibrationModel = CalibrationModel;
//# sourceMappingURL=calibration.js.map