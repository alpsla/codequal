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
export declare class CalibrationModel {
    /**
     * Store a new calibration run
     * @param runId Unique identifier for the calibration run
     * @param modelVersions Versions of the models tested
     * @param metrics Performance metrics for each model and role
     * @returns Created calibration run
     */
    static storeCalibrationRun(runId: string, modelVersions: Record<string, string>, metrics: Record<string, unknown>[]): Promise<CalibrationRun>;
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
    static storeTestResult(runId: string, repositoryId: string, size: string, languages: string[], architecture: string, results: Record<string, Record<string, number>>): Promise<CalibrationTestResult>;
    /**
     * Get the latest calibration run
     * @returns Latest calibration run or null if none exists
     */
    static getLatestCalibrationRun(): Promise<CalibrationRun | null>;
    /**
     * Get calibration run by ID
     * @param runId Calibration run ID
     * @returns Calibration run
     */
    static getCalibrationRunById(runId: string): Promise<CalibrationRun>;
    /**
     * Get test results for a calibration run
     * @param runId Calibration run ID
     * @returns Test results
     */
    static getTestResultsForRun(runId: string): Promise<CalibrationTestResult[]>;
    /**
     * Map database record to calibration run
     * @param data Database record
     * @returns Calibration run
     */
    private static mapToCalibrationRun;
    /**
     * Map database record to calibration test result
     * @param data Database record
     * @returns Calibration test result
     */
    private static mapToCalibrationTestResult;
}
//# sourceMappingURL=calibration.d.ts.map