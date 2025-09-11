/**
 * Skill Provider Interface
 * Temporary interface for MCP-based orchestrator
 */

export interface ISkillProvider {
  name: string;
  type: string;
  isAvailable(): Promise<boolean>;
  executeSkill(params: any): Promise<any>;
  getUserSkills?(): Promise<any[]>;
  updateSkills?(skills: any[]): Promise<void>;
}