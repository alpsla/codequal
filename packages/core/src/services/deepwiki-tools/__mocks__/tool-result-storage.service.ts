/* eslint-disable @typescript-eslint/no-explicit-any */

export const ToolResultStorageService = jest.fn().mockImplementation(() => ({
  storeToolResults: jest.fn().mockResolvedValue(undefined)
}));
