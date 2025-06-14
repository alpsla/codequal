/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Mock for ToolResultStorageService to use in tests
 */
export class ToolResultStorageService {
  constructor(
    private vectorStorage: any,
    private embeddingService: any
  ) {}
  
  async storeToolResults(
    repositoryId: string,
    toolResults: Record<string, any>,
    options: any = {}
  ): Promise<void> {
    // Mock implementation
    await this.vectorStorage.deleteChunksBySource('tool', repositoryId, repositoryId);
    
    const chunks: any[] = [];
    for (const [toolId, result] of Object.entries(toolResults)) {
      if (result.success) {
        chunks.push({
          id: `mock-${toolId}-${Date.now()}`,
          content: JSON.stringify(result),
          type: 'tool_result',
          metadata: {
            tool_id: toolId,
            ...result.metadata
          }
        });
      }
    }
    
    if (chunks.length > 0) {
      await this.vectorStorage.storeChunks(chunks);
    }
  }
}
