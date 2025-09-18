/**
 * Vector Context Service stub for backward compatibility
 */

export class VectorContextService {
  constructor(config?: any) {
    console.log('VectorContextService: Legacy stub');
  }
  
  async storeAnalysisResults(repositoryId: string, results: any[], userId: string): Promise<void> {
    console.log(`Storing ${results.length} results for repository ${repositoryId}`);
  }
  
  async getContext(query: string): Promise<any> {
    return {
      results: [],
      message: 'Vector context service stub'
    };
  }
}